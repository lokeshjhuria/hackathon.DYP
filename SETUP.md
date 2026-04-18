# DCIS Backend Setup Guide

## Quick Setup (Windows)

### 1. Prerequisites
- **Node.js 18+**: Download from https://nodejs.org/
- **MongoDB**: Download from https://www.mongodb.com/try/download/community
- **Git**: Download from https://git-scm.com/

### 2. One-Click Setup
1. Double-click `start.bat` in the project folder
2. Follow the on-screen instructions
3. The server will start on http://localhost:5000

### 3. Manual Setup (if start.bat fails)

#### Step 1: Install Dependencies
```bash
# Open PowerShell as Administrator and run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
npm install
```

#### Step 2: Configure Environment
```bash
# Copy environment template
copy .env.example .env
```

Edit `.env` file with:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/opentrack-ps
JWT_SECRET=your_secret_key_here
GITHUB_TOKEN=your_github_token_here
FRONTEND_URL=http://localhost:3000
```

#### Step 3: Start MongoDB
```bash
# If using MongoDB service
net start MongoDB

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:7.0
```

#### Step 4: Start Server
```bash
npm start
```

## Testing the Backend

### Test API Endpoints
Open http://localhost:5000 in your browser to test:

1. **Frontend**: Full application interface
2. **API Health**: http://localhost:5000/api/health
3. **GitHub Integration**: Test with any GitHub username

### Example API Calls

#### Register User (Optional)
```bash
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"testuser\",\"email\":\"test@example.com\",\"name\":\"Test User\"}"
```

#### Start Analysis
```bash
curl -X POST http://localhost:5000/api/analysis/start ^
  -H "Content-Type: application/json" ^
  -d "{\"type\":\"github\",\"source\":{\"githubUsername\":\"octocat\"}}"
```

## Features Working Out of the Box

### 1. GitHub Profile Analysis
- Enter any GitHub username (e.g., "octocat")
- Real-time code analysis
- Skill assessment and scoring
- Job matching based on verified skills

### 2. Live Application Analysis
- Enter any live app URL (e.g., "https://github.com")
- Performance and security analysis
- UI/UX assessment
- Architecture evaluation

### 3. Complete Backend Functionality
- User authentication (optional)
- Real code analysis
- Database storage
- Progress tracking
- Results visualization

## Troubleshooting

### Common Issues

#### "Node.js not found"
- Install Node.js from https://nodejs.org/
- Restart your terminal/command prompt

#### "MongoDB connection failed"
- Ensure MongoDB is running
- Check MongoDB service status
- Verify MONGODB_URI in .env file

#### "GitHub API rate limit"
- Add your GitHub token to .env file
- Create token at: https://github.com/settings/tokens

#### "Permission denied" (PowerShell)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Conflicts
If port 5000 is in use:
1. Edit `.env` file: `PORT=5001`
2. Or stop the conflicting service

### Database Issues
```bash
# Reset database (delete all data)
mongo opentrack-ps --eval "db.dropDatabase()"
```

## Production Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db-url
JWT_SECRET=your-very-secure-secret
GITHUB_TOKEN=your-production-github-token
FRONTEND_URL=https://yourdomain.com
```

### Docker Deployment
```bash
docker-compose up -d
```

## Support

### Getting Help
1. Check the console output for error messages
2. Verify all prerequisites are installed
3. Ensure MongoDB is running
4. Check .env file configuration

### Log Files
- Server logs: Console output
- Database logs: MongoDB logs
- Error logs: Console error messages

---

**Your DCIS backend is now ready!** Start the server and begin analyzing code immediately.
