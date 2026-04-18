const express = require('express');
const SupabaseHelper = require('../utils/supabaseHelper');
const router = express.Router();

// @route   GET /api/health
// @desc    Health check endpoint
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: 'disconnected',
      github: 'not_configured',
      services: {
        api: 'running',
        database: 'checking',
        github: 'checking'
      }
    };

    // Check database connection
    const dbConnected = await SupabaseHelper.testConnection();
    if (dbConnected) {
      healthCheck.database = 'connected';
      healthCheck.services.database = 'healthy';
    } else {
      healthCheck.database = 'disconnected';
      healthCheck.services.database = 'unhealthy';
    }

    // Check GitHub token
    if (process.env.GITHUB_TOKEN) {
      healthCheck.github = 'configured';
      healthCheck.services.github = 'healthy';
    } else {
      healthCheck.github = 'not_configured';
      healthCheck.services.github = 'warning';
    }

    // Overall status
    const allServicesHealthy = Object.values(healthCheck.services).every(
      status => status === 'healthy' || status === 'running'
    );
    
    healthCheck.status = allServicesHealthy ? 'healthy' : 'degraded';

    res.status(allServicesHealthy ? 200 : 503).json({
      success: true,
      data: healthCheck
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

module.exports = router;
