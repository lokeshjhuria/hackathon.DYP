const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.githubId; // Password not required if GitHub auth
    },
    minlength: 6,
  },
  githubId: {
    type: String,
    sparse: true,
    unique: true,
  },
  githubUsername: {
    type: String,
    sparse: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    maxlength: 500,
    default: '',
  },
  location: {
    type: String,
    default: '',
  },
  website: {
    type: String,
    default: '',
  },
  skills: [{
    name: {
      type: String,
      required: true,
    },
    level: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    lastAssessed: {
      type: Date,
      default: Date.now,
    },
  }],
  analyses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
  }],
  careerGoals: {
    targetRoles: [String],
    targetCompanies: [String],
    salaryRange: {
      min: Number,
      max: Number,
    },
    preferredLocations: [String],
  },
  resume: {
    bulletPoints: [String],
    summary: String,
    experience: [{
      company: String,
      role: String,
      duration: String,
      description: String,
      technologies: [String],
    }],
    education: [{
      institution: String,
      degree: String,
      year: String,
    }],
  },
  stats: {
    totalAnalyses: {
      type: Number,
      default: 0,
    },
    averageScore: {
      type: Number,
      default: 0,
    },
    improvementRate: {
      type: Number,
      default: 0,
    },
    lastAnalysisDate: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update stats method
userSchema.methods.updateStats = async function() {
  const Analysis = mongoose.model('Analysis');
  const analyses = await Analysis.find({ user: this._id });
  
  this.stats.totalAnalyses = analyses.length;
  if (analyses.length > 0) {
    const totalScore = analyses.reduce((sum, analysis) => sum + analysis.overallScore, 0);
    this.stats.averageScore = totalScore / analyses.length;
    this.stats.lastAnalysisDate = analyses[analyses.length - 1].createdAt;
    
    // Calculate improvement rate
    if (analyses.length >= 2) {
      const recentScore = analyses[analyses.length - 1].overallScore;
      const previousScore = analyses[analyses.length - 2].overallScore;
      this.stats.improvementRate = ((recentScore - previousScore) / previousScore) * 100;
    }
  }
  
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
