# Quick Start Guide - DCIS Backend Server

## Step 1: Start MongoDB (Required)
```bash
# Option A: Using Docker (Recommended)
docker run -d -p 27017:27017 --name mongodb mongo:7.0

# Option B: Using Windows Service
net start MongoDB

# Option C: Manual MongoDB
# Download from https://www.mongodb.com/try/download/community
```

## Step 2: Start Backend Server
```bash
# Double-click this file in Windows Explorer:
start.bat

# OR run manually in terminal:
npm start

# OR run directly:
node server.js
```

## Step 3: Verify Server is Running
Open your browser and go to:
- **Frontend**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## Step 4: Test Analysis
1. Open http://localhost:5000
2. Enter GitHub username (e.g., "octocat")
3. Click "Start Free Analysis"
4. Watch the analysis progress

## Troubleshooting

### If "Node.js not found":
1. Download Node.js from https://nodejs.org/
2. Restart your terminal/command prompt
3. Try again

### If "MongoDB connection failed":
1. Make sure MongoDB is running (Step 1)
2. Check `.env` file has correct MongoDB URI:
   ```
   MONGODB_URI=mongodb://localhost:27017/opentrack-ps
   ```

### If "Port 5000 in use":
1. Edit `.env` file: `PORT=5001`
2. Restart the server

### If "GitHub API rate limit":
1. Add GitHub token to `.env`:
   ```
   GITHUB_TOKEN=your_github_personal_access_token
   ```
2. Create token at: https://github.com/settings/tokens

## Quick Test
```bash
# Test backend connectivity
npm run test-backend

# Or run:
test-backend.bat
```

## Server Status Indicators
- **Running**: Server console shows "Server running on port 5000"
- **Database**: MongoDB logs show connection success
- **API**: Health check returns "status: ok"

## Need Help?
1. Check console output for error messages
2. Run `test-backend.bat` for connectivity test
3. Verify all prerequisites are installed

---

**Your DCIS backend will be ready in minutes!**
