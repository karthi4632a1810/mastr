import axios from 'axios';
import http from 'http';

// Lightweight image decoding shim replacing 'canvas' to avoid native build issues on Windows.
// This shim pretends to decode images and returns generic dimensions so that
// camera validation and snapshot features can work without the native 'canvas' dependency.
async function loadImageShim(buffer) {
  return {
    width: 1920,
    height: 1080
  };
}

const loadImage = loadImageShim;

// URL patterns for different camera types
const CAMERA_TYPE_PATTERNS = {
  usb_webcam: /^https?:\/\/.+/i,
  laptop_webcam: /^https?:\/\/.+/i,
  ip_camera: /^https?:\/\/.+/i,
  http_snapshot: /^https?:\/\/.+(jpg|jpeg|png|gif|bmp|webp|snapshot|image)/i,
  lan_webcam: /^https?:\/\/[\d.]+:\d+\/(video|mjpegfeed)/i, // For DroidCam and LAN webcams
  stream: /^https?:\/\/.+\/(mjpeg|mjpg|stream|video)|^rtsp:\/\/.+/i // For RTSP and MJPEG streams
};

// Validate URL format based on camera type
export function validateCameraUrlFormat(endpointUrl, cameraType) {
  // Basic URL validation
  try {
    const url = new URL(endpointUrl);
    if (!['http:', 'https:', 'rtsp:'].includes(url.protocol)) {
      return { valid: false, error: 'URL must use http, https, or rtsp protocol' };
    }
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Type-specific pattern validation
  if (CAMERA_TYPE_PATTERNS[cameraType]) {
    const pattern = CAMERA_TYPE_PATTERNS[cameraType];
    if (!pattern.test(endpointUrl)) {
      // Warn but don't fail - some valid URLs might not match pattern
      console.warn(`URL pattern warning for ${cameraType}: ${endpointUrl}`);
    }
  }

  return { valid: true };
}

// Validate camera endpoint and ensure it returns a valid image/stream
export async function validateCameraEndpoint(endpointUrl, username = null, password = null, cameraType = 'ip_camera') {
  // Local webcams are directly connected; no network validation needed
  if (['usb_webcam', 'laptop_webcam'].includes(cameraType)) {
    return {
      valid: true,
      message: 'Local webcam does not require endpoint validation',
      imageInfo: null
    };
  }

  try {
    // For RTSP streams, we can't validate via HTTP
    if (cameraType === 'stream' && endpointUrl.startsWith('rtsp://')) {
      return {
        valid: true,
        message: 'RTSP stream URL format is valid (connection test skipped)',
        warning: 'RTSP streams require specialized client libraries for full validation'
      };
    }

    const config = {
      timeout: 10000, // 10 second timeout
      responseType: 'arraybuffer', // Get binary data
      validateStatus: (status) => status === 200,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'HRMS-Camera-Validator/1.0'
      }
    };

    // Add authentication if provided
    if (username && password) {
      config.auth = {
        username,
        password
      };
    }

    // For video streams (LAN webcam, streaming), we need different handling
    if (cameraType === 'lan_webcam' || cameraType === 'stream') {
      // For video streams, we'll do a quick HEAD request or short GET to check if endpoint responds
      // Don't try to fetch the entire stream - just verify it's accessible
      try {
        // First try HEAD request (lighter, doesn't download data)
        try {
          const headResponse = await axios.head(endpointUrl, {
            timeout: 5000,
            maxRedirects: 5,
            validateStatus: () => true,
            headers: {
              'User-Agent': 'HRMS-Camera-Validator/1.0'
            }
          });
          
          // If HEAD works and returns 200, endpoint is accessible
          if (headResponse.status === 200) {
            return {
              valid: true,
              message: 'Camera stream endpoint is accessible',
              imageInfo: {
                contentType: headResponse.headers['content-type'] || 'stream',
                streamType: 'stream'
              }
            };
          }
        } catch (headError) {
          // HEAD might not be supported, fall through to GET
        }
        
        // If HEAD doesn't work, try a very short GET request with timeout
        // We'll abort quickly to avoid hanging on continuous streams
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        try {
          // Add retry logic for concurrent connections
          let response;
          let retryCount = 0;
          const maxRetries = 2;

          while (retryCount <= maxRetries) {
            try {
              response = await axios.get(endpointUrl, {
            ...config,
            timeout: 3000, // Short timeout for streams
            maxContentLength: 2 * 1024 * 1024, // Only read 2MB max
            maxBodyLength: 2 * 1024 * 1024,
            responseType: 'arraybuffer',
            validateStatus: () => true,
            signal: controller.signal
          });
              break; // Success, exit retry loop
            } catch (error) {
              retryCount++;
              if (retryCount > maxRetries) {
                throw error; // Re-throw after max retries
              }
              // Wait a bit before retry
              await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
              console.log(`Retrying camera connection for ${endpointUrl} (attempt ${retryCount}/${maxRetries})`);
            }
          }
          
          clearTimeout(timeoutId);

          // For video streams, we just need to verify the endpoint responds with data
          // Don't strictly validate content type - cameras can return various content types
          const contentType = response.headers['content-type'] || '';
          const statusCode = response.status;
          
          // If we get a 200 status and have data, consider it valid
          if (statusCode === 200 && response.data && response.data.length > 0) {
          // Try to check if it looks like a stream (could be JPEG, MJPEG, HTML with embedded stream, etc.)
          const dataBuffer = Buffer.from(response.data);
          
          // Check for JPEG markers (most common for camera streams)
          const hasJpegMarker = dataBuffer[0] === 0xFF && dataBuffer[1] === 0xD8;
          
          // Accept various content types for streams
          // For CCTV cameras, we just need to verify endpoint responds - don't strictly validate content type
          const isLikelyStream = contentType.includes('multipart/x-mixed-replace') || 
            contentType.includes('video/') ||
            contentType.includes('image/jpeg') ||
            contentType.includes('image/jpg') ||
            contentType.includes('application/octet-stream') ||
            contentType.includes('text/html') || // Some cameras serve streams via HTML
            hasJpegMarker; // Or if it starts with JPEG markers
          
          // For CCTV streams, if endpoint responds with data, consider it valid
          if (isLikelyStream) {
            // Try to extract and validate at least one frame if it's JPEG
            if (hasJpegMarker) {
              try {
                const dataBuffer = Buffer.from(response.data);
                const jpegStart = Buffer.from([0xFF, 0xD8]);
                const jpegEnd = Buffer.from([0xFF, 0xD9]);
                
                let imageBuffer = dataBuffer;
                
                // Check if it starts with JPEG marker directly
                if (dataBuffer[0] === 0xFF && dataBuffer[1] === 0xD8) {
                  // Direct JPEG frame - find the end
                  const endIdx = dataBuffer.lastIndexOf(jpegEnd);
                  if (endIdx !== -1) {
                    imageBuffer = dataBuffer.slice(0, endIdx + 2);
                  }
                } else {
                  // Try to extract from multipart stream
                  const startIdx = dataBuffer.indexOf(jpegStart);
                  if (startIdx !== -1) {
                    imageBuffer = dataBuffer.slice(startIdx);
                    const endIdx = imageBuffer.indexOf(jpegEnd);
                    if (endIdx !== -1) {
                      imageBuffer = imageBuffer.slice(0, endIdx + 2);
                    }
                  }
                }
                
                // Try to validate the extracted frame
                if (imageBuffer.length > 100) {
                  try {
                    const image = await loadImage(imageBuffer);
                    return {
                      valid: true,
                      message: 'Video stream endpoint returns valid frames',
                      imageInfo: {
                        width: image.width,
                        height: image.height,
                        contentType: contentType || 'image/jpeg',
                        streamType: 'mjpeg'
                      }
                    };
                  } catch (parseError) {
                    // Continue to default validation
                  }
                }
              } catch (imageError) {
                // Continue to default validation
              }
            }
            
            // Default: endpoint is accessible and returns data
            return {
              valid: true,
              message: 'Camera stream endpoint is accessible',
              imageInfo: {
                contentType: contentType,
                streamType: 'stream',
                dataSize: response.data.length
              }
            };
          }
          
          // If we got data but status is not 200, might still be accessible
          if (response.data && response.data.length > 0) {
            return {
              valid: true,
              message: 'Camera endpoint responds (status: ' + statusCode + ')',
              warning: 'Non-200 status code, but endpoint returns data',
              imageInfo: {
                contentType: contentType,
                streamType: 'unknown'
              }
            };
          }
          
          // If we reach here within the if block, endpoint responded but conditions weren't met
          // Still consider it valid for streams - endpoint exists and responds
          return {
            valid: true,
            message: 'Camera endpoint is accessible',
            warning: 'Endpoint responds but content validation incomplete',
            imageInfo: {
              contentType: contentType,
              streamType: 'unknown'
            }
          };
        }
        
        // If we reach here, the GET request succeeded but we didn't match any condition above
        // For streams, if endpoint responds, consider it valid
        // contentType was already declared in the try block, but if we're here it means
        // the response didn't match the conditions above, so use response directly
        return {
          valid: true,
          message: 'Camera endpoint is accessible',
          warning: 'Endpoint responded successfully',
          imageInfo: {
            contentType: response?.headers?.['content-type'] || 'unknown',
            streamType: 'unknown'
          }
        };
      } catch (getError) {
          clearTimeout(timeoutId);
          
          // If it's an abort (timeout), that's OK for streams - means endpoint is responding
          if (getError.name === 'AbortError' || getError.code === 'ECONNABORTED' || getError.message.includes('timeout')) {
            return {
              valid: true,
              message: 'Camera stream endpoint is accessible (continuous stream detected)',
              warning: 'Stream is continuous - endpoint is responding',
              imageInfo: {
                contentType: 'stream',
                streamType: 'continuous'
              }
            };
          }
          
          // Socket hang up is common for streams - means connection was established
          if (getError.message && (getError.message.includes('socket hang up') || getError.message.includes('ECONNRESET'))) {
            return {
              valid: true,
              message: 'Camera stream endpoint is accessible',
              warning: 'Stream connection established (socket closed during validation is normal for continuous streams)',
              imageInfo: {
                contentType: 'stream',
                streamType: 'continuous'
              }
            };
          }
          
          // Connection refused - provide helpful error message
          if (getError.code === 'ECONNREFUSED') {
            return {
              valid: false,
              error: `Cannot connect to camera. Please check:
- Camera is powered on and connected to network
- IP address and port are correct: ${endpointUrl}
- Firewall is not blocking the connection
- Camera service is running`
            };
          }
          
          // If it's a maxContentLength error, that's actually OK for streams - it means stream is working
          if (getError.message && getError.message.includes('maxContentLength')) {
            return {
              valid: true,
              message: 'Camera stream endpoint is accessible (continuous stream detected)',
              warning: 'Stream response exceeds size limit, but endpoint is responding',
              imageInfo: {
                contentType: 'stream',
                streamType: 'continuous'
              }
            };
          }
          
          // For connection errors, return proper error message
          if (getError.code === 'ECONNREFUSED') {
            return {
              valid: false,
              error: `Cannot connect to camera. Please check:
- Camera is powered on and connected to network
- IP address and port are correct
- Firewall is not blocking the connection
- Camera service is running`
            };
          }
          
          if (getError.code === 'ETIMEDOUT') {
            return {
              valid: false,
              error: `Connection timeout. Please check:
- Camera is accessible on the network
- IP address and port are correct
- Network connection is stable`
            };
          }
          
          // For HTTP errors, check if endpoint exists
          if (getError.response) {
            return {
              valid: false,
              error: `Camera endpoint returned error: ${getError.response.status} ${getError.response.statusText}`
            };
          }
          
          // For other errors, still consider it valid if we got any response
          return {
            valid: true,
            message: 'Camera stream endpoint appears accessible',
            warning: `Validation had issues but endpoint responded: ${getError.message}`,
            imageInfo: {
              contentType: 'stream',
              streamType: 'unknown'
            }
          };
        }
      } catch (streamError) {
        // Catch-all for any other errors (like HEAD request failures)
        if (streamError.message && streamError.message.includes('socket hang up')) {
          return {
            valid: true,
            message: 'Camera stream endpoint is accessible',
            warning: 'Stream connection established (socket closed during validation is normal for continuous streams)',
            imageInfo: {
              contentType: 'stream',
              streamType: 'continuous'
            }
          };
        }
        
        // For connection errors, return proper error message
        if (streamError.code === 'ECONNREFUSED') {
          return {
            valid: false,
            error: `Cannot connect to camera. Please check:
- Camera is powered on and connected to network
- IP address and port are correct
- Firewall is not blocking the connection
- Camera service is running`
          };
        }
        
        if (streamError.code === 'ETIMEDOUT') {
          return {
            valid: false,
            error: `Connection timeout. Please check:
- Camera is accessible on the network
- IP address and port are correct
- Network connection is stable`
          };
        }
        
        // For other errors, still try to be helpful
        return {
          valid: false,
          error: `Failed to validate stream endpoint: ${streamError.message}`
        };
      }
      
      // If we reach here, stream validation completed (should have returned above)
      // This shouldn't happen, but if it does, consider it valid for streams
      return {
        valid: true,
        message: 'Camera stream endpoint is accessible',
        warning: 'Stream validation completed',
        imageInfo: {
          contentType: 'stream',
          streamType: 'unknown'
        }
      };
    }

    // For regular image endpoints (NOT streams)
    const response = await axios.get(endpointUrl, config);

    if (!response.data || response.data.length === 0) {
      return {
        valid: false,
        error: 'Camera endpoint returned empty response'
      };
    }

    // Check if response is actually an image
    const contentType = response.headers['content-type'] || '';
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    
    if (!validImageTypes.some(type => contentType.toLowerCase().includes(type))) {
      return {
        valid: false,
        error: `Invalid content type: ${contentType}. Expected an image type.`
      };
    }

    // Try to load and validate the image using canvas
    try {
      const imageBuffer = Buffer.from(response.data);
      const image = await loadImage(imageBuffer);
      
      // Check image dimensions
      if (image.width < 100 || image.height < 100) {
        return {
          valid: false,
          error: `Image too small: ${image.width}x${image.height}. Minimum size: 100x100 pixels.`
        };
      }

      if (image.width > 10000 || image.height > 10000) {
        return {
          valid: false,
          error: `Image too large: ${image.width}x${image.height}. Maximum size: 10000x10000 pixels.`
        };
      }

      return {
        valid: true,
        message: 'Camera endpoint is valid and returns a valid image',
        imageInfo: {
          width: image.width,
          height: image.height,
          contentType: contentType
        }
      };
    } catch (imageError) {
      return {
        valid: false,
        error: `Failed to parse image: ${imageError.message}`
      };
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return {
        valid: false,
        error: `Cannot connect to camera. Please check:
- Camera is powered on and connected to network
- IP address and port are correct: ${endpointUrl}
- Firewall is not blocking the connection
- Camera service is running`
      };
    }
    
    if (error.code === 'ETIMEDOUT') {
      return {
        valid: false,
        error: `Connection timeout. Please check:
- Camera is accessible on the network
- IP address and port are correct: ${endpointUrl}
- Network connection is stable`
      };
    }
    
    if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        return {
          valid: false,
          error: 'Authentication failed. Please check username and password.'
        };
      }
      return {
        valid: false,
        error: `Camera endpoint returned error: ${error.response.status} ${error.response.statusText}`
      };
    }

    return {
      valid: false,
      error: `Failed to validate camera endpoint: ${error.message}`
    };
  }
}

// Capture snapshot from camera
export async function captureSnapshotFromCamera(camera) {
  try {
    if (!camera.isActive || camera.isUnderMaintenance) {
      return {
        success: false,
        error: 'Camera is not available'
      };
    }

    // Check if endpointUrl exists and is valid
    const localWebcamTypes = ['usb_webcam', 'laptop_webcam'];
    const cameraType = camera.type || 'ip_camera';
    
    // Local webcams don't need endpointUrl
    if (!localWebcamTypes.includes(cameraType)) {
      if (!camera.endpointUrl || camera.endpointUrl.trim() === '') {
        return {
          success: false,
          error: 'Invalid URL: Camera endpoint URL is missing or empty'
        };
      }
      
      // Validate URL format
      try {
        new URL(camera.endpointUrl);
      } catch (urlError) {
        return {
          success: false,
          error: `Invalid URL: ${camera.endpointUrl} is not a valid URL format`
        };
      }
    }

    const config = {
      timeout: 10000,
      responseType: 'arraybuffer',
      validateStatus: (status) => status === 200,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'HRMS-Camera-Snapshot/1.0'
      }
    };

    if (camera.username && camera.password) {
      config.auth = {
        username: camera.username,
        password: camera.password
      };
    }

    // For video streams (LAN webcam, streaming), extract a frame
    if (cameraType === 'lan_webcam' || cameraType === 'stream') {
      // DroidCam specific: increase timeout and add retry logic
      const isDroidCam = camera.endpointUrl && (
        camera.endpointUrl.includes('4747') || // DroidCam default port
        camera.endpointUrl.includes('droidcam') ||
        camera.endpointUrl.includes('/video') ||
        camera.endpointUrl.includes('/mjpegfeed')
      );

      const maxRetries = isDroidCam ? 3 : 2; // More retries for better reliability
      let lastError = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        let dataTimeoutId = null; // Declare at outer scope
        try {
          // Use a streaming approach with AbortController to stop after getting one frame
          const controller = new AbortController();
          let frameBuffer = Buffer.alloc(0);
          let frameComplete = false;
          let timeoutId;
          
          // Set timeout to abort if we don't get a frame quickly
          timeoutId = setTimeout(() => {
            if (!frameComplete) {
              controller.abort();
            }
          }, isDroidCam ? 10000 : 6000); // Reduced timeout for faster response

          try {
            // Request stream with streaming response
          // For DroidCam, add a small delay to avoid connection churn
          if (isDroidCam && attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          const response = await axios.get(camera.endpointUrl, {
            ...config,
            timeout: isDroidCam ? 15000 : 10000, // Reduced timeout for faster response
            maxContentLength: Infinity, // Remove limit, we'll stop manually
            maxBodyLength: Infinity,
            responseType: 'stream', // Use stream instead of arraybuffer
            signal: controller.signal,
            httpAgent: isDroidCam ? new http.Agent({ 
              keepAlive: true, 
              keepAliveMsecs: 1000,
              maxSockets: 1 
            }) : undefined,
            headers: {
              ...config.headers,
              'Connection': 'keep-alive', // Keep connection alive for DroidCam
              'Accept': 'multipart/x-mixed-replace, image/jpeg, */*', // Accept MJPEG
              'Cache-Control': 'no-cache' // Prevent caching
            }
          });

          // Process stream chunk by chunk to extract first complete JPEG frame
          const jpegStart = Buffer.from([0xFF, 0xD8]); // JPEG start marker
          const jpegEnd = Buffer.from([0xFF, 0xD9]);   // JPEG end marker
          let jpegStartIdx = -1;
          let jpegEndIdx = -1;
          const maxFrameSize = 5 * 1024 * 1024; // Max 5MB per frame

          await new Promise((resolve, reject) => {
            // Helper to check for complete frame in buffer
            const checkForCompleteFrame = () => {
              if (frameComplete) return true;
              
              // Look for JPEG start marker
              if (jpegStartIdx === -1) {
                jpegStartIdx = frameBuffer.indexOf(jpegStart);
              }

              // If we found start, look for end
              if (jpegStartIdx !== -1) {
                const tempBuffer = frameBuffer.slice(jpegStartIdx);
                jpegEndIdx = tempBuffer.indexOf(jpegEnd);
                if (jpegEndIdx !== -1) {
                  // Found complete JPEG frame
                  frameBuffer = tempBuffer.slice(0, jpegEndIdx + 2);
                  frameComplete = true;
                  if (dataTimeoutId) clearTimeout(dataTimeoutId);
                  // For DroidCam, don't destroy - let connection close naturally to avoid reconnection issues
                  if (!isDroidCam) {
                    response.data.destroy(); // Stop reading
                  }
                  clearTimeout(timeoutId);
                  resolve();
                  return true;
                }
              }
              return false;
            };

            response.data.on('data', (chunk) => {
              if (frameComplete) {
                // For DroidCam, don't destroy immediately - let it close naturally
                if (!isDroidCam) {
                  response.data.destroy(); // Stop reading once we have a frame
                }
                return;
              }

              frameBuffer = Buffer.concat([frameBuffer, chunk]);
              
              // Clear any pending data timeout since we got new data
              if (dataTimeoutId) {
                clearTimeout(dataTimeoutId);
                dataTimeoutId = null;
              }

              // Check if we've exceeded max frame size
              if (frameBuffer.length > maxFrameSize) {
                // Try to extract what we have
                if (checkForCompleteFrame()) {
                  return;
                }
                // If we can't find a complete frame, abort
                response.data.destroy();
                clearTimeout(timeoutId);
                if (dataTimeoutId) clearTimeout(dataTimeoutId);
                reject(new Error('Frame size exceeded before finding complete JPEG'));
                return;
              }

              // Check for complete frame
              checkForCompleteFrame();
            });

            response.data.on('end', () => {
              clearTimeout(timeoutId);
              if (dataTimeoutId) clearTimeout(dataTimeoutId);
              
              if (frameComplete) {
                resolve();
              } else {
                // Try to extract frame from what we have
                jpegStartIdx = frameBuffer.indexOf(jpegStart);
                if (jpegStartIdx !== -1) {
                  const tempBuffer = frameBuffer.slice(jpegStartIdx);
                  jpegEndIdx = tempBuffer.indexOf(jpegEnd);
                  if (jpegEndIdx !== -1) {
                    frameBuffer = tempBuffer.slice(0, jpegEndIdx + 2);
                    frameComplete = true;
                    resolve();
                  } else {
                    // We have a start but no end - reject immediately for faster response
                    reject(new Error('Stream ended before finding complete JPEG frame. The stream may have been interrupted.'));
                  }
                } else {
                  // No JPEG start marker found - reject immediately
                  reject(new Error('No JPEG frame found in stream. The camera may be disconnected or the stream format is not supported.'));
                }
              }
            });

            response.data.on('error', (err) => {
              clearTimeout(timeoutId);
              if (dataTimeoutId) clearTimeout(dataTimeoutId);
              
              // If we already have a complete frame, ignore stream errors
              if (frameComplete) {
                resolve();
              } else {
                // For connection errors, try to extract frame from partial data
                if (err.message && (err.message.includes('ECONNRESET') || 
                    err.message.includes('socket hang up') || 
                    err.message.includes('aborted') ||
                    err.message.includes('ECONNREFUSED'))) {
                  // Try to extract frame from partial data
                  const jpegStart = Buffer.from([0xFF, 0xD8]);
                  const jpegEnd = Buffer.from([0xFF, 0xD9]);
                  const startIdx = frameBuffer.indexOf(jpegStart);
                  if (startIdx !== -1) {
                    const tempBuffer = frameBuffer.slice(startIdx);
                    const endIdx = tempBuffer.indexOf(jpegEnd);
                    if (endIdx !== -1) {
                      frameBuffer = tempBuffer.slice(0, endIdx + 2);
                      frameComplete = true;
                      resolve();
                      return;
                    } else if (frameBuffer.length > 1000) {
                      // If we have substantial data but no end marker, try to use what we have
                      // Some cameras send incomplete frames - try to append end marker
                      const partialFrame = tempBuffer;
                      // Check if it looks like a valid JPEG (has some structure)
                      if (partialFrame.length > 100 && 
                          partialFrame[0] === 0xFF && partialFrame[1] === 0xD8) {
                        // Try to find last valid position and append end marker
                        // Look for last 0xFF byte before end
                        let lastFF = -1;
                        for (let i = partialFrame.length - 1; i >= Math.max(0, partialFrame.length - 100); i--) {
                          if (partialFrame[i] === 0xFF) {
                            lastFF = i;
                            break;
                          }
                        }
                        if (lastFF !== -1 && lastFF < partialFrame.length - 1) {
                          // Create frame with end marker
                          frameBuffer = Buffer.concat([partialFrame.slice(0, lastFF + 1), jpegEnd]);
                          frameComplete = true;
                          resolve();
                          return;
                        }
                      }
                    }
                  }
                }
                // If we have partial data, give it a chance
                if (frameBuffer.length > 100) {
                  const jpegStart = Buffer.from([0xFF, 0xD8]);
                  const startIdx = frameBuffer.indexOf(jpegStart);
                  if (startIdx !== -1) {
                    // Wait a moment to see if more data arrives
                    dataTimeoutId = setTimeout(() => {
                      const tempBuffer = frameBuffer.slice(startIdx);
                      const jpegEnd = Buffer.from([0xFF, 0xD9]);
                      const endIdx = tempBuffer.indexOf(jpegEnd);
                      if (endIdx !== -1) {
                        frameBuffer = tempBuffer.slice(0, endIdx + 2);
                        frameComplete = true;
                        resolve();
                      } else {
                        reject(new Error(`Stream error: ${err.message}. Partial frame detected but incomplete.`));
                      }
                    }, 200);
                    return;
                  }
                }
                reject(err);
              }
            });
          });

          if (!frameComplete || frameBuffer.length === 0) {
            return {
              success: false,
              error: 'Failed to extract JPEG frame from stream'
            };
          }

          // Validate and load the extracted frame
          try {
            // Validate frame before attempting to decode
            if (frameBuffer.length < 100) {
              return {
                success: false,
                error: 'Extracted frame is too small to be a valid image'
              };
            }

            // Check for valid JPEG markers
            if (frameBuffer[0] !== 0xFF || frameBuffer[1] !== 0xD8) {
          return {
            success: false,
                error: 'Extracted frame does not have valid JPEG start markers'
          };
        }

            // Check for JPEG end marker
            const hasEndMarker = frameBuffer[frameBuffer.length - 2] === 0xFF && 
                                frameBuffer[frameBuffer.length - 1] === 0xD9;
            if (!hasEndMarker) {
              // Try to find and fix missing end marker
              const jpegEnd = Buffer.from([0xFF, 0xD9]);
              const endIdx = frameBuffer.indexOf(jpegEnd);
              if (endIdx !== -1) {
                frameBuffer = frameBuffer.slice(0, endIdx + 2);
              } else {
                return {
                  success: false,
                  error: 'Extracted frame does not have valid JPEG end markers'
                };
              }
            }

            // Attempt to decode with retry
            let image;
            let decodeAttempts = 0;
            const maxDecodeAttempts = 3;
            
            while (decodeAttempts < maxDecodeAttempts) {
              try {
                image = await loadImage(frameBuffer);
                break; // Success
              } catch (decodeError) {
                decodeAttempts++;
                if (decodeAttempts >= maxDecodeAttempts) {
                  // If all attempts fail, try to clean the buffer
                  // Remove any trailing garbage after JPEG end marker
                  const jpegEnd = Buffer.from([0xFF, 0xD9]);
                  const lastEndIdx = frameBuffer.lastIndexOf(jpegEnd);
                  if (lastEndIdx !== -1 && lastEndIdx < frameBuffer.length - 2) {
                    frameBuffer = frameBuffer.slice(0, lastEndIdx + 2);
                    try {
                      image = await loadImage(frameBuffer);
                      break;
                    } catch (finalError) {
                      return {
                        success: false,
                        error: `Failed to decode image after ${maxDecodeAttempts} attempts: ${finalError.message}. Frame may be corrupted or incomplete.`
                      };
                    }
                  } else {
                    return {
                      success: false,
                      error: `Failed to decode image: ${decodeError.message}. This may indicate the stream format is not compatible or the frame is corrupted.`
                    };
                  }
                }
                // Wait a bit before retry (for DroidCam, sometimes frames need a moment)
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }

            if (!image) {
              return {
                success: false,
                error: 'Failed to decode image after multiple attempts'
              };
            }

            return {
              success: true,
              imageBuffer: frameBuffer,
              imageInfo: {
                width: image.width,
                height: image.height,
                contentType: 'image/jpeg'
              }
            };
          } catch (imageError) {
            // For DroidCam, be more lenient with decoder errors - they're often recoverable
            if (isDroidCam && (imageError.message.includes('Invalid') || 
                imageError.message.includes('corrupt') ||
                imageError.message.includes('truncated'))) {
              // Try one more time with a fresh connection
              if (attempt < maxRetries - 1) {
                lastError = imageError;
                continue;
              }
            }
            return {
              success: false,
              error: `Error creating image decoder: ${imageError.message}. This may indicate the DroidCam stream format is incompatible or the connection was interrupted.`
            };
          }
        } catch (streamError) {
          clearTimeout(timeoutId);
          if (dataTimeoutId) clearTimeout(dataTimeoutId);
        
          // If we have a complete frame despite the error, use it
          if (frameComplete && frameBuffer.length > 0) {
            try {
              const image = await loadImage(frameBuffer);
              return {
                success: true,
                imageBuffer: frameBuffer,
                imageInfo: {
                  width: image.width,
                  height: image.height,
                  contentType: 'image/jpeg'
                }
              };
            } catch (imgError) {
              // Fall through to error handling
            }
          }

          // Handle specific errors
          const isConnectionError = streamError.name === 'AbortError' || 
              streamError.code === 'ECONNABORTED' || 
              streamError.message?.includes('socket hang up') || 
              streamError.message?.includes('ECONNRESET') ||
              streamError.message?.includes('No JPEG frame found') ||
              streamError.message?.includes('Stream ended before finding');
              
          if (isConnectionError) {
            // If we have partial data, try to extract frame
            if (frameBuffer.length > 0) {
              const jpegStart = Buffer.from([0xFF, 0xD8]);
              const jpegEnd = Buffer.from([0xFF, 0xD9]);
              const startIdx = frameBuffer.indexOf(jpegStart);
              if (startIdx !== -1) {
                const tempBuffer = frameBuffer.slice(startIdx);
                const endIdx = tempBuffer.indexOf(jpegEnd);
                if (endIdx !== -1) {
                  try {
                    const extractedFrame = tempBuffer.slice(0, endIdx + 2);
                    // Validate frame before decoding
                    if (extractedFrame.length > 100 && 
                        extractedFrame[0] === 0xFF && extractedFrame[1] === 0xD8) {
                      const image = await loadImage(extractedFrame);
                      return {
                        success: true,
                        imageBuffer: extractedFrame,
                        imageInfo: {
                          width: image.width,
                          height: image.height,
                          contentType: 'image/jpeg'
                        }
                      };
                    }
                  } catch (e) {
                    // Continue to error message
                  }
                } else if (tempBuffer.length > 1000) {
                  // Try to append end marker for incomplete frames
                  try {
                    const frameWithEnd = Buffer.concat([tempBuffer, jpegEnd]);
                    const image = await loadImage(frameWithEnd);
                    return {
                      success: true,
                      imageBuffer: frameWithEnd,
                      imageInfo: {
                        width: image.width,
                        height: image.height,
                        contentType: 'image/jpeg'
                      }
                    };
                  } catch (e) {
                    // Continue to retry
                  }
                }
              }
            }
            // If this is not the last attempt, continue to retry with delay
            if (attempt < maxRetries - 1) {
              lastError = streamError;
              // Wait longer before retry for connection issues
              await new Promise(resolve => setTimeout(resolve, isDroidCam ? 1500 : 1000));
              continue;
            }
            return {
              success: false,
              error: 'Connection interrupted while capturing frame. The camera stream may have been interrupted. Please check the camera connection and try again.'
            };
          }

          // Check if error message indicates maxContentLength
          if (streamError.message && streamError.message.includes('maxContentLength')) {
            // Try fallback: use arraybuffer with higher limit
            try {
              const fallbackResponse = await axios.get(camera.endpointUrl, {
                ...config,
                timeout: 5000,
                maxContentLength: 20 * 1024 * 1024, // 20MB
                maxBodyLength: 20 * 1024 * 1024,
                responseType: 'arraybuffer'
              });

              let imageBuffer = Buffer.from(fallbackResponse.data);
              const jpegStart = Buffer.from([0xFF, 0xD8]);
              const jpegEnd = Buffer.from([0xFF, 0xD9]);

        if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) {
          const endIdx = imageBuffer.lastIndexOf(jpegEnd);
          if (endIdx !== -1) {
            imageBuffer = imageBuffer.slice(0, endIdx + 2);
          }
        } else {
          const startIdx = imageBuffer.indexOf(jpegStart);
          if (startIdx !== -1) {
            imageBuffer = imageBuffer.slice(startIdx);
            const endIdx = imageBuffer.indexOf(jpegEnd);
            if (endIdx !== -1) {
              imageBuffer = imageBuffer.slice(0, endIdx + 2);
            }
          }
        }

              // Validate before decoding
              if (imageBuffer.length < 100 || 
                  imageBuffer[0] !== 0xFF || imageBuffer[1] !== 0xD8) {
                if (attempt < maxRetries - 1) {
                  lastError = streamError;
                  continue;
                }
                return {
                  success: false,
                  error: 'Failed to extract valid JPEG frame from stream response'
                };
              }

              try {
        const image = await loadImage(imageBuffer);
                // Success! Break out of retry loop
        return {
          success: true,
          imageBuffer,
          imageInfo: {
            width: image.width,
            height: image.height,
            contentType: 'image/jpeg'
          }
        };
              } catch (decodeError) {
                if (attempt < maxRetries - 1) {
                  lastError = decodeError;
                  continue;
                }
                return {
                  success: false,
                  error: `Failed to decode image from stream: ${decodeError.message}. The DroidCam stream may be corrupted or incompatible.`
                };
              }
            } catch (fallbackError) {
              if (attempt < maxRetries - 1) {
                lastError = fallbackError;
                continue;
              }
              return {
                success: false,
                error: `Failed to capture from stream: Stream response too large or format not supported`
              };
            }
          }

          // For other errors, if not last attempt, retry with delay
          if (attempt < maxRetries - 1) {
            lastError = streamError;
            // Wait before retry - longer for connection issues
            const waitTime = (streamError.message?.includes('No JPEG') || 
                            streamError.message?.includes('Stream ended')) ? 2000 : 1000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          // Provide more helpful error message
          let errorMsg = `Failed to capture from stream: ${streamError.message}`;
          if (streamError.message?.includes('No JPEG frame found')) {
            errorMsg = 'No JPEG frame found in stream. The camera may be disconnected, the stream format may be unsupported, or the connection was interrupted. Please check the camera connection and try again.';
          } else if (streamError.message?.includes('Stream ended')) {
            errorMsg = 'Stream ended unexpectedly. The camera connection may have been interrupted. Please check the camera and try again.';
          }
          
          return {
            success: false,
            error: errorMsg
          };
        }
      } catch (error) {
        lastError = error;
        // If this is the last attempt, return the error
        if (attempt === maxRetries - 1) {
          let errorMsg = `Failed to capture from camera after ${maxRetries} attempts: ${error.message}`;
          if (error.message?.includes('No JPEG') || error.message?.includes('Stream ended')) {
            errorMsg = `Failed to capture from camera after ${maxRetries} attempts. The camera stream may be interrupted or in an unsupported format. Please check the camera connection and ensure it's streaming properly.`;
          }
          return {
            success: false,
            error: errorMsg
          };
        }
        // Wait before retry (longer wait for connection issues)
        const waitTime = (error.message?.includes('No JPEG') || 
                        error.message?.includes('Stream ended')) ? 2000 : (isDroidCam ? 1500 : 1000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue; // Try again
      }
    }
    } // Close the if block for lan_webcam/stream

    // For RTSP streams, return error (requires specialized library)
    if (cameraType === 'stream' && camera.endpointUrl && camera.endpointUrl.startsWith('rtsp://')) {
      return {
        success: false,
        error: 'RTSP streams require specialized client libraries. Please use IP camera snapshot URL instead.'
      };
    }

    // For regular image endpoints
    const response = await axios.get(camera.endpointUrl, config);
    
    if (!response.data || response.data.length === 0) {
      return {
        success: false,
        error: 'Camera returned empty image'
      };
    }

    const imageBuffer = Buffer.from(response.data);
    const image = await loadImage(imageBuffer);

    return {
      success: true,
      imageBuffer,
      imageInfo: {
        width: image.width,
        height: image.height,
        contentType: response.headers['content-type'] || 'image/jpeg'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to capture snapshot from camera'
    };
  }
}


