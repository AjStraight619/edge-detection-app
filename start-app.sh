#!/bin/bash

# Exit on error
set -e

# Make all scripts executable (self-healing)
chmod +x "$(dirname "$0")/backend/setup.sh"
chmod +x "$(dirname "$0")/backend/start.sh"
chmod +x "$(dirname "$0")/start-app.sh"

echo "Starting Edge Detection Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js before continuing."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3 before continuing."
    exit 1
fi

# Check if backend is already set up
if [ ! -d "backend/venv" ]; then
    echo "Setting up backend..."
    (cd backend && ./setup.sh)
fi

# Start backend in background
echo "Starting backend server..."
(cd backend && ./start.sh) &
BACKEND_PID=$!

# Sleep to let backend start
sleep 2

# Check if node_modules exists in frontend, if not, install dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    (cd frontend && npm install)
fi

echo "Starting frontend..."
(cd frontend && npm run dev)

# When the frontend is terminated, kill the backend too
trap "echo 'Shutting down backend...' && kill $BACKEND_PID" EXIT