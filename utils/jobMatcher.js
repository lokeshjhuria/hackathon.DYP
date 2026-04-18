const axios = require('axios');

// Live job matching engine with real job board integration
class JobMatchingEngine {
  constructor() {
    this.jobBoards = {
      github: {
        baseUrl: 'https://jobs.github.com/positions.json',
        name: 'GitHub Jobs'
      },
      indeed: {
        baseUrl: 'https://api.indeed.com/ads/apisearch',
        name: 'Indeed'
      },
      linkedin: {
        baseUrl: 'https://api.linkedin.com/v2/jobSearch',
        name: 'LinkedIn Jobs'
      }
    };
    
    this.skillMapping = this.initializeSkillMapping();
    this.jobTemplates = this.getJobTemplates();
  }

  // Initialize skill mapping for better matching
  initializeSkillMapping() {
    return {
      'JavaScript': ['javascript', 'js', 'ecmascript', 'es6', 'es7'],
      'TypeScript': ['typescript', 'ts'],
      'React': ['react', 'reactjs', 'react.js'],
      'Vue': ['vue', 'vuejs', 'vue.js'],
      'Angular': ['angular', 'angularjs'],
      'Node.js': ['node', 'nodejs', 'node.js'],
      'Python': ['python', 'django', 'flask'],
      'Java': ['java', 'spring', 'jsp'],
      'C#': ['c#', 'csharp', '.net'],
      'Docker': ['docker', 'containers'],
      'Kubernetes': ['kubernetes', 'k8s'],
      'AWS': ['aws', 'amazon web services'],
      'SQL': ['sql', 'database', 'mysql', 'postgresql'],
      'MongoDB': ['mongodb', 'nosql'],
      'Git': ['git', 'version control']
    };
  }

  // Main job matching function
  async generateJobMatches(analysis, skillScores = null) {
    try {
      const jobMatches = [];
      
      // Extract verified skills from analysis or skill scores
      const verifiedSkills = skillScores ? 
        Object.entries(skillScores).map(([skill, data]) => ({
          name: skill,
          score: data.score,
          verified: data.verified
        })).filter(s => s.verified && s.score >= 6) :
        analysis.technologies.map(tech => ({
          name: tech.name,
          score: tech.proficiency || 7,
          verified: true
        }));

      // Determine experience level from analysis
      const experienceLevel = this.determineExperienceLevel(analysis.overallScore);
      
      // Get live job postings
      const liveJobs = await this.fetchLiveJobs(verifiedSkills, experienceLevel);
      
      // Match against job templates
      const templateMatches = this.matchWithTemplates(analysis, verifiedSkills, experienceLevel);
      
      // Combine and rank all matches
      const allMatches = [...liveJobs, ...templateMatches];
      const rankedMatches = this.rankJobMatches(allMatches, verifiedSkills, analysis);
      
      // Return top matches with detailed information
      return rankedMatches.slice(0, 10);
    } catch (error) {
      console.error('Job matching error:', error);
      return this.getFallbackMatches(analysis);
    }
  }

  // Fetch live jobs from multiple job boards
  async fetchLiveJobs(skills, experienceLevel) {
    const liveJobs = [];
    
    try {
      // GitHub Jobs API (free and public)
      const githubJobs = await this.fetchGitHubJobs(skills, experienceLevel);
      liveJobs.push(...githubJobs);
      
      // Indeed Jobs API (would require API key)
      if (process.env.INDEED_API_KEY) {
        const indeedJobs = await this.fetchIndeedJobs(skills, experienceLevel);
        liveJobs.push(...indeedJobs);
      }
      
      // LinkedIn Jobs API (would require API key)
      if (process.env.LINKEDIN_API_KEY) {
        const linkedinJobs = await this.fetchLinkedInJobs(skills, experienceLevel);
        liveJobs.push(...linkedinJobs);
      }
    } catch (error) {
      console.error('Error fetching live jobs:', error);
    }
    
    return liveJobs;
  }

  // Fetch jobs from GitHub Jobs API
  async fetchGitHubJobs(skills, experienceLevel) {
    try {
      const skillKeywords = skills.map(skill => skill.name).join(' ');
      const response = await axios.get('https://jobs.github.com/positions.json', {
        params: {
          description: skillKeywords,
          full_time: true,
          location: 'remote'
        },
        timeout: 10000
      });
      
      return response.data.map(job => ({
        source: 'GitHub Jobs',
        jobTitle: job.title,
        company: job.company,
        matchScore: this.calculateLiveMatchScore(skills, job),
        requiredSkills: this.extractSkillsFromDescription(job.description),
        missingSkills: this.findMissingSkills(skills, job.description),
        salary: this.extractSalaryFromDescription(job.description),
        location: job.location,
        url: job.url,
        description: job.description,
        postedDate: job.created_at,
        type: job.type,
        isLive: true
      }));
    } catch (error) {
      console.error('GitHub Jobs API error:', error);
      return [];
    }
  }

  // Fetch jobs from Indeed API
  async fetchIndeedJobs(skills, experienceLevel) {
    try {
      const skillKeywords = skills.map(skill => skill.name).join(' ');
      const response = await axios.get('https://api.indeed.com/ads/apisearch', {
        params: {
          publisher: process.env.INDEED_API_KEY,
          q: skillKeywords,
          l: 'remote',
          sort: 'date',
          limit: 25,
          format: 'json',
          v: '2'
        },
        timeout: 10000
      });
      
      return response.data.results.map(job => ({
        source: 'Indeed',
        jobTitle: job.jobtitle,
        company: job.company,
        matchScore: this.calculateLiveMatchScore(skills, job),
        requiredSkills: this.extractSkillsFromDescription(job.snippet),
        missingSkills: this.findMissingSkills(skills, job.snippet),
        salary: job.formattedSalary || 'Not specified',
        location: job.formattedLocation,
        url: job.url,
        description: job.snippet,
        postedDate: job.date,
        isLive: true
      }));
    } catch (error) {
      console.error('Indeed API error:', error);
      return [];
    }
  }

  // Match with job templates for comprehensive coverage
  matchWithTemplates(analysis, verifiedSkills, experienceLevel) {
    const templateMatches = [];
    
    this.jobTemplates.forEach(template => {
      const matchScore = this.calculateTemplateMatchScore(verifiedSkills, analysis, template);
      
      if (matchScore >= 0.5) { // 50% match threshold for templates
        const missingSkills = this.findMissingTemplateSkills(verifiedSkills, template);
        
        templateMatches.push({
          source: 'Template Match',
          jobTitle: template.title,
          company: this.generateRandomCompany(),
          matchScore: Math.round(matchScore * 100) / 100,
          requiredSkills: template.requiredSkills,
          missingSkills: missingSkills,
          salary: template.salary[experienceLevel],
          location: template.location,
          url: this.generateJobUrl(template.title),
          description: template.description,
          isLive: false,
          matchReasons: this.getMatchReasons(verifiedSkills, template),
          skillAlignment: this.getSkillAlignment(verifiedSkills, template)
        });
      }
    });
    
    return templateMatches;
  }

  // Calculate match score for live job postings
  calculateLiveMatchScore(skills, job) {
    let score = 0;
    let factors = 0;
    
    // Title matching (30% weight)
    const titleScore = this.calculateTitleMatch(skills, job.title || job.jobtitle);
    score += titleScore * 0.3;
    factors += 0.3;
    
    // Description matching (50% weight)
    const descriptionScore = this.calculateDescriptionMatch(skills, job.description || job.snippet);
    score += descriptionScore * 0.5;
    factors += 0.5;
    
    // Location preference (20% weight)
    const locationScore = (job.location || '').toLowerCase().includes('remote') ? 1 : 0.7;
    score += locationScore * 0.2;
    factors += 0.2;
    
    return factors > 0 ? score / factors : 0;
  }

  // Calculate title match score
  calculateTitleMatch(skills, title) {
    if (!title) return 0;
    
    const titleLower = title.toLowerCase();
    let matchScore = 0;
    
    skills.forEach(skill => {
      const skillVariants = this.skillMapping[skill.name] || [skill.name.toLowerCase()];
      skillVariants.forEach(variant => {
        if (titleLower.includes(variant)) {
          matchScore += skill.score / 10;
        }
      });
    });
    
    return Math.min(matchScore / skills.length, 1);
  }

  // Calculate description match score
  calculateDescriptionMatch(skills, description) {
    if (!description) return 0;
    
    const descLower = description.toLowerCase();
    let matchScore = 0;
    
    skills.forEach(skill => {
      const skillVariants = this.skillMapping[skill.name] || [skill.name.toLowerCase()];
      skillVariants.forEach(variant => {
        if (descLower.includes(variant)) {
          matchScore += skill.score / 10;
        }
      });
    });
    
    return Math.min(matchScore / skills.length, 1);
  }

  // Calculate template match score
  calculateTemplateMatchScore(verifiedSkills, analysis, template) {
    let score = 0;
    let factors = 0;
    
    // Skill matching (50% weight)
    const skillMatch = this.calculateSkillMatch(verifiedSkills, template.requiredSkills);
    score += skillMatch * 0.5;
    factors += 0.5;
    
    // Experience level matching (30% weight)
    const experienceLevel = this.determineExperienceLevel(analysis.overallScore);
    const experienceMatch = template.experienceLevels.includes(experienceLevel) ? 1 : 0.5;
    score += experienceMatch * 0.3;
    factors += 0.3;
    
    // Category scores (20% weight)
    const categoryScore = this.getCategoryScore(analysis.categories);
    score += categoryScore * 0.2;
    factors += 0.2;
    
    return factors > 0 ? score / factors : 0;
  }

  // Calculate skill match percentage
  calculateSkillMatch(userSkills, requiredSkills) {
    if (requiredSkills.length === 0) return 0;
    
    let matches = 0;
    requiredSkills.forEach(requiredSkill => {
      const hasSkill = userSkills.some(userSkill => {
        const skillVariants = this.skillMapping[requiredSkill] || [requiredSkill.toLowerCase()];
        return skillVariants.some(variant => 
          userSkill.name.toLowerCase().includes(variant) || 
          variant.includes(userSkill.name.toLowerCase())
        );
      });
      if (hasSkill) matches++;
    });
    
    return matches / requiredSkills.length;
  }

  // Rank job matches by comprehensive scoring
  rankJobMatches(matches, skills, analysis) {
    return matches.map(match => ({
      ...match,
      overallScore: this.calculateOverallScore(match, skills, analysis),
      recommendations: this.generateJobRecommendations(match, skills),
      applicationTips: this.generateApplicationTips(match, skills)
    })).sort((a, b) => b.overallScore - a.overallScore);
  }

  // Calculate overall match score
  calculateOverallScore(match, skills, analysis) {
    let score = match.matchScore || 0;
    
    // Bonus for live jobs
    if (match.isLive) score += 0.1;
    
    // Bonus for salary transparency
    if (match.salary && !match.salary.includes('Not specified')) score += 0.05;
    
    // Bonus for remote work
    if (match.location && match.location.toLowerCase().includes('remote')) score += 0.05;
    
    return Math.min(score, 1);
  }

  // Generate job recommendations
  generateJobRecommendations(match, skills) {
    const recommendations = [];
    
    if (match.missingSkills && match.missingSkills.length > 0) {
      recommendations.push({
        type: 'skill_gap',
        message: `Consider learning: ${match.missingSkills.join(', ')}`,
        priority: 'medium'
      });
    }
    
    if (match.matchScore >= 0.8) {
      recommendations.push({
        type: 'high_match',
        message: 'Excellent match! Apply immediately.',
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  // Generate application tips
  generateApplicationTips(match, skills) {
    const tips = [];
    
    const matchingSkills = skills.filter(skill => 
      !match.missingSkills || !match.missingSkills.includes(skill.name)
    );
    
    if (matchingSkills.length > 0) {
      tips.push(`Highlight your expertise in: ${matchingSkills.map(s => s.name).join(', ')}`);
    }
    
    if (match.isLive) {
      tips.push('Apply quickly - this is a live posting!');
    }
    
    return tips;
  }

  // Helper functions
  determineExperienceLevel(score) {
    if (score >= 8.5) return 'senior';
    if (score >= 7) return 'mid';
    if (score >= 5) return 'junior';
    return 'entry';
  }

  getCategoryScore(categories) {
    const scores = [
      categories.codeQuality?.score || 0,
      categories.architecture?.score || 0,
      categories.security?.score || 0,
      categories.performance?.score || 0
    ];
    return scores.reduce((sum, score) => sum + score, 0) / scores.length / 10;
  }

  extractSkillsFromDescription(description) {
    if (!description) return [];
    
    const skills = [];
    Object.entries(this.skillMapping).forEach(([skill, variants]) => {
      variants.forEach(variant => {
        if (description.toLowerCase().includes(variant)) {
          if (!skills.includes(skill)) skills.push(skill);
        }
      });
    });
    
    return skills;
  }

  findMissingSkills(userSkills, description) {
    const userSkillNames = userSkills.map(s => s.name.toLowerCase());
    const requiredSkills = this.extractSkillsFromDescription(description);
    
    return requiredSkills.filter(skill => 
      !userSkillNames.some(userSkill => 
        userSkill.includes(skill.toLowerCase()) || 
        skill.toLowerCase().includes(userSkill)
      )
    );
  }

  findMissingTemplateSkills(userSkills, template) {
    const userSkillNames = userSkills.map(s => s.name.toLowerCase());
    
    return template.requiredSkills.filter(skill => 
      !userSkillNames.some(userSkill => 
        userSkill.includes(skill.toLowerCase()) || 
        skill.toLowerCase().includes(userSkill)
      )
    );
  }

  extractSalaryFromDescription(description) {
    if (!description) return 'Not specified';
    
    const salaryRegex = /\$[\d,]+.*?[\d,]*/gi;
    const match = description.match(salaryRegex);
    return match ? match[0] : 'Not specified';
  }

  generateRandomCompany() {
    const companies = [
      'TechCorp Solutions', 'Digital Innovations Inc', 'CloudTech Systems',
      'DataDriven Analytics', 'DevOps Engineering', 'StartupHub Technologies',
      'Enterprise Software Co', 'MobileFirst Development', 'AI Solutions Ltd',
      'WebCraft Agency', 'CodeBase Technologies', 'NextGen Systems'
    ];
    return companies[Math.floor(Math.random() * companies.length)];
  }

  generateJobUrl(title, company = null) {
    const baseUrl = 'https://example.com/jobs';
    const encodedTitle = encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'));
    const companyParam = company ? `?company=${encodeURIComponent(company)}` : '';
    return `${baseUrl}/${encodedTitle}${companyParam}`;
  }

  getMatchReasons(skills, template) {
    const reasons = [];
    
    skills.forEach(skill => {
      if (template.requiredSkills.includes(skill.name)) {
        reasons.push(`Strong match in ${skill.name} (score: ${skill.score}/10)`);
      }
    });
    
    return reasons;
  }

  getSkillAlignment(skills, template) {
    const alignment = {
      matched: [],
      partial: [],
      missing: []
    };
    
    template.requiredSkills.forEach(requiredSkill => {
      const userSkill = skills.find(s => s.name === requiredSkill);
      if (userSkill) {
        if (userSkill.score >= 7) {
          alignment.matched.push(requiredSkill);
        } else {
          alignment.partial.push(requiredSkill);
        }
      } else {
        alignment.missing.push(requiredSkill);
      }
    });
    
    return alignment;
  }

  // Fallback matches when APIs fail
  getFallbackMatches(analysis) {
    const skills = analysis.technologies.map(tech => tech.name);
    const experienceLevel = this.determineExperienceLevel(analysis.overallScore);
    
    return this.jobTemplates
      .filter(template => this.calculateSkillMatch(skills, template.requiredSkills) >= 0.5)
      .slice(0, 5)
      .map(template => ({
        source: 'Template Match',
        jobTitle: template.title,
        company: this.generateRandomCompany(),
        matchScore: 0.7,
        requiredSkills: template.requiredSkills,
        missingSkills: this.findMissingTemplateSkills(skills, template),
        salary: template.salary[experienceLevel],
        location: template.location,
        url: this.generateJobUrl(template.title),
        isLive: false
      }));
  }

  // Get job templates
  getJobTemplates() {
    return [
      {
        title: 'Frontend Developer',
        requiredSkills: ['JavaScript', 'React', 'CSS', 'HTML', 'TypeScript'],
        experienceLevels: ['entry', 'junior', 'mid', 'senior'],
        salary: {
          entry: '$50,000 - $70,000',
          junior: '$70,000 - $90,000',
          mid: '$90,000 - $120,000',
          senior: '$120,000 - $160,000',
        },
        location: 'Remote / San Francisco / New York',
        description: 'Build responsive web applications using modern frontend technologies'
      },
      {
        title: 'Backend Developer',
        requiredSkills: ['Node.js', 'Python', 'Java', 'Database', 'API'],
        experienceLevels: ['junior', 'mid', 'senior'],
        salary: {
          entry: '$55,000 - $75,000',
          junior: '$75,000 - $95,000',
          mid: '$95,000 - $130,000',
          senior: '$130,000 - $170,000',
        },
        location: 'Remote / Seattle / Austin',
        description: 'Develop server-side applications and APIs'
      },
      {
        title: 'Full Stack Developer',
        requiredSkills: ['JavaScript', 'React', 'Node.js', 'Database', 'API'],
        experienceLevels: ['junior', 'mid', 'senior'],
        salary: {
          entry: '$60,000 - $80,000',
          junior: '$80,000 - $110,000',
          mid: '$110,000 - $150,000',
          senior: '$150,000 - $200,000',
        },
        location: 'Remote / Multiple Locations',
        description: 'Work on both frontend and backend development'
      },
      {
        title: 'DevOps Engineer',
        requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'],
        experienceLevels: ['mid', 'senior'],
        salary: {
          entry: '$70,000 - $90,000',
          junior: '$90,000 - $120,000',
          mid: '$120,000 - $160,000',
          senior: '$160,000 - $200,000',
        },
        location: 'Remote / Cloud-first Companies',
        description: 'Manage cloud infrastructure and deployment pipelines'
      },
      {
        title: 'Mobile Developer',
        requiredSkills: ['React Native', 'Flutter', 'iOS', 'Android', 'JavaScript'],
        experienceLevels: ['junior', 'mid', 'senior'],
        salary: {
          entry: '$65,000 - $85,000',
          junior: '$85,000 - $115,000',
          mid: '$115,000 - $145,000',
          senior: '$145,000 - $185,000',
        },
        location: 'Remote / Tech Hubs',
        description: 'Develop mobile applications for iOS and Android'
      }
    ];
  }
}

// Export the enhanced job matching function
async function generateJobMatches(analysis, skillScores = null) {
  const engine = new JobMatchingEngine();
  return await engine.generateJobMatches(analysis, skillScores);
}

module.exports = { generateJobMatches, JobMatchingEngine };

function determineExperienceLevel(score) {
  if (score >= 8.5) return 'senior';
  if (score >= 7) return 'mid';
  if (score >= 5) return 'junior';
  return 'entry';
}

function calculateMatchScore(analysis, template) {
  let score = 0;
  let factors = 0;
  
  // Skill matching (40% weight)
  const userSkills = analysis.technologies.map(tech => tech.name.toLowerCase());
  const requiredSkills = template.requiredSkills.map(skill => skill.toLowerCase());
  
  const matchingSkills = userSkills.filter(skill => 
    requiredSkills.some(req => req.includes(skill) || skill.includes(req))
  );
  
  const skillMatchRatio = matchingSkills.length / Math.max(requiredSkills.length, 1);
  score += skillMatchRatio * 0.4;
  factors += 0.4;
  
  // Category scores (30% weight)
  const categoryScores = [
    analysis.categories.codeQuality?.score || 0,
    analysis.categories.architecture?.score || 0,
    analysis.categories.security?.score || 0,
    analysis.categories.performance?.score || 0,
  ];
  
  const avgCategoryScore = categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length;
  score += (avgCategoryScore / 10) * 0.3;
  factors += 0.3;
  
  // Experience level matching (20% weight)
  const experienceLevel = determineExperienceLevel(analysis.overallScore);
  const experienceMatch = template.experienceLevels.includes(experienceLevel) ? 1 : 0.5;
  score += experienceMatch * 0.2;
  factors += 0.2;
  
  // Overall score bonus (10% weight)
  score += (analysis.overallScore / 10) * 0.1;
  factors += 0.1;
  
  return factors > 0 ? score / factors : 0;
}

function findMissingSkills(userSkills, requiredSkills) {
  const userSkillsLower = userSkills.map(skill => skill.toLowerCase());
  const requiredSkillsLower = requiredSkills.map(skill => skill.toLowerCase());
  
  return requiredSkills.filter(skill => 
    !userSkillsLower.some(userSkill => 
      userSkill.includes(skill.toLowerCase()) || skill.toLowerCase().includes(userSkill)
    )
  );
}

function getJobTemplates() {
  return [
    {
      title: 'Frontend Developer',
      requiredSkills: ['JavaScript', 'React', 'CSS', 'HTML', 'TypeScript'],
      experienceLevels: ['entry', 'junior', 'mid', 'senior'],
      salary: {
        entry: '$50,000 - $70,000',
        junior: '$70,000 - $90,000',
        mid: '$90,000 - $120,000',
        senior: '$120,000 - $160,000',
      },
      location: 'Remote / San Francisco / New York',
    },
    {
      title: 'Backend Developer',
      requiredSkills: ['Node.js', 'Python', 'Java', 'Database', 'API'],
      experienceLevels: ['junior', 'mid', 'senior'],
      salary: {
        entry: '$55,000 - $75,000',
        junior: '$75,000 - $95,000',
        mid: '$95,000 - $130,000',
        senior: '$130,000 - $170,000',
      },
      location: 'Remote / Seattle / Austin',
    },
    {
      title: 'Full Stack Developer',
      requiredSkills: ['JavaScript', 'React', 'Node.js', 'Database', 'API'],
      experienceLevels: ['junior', 'mid', 'senior'],
      salary: {
        entry: '$60,000 - $80,000',
        junior: '$80,000 - $110,000',
        mid: '$110,000 - $150,000',
        senior: '$150,000 - $200,000',
      },
      location: 'Remote / Multiple Locations',
    },
    {
      title: 'DevOps Engineer',
      requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'],
      experienceLevels: ['mid', 'senior'],
      salary: {
        entry: '$70,000 - $90,000',
        junior: '$90,000 - $120,000',
        mid: '$120,000 - $160,000',
        senior: '$160,000 - $200,000',
      },
      location: 'Remote / Cloud-first Companies',
    },
    {
      title: 'Mobile Developer',
      requiredSkills: ['React Native', 'Flutter', 'iOS', 'Android', 'JavaScript'],
      experienceLevels: ['junior', 'mid', 'senior'],
      salary: {
        entry: '$65,000 - $85,000',
        junior: '$85,000 - $115,000',
        mid: '$115,000 - $145,000',
        senior: '$145,000 - $185,000',
      },
      location: 'Remote / Tech Hubs',
    },
    {
      title: 'Software Engineer',
      requiredSkills: ['JavaScript', 'Python', 'Java', 'Algorithms', 'Data Structures'],
      experienceLevels: ['entry', 'junior', 'mid', 'senior'],
      salary: {
        entry: '$55,000 - $75,000',
        junior: '$75,000 - $100,000',
        mid: '$100,000 - $140,000',
        senior: '$140,000 - $190,000',
      },
      location: 'Remote / Major Tech Cities',
    },
    {
      title: 'UI/UX Developer',
      requiredSkills: ['JavaScript', 'CSS', 'React', 'Design Systems', 'Accessibility'],
      experienceLevels: ['junior', 'mid', 'senior'],
      salary: {
        entry: '$50,000 - $70,000',
        junior: '$70,000 - $90,000',
        mid: '$90,000 - $120,000',
        senior: '$120,000 - $150,000',
      },
      location: 'Remote / Design-focused Companies',
    },
    {
      title: 'Data Engineer',
      requiredSkills: ['Python', 'SQL', 'ETL', 'Big Data', 'Cloud'],
      experienceLevels: ['mid', 'senior'],
      salary: {
        entry: '$70,000 - $90,000',
        junior: '$90,000 - $120,000',
        mid: '$120,000 - $160,000',
        senior: '$160,000 - $210,000',
      },
      location: 'Remote / Data-driven Companies',
    },
  ];
}

function generateRandomCompany() {
  const companies = [
    'TechCorp Solutions',
    'Digital Innovations Inc',
    'CloudFirst Technologies',
    'DataDriven Systems',
    'NextGen Software',
    'FutureProof Apps',
    'SmartTech Development',
    'Innovation Labs',
    'CodeCraft Studios',
    'PixelPerfect Solutions',
    'AgileMind Technologies',
    'DevOps Masters',
    'FullStack Factory',
    'CloudNative Systems',
    'AI First Development',
  ];
  
  return companies[Math.floor(Math.random() * companies.length)];
}

function generateJobUrl(jobTitle, company) {
  const baseUrl = 'https://example.com/jobs';
  const slug = `${jobTitle.toLowerCase().replace(/\s+/g, '-')}-${company.toLowerCase().replace(/\s+/g, '-')}`;
  return `${baseUrl}/${slug}`;
}

// Generate learning recommendations based on skill gaps
function generateLearningRecommendations(analysis, jobMatches) {
  const recommendations = [];
  const userSkills = analysis.technologies.map(tech => tech.name.toLowerCase());
  
  // Find common missing skills across job matches
  const missingSkills = new Set();
  jobMatches.forEach(match => {
    match.missingSkills.forEach(skill => missingSkills.add(skill));
  });
  
  // Generate learning resources for missing skills
  missingSkills.forEach(skill => {
    const resources = generateLearningResources(skill);
    recommendations.push({
      priority: 'high',
      category: 'Skill Development',
      title: `Learn ${skill}`,
      description: `Master ${skill} to unlock more job opportunities`,
      resources,
    });
  });
  
  // Add recommendations based on weak areas
  Object.keys(analysis.categories).forEach(category => {
    const score = analysis.categories[category].score;
    if (score < 6) {
      recommendations.push({
        priority: score < 4 ? 'high' : 'medium',
        category: 'Improvement Area',
        title: `Improve ${category.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
        description: `Focus on ${category.replace(/([A-Z])/g, ' $1').toLowerCase()} to increase your overall score`,
        resources: generateCategoryResources(category),
      });
    }
  });
  
  return recommendations;
}

function generateLearningResources(skill) {
  const resources = [
    {
      type: 'course',
      title: `${skill} - Complete Course`,
      url: `https://example.com/courses/${skill.toLowerCase()}`,
      difficulty: 'intermediate',
    },
    {
      type: 'documentation',
      title: `Official ${skill} Documentation`,
      url: `https://docs.example.com/${skill.toLowerCase()}`,
      difficulty: 'beginner',
    },
    {
      type: 'video',
      title: `${skill} Tutorial Series`,
      url: `https://example.com/videos/${skill.toLowerCase()}`,
      difficulty: 'beginner',
    },
  ];
  
  return resources;
}

function generateCategoryResources(category) {
  const categoryResources = {
    codeQuality: [
      {
        type: 'course',
        title: 'Clean Code Principles',
        url: 'https://example.com/courses/clean-code',
        difficulty: 'intermediate',
      },
      {
        type: 'article',
        title: 'Writing Maintainable Code',
        url: 'https://example.com/articles/maintainable-code',
        difficulty: 'beginner',
      },
    ],
    security: [
      {
        type: 'course',
        title: 'Web Security Fundamentals',
        url: 'https://example.com/courses/web-security',
        difficulty: 'intermediate',
      },
      {
        type: 'documentation',
        title: 'OWASP Security Guidelines',
        url: 'https://owasp.org/',
        difficulty: 'advanced',
      },
    ],
    performance: [
      {
        type: 'course',
        title: 'Web Performance Optimization',
        url: 'https://example.com/courses/performance',
        difficulty: 'intermediate',
      },
      {
        type: 'article',
        title: 'Performance Best Practices',
        url: 'https://example.com/articles/performance',
        difficulty: 'beginner',
      },
    ],
  };
  
  return categoryResources[category] || generateLearningResources(category);
}

module.exports = {
  generateJobMatches,
  generateLearningRecommendations,
};
