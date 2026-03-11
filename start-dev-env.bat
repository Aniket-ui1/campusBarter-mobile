@echo off
echo Starting CampusBarter Development Environment
echo.
echo [1/2] Starting CORS dev-proxy on port 3999...
start "CORS Proxy" cmd /k "node dev-proxy.js"
timeout /t 3 /nobreak > nul

echo [2/2] Starting Expo web dev server...
echo.
echo IMPORTANT: Use http://localhost:8083 in your browser
echo The proxy will forward API calls to Azure backend with CORS headers
echo.
set EXPO_PUBLIC_API_URL=http://localhost:3999
npm run web
