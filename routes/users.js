const express = require('express');
const User = require('../models/User');
const Analysis = require('../models/Analysis');
const auth = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile with stats
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('analyses')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const allowedUpdates = [
      'username',
      'bio',
      'location',
      'website',
      'careerGoals',
      'skills',
      'resume',
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
    });
  }
});

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate({
        path: 'analyses',
        options: { sort: { createdAt: -1 }, limit: 5 },
      })
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get recent analyses
    const recentAnalyses = await Analysis.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate skill distribution
    const skillDistribution = {};
    user.skills.forEach(skill => {
      if (!skillDistribution[skill.name]) {
        skillDistribution[skill.name] = [];
      }
      skillDistribution[skill.name].push(skill.level);
    });

    const averageSkills = {};
    Object.keys(skillDistribution).forEach(skill => {
      const levels = skillDistribution[skill];
      averageSkills[skill] = levels.reduce((sum, level) => sum + level, 0) / levels.length;
    });

    // Get career insights
    const careerInsights = {
      currentLevel: user.stats.averageScore >= 8 ? 'Senior' :
                    user.stats.averageScore >= 6 ? 'Mid-Level' :
                    user.stats.averageScore >= 4 ? 'Junior' : 'Beginner',
      totalAnalyses: user.stats.totalAnalyses,
      improvementRate: user.stats.improvementRate,
      topSkills: Object.entries(averageSkills)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([skill, level]) => ({ skill, level })),
      recentActivity: recentAnalyses.map(analysis => ({
        id: analysis._id,
        type: analysis.type,
        score: analysis.overallScore,
        date: analysis.createdAt,
      })),
    };

    res.json({
      success: true,
      data: {
        user,
        careerInsights,
        recentAnalyses,
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard',
    });
  }
});

// @route   GET /api/users/skills
// @desc    Get user skills with verification status
router.get('/skills', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('analyses')
      .select('skills analyses');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Aggregate skills from analyses
    const analysisSkills = new Map();
    
    user.analyses.forEach(analysis => {
      if (analysis.technologies) {
        analysis.technologies.forEach(tech => {
          if (!analysisSkills.has(tech.name)) {
            analysisSkills.set(tech.name, {
              name: tech.name,
              proficiency: tech.proficiency,
              verified: true,
              sources: [],
            });
          }
          analysisSkills.get(tech.name).sources.push({
            type: analysis.type,
            score: analysis.overallScore,
            date: analysis.createdAt,
          });
        });
      }
    });

    // Combine user-declared skills with analysis-detected skills
    const allSkills = new Map();

    // Add user-declared skills
    user.skills.forEach(skill => {
      allSkills.set(skill.name, {
        ...skill,
        verified: skill.verified,
        sources: [],
      });
    });

    // Add or update with analysis-detected skills
    analysisSkills.forEach((analysisSkill, name) => {
      if (allSkills.has(name)) {
        const existingSkill = allSkills.get(name);
        existingSkill.verified = true;
        existingSkill.sources = analysisSkill.sources;
        // Update proficiency if analysis shows higher level
        if (analysisSkill.proficiency > existingSkill.level) {
          existingSkill.level = analysisSkill.proficiency;
        }
      } else {
        allSkills.set(name, analysisSkill);
      }
    });

    res.json({
      success: true,
      data: {
        skills: Array.from(allSkills.values()),
        totalSkills: allSkills.size,
        verifiedSkills: Array.from(allSkills.values()).filter(skill => skill.verified).length,
      },
    });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching skills',
    });
  }
});

// @route   POST /api/users/skills
// @desc    Add or update user skills
router.post('/skills', auth, async (req, res) => {
  try {
    const { skills } = req.body;

    if (!Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        message: 'Skills must be an array',
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update or add skills
    skills.forEach(newSkill => {
      const existingSkillIndex = user.skills.findIndex(
        skill => skill.name.toLowerCase() === newSkill.name.toLowerCase()
      );

      if (existingSkillIndex >= 0) {
        // Update existing skill
        user.skills[existingSkillIndex] = {
          ...user.skills[existingSkillIndex],
          ...newSkill,
          lastAssessed: new Date(),
        };
      } else {
        // Add new skill
        user.skills.push({
          ...newSkill,
          verified: false,
          lastAssessed: new Date(),
        });
      }
    });

    await user.save();

    res.json({
      success: true,
      message: 'Skills updated successfully',
      data: { skills: user.skills },
    });
  } catch (error) {
    console.error('Update skills error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating skills',
    });
  }
});

// @route   DELETE /api/users/skills/:skillName
// @desc    Delete a user skill
router.delete('/skills/:skillName', auth, async (req, res) => {
  try {
    const { skillName } = req.params;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.skills = user.skills.filter(
      skill => skill.name.toLowerCase() !== skillName.toLowerCase()
    );

    await user.save();

    res.json({
      success: true,
      message: 'Skill deleted successfully',
    });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting skill',
    });
  }
});

// @route   GET /api/users/resume
// @desc    Get user resume data
router.get('/resume', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('analyses')
      .select('username email bio location website skills analyses resume stats');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate resume bullet points from analyses
    const generatedBulletPoints = [];
    
    user.analyses.forEach(analysis => {
      if (analysis.resumeBulletPoints) {
        generatedBulletPoints.push(...analysis.resumeBulletPoints);
      }
    });

    // Get verified skills
    const verifiedSkills = user.skills.filter(skill => skill.verified);

    const resumeData = {
      personalInfo: {
        name: user.username,
        email: user.email,
        bio: user.bio,
        location: user.location,
        website: user.website,
      },
      skills: verifiedSkills,
      experience: user.resume.experience || [],
      education: user.resume.education || [],
      generatedBulletPoints,
      stats: user.stats,
    };

    res.json({
      success: true,
      data: { resume: resumeData },
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching resume',
    });
  }
});

// @route   GET /api/users/linkedin-profile
// @desc    Get user's LinkedIn profile data
router.get('/linkedin-profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Mock LinkedIn profile data
    const linkedinProfile = {
      skills: user.skills.map(skill => skill.name),
      projects: user.resume.experience || [],
      endorsements: Math.floor(Math.random() * 100) + 50, // Mock endorsements
      connections: Math.floor(Math.random() * 500) + 100, // Mock connections
      headline: user.bio || 'Software Developer',
      location: user.location || 'Remote',
    };

    res.json({
      success: true,
      data: { profile: linkedinProfile },
    });
  } catch (error) {
    console.error('LinkedIn profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching LinkedIn profile',
    });
  }
});

module.exports = router;
