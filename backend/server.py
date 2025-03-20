import socketio
import eventlet
import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image
import os

# Create Socket.io server with logging completely disabled
sio = socketio.Server(
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)
app = socketio.WSGIApp(sio)

@sio.event
def connect(sid, environ):
    pass

@sio.event
def process_frame(sid, data):
    try:
        # Check if data contains frame
        if isinstance(data, dict) and 'frame' in data:
            # Skip processing if isPeakingEnabled is explicitly set to False
            if data.get('isPeakingEnabled') is False:
                return
                
            try:
                frame_data = data['frame']
                edge_color = data.get('edge_color', 'red')
                sensitivity = data.get('sensitivity', 50)  # Default to 50% if not provided
                source_type = data.get('source_type', 'file')  # Get source type
                
                # Adjust processing based on source type
                # Webcam can handle more detail, uploaded videos need more optimization
                is_webcam = source_type == 'webcam'
                
                # Convert sensitivity to threshold values
                # Higher sensitivity (higher value) = lower thresholds = more edges
                # Lower sensitivity (lower value) = higher thresholds = fewer edges
                sensitivity_factor = sensitivity / 50.0  # Normalize around 1.0
                
                # Scale thresholds inversely with sensitivity
                # Lower thresholds = more edges detected = higher sensitivity
                low_threshold = int(100 / sensitivity_factor)
                high_threshold = int(200 / sensitivity_factor)
                
                # Ensure thresholds are in valid ranges
                low_threshold = max(10, min(low_threshold, 100))
                high_threshold = max(low_threshold + 50, min(high_threshold, 255))
                
                # Further optimize based on source type
                if not is_webcam:
                    # For uploaded videos, reduce edge detection detail to improve performance
                    low_threshold = int(low_threshold * 1.2)  # Higher threshold = fewer edges
                    high_threshold = int(high_threshold * 1.2)
                
                # Decode the base64 image
                img_data = base64.b64decode(frame_data)
                image = np.array(Image.open(BytesIO(img_data)))
                
                # For uploaded videos, reduce image size to improve performance
                if not is_webcam and (image.shape[0] > 720 or image.shape[1] > 1280):
                    # Calculate new dimensions while preserving aspect ratio
                    height, width = image.shape[:2]
                    max_dimension = 720
                    
                    # Determine scaling factor
                    if height > width:
                        scale = max_dimension / height
                    else:
                        scale = max_dimension / width
                        
                    new_width = int(width * scale)
                    new_height = int(height * scale)
                    
                    # Resize image to improve performance
                    image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
                
                # Keep track of frame numbers for response
                process_frame.counter = getattr(process_frame, 'counter', 0) + 1
                frame_num = process_frame.counter
                
                # Convert to grayscale for edge detection
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
                
                # Apply sharpening to enhance edges
                kernel_sharpen = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
                sharpened = cv2.filter2D(gray, -1, kernel_sharpen)
                
                # Apply a Gaussian blur to reduce noise while preserving edges
                blur_size = 5 if sensitivity < 70 else 3  # Less blur at high sensitivity
                blurred = cv2.GaussianBlur(sharpened, (blur_size, blur_size), 0)
                
                # More precise edge detection with sensitivity-adjusted thresholds
                edges = cv2.Canny(blurred, low_threshold, high_threshold)
                
                # Make lines thinner with smaller kernel and fewer iterations
                kernel_size = 2  # Reduced from 3 to 2 for thinner lines
                # Use minimal dilation or none for very thin lines
                if sensitivity > 80:
                    # For high sensitivity, just use the raw edges with no dilation
                    pass  # Skip dilation completely
                else:
                    # For lower sensitivity, use minimal dilation
                    iterations = 1  # Always use just 1 iteration
                    kernel = np.ones((kernel_size, kernel_size), np.uint8)
                    edges = cv2.dilate(edges, kernel, iterations=iterations)
                
                color_rgb = [255, 0, 0]  # Default: Red in RGB
                if edge_color == 'green':
                    color_rgb = [0, 255, 0]  # Green in RGB
                elif edge_color == 'blue':
                    color_rgb = [0, 0, 255]  # Blue in RGB
                elif edge_color == 'yellow':
                    color_rgb = [255, 255, 0]  # Yellow in RGB
                
                # Create the edge overlay
                overlay = np.zeros_like(image)
                overlay[edges > 0] = color_rgb
                
                # Apply the edges directly without blending for maximum visibility
                result = image.copy()
                result[edges > 0] = color_rgb
                
                # Encode and return the processed image with appropriate quality
                # Lower quality for faster transmission when using uploaded videos
                encode_quality = 70 if is_webcam else 50
                _, buffer = cv2.imencode('.jpg', cv2.cvtColor(result, cv2.COLOR_RGB2BGR), 
                                        [cv2.IMWRITE_JPEG_QUALITY, encode_quality])
                img_str = base64.b64encode(buffer).decode('utf-8')
                
                # Send back the frame with frame number
                response = {
                    'frame': img_str,
                    'frame_number': frame_num
                }
                
                sio.emit('processed_frame', response, to=sid)
            except Exception as e:
                sio.emit('error', {'message': f"Error processing image: {str(e)}"}, to=sid)
                return
        else:
            sio.emit('error', {'message': "Invalid data format: expected 'frame' in JSON object"}, to=sid)
    except Exception as e:
        sio.emit('error', {'message': str(e)}, to=sid)

@sio.event
def disconnect(sid):
    pass

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    print(f"Starting edge detection server on port {port}")
    eventlet.wsgi.server(eventlet.listen(('0.0.0.0', port)), app, log_output=False) 