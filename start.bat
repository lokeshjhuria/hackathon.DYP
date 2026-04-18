@echo off
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

REM Check if Supabase configuration exists
echo Checking Supabase configuration...
if not exist ".env" (
    echo Warning: .env file not found
    echo Creating .env from template...
    copy ".env.example" ".env"
    echo Please edit .env file with your Supabase credentials
    pause
)

REM Check if Supabase credentials are configured
findstr /C:"SUPABASE_URL" ".env" >nul
if %errorlevel% neq 0 (
    echo Warning: SUPABASE_URL not found in .env file
    echo Please add your Supabase URL to .env file
    echo.
    echo Example: SUPABASE_URL=https://your-project-id.supabase.co
    pause
    exit /b 1
)

findstr /C:"SUPABASE_ANON_KEY" ".env" >nul
if %errorlevel% neq 0 (
    echo Warning: SUPABASE_ANON_KEY not found in .env file
    echo Please add your Supabase anon key to .env file
    echo.
    echo Example: SUPABASE_ANON_KEY=your-supabase-anon-key
    pause
    exit /b 1
)

echo Supabase configuration found!

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
