const mongoose = require('mongoose');

class SkillScoringEngine {
  constructor() {
    this.skillWeights = this.initializeSkillWeights();
    this.technologyComplexity = this.initializeTechnologyComplexity();
    this.experienceMultipliers = this.initializeExperienceMultipliers();
  }

  // Initialize weights for different skill categories
  initializeSkillWeights() {
    return {
      'Frontend Development': {
        'HTML/CSS': 0.6,
        'JavaScript': 1.0,
        'TypeScript': 1.2,
        'React': 1.1,
        'Vue': 1.0,
        'Angular': 1.1,
        'CSS Frameworks': 0.8,
        'State Management': 1.1,
        'Testing': 0.9
      },
      'Backend Development': {
        'Node.js': 1.0,
        'Python': 1.1,
        'Java': 1.2,
        'C#': 1.1,
        'Ruby': 0.9,
        'PHP': 0.8,
        'Go': 1.1,
        'Rust': 1.3,
        'API Design': 1.2,
        'Database Design': 1.1
      },
      'DevOps & Cloud': {
        'Docker': 1.0,
        'Kubernetes': 1.3,
        'AWS': 1.2,
        'Azure': 1.1,
        'GCP': 1.1,
        'CI/CD': 1.1,
        'Infrastructure as Code': 1.2,
        'Monitoring': 0.9
      },
      'Mobile Development': {
        'React Native': 1.0,
        'Flutter': 1.1,
        'Swift': 1.2,
        'Kotlin': 1.2,
        'iOS Development': 1.2,
        'Android Development': 1.2
      },
      'Data & AI': {
        'Machine Learning': 1.3,
        'Data Science': 1.2,
        'SQL': 0.9,
        'NoSQL': 1.0,
        'Data Engineering': 1.2,
        'Analytics': 1.0
      }
    };
  }

  // Initialize technology complexity scores
  initializeTechnologyComplexity() {
    return {
      'HTML/CSS': 2,
      'JavaScript': 5,
      'TypeScript': 6,
      'React': 7,
      'Vue': 6,
      'Angular': 8,
      'Node.js': 6,
      'Python': 5,
      'Java': 8,
      'C#': 7,
      'Go': 7,
      'Rust': 9,
      'Docker': 6,
      'Kubernetes': 8,
      'AWS': 7,
      'Machine Learning': 9,
      'SQL': 4,
      'NoSQL': 6
    };
  }

  // Initialize experience multipliers
  initializeExperienceMultipliers() {
    return {
      'beginner': 0.6,    // < 1 year
      'junior': 0.8,     // 1-2 years
      'mid': 1.0,        // 2-5 years
      'senior': 1.2,     // 5-8 years
      'lead': 1.4,       // 8+ years
      'principal': 1.6   // 10+ years
    };
  }

  // Calculate honest skill score based on code analysis
  calculateSkillScore(analysis, userExperience = {}) {
    const skillScores = {};
    const categories = analysis.categories;
    
    // Calculate scores for each detected technology
    const technologies = analysis.technologies || [];
    
    technologies.forEach(tech => {
      const techName = tech.name;
      const proficiency = tech.proficiency || 5;
      const usage = tech.usage || '';
      
      // Base score from code analysis
      const codeQualityScore = this.getCodeQualityScore(categories, techName);
      const complexityBonus = this.getComplexityBonus(techName);
      const experienceMultiplier = this.getExperienceMultiplier(techName, userExperience);
      
      // Calculate final skill score (0-10)
      let finalScore = (codeQualityScore + complexityBonus) * experienceMultiplier;
      finalScore = Math.min(10, Math.max(0, finalScore));
      
      skillScores[techName] = {
        score: Math.round(finalScore * 10) / 10,
        confidence: this.calculateConfidence(tech, analysis),
        verified: true,
        evidence: this.generateEvidence(tech, analysis),
        marketValue: this.calculateMarketValue(techName, finalScore)
      };
    });
    
    return skillScores;
  }

  // Get code quality score for specific technology
  getCodeQualityScore(categories, technology) {
    let score = 5; // Base score
    
    // Factor in overall code quality
    if (categories.codeQuality) {
      score += categories.codeQuality.score * 0.3;
    }
    
    // Factor in security
    if (categories.security) {
      score += categories.security.score * 0.2;
    }
    
    // Factor in architecture
    if (categories.architecture) {
      score += categories.architecture.score * 0.3;
    }
    
    // Factor in performance
    if (categories.performance) {
      score += categories.performance.score * 0.2;
    }
    
    return score / 2; // Normalize to 0-10 range
  }

  // Get complexity bonus for technology
  getComplexityBonus(technology) {
    const complexity = this.technologyComplexity[technology] || 5;
    return (complexity / 10) * 2; // Max 2 points bonus
  }

  // Get experience multiplier for technology
  getExperienceMultiplier(technology, userExperience) {
    const experience = userExperience[technology] || userExperience.general || 'mid';
    return this.experienceMultipliers[experience] || 1.0;
  }

  // Calculate confidence level in skill assessment
  calculateConfidence(technology, analysis) {
    let confidence = 0.5; // Base confidence
    
    // More files analyzed = higher confidence
    if (analysis.metadata) {
      const filesAnalyzed = analysis.metadata.filesAnalyzed || 0;
      confidence += Math.min(filesAnalyzed / 50, 0.3);
    }
    
    // More commits = higher confidence
    if (analysis.metadata) {
      const commitsAnalyzed = analysis.metadata.commitsAnalyzed || 0;
      confidence += Math.min(commitsAnalyzed / 100, 0.2);
    }
    
    return Math.min(confidence, 1.0);
  }

  // Generate evidence for skill claim
  generateEvidence(technology, analysis) {
    const evidence = [];
    
    // Code quality evidence
    if (analysis.categories.codeQuality) {
      const cq = analysis.categories.codeQuality;
      if (cq.score >= 7) {
        evidence.push(`High code quality score (${cq.score}/10) in ${technology} projects`);
      }
      if (cq.metrics.testCoverage >= 70) {
        evidence.push(`Strong test coverage (${cq.metrics.testCoverage}%)`);
      }
    }
    
    // Security evidence
    if (analysis.categories.security) {
      const sec = analysis.categories.security;
      if (sec.score >= 8) {
        evidence.push(`Excellent security practices (${sec.score}/10)`);
      }
      if (sec.vulnerabilities.length === 0) {
        evidence.push('No security vulnerabilities detected');
      }
    }
    
    // Architecture evidence
    if (analysis.categories.architecture) {
      const arch = analysis.categories.architecture;
      if (arch.patterns.length > 0) {
        evidence.push(`Uses good patterns: ${arch.patterns.join(', ')}`);
      }
    }
    
    // Project evidence
    if (analysis.metadata) {
      const meta = analysis.metadata;
      if (meta.linesOfCode > 1000) {
        evidence.push(`Substantial codebase (${meta.linesOfCode.toLocaleString()} lines)`);
      }
      if (meta.commitsAnalyzed > 50) {
        evidence.push(`Active development (${meta.commitsAnalyzed} commits analyzed)`);
      }
    }
    
    return evidence;
  }

  // Calculate market value for skill
  calculateMarketValue(technology, score) {
    const baseSalaries = {
      'JavaScript': 75000,
      'TypeScript': 85000,
      'React': 90000,
      'Node.js': 85000,
      'Python': 80000,
      'Java': 85000,
      'AWS': 95000,
      'Machine Learning': 120000,
      'Docker': 90000,
      'Kubernetes': 110000
    };
    
    const baseSalary = baseSalaries[technology] || 70000;
    const skillMultiplier = 0.7 + (score / 10) * 0.6; // 0.7 to 1.3 multiplier
    
    return Math.round(baseSalary * skillMultiplier);
  }

  // Generate honest skill level assessment
  generateHonestAssessment(skillScores) {
    const assessments = [];
    
    Object.entries(skillScores).forEach(([skill, data]) => {
      const score = data.score;
      const confidence = data.confidence;
      
      let level, description, realityCheck;
      
      if (score >= 8.5) {
        level = 'Senior';
        description = `Strong ${skill} skills with demonstrated expertise`;
        realityCheck = confidence >= 0.8 ? 
          'Consistently demonstrates senior-level capabilities' : 
          'May need more evidence to confirm senior level';
      } else if (score >= 7) {
        level = 'Mid-Level';
        description = `Solid ${skill} skills with good practical application`;
        realityCheck = confidence >= 0.7 ? 
          'Reliable mid-level performance' : 
          'Skills appear mid-level but need more validation';
      } else if (score >= 5) {
        level = 'Junior';
        description = `Developing ${skill} skills with basic competence`;
        realityCheck = confidence >= 0.6 ? 
          'Shows junior-level capabilities' : 
          'Basic skills present but need significant development';
      } else {
        level = 'Beginner';
        description = `Limited ${skill} skills requiring significant improvement`;
        realityCheck = 'Skills are at beginner level and need substantial work';
      }
      
      assessments.push({
        skill,
        level,
        score,
        confidence,
        description,
        realityCheck,
        verified: data.verified,
        evidence: data.evidence,
        marketValue: data.marketValue,
        gap: this.calculateSkillGap(score, 8.5) // Gap to senior level
      });
    });
    
    return assessments.sort((a, b) => b.score - a.score);
  }

  // Calculate skill gap to target level
  calculateSkillGap(currentScore, targetScore = 8.5) {
    const gap = targetScore - currentScore;
    if (gap <= 0) return 'At target level';
    
    if (gap <= 1) return 'Minor improvements needed';
    if (gap <= 2) return 'Moderate development needed';
    if (gap <= 3) return 'Significant practice required';
    return 'Extensive learning and practice needed';
  }

  // Generate overall skill summary
  generateSkillSummary(skillScores) {
    const scores = Object.values(skillScores).map(s => s.score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highestSkill = Object.entries(skillScores).reduce((a, b) => 
      b[1].score > a[1].score ? b : a
    );
    
    let overallLevel;
    if (averageScore >= 8.5) overallLevel = 'Senior Developer';
    else if (averageScore >= 7) overallLevel = 'Mid-Level Developer';
    else if (averageScore >= 5) overallLevel = 'Junior Developer';
    else overallLevel = 'Beginner Developer';
    
    return {
      overallLevel,
      averageScore: Math.round(averageScore * 10) / 10,
      totalSkills: scores.length,
      strongestSkill: highestSkill[0],
      strongestScore: highestSkill[1].score,
      readiness: this.calculateJobReadiness(averageScore, scores.length),
      recommendations: this.generateRecommendations(skillScores)
    };
  }

  // Calculate job readiness
  calculateJobReadiness(averageScore, skillCount) {
    const scoreReadiness = averageScore / 10;
    const breadthReadiness = Math.min(skillCount / 5, 1); // 5+ skills is good breadth
    
    const overallReadiness = (scoreReadiness * 0.7) + (breadthReadiness * 0.3);
    
    if (overallReadiness >= 0.8) return 'Ready for senior positions';
    if (overallReadiness >= 0.6) return 'Ready for mid-level positions';
    if (overallReadiness >= 0.4) return 'Ready for junior positions';
    return 'Needs more development before job hunting';
  }

  // Generate personalized recommendations
  generateRecommendations(skillScores) {
    const recommendations = [];
    const sortedSkills = Object.entries(skillScores).sort((a, b) => a[1].score - b[1].score);
    
    // Recommend improving weakest skills
    const weakestSkills = sortedSkills.slice(0, 2);
    weakestSkills.forEach(([skill, data]) => {
      if (data.score < 7) {
        recommendations.push({
          priority: 'high',
          type: 'skill-improvement',
          skill,
          current: data.score,
          target: Math.min(data.score + 2, 8),
          action: `Focus on improving ${skill} through practice and learning`
        });
      }
    });
    
    // Recommend leveraging strongest skills
    const strongestSkill = sortedSkills[sortedSkills.length - 1];
    if (strongestSkill[1].score >= 7) {
      recommendations.push({
        priority: 'medium',
        type: 'skill-leverage',
        skill: strongestSkill[0],
        action: `Leverage your strong ${strongestSkill[0]} skills in job applications and projects`
      });
    }
    
    // Recommend broadening skill set
    if (sortedSkills.length < 4) {
      recommendations.push({
        priority: 'medium',
        type: 'skill-broadening',
        action: 'Expand your skill set by learning complementary technologies'
      });
    }
    
    return recommendations;
  }
}

module.exports = SkillScoringEngine;
