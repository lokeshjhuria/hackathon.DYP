// Simple test script to check backend connectivity
const API_BASE_URL = 'http://localhost:5000/api';

async function testBackend() {
    console.log('Testing DCIS Backend...');
    
    try {
        // Test 1: Health check
        console.log('1. Testing health endpoint...');
        const healthResponse = await fetch(`${API_BASE_URL}/health`);
        if (healthResponse.ok) {
            const health = await healthResponse.json();
            console.log('   Health check: ', health.data.status);
            console.log('   Database: ', health.data.database);
            console.log('   GitHub: ', health.data.github);
        } else {
            console.log('   Health check failed:', healthResponse.status);
            return false;
        }
        
        // Test 2: Analysis endpoint (without auth)
        console.log('2. Testing analysis endpoint...');
        const analysisResponse = await fetch(`${API_BASE_URL}/analysis/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'github',
                source: {
                    githubUsername: 'octocat',
                    repositoryName: null
                }
            })
        });
        
        if (analysisResponse.ok) {
            const analysis = await analysisResponse.json();
            console.log('   Analysis test: SUCCESS');
            console.log('   Analysis ID:', analysis.data.analysisId);
        } else {
            const error = await analysisResponse.json();
            console.log('   Analysis test failed:', error.message);
        }
        
        console.log('Backend test completed successfully!');
        return true;
        
    } catch (error) {
        console.error('Backend test failed:', error.message);
        console.log('Make sure the backend server is running on port 5000');
        console.log('Run: npm start or node server.js');
        return false;
    }
}

// Run the test
testBackend();
