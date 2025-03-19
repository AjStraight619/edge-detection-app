# Focus Peaking Application

A tool for detecting and highlighting in-focus areas in video using edge detection.

## Prerequisites

Before running this application, you need:

- **Python 3.7+**: Required for the backend processing
  - Install from [python.org](https://www.python.org/downloads/)
  - Verify with `python3 --version`

- **Node.js**: Required for the React frontend
  - Install from [nodejs.org](https://nodejs.org/)
  - Verify with `node --version`

## Quick Start

1. Clone this repository
2. Place your test video file in `frontend/public/` directory (name it `test.mp4`)
3. Make the scripts executable (only needed once):
   ```
   chmod +x backend/setup.sh backend/start.sh start-app.sh
   ```
4. Start the application:
   ```
   ./start-app.sh
   ```

This will:
- Set up the Python virtual environment
- Install all required Python packages
- Start the backend server
- Launch the React frontend

## Manual Setup

If you prefer to set up components separately:

### Backend Setup
```
cd backend
./setup.sh  # Creates virtual environment and installs dependencies
./start.sh  # Starts the backend server
```

### Frontend Setup
```
cd frontend
npm install
npm run dev
```

## How It Works

1. The frontend captures video frames
2. Frames are sent to the Python backend for processing
3. The backend detects edges (high contrast areas) which typically indicate in-focus regions
4. Processed frames with highlighted focus areas are sent back to the frontend
5. The frontend displays the original video with focus peaking overlay

## Troubleshooting

- Error "port 5001 already in use": Kill the process using port 5001 or change the port in backend/server.py
- Issues with Python packages: Run `cd backend && ./setup.sh` again to reinstall dependencies
- If OpenCV doesn't install correctly, you may need additional system libraries. See the OpenCV documentation for your operating system. 