/**
 * Python InsightFace Face Recognition Service Wrapper
 * Communicates with Python face recognition microservice
 */
import axios from 'axios';

const PYTHON_SERVICE_URL = process.env.PYTHON_FACE_SERVICE_URL || 'http://localhost:5001';

// Check if Python service is available
async function checkServiceHealth() {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/health`, {
      timeout: 10000 // Increased from 5000ms to 10000ms
    });
    return response.data.model_loaded === true;
  } catch (error) {
    console.warn('⚠️ Python face recognition service not available:', error.message);
    return false;
  }
}

/**
 * Generate face descriptor from image
 * @param {string|Buffer} imageInput - Base64 string, file path, or Buffer
 * @returns {Promise<{success: boolean, descriptor?: number[], error?: string}>}
 */
export async function generateFaceDescriptor(imageInput) {
  try {
    // Check service health
    const isHealthy = await checkServiceHealth();
    if (!isHealthy) {
      return {
        success: false,
        error: 'Python face recognition service is not available. Please ensure the service is running on port 5001.'
      };
    }

    let imageBase64;
    let format = 'base64';

    // Convert input to base64
    if (typeof imageInput === 'string') {
      if (imageInput.startsWith('data:image/')) {
        // Already base64 data URI
        imageBase64 = imageInput;
        format = 'base64';
      } else if (imageInput.startsWith('/') || imageInput.includes('\\')) {
        // File path
        const fs = await import('fs');
        const imageBuffer = fs.readFileSync(imageInput);
        imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
        format = 'base64';
      } else {
        // Assume base64 string
        imageBase64 = imageInput;
        format = 'base64';
      }
    } else if (Buffer.isBuffer(imageInput)) {
      // Convert buffer to base64
      imageBase64 = `data:image/jpeg;base64,${imageInput.toString('base64')}`;
      format = 'base64';
    } else {
      return {
        success: false,
        error: 'Invalid image input. Expected file path, buffer, or base64 data URI.'
      };
    }

    // Call Python service
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/generate-descriptor`,
      {
        image: imageBase64,
        format: format
      },
      {
        timeout: 45000 // Increased from 30000ms to 45000ms for better reliability under load
      }
    );

    if (response.data.success) {
      return {
        success: true,
        descriptor: response.data.descriptor,
        bbox: response.data.bbox,
        face_size: response.data.face_size,
        validation: response.data.message
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Failed to generate face descriptor'
      };
    }
  } catch (error) {
    console.error('Error generating face descriptor:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Cannot connect to Python face recognition service. Please ensure it is running on port 5001.'
      };
    }
    
    if (error.response?.data?.error) {
      return {
        success: false,
        error: error.response.data.error
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to process face recognition'
    };
  }
}

/**
 * Detect all faces in an image
 * @param {string|Buffer} imageInput - Base64 string or Buffer
 * @returns {Promise<{success: boolean, detections?: Array, error?: string}>}
 */
export async function detectFaces(imageInput) {
  try {
    const isHealthy = await checkServiceHealth();
    if (!isHealthy) {
      return {
        success: false,
        error: 'Python face recognition service is not available'
      };
    }

    let imageBase64;
    if (typeof imageInput === 'string') {
      imageBase64 = imageInput.startsWith('data:image/') 
        ? imageInput 
        : `data:image/jpeg;base64,${imageInput}`;
    } else if (Buffer.isBuffer(imageInput)) {
      imageBase64 = `data:image/jpeg;base64,${imageInput.toString('base64')}`;
    } else {
      return {
        success: false,
        error: 'Invalid image input'
      };
    }

    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/detect-faces`,
      {
        image: imageBase64,
        format: 'base64',
        require_single_face: false // For live stream, allow multiple but we'll use best one
      },
      {
        timeout: 45000 // Increased from 30000ms to 45000ms for better reliability under load
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error detecting faces:', error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

/**
 * Compare two face descriptors
 * @param {number[]} descriptor1 - First face descriptor
 * @param {number[]} descriptor2 - Second face descriptor
 * @param {number} threshold - Similarity threshold (default: 0.40 for ArcFace)
 * @returns {Promise<{match: boolean, similarity: number, distance: number}>}
 */
export async function compareFaceDescriptors(descriptor1, descriptor2, threshold = 0.40) {
  try {
    if (!descriptor1 || !descriptor2) {
      return { match: false, distance: Infinity, similarity: 0 };
    }

    if (descriptor1.length !== descriptor2.length) {
      return { match: false, distance: Infinity, similarity: 0 };
    }

    // Call Python service for comparison
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/compare-faces`,
      {
        descriptor1: descriptor1,
        descriptor2: descriptor2,
        threshold: threshold
      },
      {
        timeout: 10000 // Increased from 5000ms to 10000ms for better reliability
      }
    );

    if (response.data.success) {
      return {
        match: response.data.match,
        similarity: response.data.similarity,
        distance: response.data.distance
      };
    } else {
      return {
        match: false,
        distance: Infinity,
        similarity: 0,
        error: response.data.error
      };
    }
  } catch (error) {
    console.error('Error comparing face descriptors:', error.message);
    // Fallback to local calculation if service unavailable
    return compareFaceDescriptorsLocal(descriptor1, descriptor2, threshold);
  }
}

/**
 * Local fallback comparison using cosine similarity
 * Exported for use in monitoring to reduce API calls
 */
export function compareFaceDescriptorsLocal(descriptor1, descriptor2, threshold = 0.40) {
  if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
    return { match: false, distance: Infinity, similarity: 0 };
  }

  // Calculate cosine similarity
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < descriptor1.length; i++) {
    dotProduct += descriptor1[i] * descriptor2[i];
    norm1 += descriptor1[i] * descriptor1[i];
    norm2 += descriptor2[i] * descriptor2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return { match: false, distance: Infinity, similarity: 0 };
  }

  const similarity = dotProduct / (norm1 * norm2);
  const distance = 1 - similarity;
  const match = similarity >= threshold;

  return {
    match,
    similarity,
    distance
  };
}

/**
 * Check if Python service is available
 */
export async function isServiceAvailable() {
  return await checkServiceHealth();
}

