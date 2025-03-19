# Edge Detection Backend

This is the Python backend for the Edge Detection application. It processes video frames to detect and highlight areas of high contrast, which typically correspond to edges and important details in the image.

## Requirements

- Python 3.7+
- OpenCV
- Socket.io
- Eventlet
- NumPy
- Pillow

## Setup

Run the setup script to create a virtual environment and install all dependencies:

```bash
./setup.sh
```

## Running the Server

Start the backend server:

```bash
./start.sh
```

The server will listen on port 8000 by default.

## How It Works

1. The backend receives video frames from the frontend via Socket.io
2. Each frame is processed using OpenCV to detect edges (high contrast areas)
3. The detected edges are highlighted in color
4. The processed frame is sent back to the frontend for display

## API

- Socket.io Event: `process_frame`
  - Input: Base64 encoded image data
  - Output: Base64 encoded processed image with edge detection highlights

## Troubleshooting

If you experience issues:

1. Make sure all dependencies are installed correctly
2. Check that port 8000 is not being used by another application
3. Verify the frontend is properly configured to connect to the backend 