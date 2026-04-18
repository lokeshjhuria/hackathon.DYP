@echo off
echo Testing DCIS Backend Connectivity...
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Running backend connectivity test...
node test-backend.js

echo.
echo If the test failed, make sure to:
echo 1. Start the backend server: npm start
echo 2. Check MongoDB is running
echo 3. Verify port 5000 is available
echo.

pause
