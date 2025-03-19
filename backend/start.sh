#!/bin/bash

# Exit on error
set -e

echo "Starting focus peaking backend server..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Running setup.sh first..."
    ./setup.sh
fi

# Activate virtual environment
source venv/bin/activate

# Check if requirements are installed
if ! python -c "import socketio, eventlet, cv2, numpy, PIL" &> /dev/null; then
    echo "Some dependencies are missing. Reinstalling requirements..."
    pip install -r requirements.txt
fi

# Start the server
echo "Server starting on port 5001..."
python server.py 