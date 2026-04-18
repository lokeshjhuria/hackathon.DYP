const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['github', 'project', 'live_app'],
    required: true,
  },
  source: {
    url: String,
    githubUsername: String,
    repositoryName: String,
    projectName: String,
  },
  status: {
    type: String,
    enum: ['pending', 'analyzing', 'completed', 'failed'],
    default: 'pending',
  },
  overallScore: {
    type: Number,
    min: 0,
    max: 10,
    default: 0,
  },
  categories: {
    codeQuality: {
      score: { type: Number, min: 0, max: 10, default: 0 },
      issues: [String],
      strengths: [String],
      metrics: {
        cyclomaticComplexity: Number,
        maintainabilityIndex: Number,
        technicalDebt: Number,
        duplicateLines: Number,
        testCoverage: Number,
      },
    },
    architecture: {
      score: { type: Number, min: 0, max: 10, default: 0 },
      patterns: [String],
      antiPatterns: [String],
      structure: {
        separationOfConcerns: Boolean,
        modularity: Boolean,
        scalability: Boolean,
        errorHandling: Boolean,
      },
    },
    security: {
      score: { type: Number, min: 0, max: 10, default: 0 },
      vulnerabilities: [{
        type: String,
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        description: String,
        location: String,
      }],
      bestPractices: [String],
      recommendations: [String],
    },
    performance: {
      score: { type: Number, min: 0, max: 10, default: 0 },
      metrics: {
        loadTime: Number,
        bundleSize: Number,
        apiResponseTime: Number,
        memoryUsage: Number,
      },
      optimizations: [String],
      bottlenecks: [String],
    },
    uiux: {
      score: { type: Number, min: 0, max: 10, default: 0 },
      accessibility: {
        score: Number,
        issues: [String],
      },
      usability: {
        score: Number,
        issues: [String],
      },
      design: {
        consistency: Boolean,
        responsiveness: Boolean,
        colorContrast: Boolean,
        typography: Boolean,
      },
    },
  },
  technologies: [{
    name: String,
    experience: String,
    proficiency: {
      type: Number,
      min: 1,
      max: 10,
    },
    usage: String,
  }],
  recommendations: [{
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
    },
    category: String,
    title: String,
    description: String,
    resources: [{
      type: String, // 'article', 'course', 'video', 'documentation'
      title: String,
      url: String,
      difficulty: String,
    }],
  }],
  jobMatches: [{
    jobTitle: String,
    company: String,
    matchScore: Number,
    requiredSkills: [String],
    missingSkills: [String],
    salary: String,
    location: String,
    url: String,
  }],
  resumeBulletPoints: [{
    skill: String,
    achievement: String,
    metrics: String,
    impact: String,
  }],
  insights: {
    strengths: [String],
    weaknesses: [String],
    growthAreas: [String],
    careerLevel: String, // 'junior', 'mid', 'senior', 'lead'
    marketValue: String,
  },
  metadata: {
    analysisDuration: Number, // in seconds
    linesOfCode: Number,
    filesAnalyzed: Number,
    commitsAnalyzed: Number,
    contributors: Number,
    lastCommitDate: Date,
  },
  error: {
    message: String,
    stack: String,
  },
}, {
  timestamps: true,
});

// Calculate overall score based on categories
analysisSchema.methods.calculateOverallScore = function() {
  const categories = ['codeQuality', 'architecture', 'security', 'performance', 'uiux'];
  let totalScore = 0;
  let validCategories = 0;

  categories.forEach(category => {
    if (this.categories[category] && this.categories[category].score > 0) {
      totalScore += this.categories[category].score;
      validCategories++;
    }
  });

  this.overallScore = validCategories > 0 ? totalScore / validCategories : 0;
  return this.overallScore;
};

// Generate career level based on scores
analysisSchema.methods.determineCareerLevel = function() {
  const score = this.overallScore;
  
  if (score >= 8.5) return 'senior';
  if (score >= 7) return 'mid';
  if (score >= 5) return 'junior';
  return 'beginner';
};

// Generate insights based on analysis
analysisSchema.methods.generateInsights = function() {
  const insights = {
    strengths: [],
    weaknesses: [],
    growthAreas: [],
    careerLevel: this.determineCareerLevel(),
  };

  // Analyze each category for insights
  Object.keys(this.categories).forEach(category => {
    const cat = this.categories[category];
    if (cat.score >= 7) {
      insights.strengths.push(`Strong ${category.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    } else if (cat.score < 5) {
      insights.weaknesses.push(`Needs improvement in ${category.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      insights.growthAreas.push(category);
    }
  });

  this.insights = insights;
};

// Pre-save middleware
analysisSchema.pre('save', function(next) {
  this.calculateOverallScore();
  this.generateInsights();
  next();
});

module.exports = mongoose.model('Analysis', analysisSchema);
