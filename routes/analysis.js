const express = require('express');
const auth = require('../middleware/auth');
const { analyzeGitHub, analyzeProject, analyzeLiveApp } = require('../utils/codeAnalyzer');
const { generateJobMatches } = require('../utils/jobMatcher');
const { calculateSkillScore } = require('../utils/skillScoring');
const router = express.Router();
const SupabaseHelper = require('../utils/supabaseHelper');

// @route   POST /api/analysis/start
// @desc    Start a new analysis
router.post('/start', auth, async (req, res) => {
  try {
    const { type, source } = req.body;

    // Validation
    if (!type || !source) {
      return res.status(400).json({
        success: false,
        message: 'Please provide analysis type and source',
      });
    }

    if (!['github', 'project', 'live_app'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid analysis type',
      });
    }

    // Create analysis record
    const analysisData = {
      user_id: req.userId,
      type,
      source,
      status: 'analyzing',
      created_at: new Date().toISOString(),
    };

    const analysis = await SupabaseHelper.createAnalysis(analysisData);

    // Start analysis in background
    processAnalysis(analysis.id, type, source);

    res.status(202).json({
      success: true,
      message: 'Analysis started',
      data: {
        analysisId: analysis.id,
        status: 'analyzing',
      },
    });
  } catch (error) {
    console.error('Analysis start error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start analysis',
    });
  }
});

// @route   GET /api/analysis/:id
// @desc    Get analysis by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const analysis = await SupabaseHelper.query('analyses', {
      filter: { id: req.params.id, user_id: req.userId },
      single: true
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found',
      });
    }

    res.json({
      success: true,
      data: { analysis },
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching analysis',
    });
  }
});

// @route   GET /api/analysis/user/:userId
// @desc    Get all analyses for a user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const filter = { user: req.params.id };
    
    if (type) {
      filter.type = type;
    }

    const analyses = await SupabaseHelper.query('analyses', {
      filter: filter,
      orderBy: { column: 'created_at', ascending: false },
      limit: limit
    });

    // For simplicity, we'll skip total count in this migration
    const total = analyses.length;

    res.json({
      success: true,
      data: {
        analyses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get user analyses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching analyses',
    });
  }
});

// @route   GET /api/analysis/stats/:userId
// @desc    Get analysis statistics for a user
router.get('/stats/:userId', auth, async (req, res) => {
  try {
    const analyses = await Analysis.find({ user: req.params.id })
      .sort({ createdAt: -1 });

    if (analyses.length === 0) {
      return res.json({
        success: true,
        data: {
          totalAnalyses: 0,
          averageScore: 0,
          categoryAverages: {},
          improvementRate: 0,
          recentTrend: [],
        },
      });
    }

    // Calculate statistics
    const totalAnalyses = analyses.length;
    const averageScore = analyses.reduce((sum, a) => sum + a.overallScore, 0) / totalAnalyses;
    
    // Category averages
    const categories = ['codeQuality', 'architecture', 'security', 'performance', 'uiux'];
    const categoryAverages = {};
    
    categories.forEach(cat => {
      const validScores = analyses
        .map(a => a.categories[cat]?.score)
        .filter(score => score > 0);
      
      if (validScores.length > 0) {
        categoryAverages[cat] = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
      }
    });

    // Improvement rate
    let improvementRate = 0;
    if (analyses.length >= 2) {
      const recentScore = analyses[0].overallScore;
      const previousScore = analyses[1].overallScore;
      improvementRate = ((recentScore - previousScore) / previousScore) * 100;
    }

    // Recent trend (last 10 analyses)
    const recentTrend = analyses.slice(0, 10).map(a => ({
      date: a.createdAt,
      score: a.overallScore,
      type: a.type,
    }));

    res.json({
      success: true,
      data: {
        totalAnalyses,
        averageScore,
        categoryAverages,
        improvementRate,
        recentTrend,
      },
    });
  } catch (error) {
    console.error('Get analysis stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statistics',
    });
  }
});

// @route   DELETE /api/analysis/:id
// @desc    Delete an analysis
router.delete('/:id', auth, async (req, res) => {
  try {
    const { data } = await SupabaseHelper.query('analyses', {
      filter: { id: req.params.id, user_id: req.userId },
      single: true
    });
    
    const analysis = data[0] || null;

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found',
      });
    }

    // Update user stats
    const user = await User.findById(req.userId);
    await user.updateStats();

    res.json({
      success: true,
      message: 'Analysis deleted successfully',
    });
  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting analysis',
    });
  }
});

// Background analysis processing
async function processAnalysis(analysisId, type, source) {
  try {
    const analysis = await Analysis.findById(analysisId);
    if (!analysis) return;

    // Update status to analyzing
    analysis.status = 'analyzing';
    await analysis.save();

    let result;

    switch (type) {
      case 'github':
        result = await analyzeGitHub(source);
        break;
      case 'project':
        result = await analyzeProject(source);
        break;
      case 'live_app':
        result = await analyzeLiveApp(source);
        break;
      default:
        throw new Error('Invalid analysis type');
    }

    // Get user data for skill scoring
    const user = await User.findById(analysis.user);
    const userExperience = {
      general: getUserExperienceLevel(user),
      // Add specific technology experience if available
      ...(user.skills && user.skills.reduce((acc, skill) => {
        acc[skill.name] = getExperienceFromLevel(skill.level);
        return acc;
      }, {}))
    };

    // Initialize skill scoring engine
    const skillEngine = new SkillScoringEngine();
    
    // Calculate honest skill scores
    const skillScores = skillEngine.calculateSkillScore(result, userExperience);
    const skillAssessments = skillEngine.generateHonestAssessment(skillScores);
    const skillSummary = skillEngine.generateSkillSummary(skillScores);

    // Update user's verified skills
    await updateUserSkills(user, skillScores);

    // Generate traceable code findings
    const traceableFindings = generateTraceableFindings(result, skillScores);

    // Generate AI resume content
    const resumeContent = generateResumeContent(skillAssessments, result);

    // Generate 90-day ROI roadmap
    const roadmap = generateROIroadmap(skillAssessments, skillSummary);

    // Update analysis with comprehensive results
    Object.assign(analysis, result);
    analysis.status = 'completed';
    analysis.metadata.analysisDuration = Math.floor((Date.now() - analysis.createdAt.getTime()) / 1000);
    
    // Add skill scoring results
    analysis.skillScores = skillScores;
    analysis.skillAssessments = skillAssessments;
    analysis.skillSummary = skillSummary;
    analysis.traceableFindings = traceableFindings;
    analysis.resumeBulletPoints = resumeContent.bulletPoints;
    analysis.recommendations = [
      ...resumeContent.recommendations,
      ...roadmap.recommendations
    ];

    // Generate job matches with verified skills
    analysis.jobMatches = await generateJobMatches(analysis, skillScores);

    await analysis.save();

    // Update user stats and skills
    user.analyses.push(analysis._id);
    user.skills = user.skills.map(skill => {
      if (skillScores[skill.name]) {
        return {
          ...skill,
          level: skillScores[skill.name].score,
          verified: true,
          lastAssessed: new Date()
        };
      }
      return skill;
    });
    await user.updateStats();

    console.log(`Analysis ${analysisId} completed successfully`);

  } catch (error) {
    console.error('Analysis processing error:', error);
    
    const analysis = await Analysis.findById(analysisId);
    if (analysis) {
      analysis.status = 'failed';
      analysis.error = {
        message: error.message,
        stack: error.stack,
      };
      await analysis.save();
    }
  }
}

// Helper functions
function getUserExperienceLevel(user) {
  if (!user.stats || !user.stats.totalAnalyses) return 'beginner';
  
  const avgScore = user.stats.averageScore || 0;
  const totalAnalyses = user.stats.totalAnalyses;
  
  if (avgScore >= 8.5 && totalAnalyses >= 3) return 'senior';
  if (avgScore >= 7 && totalAnalyses >= 2) return 'mid';
  if (avgScore >= 5 && totalAnalyses >= 1) return 'junior';
  return 'beginner';
}

function getExperienceFromLevel(level) {
  if (level >= 9) return 'senior';
  if (level >= 7) return 'mid';
  if (level >= 5) return 'junior';
  return 'beginner';
}

async function updateUserSkills(user, skillScores) {
  const currentSkills = user.skills || [];
  
  Object.entries(skillScores).forEach(([skillName, skillData]) => {
    const existingSkill = currentSkills.find(s => s.name === skillName);
    
    if (existingSkill) {
      // Update existing skill with verified score
      existingSkill.level = skillData.score;
      existingSkill.verified = true;
      existingSkill.lastAssessed = new Date();
    } else {
      // Add new verified skill
      currentSkills.push({
        name: skillName,
        level: skillData.score,
        verified: true,
        lastAssessed: new Date()
      });
    }
  });
  
  user.skills = currentSkills;
  await user.save();
}

function generateTraceableFindings(analysisResult, skillScores) {
  const findings = [];
  
  // Add code quality findings
  if (analysisResult.categories.codeQuality) {
    const cq = analysisResult.categories.codeQuality;
    cq.issues.forEach(issue => {
      findings.push({
        type: 'issue',
        category: 'code-quality',
        description: issue,
        severity: 'medium',
        impact: 'Affects maintainability and readability',
        recommendation: 'Refactor to improve code structure',
        traceable: true
      });
    });
    
    cq.strengths.forEach(strength => {
      findings.push({
        type: 'strength',
        category: 'code-quality',
        description: strength,
        impact: 'Positive impact on code maintainability',
        traceable: true
      });
    });
  }
  
  // Add security findings
  if (analysisResult.categories.security) {
    const sec = analysisResult.categories.security;
    sec.vulnerabilities.forEach(vuln => {
      findings.push({
        type: 'vulnerability',
        category: 'security',
        description: vuln.description,
        severity: vuln.severity,
        location: vuln.location,
        impact: 'Security risk that could be exploited',
        recommendation: 'Fix immediately to prevent security breaches',
        traceable: true
      });
    });
  }
  
  // Add skill-specific findings
  Object.entries(skillScores).forEach(([skill, data]) => {
    data.evidence.forEach(evidence => {
      findings.push({
        type: 'skill-evidence',
        category: 'skill-assessment',
        skill: skill,
        description: evidence,
        confidence: data.confidence,
        traceable: true
      });
    });
  });
  
  return findings;
}

function generateResumeContent(skillAssessments, analysisResult) {
  const bulletPoints = [];
  const recommendations = [];
  
  // Generate bullet points based on verified skills
  skillAssessments.forEach(assessment => {
    if (assessment.score >= 7) {
      bulletPoints.push({
        skill: assessment.skill,
        achievement: `Demonstrated ${assessment.level.toLowerCase()} expertise in ${assessment.skill}`,
        metrics: `Skill score: ${assessment.score}/10 with ${Math.round(assessment.confidence * 100)}% confidence`,
        impact: assessment.realityCheck
      });
    }
  });
  
  // Add project-specific achievements
  if (analysisResult.metadata) {
    const meta = analysisResult.metadata;
    if (meta.linesOfCode > 5000) {
      bulletPoints.push({
        skill: 'Software Development',
        achievement: 'Developed and maintained large-scale codebase',
        metrics: `${meta.linesOfCode.toLocaleString()}+ lines of code across ${meta.filesAnalyzed} files`,
        impact: 'Demonstrates ability to handle complex projects'
      });
    }
  }
  
  // Generate recommendations
  if (skillAssessments.length < 3) {
    recommendations.push({
      priority: 'medium',
      title: 'Expand Skill Set',
      description: 'Consider learning additional technologies to broaden your expertise'
    });
  }
  
  const weakSkills = skillAssessments.filter(s => s.score < 6);
  if (weakSkills.length > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Address Skill Gaps',
      description: `Focus on improving: ${weakSkills.map(s => s.skill).join(', ')}`
    });
  }
  
  return {
    bulletPoints,
    recommendations
  };
}

function generateROIroadmap(skillAssessments, skillSummary) {
  const roadmap = {
    phases: [],
    recommendations: [],
    expectedROI: 0
  };
  
  // Phase 1: Foundation (Days 1-30)
  const foundationSkills = skillAssessments.filter(s => s.score < 6);
  roadmap.phases.push({
    phase: 'Foundation Skills',
    days: '1-30',
    focus: foundationSkills.map(s => s.skill),
    activities: foundationSkills.map(skill => ({
      skill: skill.skill,
      action: `Complete online courses and practice projects for ${skill.skill}`,
      target: Math.min(skill.score + 2, 7),
      resources: ['Online courses', 'Documentation', 'Practice projects']
    })),
    expectedImprovement: '20-30% skill score increase'
  });
  
  // Phase 2: Advanced (Days 31-60)
  const advancedSkills = skillAssessments.filter(s => s.score >= 6 && s.score < 8);
  roadmap.phases.push({
    phase: 'Advanced Concepts',
    days: '31-60',
    focus: advancedSkills.map(s => s.skill),
    activities: advancedSkills.map(skill => ({
      skill: skill.skill,
      action: `Build advanced projects and contribute to open source in ${skill.skill}`,
      target: Math.min(skill.score + 1.5, 8.5),
      resources: ['Open source contributions', 'Advanced tutorials', 'Mentorship']
    })),
    expectedImprovement: '15-25% skill score increase'
  });
  
  // Phase 3: Job Ready (Days 61-90)
  roadmap.phases.push({
    phase: 'Job Preparation',
    days: '61-90',
    focus: ['Interview Skills', 'Portfolio Building', 'Networking'],
    activities: [
      {
        skill: 'Interview Preparation',
        action: 'Practice technical interviews and build portfolio',
        target: 'Job ready',
        resources: ['Mock interviews', 'Portfolio projects', 'Networking events']
      }
    ],
    expectedImprovement: 'Ready for job applications'
  });
  
  // Calculate expected ROI
  const currentMarketValue = skillAssessments.reduce((sum, s) => sum + s.marketValue, 0);
  const potentialMarketValue = skillAssessments.reduce((sum, s) => {
    const targetScore = Math.min(s.score + 2, 9);
    const scoreMultiplier = targetScore / s.score;
    return sum + (s.marketValue * scoreMultiplier);
  }, 0);
  
  roadmap.expectedROI = Math.round(((potentialMarketValue - currentMarketValue) / currentMarketValue) * 100);
  
  // Generate recommendations
  roadmap.recommendations = [
    {
      priority: 'high',
      title: 'Consistent Daily Practice',
      description: 'Dedicate 2-3 hours daily to skill development'
    },
    {
      priority: 'medium',
      title: 'Build Real Projects',
      description: 'Apply skills to practical projects rather than just tutorials'
    },
    {
      priority: 'medium',
      title: 'Get Feedback',
      description: 'Seek code reviews and mentorship to accelerate growth'
    }
  ];
  
  return roadmap;
}

module.exports = router;
