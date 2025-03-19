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

# Get the absolute path to the project directory
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if backend is already set up, if not run setup
if [ ! -d "$PROJECT_DIR/backend/venv" ]; then
    echo "Setting up backend first..."
    (cd "$PROJECT_DIR/backend" && ./setup.sh)
    echo "Backend setup complete."
fi

# Check if frontend dependencies are installed
if [ ! -d "$PROJECT_DIR/frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    (cd "$PROJECT_DIR/frontend" && npm install)
    echo "Frontend dependencies installed."
fi

# Open a new terminal window for the backend
echo "Starting backend in a new terminal window..."
osascript -e "tell application \"Terminal\" to do script \"cd \\\"$PROJECT_DIR/backend\\\" && ./start.sh; exit\""

# Give the backend a moment to start
sleep 2

# Open a new terminal window for the frontend
echo "Starting frontend in a new terminal window..."
osascript -e "tell application \"Terminal\" to do script \"cd \\\"$PROJECT_DIR/frontend\\\" && npm run dev; exit\""

echo "Edge Detection App started in separate terminals."
echo "Close both terminal windows when you're done."