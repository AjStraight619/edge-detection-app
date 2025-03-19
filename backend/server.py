import socketio
import eventlet
import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image
import os
import logging

# Setup logging with more details
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('edge-detection-server')

# Create Socket.io server with enhanced logging
sio = socketio.Server(
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)
app = socketio.WSGIApp(sio)

@sio.event
def connect(sid, environ):
    logger.info(f'Client connected: {sid}')

@sio.event
def test_event(sid, data):
    logger.info(f'Received test event from {sid}: {data}')
    sio.emit('test_response', 'Hello from server', to=sid)

@sio.event
def generate_test_image(sid):
    """Create and process a test image with patterns that should show edge detection"""
    try:
        logger.info(f"Starting test image generation for client {sid}")
        
        debug_dir = 'debug_frames'
        logger.info(f"Checking for debug directory: {debug_dir}")
        
        import os.path
        abs_path = os.path.abspath(debug_dir)
        logger.info(f"Absolute path for debug directory: {abs_path}")
        
        if not os.path.exists(debug_dir):
            logger.info(f"Directory {debug_dir} does not exist, creating it")
            try:
                os.makedirs(debug_dir)
                logger.info(f"Successfully created directory: {debug_dir}")
            except Exception as e:
                logger.error(f"Failed to create directory {debug_dir}: {e}")
                # Try creating in current working directory
                cwd = os.getcwd()
                logger.info(f"Trying to create directory in current working directory: {cwd}")
                try:
                    full_path = os.path.join(cwd, debug_dir)
                    os.makedirs(full_path)
                    debug_dir = full_path
                    logger.info(f"Successfully created directory in CWD: {full_path}")
                except Exception as e2:
                    logger.error(f"Failed to create directory in CWD: {e2}")
                    sio.emit('error', {'message': f"Could not create debug directory: {str(e2)}"}, to=sid)
                    return False
        else:
            logger.info(f"Directory {debug_dir} already exists")
            
        # Create a test image with patterns that should trigger edge detection
        width, height = 640, 480
        logger.info(f"Creating test image with dimensions {width}x{height}")
        test_img = np.zeros((height, width, 3), dtype=np.uint8)
        test_img.fill(100)  # Medium gray background
        
        # Add various patterns that should trigger edge detection
        # Central rectangle
        cv2.rectangle(test_img, (width//4, height//4), (3*width//4, 3*height//4), (220, 220, 220), 2)
        
        # Diagonal lines
        cv2.line(test_img, (0, 0), (width, height), (200, 200, 200), 2)
        cv2.line(test_img, (0, height), (width, 0), (200, 200, 200), 2)
        
        # Add some text
        font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.putText(test_img, 'Edge Detection Test', (width//3, height//2), 
                    font, 1, (240, 240, 240), 2)
                    
        # Create a checker pattern in one corner
        square_size = 20
        for i in range(5):
            for j in range(5):
                if (i + j) % 2 == 0:
                    x, y = width - (j+1)*square_size, height - (i+1)*square_size
                    cv2.rectangle(test_img, (x, y), (x+square_size, y+square_size), (200, 200, 200), -1)
        
        # Save the input test image
        input_path = os.path.join(debug_dir, 'test_pattern_input.jpg')
        logger.info(f"Attempting to save input test image to: {input_path}")
        try:
            cv2.imwrite(input_path, test_img)
            logger.info(f"Successfully saved test pattern input to {input_path}")
        except Exception as e:
            logger.error(f"Failed to save test pattern input: {e}")
            sio.emit('error', {'message': f"Failed to save test pattern: {str(e)}"}, to=sid)
            return False
        
        # Process the test image - same steps as in process_frame
        logger.info("Processing test image for edge detection")
        gray = cv2.cvtColor(test_img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 20, 80)
        
        # Save the edges image
        edges_path = os.path.join(debug_dir, 'test_pattern_edges.jpg')
        logger.info(f"Saving edges image to: {edges_path}")
        try:
            cv2.imwrite(edges_path, edges)
            logger.info(f"Successfully saved test pattern edges to {edges_path}")
        except Exception as e:
            logger.error(f"Failed to save test pattern edges: {e}")
        
        # Dilate edges
        kernel = np.ones((3, 3), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=3)
        
        # Create overlay
        overlay = np.zeros_like(test_img)
        overlay[edges > 0] = [0, 0, 255] 
        
        # Save the overlay
        overlay_path = os.path.join(debug_dir, 'test_pattern_overlay.jpg')
        logger.info(f"Saving overlay image to: {overlay_path}")
        try:
            cv2.imwrite(overlay_path, overlay)
            logger.info(f"Successfully saved test pattern overlay to {overlay_path}")
        except Exception as e:
            logger.error(f"Failed to save test pattern overlay: {e}")
        
        result = test_img.copy()
        result[edges > 0] = [0, 0, 255] 
        
        # Add border
        border_width = 30
        result[0:border_width, :] = [0, 0, 255]  # Top border
        result[-border_width:, :] = [0, 0, 255]  # Bottom border
        result[:, 0:border_width] = [0, 0, 255]  # Left border
        result[:, -border_width:] = [0, 0, 255]  # Right border
        
        # Save the result
        result_path = os.path.join(debug_dir, 'test_pattern_result.jpg')
        logger.info(f"Saving result image to: {result_path}")
        try:
            cv2.imwrite(result_path, result)
            logger.info(f"Successfully saved test pattern result to {result_path}")
        except Exception as e:
            logger.error(f"Failed to save test pattern result: {e}")
        
        # Send back confirmation
        logger.info("Sending test_image_created event back to client")
        message = {
            'message': f"Test images created in {debug_dir} directory",
            'files': [
                f"{debug_dir}/test_pattern_input.jpg",
                f"{debug_dir}/test_pattern_edges.jpg", 
                f"{debug_dir}/test_pattern_overlay.jpg",
                f"{debug_dir}/test_pattern_result.jpg"
            ]
        }
        logger.info(f"Message payload: {message}")
        sio.emit('test_image_created', message, to=sid)
        logger.info(f"Test image creation process completed successfully for client {sid}")
        
        return True
    except Exception as e:
        logger.error(f"Error generating test pattern: {e}", exc_info=True)
        sio.emit('error', {'message': f"Error generating test pattern: {str(e)}"}, to=sid)
        return False

@sio.event
def process_frame(sid, data):
    try:
        # Log every request for debugging
        logger.info(f"Received frame request from {sid}, isPeakingEnabled: {data.get('isPeakingEnabled', 'NOT_PROVIDED')}")
        
        # Check if data contains frame
        if isinstance(data, dict) and 'frame' in data:
            # Skip processing if isPeakingEnabled is explicitly set to False
            if data.get('isPeakingEnabled') is False:
                logger.info(f"Skipping frame processing because isPeakingEnabled is False")
                return
                
            try:
                frame_data = data['frame']
                edge_color = data.get('edge_color', 'red')  
                
                # Decode the base64 image
                img_data = base64.b64decode(frame_data)
                image = np.array(Image.open(BytesIO(img_data)))
                
                # Keep track of frame numbers for response
                process_frame.counter = getattr(process_frame, 'counter', 0) + 1
                frame_num = process_frame.counter
                
                logger.info(f"Processing frame #{frame_num} with edge_color: {edge_color}")
                
                # Convert to grayscale for edge detection
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
                
                # Apply sharpening to enhance edges
                kernel_sharpen = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
                sharpened = cv2.filter2D(gray, -1, kernel_sharpen)
                
                # Apply a Gaussian blur to reduce noise while preserving edges
                blurred = cv2.GaussianBlur(sharpened, (5, 5), 0)
                
                # More precise edge detection (higher thresholds = fewer edges)
                edges = cv2.Canny(blurred, 30, 100)
                
                # Smaller dilation to make edges thinner
                kernel = np.ones((3, 3), np.uint8)
                edges = cv2.dilate(edges, kernel, iterations=2)
                
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
                
                # Encode and return the processed image
                _, buffer = cv2.imencode('.jpg', cv2.cvtColor(result, cv2.COLOR_RGB2BGR))
                img_str = base64.b64encode(buffer).decode('utf-8')
                
                # Send back the frame with frame number
                response = {
                    'frame': img_str,
                    'frame_number': frame_num
                }
                
                sio.emit('processed_frame', response, to=sid)
            except Exception as e:
                logger.error(f"Error processing image: {e}", exc_info=True)
                sio.emit('error', {'message': f"Error processing image: {e}"}, to=sid)
                return
        else:
            logger.error(f"Invalid data format received from {sid}")
            sio.emit('error', {'message': "Invalid data format: expected 'frame' in JSON object"}, to=sid)
    except Exception as e:
        logger.error(f"Error in process_frame: {e}", exc_info=True)
        sio.emit('error', {'message': str(e)}, to=sid)

@sio.event
def disconnect(sid):
    logger.info(f'Client disconnected: {sid}')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    logger.info(f"Starting edge detection server on port {port}")
    eventlet.wsgi.server(eventlet.listen(('0.0.0.0', port)), app) 