"""
InsightFace Face Recognition Service
Provides face detection, recognition, and comparison using InsightFace
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import io
from PIL import Image
import insightface
from insightface.app import FaceAnalysis
import os
import traceback

app = Flask(__name__)
CORS(app)

# Initialize InsightFace
face_app = None

def init_face_recognition():
    """Initialize InsightFace model with buffalo_l for 512-dimensional embeddings"""
    global face_app
    try:
        # Use BUFFALO_L model for 512-dimensional ArcFace embeddings
        # This provides better accuracy for face recognition
        face_app = FaceAnalysis(
            name='buffalo_l',
            providers=['CPUExecutionProvider']  # Use CPU, can change to CUDAExecutionProvider for GPU
        )
        face_app.prepare(ctx_id=0, det_size=(640, 640))
        print("✅ InsightFace ArcFace (buffalo_l) model loaded successfully - 512-dimensional embeddings")
        return True
    except Exception as e:
        print(f"❌ Failed to load InsightFace model: {str(e)}")
        traceback.print_exc()
        return False

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model_loaded': face_app is not None
    })

@app.route('/generate-descriptor', methods=['POST'])
def generate_descriptor():
    """
    Generate face descriptor from image
    Accepts: base64 image, image buffer, or file path
    Returns: 512-dimensional face embedding vector
    """
    try:
        if face_app is None:
            return jsonify({
                'success': False,
                'error': 'Face recognition model not loaded'
            }), 500

        data = request.json
        image_input = data.get('image')
        image_format = data.get('format', 'base64')  # 'base64', 'buffer', 'path'

        # Load image based on format
        if image_format == 'base64':
            # Remove data URI prefix if present
            if ',' in image_input:
                image_input = image_input.split(',')[1]
            image_bytes = base64.b64decode(image_input)
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif image_format == 'buffer':
            nparr = np.frombuffer(image_input, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif image_format == 'path':
            img = cv2.imread(image_input)
        else:
            return jsonify({
                'success': False,
                'error': f'Unsupported image format: {image_format}'
            }), 400

        if img is None:
            return jsonify({
                'success': False,
                'error': 'Failed to decode image'
            }), 400

        # Detect faces (InsightFace automatically aligns faces using facial landmarks)
        faces = face_app.get(img)

        if len(faces) == 0:
            return jsonify({
                'success': False,
                'error': 'No face detected in the image'
            }), 400

        if len(faces) > 1:
            return jsonify({
                'success': False,
                'error': 'Multiple faces detected. Exactly one face is required.'
            }), 400

        # Get face embedding (512-dimensional ArcFace embedding)
        # Face is automatically aligned using facial landmarks before embedding generation
        face = faces[0]
        embedding = face.embedding.tolist()  # 512-dimensional vector from ArcFace (buffalo_l)
        
        # Get face bounding box for validation
        bbox = face.bbox.tolist()  # [x1, y1, x2, y2]
        face_width = bbox[2] - bbox[0]
        face_height = bbox[3] - bbox[1]

        # Validate face size (minimum 100x100 pixels)
        MIN_FACE_SIZE = 100
        if face_width < MIN_FACE_SIZE or face_height < MIN_FACE_SIZE:
            return jsonify({
                'success': False,
                'error': f'Face is too small. Minimum size: {MIN_FACE_SIZE}x{MIN_FACE_SIZE} pixels.'
            }), 400

        return jsonify({
            'success': True,
            'descriptor': embedding,
            'bbox': bbox,
            'face_size': {
                'width': int(face_width),
                'height': int(face_height)
            },
            'message': 'Face descriptor generated successfully'
        })

    except Exception as e:
        print(f"Error generating descriptor: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/detect-faces', methods=['POST'])
def detect_faces():
    """
    Detect faces in an image with single face requirement for verification
    For attendance/verification: returns only the largest/most confident face
    Faces are automatically aligned using facial landmarks by InsightFace
    Returns: 512-dimensional ArcFace embedding
    """
    try:
        if face_app is None:
            return jsonify({
                'success': False,
                'error': 'Face recognition model not loaded'
            }), 500

        data = request.json
        image_input = data.get('image')
        image_format = data.get('format', 'base64')
        require_single_face = data.get('require_single_face', False)  # Option to require exactly one face

        # Load image
        if image_format == 'base64':
            if ',' in image_input:
                image_input = image_input.split(',')[1]
            image_bytes = base64.b64decode(image_input)
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif image_format == 'buffer':
            nparr = np.frombuffer(image_input, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            return jsonify({
                'success': False,
                'error': f'Unsupported image format: {image_format}'
            }), 400

        if img is None:
            return jsonify({
                'success': False,
                'error': 'Failed to decode image'
            }), 400

        # Detect faces (InsightFace automatically aligns faces using landmarks)
        faces = face_app.get(img)

        if len(faces) == 0:
            return jsonify({
                'success': False,
                'error': 'No face detected in the image'
            }), 400

        # If single face required, validate exactly one face
        if require_single_face and len(faces) > 1:
            return jsonify({
                'success': False,
                'error': 'Multiple faces detected. Exactly one face is required for verification.'
            }), 400

        # For verification/attendance: use the largest/most confident face
        # InsightFace automatically aligns faces using facial landmarks before generating embeddings
        if require_single_face or len(faces) == 1:
            # Use the single face (already aligned by InsightFace)
            face = faces[0]
            bbox = face.bbox.tolist()
            embedding = face.embedding.tolist()  # 512-dimensional ArcFace embedding
            
            return jsonify({
                'success': True,
                'detections': [{
                    'bbox': {
                        'x': int(bbox[0]),
                        'y': int(bbox[1]),
                        'width': int(bbox[2] - bbox[0]),
                        'height': int(bbox[3] - bbox[1])
                    },
                    'embedding': embedding,  # 512-dimensional vector
                    'confidence': float(face.det_score) if hasattr(face, 'det_score') else 1.0,
                    'aligned': True  # InsightFace automatically aligns faces
                }],
                'count': 1
            })
        else:
            # Multiple faces detected - return all but prioritize largest
            detections = []
            # Sort by detection confidence or size
            faces_sorted = sorted(faces, key=lambda f: (f.det_score if hasattr(f, 'det_score') else 1.0) * 
                                 ((f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])), reverse=True)
            
            for face in faces_sorted:
                bbox = face.bbox.tolist()
                embedding = face.embedding.tolist()  # 512-dimensional ArcFace embedding
                
                detections.append({
                    'bbox': {
                        'x': int(bbox[0]),
                        'y': int(bbox[1]),
                        'width': int(bbox[2] - bbox[0]),
                        'height': int(bbox[3] - bbox[1])
                    },
                    'embedding': embedding,  # 512-dimensional vector
                    'confidence': float(face.det_score) if hasattr(face, 'det_score') else 1.0,
                    'aligned': True  # InsightFace automatically aligns faces
                })

            return jsonify({
                'success': True,
                'detections': detections,
                'count': len(detections)
            })

    except Exception as e:
        print(f"Error detecting faces: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/compare-faces', methods=['POST'])
def compare_faces():
    """
    Compare two face descriptors and return similarity score
    Returns: match (boolean), similarity (0-1), distance
    """
    try:
        data = request.json
        descriptor1 = np.array(data.get('descriptor1'))
        descriptor2 = np.array(data.get('descriptor2'))
        threshold = data.get('threshold', 0.40)  # Fixed verification threshold for ArcFace (buffalo_l)

        if descriptor1 is None or descriptor2 is None:
            return jsonify({
                'success': False,
                'error': 'Both descriptors are required'
            }), 400

        if len(descriptor1) != len(descriptor2):
            return jsonify({
                'success': False,
                'error': 'Descriptor dimensions do not match'
            }), 400

        # Calculate cosine similarity (InsightFace ArcFace uses cosine similarity)
        # Normalize vectors for cosine similarity calculation
        norm1 = np.linalg.norm(descriptor1)
        norm2 = np.linalg.norm(descriptor2)
        
        if norm1 == 0 or norm2 == 0:
            return jsonify({
                'success': False,
                'error': 'Invalid descriptor (zero vector)'
            }), 400

        # Cosine similarity: dot product of normalized vectors
        # For ArcFace embeddings, cosine similarity is the standard comparison method
        similarity = np.dot(descriptor1, descriptor2) / (norm1 * norm2)
        
        # Convert similarity to distance (1 - similarity)
        distance = 1 - similarity
        
        # Match if similarity is above threshold (fixed threshold: 0.40)
        match = similarity >= threshold

        return jsonify({
            'success': True,
            'match': bool(match),
            'similarity': float(similarity),
            'distance': float(distance),
            'threshold': float(threshold)
        })

    except Exception as e:
        print(f"Error comparing faces: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Starting InsightFace Face Recognition Service...")
    if init_face_recognition():
        port = int(os.environ.get('PORT', 5001))
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        print("❌ Failed to initialize face recognition service")
        exit(1)

