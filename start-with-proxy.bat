@echo off
echo.
echo ========================================
echo   Starting CampusBarter with Dev Proxy
echo ========================================
echo.
echo Dev-Proxy is running on: http://localhost:3999
echo.
echo Starting web app on: http://localhost:8083
echo.
set EXPO_PUBLIC_API_URL=http://localhost:3999
npm run web
