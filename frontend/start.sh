#!/bin/bash

echo "===================================="
echo "  UniCode Frontend - Starting..."
echo "===================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

echo "Starting development server..."
echo "Frontend will be available at: http://localhost:3000"
echo "Backend should be running at: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
