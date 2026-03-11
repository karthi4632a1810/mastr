import Camera from '../models/camera.model.js';
import AuditLog from '../models/auditLog.model.js';
import { validateCameraEndpoint, captureSnapshotFromCamera, validateCameraUrlFormat } from '../services/cameraValidation.service.js';
import { stopCameraMonitoring, startLiveDetections, getLiveDetections, addSharedStreamClient } from '../services/cameraMonitoring.service.js';
import CameraAssignment from '../models/cameraAssignment.model.js';
import Employee from '../models/employee.model.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get all cameras
export const getCameras = async (req, res) => {
  try {
    const { isActive, location, type } = req.query;
    const filter = {};

    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (location) filter.location = location;
    if (type) filter.type = type;

    const cameras = await Camera.find(filter)
      .populate('location', 'name code')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email')
      .sort({ name: 1 });

    res.json({ success: true, data: cameras });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single camera
export const getCamera = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id)
      .populate('location', 'name code')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');

    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }

    res.json({ success: true, data: camera });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create camera
export const createCamera = async (req, res) => {
  try {
    const { name, type, endpointUrl, ipAddress, port, session, location, locationTag, username, password, description, isActive } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required'
      });
    }

    const localWebcamTypes = ['usb_webcam', 'laptop_webcam'];

    // Build endpoint URL if using IP/Port/Session for IP Camera or LAN Webcam
    let finalEndpointUrl = endpointUrl;
    if ((type === 'ip_camera' || type === 'lan_webcam') && ipAddress && port) {
      const protocol = port === 443 ? 'https' : 'http';
      finalEndpointUrl = `${protocol}://${ipAddress}:${port}`;
      if (session) {
        finalEndpointUrl += `/${session}`;
      }
    }
    
    // Local webcams don't need endpoint URL
    if (localWebcamTypes.includes(type)) {
      finalEndpointUrl = null;
    }

    // Validate endpoint URL format based on camera type (only if endpoint URL is provided)
    if (finalEndpointUrl) {
      const urlValidation = validateCameraUrlFormat(finalEndpointUrl, type);
      if (!urlValidation.valid) {
        return res.status(400).json({
          success: false,
          message: urlValidation.error || 'Invalid endpoint URL format'
        });
      }
    } else if (!localWebcamTypes.includes(type)) {
      // Most camera types need endpoint URL, except local webcams
      const needsEndpoint = ['http_snapshot', 'stream'].includes(type);
      const needsIpPort = ['ip_camera', 'lan_webcam'].includes(type);
      if (needsEndpoint && !finalEndpointUrl) {
        return res.status(400).json({
          success: false,
          message: 'Endpoint URL is required for this camera type'
        });
      }
      
      if (needsIpPort && (!ipAddress || !port)) {
        return res.status(400).json({
          success: false,
          message: 'IP Address and Port are required for this camera type'
        });
      }
    }

    // Create camera without automatic validation - user can test manually
    const camera = await Camera.create({
      name,
      type,
      endpointUrl: finalEndpointUrl || null,
      ipAddress: ipAddress || null,
      port: port ? parseInt(port) : null,
      session: session || null,
      location: location || null,
      locationTag: locationTag || '',
      username: username || null,
      password: password || null,
      description: description || '',
      isActive: isActive !== undefined ? isActive : true,
      lastValidatedAt: null,
      lastValidationStatus: 'pending',
      lastValidationError: null,
      createdBy: req.user._id
    });

    const populatedCamera = await Camera.findById(camera._id)
      .populate('location', 'name code')
      .populate('createdBy', 'email');

    const successMessage = 'Camera created successfully';

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CREATE_CAMERA',
      resource: `camera:${camera._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 201,
      requestBody: {
        name,
        type,
        endpointUrl,
        location,
        locationTag
      },
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: successMessage,
      data: populatedCamera
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update camera
export const updateCamera = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }

    const { name, type, endpointUrl, ipAddress, port, session, location, locationTag, username, password, description, isActive, isUnderMaintenance } = req.body;

    // Build endpoint URL if using IP/Port/Session
    const finalIpAddress = ipAddress !== undefined ? ipAddress : camera.ipAddress;
    const finalPort = port !== undefined ? port : camera.port;
    const finalSession = session !== undefined ? session : camera.session;
    let finalEndpointUrl = endpointUrl;
    
    const newType = type !== undefined ? type : camera.type;
    const localWebcamTypes = ['usb_webcam', 'laptop_webcam'];
    const isLocalWebcam = localWebcamTypes.includes(newType);

    if (isLocalWebcam) {
      finalEndpointUrl = null;
    } else if ((newType === 'ip_camera' || newType === 'lan_webcam') && finalIpAddress && finalPort) {
      const protocol = finalPort === 443 ? 'https' : 'http';
      finalEndpointUrl = `${protocol}://${finalIpAddress}:${finalPort}`;
      if (finalSession) {
        finalEndpointUrl += `/${finalSession}`;
      }
    }
    
    // If endpoint URL changed, just update it without validation - user can test manually
    if (finalEndpointUrl !== undefined && finalEndpointUrl !== camera.endpointUrl) {
      const needsEndpoint = ['http_snapshot', 'stream'].includes(newType);
      const needsIpPort = ['ip_camera', 'lan_webcam'].includes(newType);

      if (finalEndpointUrl) {
      const urlValidation = validateCameraUrlFormat(finalEndpointUrl, newType);
      if (!urlValidation.valid) {
        return res.status(400).json({
          success: false,
          message: urlValidation.error || 'Invalid endpoint URL format'
        });
      }
      } else if (!isLocalWebcam) {
        if (needsEndpoint) {
          return res.status(400).json({
            success: false,
            message: 'Endpoint URL is required for this camera type'
          });
        }
        if (needsIpPort && (!finalIpAddress || !finalPort)) {
          return res.status(400).json({
            success: false,
            message: 'IP Address and Port are required for this camera type'
          });
        }
      }
      
      camera.endpointUrl = finalEndpointUrl || null;
      // Reset validation status when endpoint changes - user needs to test again
      camera.lastValidatedAt = null;
      camera.lastValidationStatus = 'pending';
      camera.lastValidationError = null;
    }

    if (name !== undefined) camera.name = name;
    if (type !== undefined) camera.type = type;
    if (ipAddress !== undefined) camera.ipAddress = ipAddress || null;
    if (port !== undefined) camera.port = port ? parseInt(port) : null;
    if (session !== undefined) camera.session = session || null;
    if (location !== undefined) camera.location = location || null;
    if (locationTag !== undefined) camera.locationTag = locationTag;
    if (username !== undefined) camera.username = username || null;
    if (password !== undefined) camera.password = password || null;
    if (description !== undefined) camera.description = description;
    
    // If camera is being turned off or put under maintenance, stop monitoring
    const wasActive = camera.isActive;
    const wasUnderMaintenance = camera.isUnderMaintenance;
    
    if (isActive !== undefined) camera.isActive = isActive;
    if (isUnderMaintenance !== undefined) camera.isUnderMaintenance = isUnderMaintenance;
    
    // Stop monitoring if camera is being turned off or put under maintenance
    if ((isActive !== undefined && !isActive && wasActive) || 
        (isUnderMaintenance !== undefined && isUnderMaintenance && !wasUnderMaintenance)) {
      stopCameraMonitoring(camera._id.toString());
    }
    
    camera.updatedBy = req.user._id;

    await camera.save();

    const updatedCamera = await Camera.findById(camera._id)
      .populate('location', 'name code')
      .populate('updatedBy', 'email');

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE_CAMERA',
      resource: `camera:${camera._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: {
        name, type, endpointUrl, location, locationTag, isActive, isUnderMaintenance
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Camera updated successfully',
      data: updatedCamera
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete camera
export const deleteCamera = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }

    // Audit log before deletion
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DELETE_CAMERA',
      resource: `camera:${camera._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: {
        name: camera.name,
        endpointUrl: camera.endpointUrl
      },
      timestamp: new Date()
    });

    // Stop monitoring before deleting
    stopCameraMonitoring(camera._id.toString());

    await Camera.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Camera deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Validate camera endpoint (manual validation)
export const validateCamera = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id).select('+password');
    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }

    // Pass camera type to validation
    const validation = await validateCameraEndpoint(
      camera.endpointUrl,
      camera.username,
      camera.password,
      camera.type
    );

    // Update camera validation status
    camera.lastValidatedAt = new Date();
    camera.lastValidationStatus = validation.valid ? 'valid' : 'invalid';
    camera.lastValidationError = validation.valid ? null : validation.error;
    await camera.save();

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'VALIDATE_CAMERA',
      resource: `camera:${camera._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: validation.valid ? 200 : 400,
      requestBody: {
        validationResult: validation
      },
      timestamp: new Date()
    });

    res.json({
      success: validation.valid,
      message: validation.valid ? 'Camera endpoint is valid' : validation.error,
      data: validation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Test camera endpoint (without saving)
export const testCameraEndpoint = async (req, res) => {
  try {
    const { endpointUrl, username, password } = req.body;
    const cameraType = req.body.type || 'ip_camera';
    const localWebcamTypes = ['usb_webcam', 'laptop_webcam'];

    // Local webcams don't require network endpoint
    if (localWebcamTypes.includes(cameraType) && !endpointUrl) {
      return res.json({
        success: true,
        message: 'Local webcam does not require an endpoint URL',
        data: { valid: true, message: 'Local webcam validated' }
      });
    }

    if (!endpointUrl) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint URL is required'
      });
    }
    
    // Validate URL format
    const urlValidation = validateCameraUrlFormat(endpointUrl, cameraType);
    if (!urlValidation.valid) {
      return res.status(400).json({
        success: false,
        message: urlValidation.error || 'Invalid endpoint URL format'
      });
    }

    const validation = await validateCameraEndpoint(endpointUrl, username, password, cameraType);

    res.json({
      success: validation.valid,
      message: validation.valid ? 'Camera endpoint is valid' : validation.error,
      data: validation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get cameras for a specific location
export const getCamerasByLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    const cameras = await Camera.find({
      location: locationId,
      isActive: true,
      isUnderMaintenance: false
    })
      .populate('location', 'name code')
      .sort({ name: 1 });

    res.json({ success: true, data: cameras });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Capture snapshot from camera (for attendance)
export const captureSnapshot = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id).select('+password');
    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }

    const result = await captureSnapshotFromCamera(camera);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    // Convert buffer to base64 for response
    const base64Image = result.imageBuffer.toString('base64');
    const dataUrl = `data:${result.imageInfo.contentType};base64,${base64Image}`;

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CAPTURE_CAMERA_SNAPSHOT',
      resource: `camera:${camera._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: {
        cameraName: camera.name,
        cameraType: camera.type,
        imageSize: result.imageInfo.width + 'x' + result.imageInfo.height
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: {
        imageData: dataUrl,
        imageInfo: result.imageInfo,
        camera: {
          id: camera._id,
          name: camera.name,
          type: camera.type,
          location: camera.location
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get camera snapshot with face detection for monitoring preview
export const getSnapshotWithDetection = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id).select('+password');
    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }

    if (!camera.isActive) {
      return res.status(400).json({ 
        success: false, 
        message: 'Camera is not active. Please activate the camera first.',
        cameraStatus: { isActive: camera.isActive, isUnderMaintenance: camera.isUnderMaintenance }
      });
    }

    if (camera.isUnderMaintenance) {
      return res.status(400).json({ 
        success: false, 
        message: 'Camera is under maintenance. Please try again later.',
        cameraStatus: { isActive: camera.isActive, isUnderMaintenance: camera.isUnderMaintenance }
      });
    }

    // Capture snapshot with retry for stream cameras
    let snapshotResult;
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      snapshotResult = await captureSnapshotFromCamera(camera);
      if (snapshotResult.success) {
        break;
      }
      attempts++;
      if (attempts < maxAttempts) {
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!snapshotResult.success) {
      console.error(`Failed to capture snapshot for camera ${req.params.id} after ${maxAttempts} attempts:`, snapshotResult.error);
      return res.status(400).json({ 
        success: false, 
        message: snapshotResult.error || 'Failed to capture snapshot from camera. The camera may be disconnected or the stream may be unavailable.',
        error: snapshotResult.error,
        cameraId: req.params.id,
        cameraName: camera.name
      });
    }

    // Convert buffer to base64 for response
    const contentType = snapshotResult.imageInfo.contentType || 'image/jpeg';

    // Return image as blob
    res.setHeader('Content-Type', contentType);
    res.send(snapshotResult.imageBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get face detections for a camera (separate endpoint for detection data)
export const getCameraDetections = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id).select('+password');
    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }

    if (!camera.isActive || camera.isUnderMaintenance) {
      return res.status(400).json({ 
        success: false, 
        message: `Camera is not available. Active: ${camera.isActive}, Maintenance: ${camera.isUnderMaintenance}` 
      });
    }

    // Capture snapshot
    const snapshotResult = await captureSnapshotFromCamera(camera);
    if (!snapshotResult.success) {
      console.error(`Failed to capture snapshot for detections (camera ${req.params.id}):`, snapshotResult.error);
      return res.status(400).json({ 
        success: false, 
        message: snapshotResult.error || 'Failed to capture snapshot from camera',
        error: snapshotResult.error
      });
    }

    // Perform face detection using Python service
    let detections = [];
    try {
      const { detectFaces, compareFaceDescriptors } = await import('../services/pythonFaceRecognition.service.js');
      
      // Detect faces using Python service
      const detectionResult = await detectFaces(snapshotResult.imageBuffer);
      
      if (detectionResult.success && detectionResult.detections && detectionResult.detections.length > 0) {
        // Get assigned employees
        const assignments = await CameraAssignment.find({
          camera: camera._id,
          isActive: true,
          autoPunchInEnabled: true
        }).populate('employee');

        const employees = assignments
          .map(a => a.employee)
          .filter(emp => emp && emp.faceEligible && emp.faceDescriptor && emp.faceDescriptor.length > 0);

        const threshold = 0.40; // Fixed verification threshold for ArcFace (buffalo_l)

        // Match each detected face with employees
        for (const faceDetection of detectionResult.detections) {
          let bestMatch = null;
          let bestScore = 0;

          for (const employee of employees) {
            const comparison = await compareFaceDescriptors(
              faceDetection.embedding,
              employee.faceDescriptor,
              threshold
            );

            if (comparison.match) {
              const matchScore = comparison.similarity;
              if (matchScore > bestScore) {
                bestScore = matchScore;
                bestMatch = {
                  employee,
                  score: matchScore
                };
              }
            }
          }

          detections.push({
            box: faceDetection.bbox,
            confidence: bestMatch ? bestScore : 0.5,
            matched: !!bestMatch,
            employeeName: bestMatch ? `${bestMatch.employee.firstName} ${bestMatch.employee.lastName}` : null,
            employeeId: bestMatch ? bestMatch.employee.employeeId : null
          });
        }
      }
    } catch (detectionError) {
      console.error('Face detection error:', detectionError);
    }

    res.json({
      success: true,
      data: {
        detections,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// MJPEG/HTTP live stream passthrough
export const getCameraLiveStream = async (req, res) => {
  try {
    const result = await addSharedStreamClient(req.params.id, res);
    if (!result.success) {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Live stream error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Live detections (real-time polling cache)
export const getCameraLiveDetections = async (req, res) => {
  try {
    const { id } = req.params;
    const intervalSeconds = parseInt(req.query.intervalSeconds || '1', 10);
    const startResult = await startLiveDetections(id, intervalSeconds);
    if (!startResult.success) {
      return res.status(400).json(startResult);
    }
    const data = await getLiveDetections(id, intervalSeconds);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Real-time live detection stream using Server-Sent Events (SSE)
// Note: This endpoint should use authenticate and authorize middleware from routes
// FR-2: Monitoring Preview (Recognition-Aware View)
// This function provides a live monitoring preview that displays annotated video frames
// generated by the background recognition engine. It operates in read-only mode.
export const getCameraLiveDetectionStream = async (req, res) => {
  // Set up SSE headers first (before any response)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: 'Camera not found',
        code: 'CAMERA_NOT_FOUND'
      })}\n\n`);
      res.end();
      return;
    }

    if (!camera.isActive || camera.isUnderMaintenance) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: 'Camera is not available. Please activate the camera or remove it from maintenance mode.',
        code: 'CAMERA_NOT_AVAILABLE'
      })}\n\n`);
      res.end();
      return;
    }

    // Handle local webcams
    const localWebcamTypes = ['usb_webcam', 'laptop_webcam'];
    if (localWebcamTypes.includes(camera.type)) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: 'Local webcams (USB/Laptop) cannot be streamed from the server. Please use the browser\'s camera API directly in the attendance page.',
        code: 'LOCAL_WEBCAM_NOT_SUPPORTED'
      })}\n\n`);
      res.end();
      return;
    }

    // Check if monitoring is active for this camera
    const { getMonitoringStatus, getMonitoringResults } = await import('../services/cameraMonitoring.service.js');
    const monitoringStatus = getMonitoringStatus();
    const isMonitoringActive = monitoringStatus.data.some(m => m.cameraId === camera._id.toString());

    if (!isMonitoringActive) {
      // Send error message in SSE format
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: 'Camera monitoring must be active to view preview. Please start monitoring from the Real-Time Attendance page first.',
        code: 'MONITORING_NOT_ACTIVE'
      })}\n\n`);
      res.end();
      return;
    }

    const frameInterval = parseInt(req.query.interval || '1000', 10); // Default 1 second
    let isActive = true;
    let lastFrameCount = -1;

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      message: 'Monitoring preview stream started - displaying results from background recognition engine',
      cameraId: camera._id.toString(),
      cameraName: camera.name,
      isReadOnly: true // Preview is read-only, no face detection performed here
    })}\n\n`);

    // Cleanup on client disconnect
    req.on('close', () => {
      isActive = false;
      res.end();
    });

    // Stream monitoring results to preview (read-only mode)
    const streamMonitoringResults = () => {
      if (!isActive) return;

      try {
        const monitoringResult = getMonitoringResults(camera._id.toString());

        if (monitoringResult && monitoringResult.frameCount !== lastFrameCount) {
          // Send the pre-computed results from monitoring (read-only)
          // This includes:
          // - Face bounding boxes (computed in background service)
          // - Employee name or "Unknown"
          // - Match confidence score
          // - Timestamp
          // - Camera ID
          res.write(`data: ${JSON.stringify({
            type: 'frame',
            imageData: `data:image/jpeg;base64,${monitoringResult.imageData}`,
            detections: monitoringResult.detections, // Pre-computed by monitoring
            modelInfo: monitoringResult.modelInfo,
            timestamp: monitoringResult.timestamp,
            cameraId: monitoringResult.cameraId,
            frameCount: monitoringResult.frameCount,
            bestMatch: monitoringResult.bestMatch,
            isFromMonitoring: true, // Indicates this came from background monitoring
            readOnly: true // Preview does not perform detection
          })}\n\n`);

          lastFrameCount = monitoringResult.frameCount;
        }
      } catch (error) {
        console.error('Error streaming monitoring results:', error);
      }

      // Continue streaming at specified interval
      if (isActive) {
        setTimeout(streamMonitoringResults, frameInterval);
      }
    };

    // Start streaming monitoring results
    streamMonitoringResults();

  } catch (error) {
    console.error('Preview stream error:', error);
    // Send error message in SSE format
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message || 'An error occurred while setting up the preview stream',
      code: 'STREAM_ERROR'
    })}\n\n`);
    res.end();
  }
};

// Real-time preview with face detection overlays and model info
// This function is read-only and displays results from background monitoring
// No snapshot or face detection is performed here
export const getCameraPreview = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }

    if (!camera.isActive || camera.isUnderMaintenance) {
      return res.status(400).json({
        success: false,
        message: 'Camera is not available',
        cameraStatus: { isActive: camera.isActive, isUnderMaintenance: camera.isUnderMaintenance }
      });
    }

    // Check if monitoring is active for this camera
    const { getMonitoringStatus, getMonitoringResults } = await import('../services/cameraMonitoring.service.js');
    const monitoringStatus = getMonitoringStatus();
    const isMonitoringActive = monitoringStatus.data.some(m => m.cameraId === camera._id.toString());

    if (!isMonitoringActive) {
      return res.status(400).json({
        success: false,
        message: 'Camera monitoring must be active to view preview. Start monitoring first.',
        camera: {
          id: camera._id,
          name: camera.name,
          type: camera.type
        }
      });
    }

    // Get latest monitoring results (read-only, no snapshot)
    const monitoringResult = getMonitoringResults(camera._id.toString());

    if (!monitoringResult) {
      return res.json({
        success: false,
        message: 'No monitoring results available yet. Monitoring is processing frames...',
        camera: {
          id: camera._id,
          name: camera.name,
          type: camera.type
        }
      });
    }

    // Return pre-computed results from monitoring (read-only)
    res.json({
      success: true,
      data: {
        imageData: `data:image/jpeg;base64,${monitoringResult.imageData}`, // Pre-computed by monitoring
        detections: monitoringResult.detections, // Pre-computed by monitoring
        modelInfo: monitoringResult.modelInfo,
        camera: {
          id: camera._id,
          name: camera.name,
          type: camera.type,
          location: camera.location,
          endpointUrl: camera.endpointUrl ? '***configured***' : null
        },
        timestamp: monitoringResult.timestamp,
        cameraId: monitoringResult.cameraId,
        frameCount: monitoringResult.frameCount,
        bestMatch: monitoringResult.bestMatch,
        isFromMonitoring: true, // Indicates this came from background monitoring
        readOnly: true // Preview does not perform detection or snapshot
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

