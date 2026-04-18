const express = require('express');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { analyzeGitHub, analyzeProject, analyzeLiveApp } = require('../utils/codeAnalyzer');
const { generateJobMatches } = require('../utils/jobMatcher');
const router = express.Router();

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
    const analysis = new Analysis({
      user: req.userId,
      type,
      source,
      status: 'analyzing',
    });

    await analysis.save();

    // Start analysis in background
    processAnalysis(analysis._id, type, source);

    res.status(202).json({
      success: true,
      message: 'Analysis started',
      data: {
        analysisId: analysis._id,
        status: 'analyzing',
      },
    });
  } catch (error) {
    console.error('Start analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error starting analysis',
    });
  }
});

// @route   GET /api/analysis/:id
// @desc    Get analysis by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      user: req.userId,
    }).populate('user', 'username email avatar');

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

    const analyses = await Analysis.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Analysis.countDocuments(filter);

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
    const analysis = await Analysis.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

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

    // Update analysis with results
    Object.assign(analysis, result);
    analysis.status = 'completed';
    analysis.metadata.analysisDuration = Math.floor((Date.now() - analysis.createdAt.getTime()) / 1000);

    // Generate job matches
    analysis.jobMatches = await generateJobMatches(analysis);

    await analysis.save();

    // Update user stats
    const user = await User.findById(analysis.user);
    user.analyses.push(analysis._id);
    await user.updateStats();

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

module.exports = router;
