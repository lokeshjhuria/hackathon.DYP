@echo on
echo Starting DCIS Backend Server...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if MongoDB is running
echo Checking MongoDB connection...
timeout /t 3 >nul
docker ps --filter "name=mongodb" 2>nul | findstr mongodb >nul
if %errorlevel% equ 0 (
    echo MongoDB is running (Docker)
) else (
    net start MongoDB 2>nul | findstr "started" >nul
    if %errorlevel% equ 0 (
        echo MongoDB is running (Windows Service)
    ) else (
        echo Warning: MongoDB may not be running
        echo Please start MongoDB or install Docker
        echo.
        echo Options:
        echo 1. Docker: docker run -d -p 27017:27017 --name mongodb mongo:7.0
        echo 2. Windows Service: net start MongoDB
        echo 3. Manual: Install from https://www.mongodb.com/try/download/community
        echo.
        echo Continue anyway? (y/n)
        set /p continue=
        if /i not "%continue%"=="y" (
            echo Setup cancelled.
            pause
            exit /b 1
        )
    )
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .env file exists
if not exist ".env" (
    echo Creating .env file from template...
    copy ".env.example" ".env"
    echo Please edit .env file with your configuration if needed
    echo.
)

REM Start the server
echo.
echo ========================================
echo  DCIS Backend Server Starting
echo ========================================
echo Server will start on: http://localhost:5000
echo Frontend available at: http://localhost:5000
echo API Health Check: http://localhost:5000/api/health
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

node server.js

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo  SERVER STARTUP FAILED
    echo ========================================
    echo.
    echo Troubleshooting:
    echo 1. Check if MongoDB is running
    echo 2. Verify .env file configuration
    echo 3. Check if port 5000 is available
    echo 4. Run test-backend.bat for connectivity test
    echo.
)

pause
