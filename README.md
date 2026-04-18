# OPEN TRACK PS - Developer Career Intelligence System

A comprehensive platform that analyzes developer skills through code analysis, providing personalized career guidance and job matching based on actual demonstrated abilities.

## Features

### Core Functionality
- **360° Code Analysis**: Comprehensive evaluation of GitHub repositories, project links, and live applications
- **Skill Assessment**: Automated detection and verification of technical skills
- **Career Intelligence**: Personalized learning roadmaps and career recommendations
- **Job Matching**: AI-powered matching with relevant job opportunities
- **Resume Generation**: Data-driven bullet points based on actual code contributions

### Analysis Categories
- **Code Quality**: Maintainability, complexity, technical debt, test coverage
- **Architecture**: Design patterns, modularity, scalability, structure
- **Security**: Vulnerability detection, best practices, recommendations
- **Performance**: Load times, optimization opportunities, bottlenecks
- **UI/UX**: Accessibility, usability, design consistency

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **JWT** - Authentication
- **Octokit** - GitHub API integration
- **Docker** - Containerization

### Frontend
- **HTML5/CSS3** - Modern responsive design
- **Vanilla JavaScript** - No framework dependencies
- **Font Awesome** - Icons
- **CSS Animations** - Interactive UI elements

### DevOps
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy
- **Redis** - Caching (optional)

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB 5.0+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/opentrack-ps.git
   cd opentrack-ps
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Using Docker (recommended)
   docker run -d -p 27017:27017 --name mongodb mongo:7.0
   
   # Or install locally
   # Follow MongoDB installation guide for your OS
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Docker Deployment

1. **Using Docker Compose (Recommended)**
   ```bash
   docker-compose up -d
   ```

2. **Manual Docker Build**
   ```bash
   docker build -t opentrack-ps .
   docker run -p 5000:5000 opentrack-ps
   ```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/opentrack-ps

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d

# GitHub API
GITHUB_TOKEN=your_github_personal_access_token_here

# CORS
FRONTEND_URL=http://localhost:3000
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### POST /api/auth/login
Authenticate user and return JWT token.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

### Analysis Endpoints

#### POST /api/analysis/start
Start a new code analysis.

**Request:**
```json
{
  "type": "github",
  "source": {
    "githubUsername": "username",
    "repositoryName": "repository"
  }
}
```

#### GET /api/analysis/:id
Get analysis results by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "overallScore": 8.5,
      "categories": {
        "codeQuality": { "score": 8.2 },
        "architecture": { "score": 8.7 },
        "security": { "score": 7.9 },
        "performance": { "score": 8.3 },
        "uiux": { "score": 8.8 }
      },
      "technologies": [...],
      "recommendations": [...],
      "jobMatches": [...]
    }
  }
}
```

### GitHub Integration

#### GET /api/github/user/:username
Get GitHub user profile and repositories.

#### GET /api/github/repo/:owner/:repo
Get detailed repository information.

## Architecture

### Project Structure
```
opentrack-ps/
|-- config/           # Configuration files
|-- models/            # Database models
|-- routes/            # API routes
|-- middleware/        # Express middleware
|-- utils/             # Utility functions
|-- public/            # Static frontend files
|-- scripts/           # Database scripts
|-- docker-compose.yml # Docker configuration
|-- Dockerfile         # Docker image configuration
|-- server.js          # Main application file
|-- package.json       # Dependencies and scripts
```

### Database Schema

#### User Model
- Authentication details
- Profile information
- Skills and career goals
- Analysis history
- Statistics

#### Analysis Model
- Analysis metadata
- Category scores
- Technology detection
- Recommendations
- Job matches

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run test suite
- `npm run lint` - Run ESLint

### Code Quality
- ESLint for code linting
- Prettier for code formatting
- Jest for testing
- Git hooks for pre-commit checks

## Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   export NODE_ENV=production
   export MONGODB_URI=mongodb://your-production-db
   export JWT_SECRET=your-production-secret
   ```

2. **Build and Deploy**
   ```bash
   npm ci --only=production
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Cloud Deployment Options

#### Vercel (Frontend)
```bash
npm install -g vercel
vercel --prod
```

#### Heroku
```bash
heroku create opentrack-ps
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
git push heroku main
```

#### AWS ECS
- Use Docker Compose with ECS integration
- Configure load balancer and auto-scaling
- Set up RDS for MongoDB

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow ESLint configuration
- Write meaningful commit messages
- Add tests for new features
- Update documentation

## Security

### Authentication
- JWT-based authentication
- Secure password hashing with bcrypt
- Token expiration management

### API Security
- Rate limiting
- CORS configuration
- Input validation
- SQL injection prevention

### Data Protection
- Environment variable encryption
- Secure headers with Helmet
- Data sanitization

## Monitoring and Logging

### Application Monitoring
- Health check endpoint (`/api/health`)
- Performance metrics
- Error tracking

### Logging
- Structured logging with Morgan
- Error logging to console
- Database query logging

## Support

### Documentation
- API documentation available at `/api/docs`
- User guide in the application
- Technical documentation in README

### Issues
- Report bugs via GitHub Issues
- Feature requests welcome
- Community support via Discussions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- GitHub API for repository analysis
- Open source community for tools and libraries
- Contributors and beta testers

---

**OPEN TRACK PS** - Transform your career through data-driven insights.
