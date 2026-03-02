#!/bin/bash
# backend/startup.sh
# ─────────────────────────────────────────────────────────────
# Azure App Service startup script for campusbarter-api
# This runs automatically when the App Service starts.
# ─────────────────────────────────────────────────────────────

cd /home/site/wwwroot

echo "Starting CampusBarter API..."
echo "Node version: $(node --version)"
echo "Environment: $NODE_ENV"

# Start the compiled server
node dist/server.js
