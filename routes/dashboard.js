const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Analysis = require('../models/Analysis');
const router = express.Router();

// @route   GET /api/dashboard/skills
// @desc    Get user skills with real-time data
router.get('/skills', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('analyses');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Aggregate skills from analyses
    const skills = {};
    
    // User-declared skills
    user.skills.forEach(skill => {
      skills[skill.name] = {
        level: skill.level,
        verified: skill.verified,
        source: 'user',
        lastAssessed: skill.lastAssessed,
      };
    });

    // Skills from analyses
    user.analyses.forEach(analysis => {
      if (analysis.technologies) {
        analysis.technologies.forEach(tech => {
          if (!skills[tech.name] || skills[tech.name].level < tech.proficiency) {
            skills[tech.name] = {
              level: tech.proficiency,
              verified: true,
              source: 'analysis',
              lastAssessed: analysis.createdAt,
            };
          }
        });
      }
    });

    res.json({
      success: true,
      data: { skills },
    });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching skills',
    });
  }
});

// @route   GET /api/dashboard/job-requirements
// @desc    Get job requirements for skill comparison
router.get('/job-requirements', auth, async (req, res) => {
  try {
    // Mock job requirements based on market data
    const jobRequirements = [
      { name: 'JavaScript', level: 9, demand: 'high' },
      { name: 'React', level: 8, demand: 'high' },
      { name: 'Node.js', level: 7, demand: 'high' },
      { name: 'Python', level: 8, demand: 'high' },
      { name: 'AWS', level: 7, demand: 'medium' },
      { name: 'Database', level: 8, demand: 'high' },
      { name: 'TypeScript', level: 8, demand: 'high' },
      { name: 'Docker', level: 7, demand: 'medium' },
    ];

    res.json({
      success: true,
      data: { requiredSkills: jobRequirements },
    });
  } catch (error) {
    console.error('Get job requirements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching job requirements',
    });
  }
});

// @route   GET /api/dashboard/salary-calculator
// @desc    Calculate salary based on skills
router.get('/salary-calculator', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Base salary calculation
    const baseSalary = 75000;
    let currentSalary = baseSalary;
    
    // Calculate salary based on verified skills
    const verifiedSkills = user.skills.filter(skill => skill.verified);
    verifiedSkills.forEach(skill => {
      currentSalary += skill.level * 2000;
    });

    // Calculate potential salary with skill improvements
    let potentialSalary = currentSalary;
    const skillValues = [];

    user.skills.forEach(skill => {
      const potentialLevel = Math.min(10, skill.level + 2);
      const skillValue = (potentialLevel - skill.level) * 3000;
      potentialSalary += skillValue;
      
      skillValues.push({
        skill: skill.name,
        value: skillValue,
      });
    });

    res.json({
      success: true,
      data: {
        currentSalary,
        potentialSalary,
        skillValues,
      },
    });
  } catch (error) {
    console.error('Salary calculator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error calculating salary',
    });
  }
});

// @route   GET /api/dashboard/portfolio-rankings
// @desc    Get ranked portfolio projects
router.get('/portfolio-rankings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate({
      path: 'analyses',
      match: { type: { $in: ['github', 'project'] } },
      options: { sort: { createdAt: -1 } },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const projects = [];

    // Process analyses to create project rankings
    user.analyses.forEach(analysis => {
      const score = analysis.overallScore;
      const technologies = analysis.technologies.map(tech => tech.name);
      
      let name = 'Unknown Project';
      if (analysis.source.githubUsername) {
        name = `${analysis.source.githubUsername}/${analysis.source.repositoryName || 'repository'}`;
      } else if (analysis.source.projectName) {
        name = analysis.source.projectName;
      }

      projects.push({
        name,
        technologies,
        score,
        type: analysis.type,
        createdAt: analysis.createdAt,
        analysisId: analysis._id,
      });
    });

    // Sort by score
    projects.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: { projects },
    });
  } catch (error) {
    console.error('Portfolio rankings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching portfolio rankings',
    });
  }
});

// @route   GET /api/dashboard/gap-analysis
// @desc    Get GitHub vs LinkedIn gap analysis
router.get('/gap-analysis', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const gaps = [];

    // Analyze gaps between GitHub and LinkedIn
    const githubStrength = user.skills.filter(skill => skill.verified).length;
    const linkedinSkills = user.resume.experience?.length || 0;

    if (githubStrength > linkedinSkills * 2) {
      gaps.push({
        type: 'negative',
        description: 'Underselling on LinkedIn - showcase more GitHub achievements',
      });
    } else if (githubStrength < linkedinSkills) {
      gaps.push({
        type: 'positive',
        description: 'Strong LinkedIn presence - good professional branding',
      });
    }

    if (user.skills.length < 5) {
      gaps.push({
        type: 'neutral',
        description: 'Consider expanding your skill portfolio',
      });
    }

    if (user.stats.averageScore > 7) {
      gaps.push({
        type: 'positive',
        description: 'High code quality scores - excellent technical skills',
      });
    }

    res.json({
      success: true,
      data: { gaps },
    });
  } catch (error) {
    console.error('Gap analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error performing gap analysis',
    });
  }
});

// @route   GET /api/dashboard/roi-roadmap
// @desc    Get 90-day ROI roadmap
router.get('/roi-roadmap', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const currentScore = user.stats.averageScore || 5;
    const targetScore = Math.min(10, currentScore + 2);
    const progress = ((currentScore - 5) / (targetScore - 5)) * 100;
    const expectedIncrease = Math.round((targetScore - currentScore) * 15);

    const milestones = [
      {
        title: 'Day 1-30',
        description: 'Foundation Skills',
        status: 'completed',
        day: '30',
        tasks: [
          'Master React Hooks',
          'Learn TypeScript',
          'Build 2 projects',
        ],
      },
      {
        title: 'Day 31-60',
        description: 'Advanced Concepts',
        status: 'current',
        day: '60',
        tasks: [
          'System Design',
          'Cloud Deployment',
          'Performance Optimization',
        ],
      },
      {
        title: 'Day 61-90',
        description: 'Job Ready',
        status: 'upcoming',
        day: '90',
        tasks: [
          'Portfolio Enhancement',
          'Interview Prep',
          'Salary Negotiation',
        ],
      },
    ];

    res.json({
      success: true,
      data: {
        progress,
        expectedIncrease,
        milestones,
      },
    });
  } catch (error) {
    console.error('ROI roadmap error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating ROI roadmap',
    });
  }
});

// @route   GET /api/dashboard/analysis-status
// @desc    Get current analysis status
router.get('/analysis-status', auth, async (req, res) => {
  try {
    const latestAnalysis = await Analysis.findOne({ 
      user: req.userId 
    }).sort({ createdAt: -1 });

    if (!latestAnalysis) {
      return res.json({
        success: true,
        data: {
          analysis: {
            status: 'pending',
            progress: 0,
          },
        },
      });
    }

    const progress = latestAnalysis.status === 'completed' ? 100 : 
                    latestAnalysis.status === 'analyzing' ? 65 : 0;

    res.json({
      success: true,
      data: {
        analysis: {
          status: latestAnalysis.status,
          progress,
          analysisId: latestAnalysis._id,
        },
      },
    });
  } catch (error) {
    console.error('Analysis status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching analysis status',
    });
  }
});

module.exports = router;
