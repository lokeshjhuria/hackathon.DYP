const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password',
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Create user
    const user = new User({
      username,
      email,
      password,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          githubUsername: user.githubUsername,
          stats: user.stats,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
router.get('/me', auth, async (req, res) => {
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
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const {
      username,
      bio,
      location,
      website,
      careerGoals,
      skills,
    } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update fields
    if (username) user.username = username;
    if (bio) user.bio = bio;
    if (location) user.location = location;
    if (website) user.website = website;
    if (careerGoals) user.careerGoals = careerGoals;
    if (skills) user.skills = skills;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update',
    });
  }
});

// @route   POST /api/auth/github
// @desc    Authenticate with GitHub
router.post('/github', async (req, res) => {
  try {
    const { githubId, githubUsername, email, name, avatar } = req.body;

    // Find or create user
    let user = await User.findOne({ githubId });

    if (!user) {
      // Check if email already exists
      user = await User.findOne({ email });
      
      if (user) {
        // Link GitHub to existing account
        user.githubId = githubId;
        user.githubUsername = githubUsername;
        user.avatar = avatar;
      } else {
        // Create new user
        user = new User({
          username: githubUsername,
          email,
          githubId,
          githubUsername,
          avatar,
        });
      }
    } else {
      // Update existing GitHub user
      user.githubUsername = githubUsername;
      user.avatar = avatar;
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'GitHub authentication successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          githubUsername: user.githubUsername,
        },
      },
    });
  } catch (error) {
    console.error('GitHub auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during GitHub authentication',
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
router.post('/logout', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

module.exports = router;
