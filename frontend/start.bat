@echo off
echo ====================================
echo   UniCode Frontend - Starting...
echo ====================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting development server...
echo Frontend will be available at: http://localhost:3000
echo Backend should be running at: http://localhost:8080
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause
