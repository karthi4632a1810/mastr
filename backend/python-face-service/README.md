# InsightFace Face Recognition Service

Python microservice for face recognition using InsightFace.

## Setup

1. Install Python dependencies:
```bash
cd backend/python-face-service
pip install -r requirements.txt
```

2. The InsightFace models will be automatically downloaded on first run.

3. Start the service:
```bash
python app.py
```

The service will run on port 5001 by default.

## API Endpoints

### Health Check
- `GET /health` - Check if service is running and model is loaded

### Generate Face Descriptor
- `POST /generate-descriptor`
- Body: `{ "image": "base64_string", "format": "base64" }`
- Returns: 512-dimensional face embedding vector

### Detect Faces
- `POST /detect-faces`
- Body: `{ "image": "base64_string", "format": "base64" }`
- Returns: Array of face detections with bounding boxes and embeddings

### Compare Faces
- `POST /compare-faces`
- Body: `{ "descriptor1": [...], "descriptor2": [...], "threshold": 0.6 }`
- Returns: Match result with similarity score

## Environment Variables

- `PORT` - Service port (default: 5001)

