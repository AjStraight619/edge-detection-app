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

# Helper function to resize image based on sensitivity and source type
def resize_for_performance(image, sensitivity, is_webcam):
    if is_webcam:
        return image  # No resizing for webcam
    
    height, width = image.shape[:2]
    
    # Less aggressive downsampling at higher sensitivity
    # This ensures we maintain enough detail for edge detection
    if sensitivity > 80:
        max_dimension = 720  # Keep more details at high sensitivity
    elif sensitivity > 60:
        max_dimension = 640  # Medium-high sensitivity
    elif sensitivity > 40:
        max_dimension = 576  # Medium sensitivity
    else:
        max_dimension = 512  # Lower sensitivity can use more downsampling
    
    # Only resize if the image is larger than our target
    if height > max_dimension or width > max_dimension:
        # Determine scaling factor
        if height > width:
            scale = max_dimension / height
        else:
            scale = max_dimension / width
            
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        # Resize image to improve performance
        image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
    
    return image

# Helper function to apply color to in-focus areas
def apply_edge_overlay(image, focus_mask, edge_color):
    # Create RGB representation of the overlay
    overlay = np.zeros_like(image)
    
    if edge_color.lower() == 'red':
        overlay[focus_mask > 0] = [255, 0, 0]
    elif edge_color.lower() == 'green':
        overlay[focus_mask > 0] = [0, 255, 0]
    elif edge_color.lower() == 'blue':
        overlay[focus_mask > 0] = [0, 0, 255]
    elif edge_color.lower() == 'yellow':
        overlay[focus_mask > 0] = [255, 255, 0]
    else:
        overlay[focus_mask > 0] = [255, 0, 0]  # Default to red
    
    # Blend the overlay with original image - slightly more transparent
    alpha = 0.4 
    result = cv2.addWeighted(image, 1, overlay, alpha, 0)
    
    return result

# Helper function to measure local sharpness/detail level (likely to be in focus)
def measure_focus_quality(image, block_size=16):
    """
    Measure local variance to determine areas likely to be in focus.
    High variance = high detail = likely in focus.
    """
    # Convert to grayscale if needed
    if len(image.shape) > 2:
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    else:
        gray = image
    
    # Apply Laplacian for edge/detail detection - works well for focus detection
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    laplacian = np.absolute(laplacian)
    
    # Normalize to 0-255 range
    laplacian = np.uint8(255 * laplacian / np.max(laplacian)) if np.max(laplacian) > 0 else np.zeros_like(gray)
    
    # Apply Gaussian blur to smooth the focus map
    focus_map = cv2.GaussianBlur(laplacian, (block_size+1, block_size+1), 0)
    
    return focus_map

# Helper function to detect in-focus areas - RESTORE TRUE FOCUS PEAKING FOR WEBCAM
def detect_in_focus_areas(image, sensitivity, is_webcam):
    """
    Detect areas likely to be in focus using focus quality metrics
    Optimized but still TRUE focus peaking for webcam
    """
    # Convert to grayscale for processing
    if len(image.shape) > 2:
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    else:
        gray = image
    
    # For webcam - simplified but still true focus peaking
    if is_webcam:
        # Sharpen to enhance details (faster version)
        kernel_sharpen = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(gray, -1, kernel_sharpen)
        
        # Fast Laplacian for focus detection (key to focus peaking)
        laplacian = cv2.Laplacian(sharpened, cv2.CV_64F)
        laplacian = np.absolute(laplacian)
        
        # Normalize to 0-255 range
        laplacian = np.uint8(255 * laplacian / np.max(laplacian)) if np.max(laplacian) > 0 else np.zeros_like(gray)
        
        # More selective mask creation for sharper focus peaking
        # Calculate a more aggressive threshold based on sensitivity
        sensitivity = max(1, sensitivity)
        
        # Calculate threshold based on image statistics
        mean_val = np.mean(laplacian)
        std_val = np.std(laplacian)
        
        # Make threshold more selective - higher values = fewer areas highlighted
        # Inverse relationship with sensitivity: higher sensitivity = lower threshold = more areas shown
        selectivity_factor = 1.5 - (sensitivity / 100.0)  # ranges from 0.5 to 1.49
        threshold = mean_val + (selectivity_factor * std_val)
        
        # Ensure threshold is in a reasonable range
        threshold = max(mean_val * 1.2, min(threshold, mean_val * 3.0))
        
        # Create binary mask of in-focus areas - more selective
        _, focus_mask = cv2.threshold(laplacian, threshold, 255, cv2.THRESH_BINARY)
        
        # Additional filtering to reduce noise
        # Remove small noise areas with morphological operations
        kernel = np.ones((2, 2), np.uint8)
        focus_mask = cv2.morphologyEx(focus_mask, cv2.MORPH_OPEN, kernel)
        
        # Get edges for final detection - more selective edge detection
        low_threshold = int(50 + (100 - sensitivity)/1.5)  # Less sensitive to edges
        high_threshold = int(low_threshold * 3)  # Higher high threshold = fewer edges
        edges = cv2.Canny(sharpened, low_threshold, high_threshold)
        
        # Only keep edges in areas considered to be in focus
        in_focus_edges = cv2.bitwise_and(edges, focus_mask)
        
        # Apply very light dilation only at higher sensitivities
        if sensitivity > 60:
            kernel = np.ones((2, 2), np.uint8)
            in_focus_edges = cv2.dilate(in_focus_edges, kernel, iterations=1)
            
        return in_focus_edges
    
    # For uploaded videos, more selective focus detection
    # Apply sharpening to better identify details
    kernel_sharpen = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
    sharpened = cv2.filter2D(gray, -1, kernel_sharpen)
    
    # Get a focus quality map
    focus_map = measure_focus_quality(sharpened)
    
    # Calculate threshold based on sensitivity
    # Higher sensitivity = lower threshold = more areas shown as "in focus"
    sensitivity = max(1, sensitivity)  # Ensure sensitivity is at least 1
    
    # Adaptive threshold based on image statistics and sensitivity
    mean_focus = np.mean(focus_map)
    std_focus = np.std(focus_map)
    
    # Calculate threshold - more selective (higher threshold)
    selectivity_factor = 1.5 - (sensitivity / 100.0)  # ranges from 0.5 to 1.49
    threshold = mean_focus + (selectivity_factor * std_focus)
    
    # Ensure threshold is in a reasonable range
    threshold = max(mean_focus * 1.2, min(threshold, mean_focus * 3.0))
    
    # Create binary mask of areas considered to be in focus
    _, focus_mask = cv2.threshold(focus_map, threshold, 255, cv2.THRESH_BINARY)
    
    # Additional filtering to reduce noise
    kernel = np.ones((2, 2), np.uint8)
    focus_mask = cv2.morphologyEx(focus_mask, cv2.MORPH_OPEN, kernel)
    
    # Get edges in the image - more selective
    low_threshold = int(70 + (100 - sensitivity)/1.5)
    high_threshold = int(low_threshold * 3)
    edges = cv2.Canny(sharpened, low_threshold, high_threshold)
    
    # Only keep edges that are in areas considered to be in focus
    in_focus_edges = cv2.bitwise_and(edges, focus_mask)
    
    # Apply very light dilation only at higher sensitivities
    if sensitivity > 70:  # Only for high sensitivity
        kernel_size = 2
        iterations = 1
        kernel = np.ones((kernel_size, kernel_size), np.uint8)
        in_focus_edges = cv2.dilate(in_focus_edges, kernel, iterations=iterations)
    
    return in_focus_edges

# Socket.io event handlers
@sio.event
def connect(sid, environ):
    pass

@sio.event
def process_frame(sid, data):
    try:
        # Check if data contains frame
        if not isinstance(data, dict) or 'frame' not in data:
            sio.emit('error', {'message': "Invalid data format: expected 'frame' in JSON object"}, to=sid)
            return
            
        # Skip processing if edge detection is disabled
        if data.get('isEdgeDetectionEnabled') is False:
            return
                
        try:
            # Extract parameters
            frame_data = data['frame']
            edge_color = data.get('edge_color', 'red')
            sensitivity = data.get('sensitivity', 50)
            source_type = data.get('source_type', 'file')
            
            # Ensure sensitivity is never 0
            if sensitivity <= 0:
                sensitivity = 1
                
            is_webcam = source_type == 'webcam'
            
            # Decode base64 image
            img_data = base64.b64decode(frame_data)
            image = np.array(Image.open(BytesIO(img_data)))
            
            # Resize image for performance if needed
            image = resize_for_performance(image, sensitivity, is_webcam)
            
            # Track frame numbers for response
            process_frame.counter = getattr(process_frame, 'counter', 0) + 1
            frame_num = process_frame.counter
            
            # Detect areas likely to be in focus (true focus peaking)
            focus_mask = detect_in_focus_areas(image, sensitivity, is_webcam)
            
            # Apply edge overlay to original image
            result = apply_edge_overlay(image, focus_mask, edge_color)
            
            # Encode result with appropriate quality
            encode_quality = 95 if is_webcam else 75  # Higher quality for webcam
            _, buffer = cv2.imencode('.jpg', cv2.cvtColor(result, cv2.COLOR_RGB2BGR), 
                                    [cv2.IMWRITE_JPEG_QUALITY, encode_quality])
            img_str = base64.b64encode(buffer).decode('utf-8')
            
            # Send response
            response = {
                'frame': img_str,
                'frame_number': frame_num
            }
            
            sio.emit('processed_frame', response, to=sid)
            
        except Exception as e:
            sio.emit('error', {'message': f"Error processing image: {str(e)}"}, to=sid)
            
    except Exception as e:
        sio.emit('error', {'message': str(e)}, to=sid)

@sio.event
def disconnect(sid):
    pass

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    print(f"Starting server on port {port}")
    eventlet.wsgi.server(eventlet.listen(('0.0.0.0', port)), app, log_output=False) 