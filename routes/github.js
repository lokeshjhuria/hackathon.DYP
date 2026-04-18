const express = require('express');
const { Octokit } = require('@octokit/rest');
const axios = require('axios');
const auth = require('../middleware/auth');
const router = express.Router();

// Initialize GitHub API client
const getOctokit = () => {
  return new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
};

// @route   GET /api/github/user/:username
// @desc    Get GitHub user profile
router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const octokit = getOctokit();

    // Get user profile
    const { data: user } = await octokit.rest.users.getByUsername({
      username,
    });

    // Get user repositories
    const { data: repos } = await octokit.rest.repos.listForUser({
      username,
      sort: 'updated',
      per_page: 100,
    });

    // Filter out forked repos and get detailed info for top repos
    const originalRepos = repos.filter(repo => !repo.fork);
    const topRepos = originalRepos.slice(0, 10);

    // Get detailed repository information
    const detailedRepos = await Promise.all(
      topRepos.map(async (repo) => {
        try {
          const [languagesResponse, commitsResponse, contributorsResponse] = await Promise.all([
            octokit.rest.repos.listLanguages({
              owner: username,
              repo: repo.name,
            }),
            octokit.rest.repos.listCommits({
              owner: username,
              repo: repo.name,
              per_page: 1,
            }),
            octokit.rest.repos.listContributors({
              owner: username,
              repo: repo.name,
              per_page: 10,
            }),
          ]);

          return {
            ...repo,
            languages: Object.keys(languagesResponse.data),
            lastCommit: commitsResponse.data[0]?.commit?.committer?.date,
            contributors: contributorsResponse.data.length,
          };
        } catch (error) {
          console.error(`Error fetching details for ${repo.name}:`, error);
          return repo;
        }
      })
    );

    // Calculate user statistics
    const totalStars = originalRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const totalForks = originalRepos.reduce((sum, repo) => sum + repo.forks_count, 0);
    const languages = new Set();
    
    detailedRepos.forEach(repo => {
      if (repo.languages) {
        repo.languages.forEach(lang => languages.add(lang));
      }
    });

    const profile = {
      login: user.login,
      name: user.name,
      bio: user.bio,
      location: user.location,
      website: user.blog,
      avatar: user.avatar_url,
      followers: user.followers,
      following: user.following,
      publicRepos: user.public_repos,
      totalStars,
      totalForks,
      languages: Array.from(languages),
      repositories: detailedRepos,
      createdAt: user.created_at,
      lastActive: user.updated_at,
    };

    res.json({
      success: true,
      data: { profile },
    });
  } catch (error) {
    console.error('GitHub user fetch error:', error);
    
    if (error.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'GitHub user not found',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching GitHub profile',
    });
  }
});

// @route   GET /api/github/repo/:owner/:repo
// @desc    Get detailed repository information
router.get('/repo/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const octokit = getOctokit();

    // Get repository details
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    });

    // Get repository content
    const { data: contents } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '',
    });

    // Get commits
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 100,
    });

    // Get languages
    const { data: languages } = await octokit.rest.repos.listLanguages({
      owner,
      repo,
    });

    // Get contributors
    const { data: contributors } = await octokit.rest.repos.listContributors({
      owner,
      repo,
      per_page: 10,
    });

    // Get README
    let readme = '';
    try {
      const { data: readmeData } = await octokit.rest.repos.getReadme({
        owner,
        repo,
      });
      readme = Buffer.from(readmeData.content, 'base64').toString('utf-8');
    } catch (error) {
      console.log('No README found');
    }

    const repository = {
      ...repoData,
      languages: Object.keys(languages),
      languageStats: languages,
      contributors: contributors.length,
      recentCommits: commits.slice(0, 10),
      readme,
      hasWiki: repoData.has_wiki,
      hasPages: repoData.has_pages,
      hasIssues: repoData.open_issues_count > 0,
      hasDiscussions: repoData.has_discussions,
    };

    res.json({
      success: true,
      data: { repository },
    });
  } catch (error) {
    console.error('GitHub repo fetch error:', error);
    
    if (error.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'Repository not found',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching repository details',
    });
  }
});

// @route   GET /api/github/repo/:owner/:repo/contents/:path
// @desc    Get file contents from repository
router.get('/repo/:owner/:repo/contents/*', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const path = req.params[0] || ''; // Get everything after /contents/

    const octokit = getOctokit();

    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    let content = data;
    
    // If it's a file, decode the content
    if (data.type === 'file' && data.content) {
      content = {
        ...data,
        content: Buffer.from(data.content, 'base64').toString('utf-8'),
      };
    }

    res.json({
      success: true,
      data: { content },
    });
  } catch (error) {
    console.error('GitHub content fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching file contents',
    });
  }
});

// @route   POST /api/github/analyze
// @desc    Analyze GitHub repository
router.post('/analyze', auth, async (req, res) => {
  try {
    const { username, repository } = req.body;

    if (!username || !repository) {
      return res.status(400).json({
        success: false,
        message: 'Username and repository are required',
      });
    }

    // This would trigger an analysis job
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'GitHub analysis started',
      data: {
        analysisId: 'github-analysis-placeholder',
        status: 'processing',
      },
    });
  } catch (error) {
    console.error('GitHub analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting GitHub analysis',
    });
  }
});

// @route   GET /api/github/search
// @desc    Search GitHub repositories
router.get('/search', async (req, res) => {
  try {
    const { q, language, sort = 'stars', order = 'desc', page = 1 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const octokit = getOctokit();

    // Build search query
    let searchQuery = q;
    if (language) {
      searchQuery += ` language:${language}`;
    }

    const { data: searchResults } = await octokit.rest.search.repos({
      q: searchQuery,
      sort,
      order,
      per_page: 20,
      page: parseInt(page),
    });

    res.json({
      success: true,
      data: {
        repositories: searchResults.items,
        totalCount: searchResults.total_count,
        page: parseInt(page),
      },
    });
  } catch (error) {
    console.error('GitHub search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching repositories',
    });
  }
});

// @route   GET /api/github/profile
// @desc    Get current user's GitHub profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user || !user.githubUsername) {
      return res.status(404).json({
        success: false,
        message: 'GitHub profile not linked',
      });
    }

    const response = await getGitHubProfile(user.githubUsername);
    
    res.json({
      success: true,
      data: { profile: response },
    });
  } catch (error) {
    console.error('GitHub profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching GitHub profile',
    });
  }
});

module.exports = router;
