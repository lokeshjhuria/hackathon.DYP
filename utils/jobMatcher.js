// Job matching utility for finding relevant positions based on analysis results

async function generateJobMatches(analysis) {
  try {
    const jobMatches = [];
    
    // Extract skills and experience level from analysis
    const skills = analysis.technologies.map(tech => tech.name);
    const experienceLevel = determineExperienceLevel(analysis.overallScore);
    const categories = analysis.categories;
    
    // Define job templates based on common developer roles
    const jobTemplates = getJobTemplates();
    
    // Match against job templates
    jobTemplates.forEach(template => {
      const matchScore = calculateMatchScore(analysis, template);
      
      if (matchScore >= 0.6) { // 60% match threshold
        jobMatches.push({
          jobTitle: template.title,
          company: generateRandomCompany(),
          matchScore: Math.round(matchScore * 100) / 100,
          requiredSkills: template.requiredSkills,
          missingSkills: findMissingSkills(skills, template.requiredSkills),
          salary: template.salary[experienceLevel],
          location: template.location,
          url: generateJobUrl(template.title, generateRandomCompany()),
        });
      }
    });
    
    // Sort by match score
    jobMatches.sort((a, b) => b.matchScore - a.matchScore);
    
    // Return top 5 matches
    return jobMatches.slice(0, 5);
  } catch (error) {
    console.error('Job matching error:', error);
    return [];
  }
}

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
