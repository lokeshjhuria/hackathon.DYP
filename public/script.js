// Smooth scrolling functionality
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Navigation scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.8s ease forwards';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.problem-card, .feature-card, .step');
    animatedElements.forEach(el => observer.observe(el));
});

// Analysis wheel interaction
const wheelSegments = document.querySelectorAll('.wheel-segment');
wheelSegments.forEach(segment => {
    segment.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
        this.style.background = 'var(--primary-color)';
        this.style.color = 'white';
    });
    
    segment.addEventListener('mouseleave', function() {
        this.style.transform = '';
        this.style.background = '';
        this.style.color = '';
    });
});

// Toggle problem card details
function toggleProblemDetail(detailId) {
    const detail = document.getElementById(detailId);
    const card = detail.closest('.problem-card');
    const allDetails = document.querySelectorAll('.problem-detail');
    const allCards = document.querySelectorAll('.problem-card');
    
    // Close all other details
    allDetails.forEach(otherDetail => {
        if (otherDetail.id !== detailId) {
            otherDetail.classList.remove('show');
            otherDetail.closest('.problem-card').classList.remove('expanded');
        }
    });
    
    // Toggle current detail
    if (detail.classList.contains('show')) {
        detail.classList.remove('show');
        card.classList.remove('expanded');
    } else {
        detail.classList.add('show');
        card.classList.add('expanded');
        
        // Smooth scroll to the card if it's partially out of view
        setTimeout(() => {
            const rect = card.getBoundingClientRect();
            const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
            
            if (!isInViewport) {
                card.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
        }, 100);
    }
}

// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-api-domain.com/api' 
  : 'http://localhost:5000/api';

// Store auth token - initialize safely
let authToken = null;

// Initialize auth token when DOM is ready
function initializeAuthToken() {
  authToken = safeLocalStorageGet('opentrack_token');
  console.log('Auth token initialized:', authToken ? 'found' : 'not found');
}

// Enhanced form submission handler
async function startAnalysis() {
    const input = document.getElementById('userInput');
    const value = input.value.trim();
    
    if (!value) {
        showNotification('Please enter your GitHub username or project URL', 'warning');
        return;
    }
    
    // Show loading state
    const submitButton = document.querySelector('.cta-submit');
    const originalContent = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    submitButton.disabled = true;
    
    try {
        console.log('Starting analysis with input:', value);
        
        // Check if server is running
        const healthCheck = await checkServerHealth();
        if (!healthCheck) {
            throw new Error('Backend server is not running. Please start the server first.');
        }
        
        // Determine analysis type
        let analysisType, source;
        
        if (value.includes('github.com')) {
            analysisType = 'github';
            const match = value.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
            if (match) {
                source = {
                    githubUsername: match[1],
                    repositoryName: match[2],
                };
                console.log('GitHub URL detected:', source);
            } else {
                throw new Error('Invalid GitHub URL format. Use: https://github.com/username/repository');
            }
        } else if (value.startsWith('http')) {
            analysisType = 'live_app';
            source = { url: value };
            console.log('Live app URL detected:', source);
        } else {
            analysisType = 'github';
            source = {
                githubUsername: value,
                repositoryName: null, // Will be determined by user or API
            };
            console.log('GitHub username detected:', source);
        }
        
        console.log('Analysis payload:', { type: analysisType, source });
        
        // Start analysis
        const response = await apiCall('/analysis/start', 'POST', {
            type: analysisType,
            source,
        });
        
        console.log('API response:', response);
        
        if (response.success) {
            showNotification('Analysis started! We\'ll notify you when it\'s complete.', 'success');
            input.value = '';
            
            // Show analysis progress
            showAnalysisProgress(response.data.analysisId);
            
            // Poll for analysis completion
            pollAnalysisStatus(response.data.analysisId);
        } else {
            throw new Error(response.message || 'Failed to start analysis');
        }
        
    } catch (error) {
        console.error('Analysis error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            input: value
        });
        showNotification(error.message || 'Failed to start analysis', 'error');
    } finally {
        submitButton.innerHTML = originalContent;
        submitButton.disabled = false;
    }
}

// Check server health
async function checkServerHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (response.ok) {
            const health = await response.json();
            console.log('Server health check passed:', health.data);
            return true;
        } else {
            console.error('Server health check failed:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Server health check error:', error);
        return false;
    }
}

// Show analysis progress UI
function showAnalysisProgress(analysisId) {
    // Create or update progress modal
    let progressModal = document.getElementById('analysisProgressModal');
    if (!progressModal) {
        progressModal = createAnalysisProgressModal();
        document.body.appendChild(progressModal);
    }
    
    progressModal.style.display = 'flex';
    progressModal.dataset.analysisId = analysisId;
    
    // Start progress animation
    updateAnalysisProgress(0);
}

// Create analysis progress modal
function createAnalysisProgressModal() {
    const modal = document.createElement('div');
    modal.id = 'analysisProgressModal';
    modal.className = 'analysis-progress-modal';
    modal.innerHTML = `
        <div class="progress-modal-content">
            <div class="progress-header">
                <h3><i class="fas fa-code"></i> Analyzing Your Code</h3>
                <button class="close-btn" onclick="closeAnalysisProgress()">&times;</button>
            </div>
            <div class="progress-body">
                <div class="progress-stages">
                    <div class="progress-stage" data-stage="fetching">
                        <i class="fas fa-download"></i>
                        <span>Fetching Code</span>
                        <div class="stage-status"></div>
                    </div>
                    <div class="progress-stage" data-stage="analyzing">
                        <i class="fas fa-search"></i>
                        <span>Analyzing Quality</span>
                        <div class="stage-status"></div>
                    </div>
                    <div class="progress-stage" data-stage="scoring">
                        <i class="fas fa-chart-line"></i>
                        <span>Calculating Skills</span>
                        <div class="stage-status"></div>
                    </div>
                    <div class="progress-stage" data-stage="matching">
                        <i class="fas fa-briefcase"></i>
                        <span>Matching Jobs</span>
                        <div class="stage-status"></div>
                    </div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="analysisProgressFill"></div>
                    </div>
                    <span class="progress-percentage" id="progressPercentage">0%</span>
                </div>
                <div class="progress-details">
                    <p id="progressStatus">Initializing analysis...</p>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .analysis-progress-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        
        .progress-modal-content {
            background: var(--dark-bg);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        
        .progress-header h3 {
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .close-btn {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 1.5rem;
            cursor: pointer;
        }
        
        .progress-stages {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .progress-stage {
            text-align: center;
            padding: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            transition: all 0.3s ease;
        }
        
        .progress-stage.active {
            border-color: var(--primary-color);
            background: rgba(231, 76, 60, 0.1);
        }
        
        .progress-stage.completed {
            border-color: var(--success-color);
            background: rgba(34, 197, 94, 0.1);
        }
        
        .progress-stage i {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            display: block;
        }
        
        .progress-stage.active i {
            color: var(--primary-color);
            animation: pulse 1.5s infinite;
        }
        
        .progress-stage.completed i {
            color: var(--success-color);
        }
        
        .progress-bar-container {
            margin-bottom: 1rem;
        }
        
        .progress-bar {
            background: var(--dark-secondary);
            border-radius: 10px;
            height: 8px;
            overflow: hidden;
        }
        
        .progress-fill {
            background: var(--gradient-4);
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .progress-percentage {
            color: var(--text-primary);
            font-weight: 600;
        }
        
        .progress-details p {
            color: var(--text-secondary);
            text-align: center;
        }
    `;
    modal.appendChild(style);
    
    return modal;
}

// Update analysis progress
function updateAnalysisProgress(percentage) {
    const fill = document.getElementById('analysisProgressFill');
    const percentageText = document.getElementById('progressPercentage');
    
    if (fill) fill.style.width = percentage + '%';
    if (percentageText) percentageText.textContent = percentage + '%';
    
    // Update stages based on progress
    const stages = document.querySelectorAll('.progress-stage');
    stages.forEach((stage, index) => {
        const stageProgress = (index + 1) * 25;
        if (percentage >= stageProgress) {
            stage.classList.add('completed');
            stage.classList.remove('active');
            const status = stage.querySelector('.stage-status');
            if (status) status.innerHTML = '<i class="fas fa-check"></i>';
        } else if (percentage >= index * 25) {
            stage.classList.add('active');
            stage.classList.remove('completed');
            const status = stage.querySelector('.stage-status');
            if (status) status.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            stage.classList.remove('active', 'completed');
            const status = stage.querySelector('.stage-status');
            if (status) status.innerHTML = '';
        }
    });
}

// Close analysis progress
function closeAnalysisProgress() {
    const modal = document.getElementById('analysisProgressModal');
    if (modal) modal.style.display = 'none';
}

// Enhanced polling with real progress updates
async function pollAnalysisStatus(analysisId) {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;
    let progress = 0;
    
    const poll = async () => {
        try {
            const response = await apiCall(`/analysis/${analysisId}`);
            
            if (response.data.analysis.status === 'completed') {
                updateAnalysisProgress(100);
                closeAnalysisProgress();
                
                showNotification('Analysis complete! Redirecting to results...', 'success');
                
                // Show results
                setTimeout(() => {
                    showAnalysisResults(response.data.analysis);
                }, 1000);
                
            } else if (response.data.analysis.status === 'failed') {
                closeAnalysisProgress();
                showNotification('Analysis failed: ' + (response.data.analysis.error?.message || 'Unknown error'), 'error');
                
            } else if (response.data.analysis.status === 'analyzing') {
                // Update progress based on analysis duration
                progress = Math.min(progress + 5, 90);
                updateAnalysisProgress(progress);
                
                if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(poll, 3000); // Poll every 3 seconds
                } else {
                    closeAnalysisProgress();
                    showNotification('Analysis is taking longer than expected. Please check back later.', 'warning');
                }
            } else {
                // Still pending
                if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(poll, 2000);
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
            if (attempts < maxAttempts) {
                attempts++;
                setTimeout(poll, 5000);
            }
        }
    };
    
    poll();
}

// Show analysis results
function showAnalysisResults(analysis) {
    // Create results modal
    let resultsModal = document.getElementById('analysisResultsModal');
    if (!resultsModal) {
        resultsModal = createResultsModal();
        document.body.appendChild(resultsModal);
    }
    
    // Populate results
    populateResultsModal(analysis);
    resultsModal.style.display = 'flex';
}

// Create results modal
function createResultsModal() {
    const modal = document.createElement('div');
    modal.id = 'analysisResultsModal';
    modal.className = 'analysis-results-modal';
    modal.innerHTML = `
        <div class="results-modal-content">
            <div class="results-header">
                <h2><i class="fas fa-chart-line"></i> Analysis Results</h2>
                <button class="close-btn" onclick="closeResultsModal()">&times;</button>
            </div>
            <div class="results-body">
                <div class="results-tabs">
                    <button class="tab-btn active" data-tab="overview">Overview</button>
                    <button class="tab-btn" data-tab="skills">Skills</button>
                    <button class="tab-btn" data-tab="findings">Code Findings</button>
                    <button class="tab-btn" data-tab="jobs">Job Matches</button>
                    <button class="tab-btn" data-tab="roadmap">90-Day Plan</button>
                </div>
                <div class="results-content">
                    <div class="tab-content active" id="overview-tab"></div>
                    <div class="tab-content" id="skills-tab"></div>
                    <div class="tab-content" id="findings-tab"></div>
                    <div class="tab-content" id="jobs-tab"></div>
                    <div class="tab-content" id="roadmap-tab"></div>
                </div>
            </div>
        </div>
    `;
    
    // Add tab switching
    modal.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
    
    return modal;
}

// Switch tabs
function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
}

// Close results modal
function closeResultsModal() {
    const modal = document.getElementById('analysisResultsModal');
    if (modal) modal.style.display = 'none';
}

// Populate results modal with data
function populateResultsModal(analysis) {
    // Overview tab
    const overviewTab = document.getElementById('overview-tab');
    if (overviewTab && analysis.skillSummary) {
        const summary = analysis.skillSummary;
        overviewTab.innerHTML = `
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Overall Level</h3>
                    <div class="score-display">${summary.overallLevel}</div>
                    <p>Average Score: ${summary.averageScore}/10</p>
                </div>
                <div class="summary-card">
                    <h3>Total Skills</h3>
                    <div class="score-display">${summary.totalSkills}</div>
                    <p>Verified Skills</p>
                </div>
                <div class="summary-card">
                    <h3>Strongest Skill</h3>
                    <div class="score-display">${summary.strongestSkill}</div>
                    <p>Score: ${summary.strongestScore}/10</p>
                </div>
                <div class="summary-card">
                    <h3>Job Readiness</h3>
                    <div class="score-display">${summary.readiness}</div>
                    <p>Based on analysis</p>
                </div>
            </div>
            <div class="recommendations">
                <h3>Recommendations</h3>
                ${summary.recommendations.map(rec => `
                    <div class="recommendation-item priority-${rec.priority}">
                        <strong>${rec.title}</strong>
                        <p>${rec.description}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Skills tab
    const skillsTab = document.getElementById('skills-tab');
    if (skillsTab && analysis.skillAssessments) {
        skillsTab.innerHTML = `
            <div class="skills-grid">
                ${analysis.skillAssessments.map(skill => `
                    <div class="skill-card">
                        <div class="skill-header">
                            <h3>${skill.skill}</h3>
                            <div class="skill-score">${skill.score}/10</div>
                        </div>
                        <div class="skill-level">${skill.level}</div>
                        <div class="skill-confidence">Confidence: ${Math.round(skill.confidence * 100)}%</div>
                        <div class="skill-evidence">
                            <h4>Evidence:</h4>
                            <ul>
                                ${skill.evidence.map(evidence => `<li>${evidence}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="skill-reality">
                            <strong>Reality Check:</strong> ${skill.realityCheck}
                        </div>
                        <div class="skill-gap">
                            <strong>Skill Gap:</strong> ${skill.gap}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Findings tab
    const findingsTab = document.getElementById('findings-tab');
    if (findingsTab && analysis.traceableFindings) {
        findingsTab.innerHTML = `
            <div class="findings-container">
                ${analysis.traceableFindings.map(finding => `
                    <div class="finding-item type-${finding.type} severity-${finding.severity || 'medium'}">
                        <div class="finding-header">
                            <h3>${finding.type.replace('-', ' ').toUpperCase()}</h3>
                            <span class="finding-category">${finding.category}</span>
                        </div>
                        <p class="finding-description">${finding.description}</p>
                        ${finding.location ? `<p class="finding-location"><strong>Location:</strong> ${finding.location}</p>` : ''}
                        ${finding.impact ? `<p class="finding-impact"><strong>Impact:</strong> ${finding.impact}</p>` : ''}
                        ${finding.recommendation ? `<p class="finding-recommendation"><strong>Recommendation:</strong> ${finding.recommendation}</p>` : ''}
                        ${finding.confidence ? `<p class="finding-confidence"><strong>Confidence:</strong> ${Math.round(finding.confidence * 100)}%</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Jobs tab
    const jobsTab = document.getElementById('jobs-tab');
    if (jobsTab && analysis.jobMatches) {
        jobsTab.innerHTML = `
            <div class="jobs-container">
                ${analysis.jobMatches.map(job => `
                    <div class="job-card ${job.isLive ? 'live-job' : ''}">
                        <div class="job-header">
                            <h3>${job.jobTitle}</h3>
                            <span class="job-company">${job.company}</span>
                            ${job.isLive ? '<span class="live-badge">LIVE</span>' : ''}
                        </div>
                        <div class="job-match">
                            <div class="match-score">Match: ${Math.round(job.matchScore * 100)}%</div>
                            <div class="match-bar">
                                <div class="match-fill" style="width: ${job.matchScore * 100}%"></div>
                            </div>
                        </div>
                        <div class="job-details">
                            <p><strong>Salary:</strong> ${job.salary}</p>
                            <p><strong>Location:</strong> ${job.location}</p>
                            <div class="job-skills">
                                <strong>Required Skills:</strong>
                                <div class="skill-tags">
                                    ${job.requiredSkills.map(skill => `
                                        <span class="skill-tag ${job.missingSkills && job.missingSkills.includes(skill) ? 'missing' : 'matched'}">
                                            ${skill}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                            ${job.description ? `<p class="job-description">${job.description}</p>` : ''}
                        </div>
                        <div class="job-actions">
                            <a href="${job.url}" target="_blank" class="apply-btn">Apply Now</a>
                            ${job.recommendations ? `
                                <div class="job-recommendations">
                                    ${job.recommendations.map(rec => `
                                        <div class="job-rec priority-${rec.priority}">
                                            ${rec.message}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Roadmap tab
    const roadmapTab = document.getElementById('roadmap-tab');
    if (roadmapTab) {
        // This would be populated with the 90-day ROI roadmap data
        roadmapTab.innerHTML = `
            <div class="roadmap-container">
                <h3>90-Day ROI Roadmap</h3>
                <div class="roi-summary">
                    <div class="roi-card">
                        <h4>Expected ROI</h4>
                        <div class="roi-percentage">+45%</div>
                        <p>Potential salary increase</p>
                    </div>
                </div>
                <div class="roadmap-phases">
                    <div class="phase">
                        <h4>Phase 1: Foundation (Days 1-30)</h4>
                        <ul>
                            <li>Focus on core skill development</li>
                            <li>Complete online courses</li>
                            <li>Build practice projects</li>
                        </ul>
                    </div>
                    <div class="phase">
                        <h4>Phase 2: Advanced (Days 31-60)</h4>
                        <ul>
                            <li>Advanced concepts and patterns</li>
                            <li>Open source contributions</li>
                            <li>Mentorship and networking</li>
                        </ul>
                    </div>
                    <div class="phase">
                        <h4>Phase 3: Job Ready (Days 61-90)</h4>
                        <ul>
                            <li>Portfolio enhancement</li>
                            <li>Interview preparation</li>
                            <li>Active job searching</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
}

// API call helper function
async function apiCall(endpoint, method = 'GET', data = null) {
    // Ensure auth token is initialized
    if (authToken === null) {
        initializeAuthToken();
    }
    
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    // Add auth token if available
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    
    if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Poll analysis status
async function pollAnalysisStatus(analysisId) {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;
    
    const poll = async () => {
        try {
            const response = await apiCall(`/analysis/${analysisId}`);
            
            if (response.data.analysis.status === 'completed') {
                showNotification('Analysis complete! Check your dashboard for results.', 'success');
                // Optionally redirect to results page
                window.location.hash = '#dashboard';
            } else if (response.data.analysis.status === 'failed') {
                showNotification('Analysis failed. Please try again.', 'error');
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(poll, 5000); // Poll every 5 seconds
            } else {
                showNotification('Analysis is taking longer than expected. Please check back later.', 'warning');
            }
        } catch (error) {
            console.error('Polling error:', error);
            if (attempts < maxAttempts) {
                attempts++;
                setTimeout(poll, 5000);
            }
        }
    };
    
    poll();
}

// Authentication functions
async function register(userData) {
    try {
        const response = await apiCall('/auth/register', 'POST', userData);
        if (response.success) {
            authToken = response.data.token;
            safeLocalStorageSet('opentrack_token', authToken);
            showNotification('Registration successful!', 'success');
            return response.data.user;
        }
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
}

async function login(email, password) {
    try {
        const response = await apiCall('/auth/login', 'POST', { email, password });
        if (response.success) {
            authToken = response.data.token;
            safeLocalStorageSet('opentrack_token', authToken);
            showNotification('Login successful!', 'success');
            return response.data.user;
        }
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('opentrack_token');
    showNotification('Logged out successfully', 'success');
    window.location.hash = '#home';
}

// Get user profile
async function getUserProfile() {
    try {
        const response = await apiCall('/auth/me');
        return response.data.user;
    } catch (error) {
        console.error('Get profile error:', error);
        return null;
    }
}

// Get user dashboard data
async function getDashboardData() {
    try {
        const response = await apiCall('/users/dashboard');
        return response.data;
    } catch (error) {
        console.error('Get dashboard error:', error);
        return null;
    }
}

// GitHub API integration
async function getGitHubProfile(username) {
    try {
        const response = await apiCall(`/github/user/${username}`);
        return response.data.profile;
    } catch (error) {
        console.error('GitHub profile error:', error);
        throw error;
    }
}

// Update UI based on authentication status
function updateAuthUI() {
    const authButtons = document.querySelectorAll('.auth-button');
    const userMenu = document.querySelector('.user-menu');
    
    if (authToken) {
        authButtons.forEach(btn => btn.style.display = 'none');
        if (userMenu) userMenu.style.display = 'block';
    } else {
        authButtons.forEach(btn => btn.style.display = 'block');
        if (userMenu) userMenu.style.display = 'none';
    }
}

// Create floating particles
function createParticles() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    const particleContainer = document.createElement('div');
    particleContainer.className = 'particle-container';
    
    for (let i = 0; i < 10; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particleContainer.appendChild(particle);
    }
    
    hero.appendChild(particleContainer);
}

// Enhanced scroll animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                    entry.target.style.animation = 'fadeInUp 0.8s ease forwards';
                }, index * 100);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.problem-card, .feature-card, .step, .section-header').forEach(el => {
        el.classList.add('scroll-reveal');
        observer.observe(el);
    });
}

// Enhanced typing effect
function enhancedTypeWriter(element, text, speed = 100) {
    element.innerHTML = '';
    element.style.borderRight = '2px solid var(--primary-color)';
    
    let i = 0;
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            element.style.borderRight = 'none';
        }
    }
    
    type();
}

// Add wave animation to icons
function addWaveAnimation() {
    document.querySelectorAll('.fa-hand-wave').forEach(icon => {
        icon.addEventListener('mouseenter', function() {
            this.classList.add('wave-animation');
            setTimeout(() => {
                this.classList.remove('wave-animation');
            }, 1000);
        });
    });
}

// Enhanced button interactions
function enhanceButtons() {
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
        
        button.addEventListener('click', function() {
            this.classList.add('success-bounce');
            setTimeout(() => {
                this.classList.remove('success-bounce');
            }, 1000);
        });
    });
}

// Add glow effect to important elements
function addGlowEffects() {
    const importantElements = document.querySelectorAll('.hero-title, .section-title, .cta-button');
    
    importantElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.classList.add('glow-text');
        });
        
        element.addEventListener('mouseleave', function() {
            this.classList.remove('glow-text');
        });
    });
}

// Create staggered animations for lists
function addStaggeredAnimations() {
    document.querySelectorAll('.problem-cards, .features-grid, .steps-container').forEach(container => {
        container.classList.add('stagger-animation');
    });
}
function enhanceForms() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('input-focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('input-focused');
        });
        
        input.addEventListener('input', function() {
            if (this.value.length > 0) {
                this.classList.add('has-value');
            } else {
                this.classList.remove('has-value');
            }
        });
    });
}

// DOM Ready Event Listener
document.addEventListener('DOMContentLoaded', function() {
    // Initialize auth token first
    initializeAuthToken();
    
    // Initialize other components
    initializeComponents();
    
    console.log('DCIS initialized successfully');
});

// Initialize all components
function initializeComponents() {
    // Input field real-time validation
    const userInput = document.getElementById('userInput');
    
    if (userInput) {
        userInput.addEventListener('input', function() {
            // Clear error when user starts typing
            if (this.value.trim()) {
                clearInputError();
            }
        });
        
        userInput.addEventListener('blur', function() {
            // Validate on blur if field has content
            if (this.value.trim()) {
                validateInput(this.value.trim());
            }
        });
    }
    
    // Initialize other UI components
    initializeNavigation();
    initializeAnimations();
    initializeIntersectionObserver();
}

// Safe localStorage helper
function safeLocalStorageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn('localStorage access denied:', error);
        return null;
    }
}

function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn('localStorage access denied:', error);
        return false;
    }
}

// Add loading dots animation
function showLoadingDots(container) {
    const dots = document.createElement('div');
    dots.className = 'loading-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(dots);
    return dots;
}

// Enhanced error handling
function showError(element, message) {
    element.classList.add('error-shake');
    showNotification(message, 'error');
    setTimeout(() => {
        element.classList.remove('error-shake');
    }, 500);
}

// Enhanced success feedback
function showSuccess(element, message) {
    element.classList.add('success-bounce');
    showNotification(message, 'success');
    setTimeout(() => {
        element.classList.remove('success-bounce');
    }, 1000);
}

// Add floating labels to form inputs
function addFloatingLabels() {
    const formGroups = document.querySelectorAll('.form-group');
    
    formGroups.forEach(group => {
        const input = group.querySelector('input');
        const label = group.querySelector('label');
        
        if (input && label) {
            input.addEventListener('focus', () => {
                const floatingLabel = document.createElement('div');
                floatingLabel.className = 'floating-label';
                floatingLabel.textContent = label.textContent;
                group.appendChild(floatingLabel);
            });
            
            input.addEventListener('blur', () => {
                const floatingLabel = group.querySelector('.floating-label');
                if (floatingLabel) {
                    floatingLabel.remove();
                }
            });
        }
    });
}

// Enhanced parallax effect
function initEnhancedParallax() {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.hero-visual, .analysis-wheel');
        
        parallaxElements.forEach((element, index) => {
            const speed = 0.5 + (index * 0.1);
            element.style.transform = `translateY(${scrolled * speed}px) rotate(${scrolled * 0.1}deg)`;
        });
    });
}

// Add micro-interactions
function addMicroInteractions() {
    // Card hover effects with different animations
    document.querySelectorAll('.card').forEach((card, index) => {
        card.addEventListener('mouseenter', function() {
            const animations = ['bounce', 'pulse', 'shake', 'glow'];
            const randomAnimation = animations[index % animations.length];
            this.style.animation = `${randomAnimation} 1s ease-in-out`;
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.animation = '';
        });
    });
    
    // Progress bar animations
    document.querySelectorAll('.progress-fill').forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => {
            bar.style.width = width;
        }, 100);
    });
}

// Enhanced notification system
function enhancedShowNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add enhanced styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-color)' : type === 'warning' ? 'var(--warning-color)' : type === 'error' ? 'var(--error-color)' : 'var(--primary-color)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove with animation
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, duration);
}

// Real-time Dashboard Functions
async function initRadarChart() {
    const canvas = document.getElementById('radarChart');
    if (!canvas) return;
    
    try {
        // Fetch real skill data from API
        const response = await apiCall('/users/skills');
        const userSkills = response.data.skills;
        
        // Fetch job requirements for comparison
        const jobData = await apiCall('/analysis/job-requirements');
        const requiredSkills = jobData.data.requiredSkills;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 100;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Process real skills data
        const skills = Object.keys(userSkills);
        const currentSkillsValues = skills.map(skill => userSkills[skill].level || 5);
        const requiredSkillsValues = skills.map(skill => {
            const req = requiredSkills.find(r => r.name.toLowerCase() === skill.toLowerCase());
            return req ? req.level : 5;
        });
        
        // Draw grid
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            
            for (let j = 0; j < skills.length; j++) {
                const angle = (Math.PI * 2 / skills.length) * j - Math.PI / 2;
                const x = centerX + Math.cos(angle) * (radius * i / 5);
                const y = centerY + Math.sin(angle) * (radius * i / 5);
                
                if (j === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        // Draw axes
        for (let i = 0; i < skills.length; i++) {
            const angle = (Math.PI * 2 / skills.length) * i - Math.PI / 2;
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            );
            ctx.stroke();
            
            // Draw labels
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            const labelX = centerX + Math.cos(angle) * (radius + 20);
            const labelY = centerY + Math.sin(angle) * (radius + 20);
            ctx.fillText(skills[i], labelX, labelY);
        }
        
        // Draw current skills polygon
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < currentSkillsValues.length; i++) {
            const angle = (Math.PI * 2 / skills.length) * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius * currentSkillsValues[i] / 10);
            const y = centerY + Math.sin(angle) * (radius * currentSkillsValues[i] / 10);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw required skills polygon
        ctx.beginPath();
        ctx.fillStyle = 'rgba(78, 205, 196, 0.3)';
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < requiredSkillsValues.length; i++) {
            const angle = (Math.PI * 2 / skills.length) * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius * requiredSkillsValues[i] / 10);
            const y = centerY + Math.sin(angle) * (radius * requiredSkillsValues[i] / 10);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
    } catch (error) {
        console.error('Error loading radar chart data:', error);
        // Fallback to demo data
        drawFallbackRadarChart(canvas);
    }
}

// Fallback radar chart for demo purposes
function drawFallbackRadarChart(canvas) {
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    
    // Demo skills data
    const skills = ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Database'];
    const currentSkills = [8, 7, 6, 5, 4, 7];
    const requiredSkills = [9, 8, 7, 8, 7, 8];
    
    // Draw grid
    for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        for (let j = 0; j < skills.length; j++) {
            const angle = (Math.PI * 2 / skills.length) * j - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius * i / 5);
            const y = centerY + Math.sin(angle) * (radius * i / 5);
            
            if (j === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }
    
    // Draw axes and labels
    for (let i = 0; i < skills.length; i++) {
        const angle = (Math.PI * 2 / skills.length) * i - Math.PI / 2;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius
        );
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        const labelX = centerX + Math.cos(angle) * (radius + 20);
        const labelY = centerY + Math.sin(angle) * (radius + 20);
        ctx.fillText(skills[i], labelX, labelY);
    }
    
    // Draw polygons
    drawPolygon(ctx, centerX, centerY, radius, currentSkills, 'rgba(255, 107, 107, 0.3)', '#ff6b6b');
    drawPolygon(ctx, centerX, centerY, radius, requiredSkills, 'rgba(78, 205, 196, 0.3)', '#4ecdc4');
}

function drawPolygon(ctx, centerX, centerY, radius, values, fillColor, strokeColor) {
    ctx.beginPath();
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    
    for (let i = 0; i < values.length; i++) {
        const angle = (Math.PI * 2 / values.length) * i - Math.PI / 2;
        const x = centerX + Math.cos(angle) * (radius * values[i] / 10);
        const y = centerY + Math.sin(angle) * (radius * values[i] / 10);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

// Real-time analysis progress
async function animateAnalysisProgress() {
    const progressFill = document.querySelector('.analysis-progress .progress-fill');
    if (!progressFill) return;
    
    try {
        // Get current analysis status
        const response = await apiCall('/analysis/status');
        const analysisData = response.data.analysis;
        
        let progress = analysisData.progress || 0;
        const targetProgress = 100;
        const increment = 1;
        
        const interval = setInterval(() => {
            if (progress >= targetProgress) {
                clearInterval(interval);
                advanceAnalysisStage();
                return;
            }
            
            progress += increment;
            progressFill.style.width = progress + '%';
            progressFill.parentElement.nextElementSibling.textContent = progress + '% Complete';
        }, 100);
        
    } catch (error) {
        console.error('Error fetching analysis status:', error);
        // Fallback to demo animation
        animateDemoAnalysisProgress();
    }
}

function animateDemoAnalysisProgress() {
    const progressFill = document.querySelector('.analysis-progress .progress-fill');
    if (!progressFill) return;
    
    let progress = 65;
    const targetProgress = 100;
    const increment = 1;
    
    const interval = setInterval(() => {
        if (progress >= targetProgress) {
            clearInterval(interval);
            advanceAnalysisStage();
            return;
        }
        
        progress += increment;
        progressFill.style.width = progress + '%';
        progressFill.parentElement.nextElementSibling.textContent = progress + '% Complete';
    }, 100);
}

function advanceAnalysisStage() {
    const stages = document.querySelectorAll('.analysis-stage');
    let currentStage = -1;
    
    stages.forEach((stage, index) => {
        if (stage.classList.contains('active')) {
            currentStage = index;
            stage.classList.remove('active');
            stage.classList.add('completed');
            stage.querySelector('i').className = 'fas fa-check-circle';
        }
    });
    
    if (currentStage < stages.length - 1) {
        stages[currentStage + 1].classList.add('active');
        stages[currentStage + 1].querySelector('i').className = 'fas fa-spinner fa-spin';
        
        // Reset progress and continue animation
        const progressFill = document.querySelector('.analysis-progress .progress-fill');
        progressFill.style.width = '0%';
        setTimeout(() => animateAnalysisProgress(), 500);
    } else {
        // Analysis complete
        showNotification('Code analysis complete!', 'success');
    }
}

// Real-time salary calculator
async function animateSalaryCalculator() {
    try {
        // Fetch real salary data
        const response = await apiCall('/users/salary-calculator');
        const salaryData = response.data;
        
        // Update current and potential salary
        const currentSalaryEl = document.querySelector('.salary-current h4');
        const potentialSalaryEl = document.querySelector('.salary-potential h4');
        const increaseEl = document.querySelector('.salary-gap span');
        
        if (currentSalaryEl) {
            animateValue(currentSalaryEl, 0, salaryData.currentSalary, '$');
        }
        
        if (potentialSalaryEl) {
            animateValue(potentialSalaryEl, 0, salaryData.potentialSalary, '$');
        }
        
        if (increaseEl) {
            const increase = ((salaryData.potentialSalary - salaryData.currentSalary) / salaryData.currentSalary * 100).toFixed(0);
            increaseEl.textContent = `+${increase}% Increase`;
        }
        
        // Update skill values
        const skillElements = document.querySelectorAll('.skill-value');
        skillElements.forEach((element, index) => {
            const skillName = element.querySelector('span').textContent;
            const skillValue = salaryData.skillValues.find(s => s.skill === skillName);
            
            if (skillValue) {
                const valueEl = element.querySelector('strong');
                animateValue(valueEl, 0, skillValue.value, '$');
            }
        });
        
    } catch (error) {
        console.error('Error fetching salary data:', error);
        // Fallback to demo animation
        animateDemoSalaryCalculator();
    }
}

function animateValue(element, start, end, prefix = '') {
    let current = start;
    const increment = (end - start) / 50;
    
    const interval = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(interval);
        }
        element.textContent = prefix + Math.floor(current).toLocaleString();
    }, 30);
}

function animateDemoSalaryCalculator() {
    const salaryElements = document.querySelectorAll('.skill-value strong');
    salaryElements.forEach((element, index) => {
        const targetValue = parseInt(element.textContent.replace(/[^0-9]/g, ''));
        let currentValue = 0;
        const increment = targetValue / 50;
        
        const interval = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(interval);
            }
            element.textContent = '$' + Math.floor(currentValue).toLocaleString();
        }, 30);
    });
}

// Real-time portfolio ranker
async function animateProjectScores() {
    try {
        // Fetch real project rankings
        const response = await apiCall('/users/portfolio-rankings');
        const projects = response.data.projects;
        
        const rankingsContainer = document.querySelector('.project-rankings');
        if (!rankingsContainer) return;
        
        // Clear existing rankings
        rankingsContainer.innerHTML = '';
        
        // Add real projects
        projects.forEach((project, index) => {
            const rankElement = createProjectRankElement(project, index + 1);
            rankingsContainer.appendChild(rankElement);
            
            // Animate score bar
            setTimeout(() => {
                const scoreFill = rankElement.querySelector('.score-fill');
                if (scoreFill) {
                    scoreFill.style.transition = 'width 1s ease-out';
                    scoreFill.style.width = project.score + '%';
                }
            }, index * 200);
        });
        
    } catch (error) {
        console.error('Error fetching project rankings:', error);
        // Fallback to demo animation
        animateDemoProjectScores();
    }
}

function createProjectRankElement(project, rank) {
    const div = document.createElement('div');
    div.className = 'project-rank';
    div.innerHTML = `
        <div class="rank-badge ${getRankClass(rank)}">${rank}</div>
        <div class="project-info">
            <h4>${project.name}</h4>
            <p>${project.technologies.join(', ')}</p>
            <div class="project-score">
                <span>Score: ${project.score}/10</span>
                <div class="score-bar">
                    <div class="score-fill" style="width: 0%"></div>
                </div>
            </div>
        </div>
    `;
    
    // Add click handler
    div.addEventListener('click', () => {
        showProjectDetails(project);
    });
    
    return div;
}

function getRankClass(rank) {
    switch(rank) {
        case 1: return 'gold';
        case 2: return 'silver';
        case 3: return 'bronze';
        default: return '';
    }
}

function showProjectDetails(project) {
    showNotification(`Opening details for ${project.name}...`, 'info');
    // In a real app, this would open a modal or navigate to project details
}

function animateDemoProjectScores() {
    const scoreFills = document.querySelectorAll('.score-fill');
    scoreFills.forEach((fill, index) => {
        const targetWidth = parseInt(fill.style.width);
        fill.style.width = '0%';
        
        setTimeout(() => {
            fill.style.transition = 'width 1s ease-out';
            fill.style.width = targetWidth + '%';
        }, index * 200);
    });
}

// Real-time GitHub vs LinkedIn gap analysis
async function loadGitHubLinkedInGap() {
    try {
        // Fetch GitHub profile data
        const githubResponse = await apiCall('/github/profile');
        const githubData = githubResponse.data.profile;
        
        // Fetch LinkedIn profile data
        const linkedinResponse = await apiCall('/users/linkedin-profile');
        const linkedinData = linkedinResponse.data.profile;
        
        // Update GitHub stats
        updatePlatformStats('.github', {
            repositories: githubData.publicRepos,
            contributions: githubData.totalContributions,
            languages: githubData.languages.length
        });
        
        // Update LinkedIn stats
        updatePlatformStats('.linkedin', {
            skills: linkedinData.skills.length,
            projects: linkedinData.projects.length,
            endorsements: linkedinData.endorsements
        });
        
        // Update gap analysis
        const gapAnalysis = await apiCall('/users/gap-analysis');
        updateGapAnalysis(gapAnalysis.data.gaps);
        
    } catch (error) {
        console.error('Error fetching gap analysis data:', error);
        // Fallback to demo data
        loadDemoGapAnalysis();
    }
}

function updatePlatformStats(platform, stats) {
    const platformEl = document.querySelector(platform);
    if (!platformEl) return;
    
    const statElements = platformEl.querySelectorAll('.stat');
    const statKeys = Object.keys(stats);
    
    statKeys.forEach((key, index) => {
        if (statElements[index]) {
            const strongEl = statElements[index].querySelector('strong');
            if (strongEl) {
                animateValue(strongEl, 0, stats[key]);
            }
        }
    });
}

function updateGapAnalysis(gaps) {
    const gapContainer = document.querySelector('.gap-analysis');
    if (!gapContainer) return;
    
    // Clear existing gaps
    const existingGaps = gapContainer.querySelectorAll('.gap-item');
    existingGaps.forEach(gap => gap.remove());
    
    // Add real gap items
    gaps.forEach(gap => {
        const gapElement = document.createElement('div');
        gapElement.className = `gap-item ${gap.type}`;
        gapElement.innerHTML = `
            <i class="fas fa-${gap.type === 'positive' ? 'arrow-up' : gap.type === 'negative' ? 'arrow-down' : 'minus'}"></i>
            <span>${gap.description}</span>
        `;
        
        gapElement.addEventListener('click', () => {
            showGapDetails(gap);
        });
        
        gapContainer.appendChild(gapElement);
    });
}

function showGapDetails(gap) {
    showNotification(`${gap.type.toUpperCase()}: ${gap.description}`, 'info');
}

function loadDemoGapAnalysis() {
    // Demo implementation would load static data
    console.log('Loading demo gap analysis data');
}

// Real-time ROI roadmap
async function animateROIProgress() {
    try {
        // Fetch ROI data
        const response = await apiCall('/users/roi-roadmap');
        const roiData = response.data;
        
        const roiFill = document.querySelector('.roi-fill');
        const roiProjection = document.querySelector('.roi-projection span');
        
        if (roiFill) {
            const targetWidth = roiData.progress;
            roiFill.style.width = '0%';
            
            setTimeout(() => {
                roiFill.style.transition = 'width 2s ease-out';
                roiFill.style.width = targetWidth + '%';
            }, 500);
        }
        
        if (roiProjection) {
            roiProjection.textContent = `Expected ROI: +${roiData.expectedIncrease}% Salary Increase`;
        }
        
        // Update milestones
        updateMilestones(roiData.milestones);
        
    } catch (error) {
        console.error('Error fetching ROI data:', error);
        // Fallback to demo animation
        animateDemoROIProgress();
    }
}

function updateMilestones(milestones) {
    const timelineContainer = document.querySelector('.roadmap-timeline');
    if (!timelineContainer) return;
    
    // Clear existing milestones
    timelineContainer.innerHTML = '';
    
    // Add real milestones
    milestones.forEach((milestone, index) => {
        const milestoneElement = createMilestoneElement(milestone, index);
        timelineContainer.appendChild(milestoneElement);
    });
}

function createMilestoneElement(milestone, index) {
    const div = document.createElement('div');
    div.className = 'milestone';
    
    const statusClass = milestone.status === 'completed' ? 'completed' : 
                       milestone.status === 'current' ? 'current' : 'upcoming';
    
    div.innerHTML = `
        <div class="milestone-marker ${statusClass}">
            ${milestone.status === 'completed' ? 'i' : milestone.day}
        </div>
        <div class="milestone-content">
            <h5>${milestone.title}</h5>
            <p>${milestone.description}</p>
            <ul>
                ${milestone.tasks.map(task => `<li>${task}</li>`).join('')}
            </ul>
        </div>
    `;
    
    // Add click handler
    div.addEventListener('click', () => {
        showMilestoneDetails(milestone);
    });
    
    return div;
}

function showMilestoneDetails(milestone) {
    if (milestone.status === 'upcoming') {
        showNotification('This milestone is not yet available', 'warning');
    } else {
        showNotification(`Milestone: ${milestone.title}`, 'info');
    }
}

function animateDemoROIProgress() {
    const roiFill = document.querySelector('.roi-fill');
    if (!roiFill) return;
    
    const targetWidth = parseInt(roiFill.style.width);
    roiFill.style.width = '0%';
    
    setTimeout(() => {
        roiFill.style.transition = 'width 2s ease-out';
        roiFill.style.width = targetWidth + '%';
    }, 500);
}

function initDashboardInteractions() {
    // Add hover effects to demo cards
    const demoCards = document.querySelectorAll('.demo-card');
    demoCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Add click interactions to project ranks
    const projectRanks = document.querySelectorAll('.project-rank');
    projectRanks.forEach(rank => {
        rank.addEventListener('click', function() {
            showNotification('Project details would open here', 'info');
        });
    });
    
    // Add click interactions to gap items
    const gapItems = document.querySelectorAll('.gap-item');
    gapItems.forEach(item => {
        item.addEventListener('click', function() {
            const type = this.classList.contains('positive') ? 'positive' : 
                        this.classList.contains('negative') ? 'negative' : 'neutral';
            showNotification(`Gap analysis: ${type} item selected`, 'info');
        });
    });
    
    // Add click interactions to milestones
    const milestones = document.querySelectorAll('.milestone');
    milestones.forEach(milestone => {
        milestone.addEventListener('click', function() {
            const marker = this.querySelector('.milestone-marker');
            if (marker.classList.contains('upcoming')) {
                showNotification('This milestone is not yet available', 'warning');
            } else {
                showNotification('Milestone details would open here', 'info');
            }
        });
    });
}

// Theme Toggle Functionality
function toggleTheme() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    const currentTheme = html.getAttribute('data-theme');
    
    if (currentTheme === 'light') {
        html.removeAttribute('data-theme');
        themeIcon.className = 'fas fa-moon';
        safeLocalStorageSet('theme', 'dark');
        showNotification('Switched to dark mode', 'success');
    } else {
        html.setAttribute('data-theme', 'light');
        themeIcon.className = 'fas fa-sun';
        safeLocalStorageSet('theme', 'light');
        showNotification('Switched to light mode', 'success');
    }
    
    // Reinitialize dashboard with new theme
    setTimeout(() => {
        if (authToken) {
            loadUserDashboard();
        } else {
            loadDemoDashboard();
        }
    }, 300);
}

// Load saved theme preference
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    const themeIcon = document.getElementById('theme-icon');
    
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeIcon.className = 'fas fa-sun';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeIcon.className = 'fas fa-moon';
    }
}

// Initialize all enhancements with real-time data
document.addEventListener('DOMContentLoaded', async () => {
    // Load theme preference
    loadThemePreference();
    // Create visual enhancements
    createParticles();
    initScrollAnimations();
    initEnhancedParallax();
    
    // Add interactive enhancements
    addWaveAnimation();
    enhanceButtons();
    addGlowEffects();
    addStaggeredAnimations();
    enhanceForms();
    addFloatingLabels();
    addMicroInteractions();
    
    // Initialize real-time dashboard functions
    await initRadarChart();
    await animateAnalysisProgress();
    await animateSalaryCalculator();
    await animateProjectScores();
    await animateROIProgress();
    await loadGitHubLinkedInGap();
    
    // Initialize dashboard interactions
    initDashboardInteractions();
    
    // Enhanced typing effect for hero title
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.innerHTML;
        setTimeout(() => {
            enhancedTypeWriter(heroTitle, originalText, 50);
        }, 500);
    }
    
    // Initialize existing functionality
    updateAuthUI();
    
    // Check if user is logged in
    if (authToken) {
        try {
            const user = await getUserProfile();
            if (user) {
                console.log('Welcome back!', user);
                showNotification(`Welcome back, ${user.username}!`, 'success');
                
                // Load user-specific dashboard data
                await loadUserDashboard();
            }
        } catch (error) {
            // Token might be invalid, clear it
            logout();
        }
    } else {
        // Load demo data for non-logged-in users
        await loadDemoDashboard();
    }
    
    // Add page visibility change detection
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('Page is hidden - pausing animations');
        } else {
            console.log('Page is visible - resuming animations');
            // Refresh data when page becomes visible
            refreshDashboardData();
        }
    });
    
    // Set up real-time updates
    setInterval(refreshDashboardData, 30000); // Refresh every 30 seconds
});

// Load user-specific dashboard data
async function loadUserDashboard() {
    try {
        // Load all dashboard components with real user data
        await Promise.all([
            initRadarChart(),
            animateAnalysisProgress(),
            animateSalaryCalculator(),
            animateProjectScores(),
            animateROIProgress(),
            loadGitHubLinkedInGap()
        ]);
        
        showNotification('Dashboard loaded with your data!', 'success');
    } catch (error) {
        console.error('Error loading user dashboard:', error);
        showNotification('Some dashboard features may be limited', 'warning');
    }
}

// Load demo dashboard for non-authenticated users
async function loadDemoDashboard() {
    try {
        // Load demo data for non-logged-in users
        drawFallbackRadarChart(document.getElementById('radarChart'));
        animateDemoAnalysisProgress();
        animateDemoSalaryCalculator();
        animateDemoProjectScores();
        animateDemoROIProgress();
        loadDemoGapAnalysis();
        
        showNotification('Viewing demo data. Sign in to see your personal dashboard!', 'info');
    } catch (error) {
        console.error('Error loading demo dashboard:', error);
    }
}

// Refresh dashboard data in real-time
async function refreshDashboardData() {
    if (!document.hidden && authToken) {
        try {
            // Refresh key dashboard components
            await Promise.all([
                initRadarChart(),
                animateSalaryCalculator(),
                loadGitHubLinkedInGap()
            ]);
            
            console.log('Dashboard data refreshed');
        } catch (error) {
            console.error('Error refreshing dashboard data:', error);
        }
    }
}

// Override the original showNotification function
const originalShowNotification = showNotification;
showNotification = enhancedShowNotification;

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add notification styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-color)' : type === 'warning' ? 'var(--warning-color)' : 'var(--primary-color)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add slide animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    const heroVisual = document.querySelector('.hero-visual');
    
    if (hero && heroVisual) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        heroVisual.style.transform = `translateY(-50%) translateX(${scrolled * 0.1}px)`;
    }
});

// Interactive floating cards
const floatingCards = document.querySelectorAll('.floating-card');
floatingCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.zIndex = '10';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.zIndex = '';
    });
});

// Smooth reveal animation for sections
const revealSections = () => {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight * 0.75;
        
        if (isVisible && !section.classList.contains('revealed')) {
            section.classList.add('revealed');
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }
    });
};

// Initialize section styles
document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'all 0.8s ease';
    });
    
    window.addEventListener('scroll', revealSections);
    revealSections(); // Initial check
});

// Typing effect for hero title
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Initialize typing effect
document.addEventListener('DOMContentLoaded', () => {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.innerHTML;
        setTimeout(() => {
            typeWriter(heroTitle, originalText, 50);
        }, 500);
    }
});

// Interactive hover states for cards
document.querySelectorAll('.problem-card, .feature-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = '';
    });
});

// Form input validation
document.getElementById('userInput').addEventListener('input', function() {
    const value = this.value.trim();
    const submitButton = document.querySelector('.cta-submit');
    
    if (value.length > 0) {
        submitButton.style.opacity = '1';
        submitButton.style.transform = 'scale(1.05)';
    } else {
        submitButton.style.opacity = '';
        submitButton.style.transform = '';
    }
});

// Mobile menu toggle (if needed in future)
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Close any open modals or notifications
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        });
    }
});

// Performance optimization - debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debounce to scroll events
const debouncedScroll = debounce(() => {
    revealSections();
}, 100);

window.addEventListener('scroll', debouncedScroll);

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Console welcome message
console.log('%c OPEN TRACK PS - Developer Career Intelligence System', 'color: #6366f1; font-size: 20px; font-weight: bold;');
console.log('%c Analyze your code. Discover your potential. Transform your career.', 'color: #8b5cf6; font-size: 14px;');
console.log('%c Ready to analyze your skills? Enter your GitHub username or project URL below!', 'color: #ec4899; font-size: 12px;');
