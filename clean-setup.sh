#!/bin/bash

# Clean up for fresh installation test

set -e

echo "Cleaning up for fresh installation test..."

if [ -d "backend/venv" ]; then
    echo "Removing backend virtual environment..."
    rm -rf backend/venv
fi

if [ -d "frontend/node_modules" ]; then
    echo "Removing frontend node_modules..."
    rm -rf frontend/node_modules
fi

echo "Cleanup complete! Now run ./start-app.sh to test the full setup process." 