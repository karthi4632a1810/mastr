import axios from 'axios';
import Camera from '../models/camera.model.js';
import CameraAssignment from '../models/cameraAssignment.model.js';
import { processAutoPunchIn } from './autoPunchIn.service.js';
import { detectFaces, compareFaceDescriptors } from './pythonFaceRecognition.service.js';
import AutoPunchInConfig from '../models/autoPunchInConfig.model.js';

// Store active monitoring intervals and streams
const activeMonitors = new Map();
const activeStreams = new Map(); // Store active stream connections
const liveDetectionCache = new Map(); // cameraId -> { detections, timestamp }
const liveDetectionIntervals = new Map(); // cameraId -> intervalId
const sharedStreams = new Map(); // cameraId -> { upstream, clients:Set<res>, contentType, buffer, lastFrame }

// Shared monitoring results cache - what monitoring detects, preview displays
const monitoringResultsCache = new Map(); // cameraId -> latest frame results

// Start monitoring a camera for auto punch-in
export async function startCameraMonitoring(cameraId, intervalSeconds = 5) {
  try {
    // Check if already monitoring
    if (activeMonitors.has(cameraId)) {
      console.log(`Camera ${cameraId} is already being monitored`);
      return { success: false, message: 'Camera is already being monitored' };
    }

    const camera = await Camera.findById(cameraId).select('+password');
    if (!camera || !camera.isActive || camera.isUnderMaintenance) {
      return { success: false, message: 'Camera is not available' };
    }

    // Get camera assignments with auto punch-in enabled
    const assignments = await CameraAssignment.find({
      camera: cameraId,
      isActive: true,
      autoPunchInEnabled: true
    }).populate('employee', 'faceEligible faceDescriptor');

    if (assignments.length === 0) {
      return { success: false, message: 'No active assignments with auto punch-in enabled for this camera' };
    }

    // Check if auto punch-in config is enabled (optional - if no config exists, allow monitoring if assignments exist)
    const configs = await AutoPunchInConfig.find({ isEnabled: true })
      .populate('cameras.cameraId');
    
    // If there are active assignments, allow monitoring even without explicit config
    // Config is optional - it's mainly for global settings like thresholds and cooldown
    const hasConfig = configs.length > 0 && configs.some(c => 
      c.cameras.some(cam => cam.cameraId?._id?.toString() === cameraId.toString())
    );

    // Allow monitoring if:
    // 1. There are active assignments with auto punch-in enabled, AND
    // 2. Either there's a config for this camera OR no configs exist at all (backward compatibility)
    if (configs.length > 0 && !hasConfig) {
      // If configs exist but this camera is not in any config, warn but don't block
      console.warn(`Camera ${cameraId} has assignments but no explicit AutoPunchInConfig. Monitoring will proceed with default settings.`);
    }

    console.log(`Starting SSE-based monitoring for camera ${camera.name} (${cameraId})`);

    // Use SSE-based monitoring for all cameras (replaces both stream and snapshot approaches)
    return await startRealTimeStreamMonitoring(cameraId, camera, assignments);
  } catch (error) {
    console.error(`Error starting camera monitoring for ${cameraId}:`, error);
    return { success: false, message: error.message };
  }
}

// --- Shared MJPEG stream fan-out (single upstream per camera) ---

async function ensureSharedStream(camera) {
  const cameraId = camera._id.toString();
  if (sharedStreams.has(cameraId)) {
    return sharedStreams.get(cameraId);
  }

  const config = {
    responseType: 'stream',
    timeout: 10000,
    headers: {
      'User-Agent': 'HRMS-Camera-SharedStream/1.0',
      Accept: 'multipart/x-mixed-replace, image/jpeg, */*',
      Connection: 'keep-alive'
    },
    validateStatus: () => true
  };

  if (camera.username && camera.password) {
    config.auth = {
      username: camera.username,
      password: camera.password
    };
  }

  const upstream = await axios.get(camera.endpointUrl, config);
  if (upstream.status !== 200) {
    throw new Error(`Upstream returned ${upstream.status}`);
  }

  const clients = new Set();
  const state = {
    upstream,
    clients,
    contentType: upstream.headers['content-type'] || 'multipart/x-mixed-replace',
    buffer: Buffer.alloc(0),
    lastFrame: null
  };

  // Parse MJPEG to extract latest frame for detections
  const jpegStart = Buffer.from([0xff, 0xd8]);
  const jpegEnd = Buffer.from([0xff, 0xd9]);
  const maxBuffer = 8 * 1024 * 1024; // 8MB safety

  upstream.data.on('data', (chunk) => {
    // broadcast to clients
    for (const res of clients) {
      if (!res.writableEnded) {
        res.write(chunk);
      }
    }

    // accumulate for detection frame extraction
    state.buffer = Buffer.concat([state.buffer, chunk]);
    if (state.buffer.length > maxBuffer) {
      // trim from start to avoid memory blow-up
      state.buffer = state.buffer.slice(state.buffer.length - maxBuffer / 2);
    }

    const startIdx = state.buffer.indexOf(jpegStart);
    if (startIdx !== -1) {
      const temp = state.buffer.slice(startIdx);
      const endIdx = temp.indexOf(jpegEnd);
      if (endIdx !== -1) {
        const frame = temp.slice(0, endIdx + 2);
        state.lastFrame = frame;
        // trim buffer after this frame to keep parsing light
        state.buffer = temp.slice(endIdx + 2);
      }
    }
  });

  const teardown = (reason) => {
    for (const res of clients) {
      if (!res.writableEnded) {
        res.end();
      }
    }
    if (upstream.data) {
      upstream.data.destroy();
    }
    sharedStreams.delete(cameraId);
    if (reason) {
      console.warn(`Shared stream for camera ${cameraId} closed: ${reason}`);
    }
  };

  upstream.data.on('error', (err) => {
    teardown(err.message || 'error');
  });
  upstream.data.on('end', () => teardown('ended'));

  sharedStreams.set(cameraId, state);
  return state;
}

export async function addSharedStreamClient(cameraId, res) {
  const camera = await Camera.findById(cameraId).select('+password');
  if (!camera || !camera.isActive || camera.isUnderMaintenance) {
    return { success: false, message: 'Camera is not available' };
  }
  if (!camera.endpointUrl || camera.endpointUrl.startsWith('rtsp://')) {
    return { success: false, message: 'Camera endpoint must be MJPEG/HTTP' };
  }

  const state = await ensureSharedStream(camera);

  res.setHeader('Content-Type', state.contentType);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Pragma', 'no-cache');

  state.clients.add(res);

  const cleanup = () => {
    state.clients.delete(res);
    if (state.clients.size === 0) {
      if (state.upstream?.data) {
        state.upstream.data.destroy();
      }
      sharedStreams.delete(cameraId);
    }
  };

  res.on('close', cleanup);
  res.on('finish', cleanup);

  return { success: true };
}

export function getSharedStreamFrame(cameraId) {
  const state = sharedStreams.get(cameraId);
  return state?.lastFrame || null;
}

export function stopSharedStream(cameraId) {
  const state = sharedStreams.get(cameraId);
  if (state) {
    if (state.upstream?.data) {
      state.upstream.data.destroy();
    }
    for (const res of state.clients) {
      if (!res.writableEnded) {
        res.end();
      }
    }
    sharedStreams.delete(cameraId);
  }
}

// Get latest monitoring results for preview display
export function getMonitoringResults(cameraId) {
  return monitoringResultsCache.get(cameraId) || null;
}

// Clear monitoring results cache when monitoring stops
export function clearMonitoringResults(cameraId) {
  monitoringResultsCache.delete(cameraId);
}
// Start real-time stream monitoring using SSE (Server-Sent Events)
async function startRealTimeStreamMonitoring(cameraId, camera, assignments) {
  try {
    console.log(`🚀 Starting SSE-based monitoring for camera ${camera.name} (${cameraId})`);

    // Create SSE monitoring connection
    const monitoringConnection = await createMonitoringSSEConnection(cameraId, camera, assignments);

    activeMonitors.set(cameraId, {
      connection: monitoringConnection,
      camera,
      startedAt: new Date(),
      intervalSeconds: 0, // SSE-based = 0 interval
      isRealTime: true,
      isSSE: true
    });

    console.log(`✅ SSE-based monitoring started for ${camera.name} - using server-sent events`);
    return { success: true, message: `Started SSE-based monitoring for camera ${camera.name}` };
  } catch (error) {
    console.error(`Error starting SSE-based monitoring for ${cameraId}:`, error);
    return { success: false, message: error.message };
  }
}

// Create SSE connection for monitoring (similar to live preview but without sending to client)
async function createMonitoringSSEConnection(cameraId, camera, assignments) {
  const axios = (await import('axios')).default;

  // Get active assignments for this camera
  const currentAssignments = await CameraAssignment.find({
    camera: cameraId,
    isActive: true,
    autoPunchInEnabled: true
  }).populate('employee');

  if (currentAssignments.length === 0) {
    throw new Error('No active assignments with auto punch-in enabled');
  }

  // Pre-load employee descriptors (similar to live preview)
  const profileDescriptorCache = new Map();
  const { generateFaceDescriptor } = await import('./pythonFaceRecognition.service.js');

  const employees = currentAssignments
    .map(a => a.employee)
    .filter(emp => emp && emp.faceEligible && emp.profilePhoto);

  console.log(`📋 Monitoring ${employees.length} employees for camera ${cameraId}`);

  // Pre-generate descriptors
  for (const employee of employees) {
    if (employee.profilePhoto) {
      try {
        const profileResult = await generateFaceDescriptor(employee.profilePhoto);
        if (profileResult.success && profileResult.descriptor) {
          profileDescriptorCache.set(employee._id.toString(), profileResult.descriptor);
        }
      } catch (err) {
        console.warn(`Failed to generate descriptor for ${employee.employeeId}:`, err.message);
      }
    }
  }

  // SSE connection setup (similar to live preview)
  const config = {
    timeout: 0,
    responseType: 'stream',
    validateStatus: (status) => status === 200,
    maxRedirects: 5,
    headers: {
      'User-Agent': 'HRMS-Monitoring-SSE/1.0',
      'Connection': 'keep-alive',
      'Accept': 'multipart/x-mixed-replace, image/jpeg, */*',
      'Cache-Control': 'no-cache'
    }
  };

  if (camera.username && camera.password) {
    config.auth = {
      username: camera.username,
      password: camera.password
    };
  }

  let streamResponse = null;
  let frameBuffer = Buffer.alloc(0);
  let isActive = true;
  let frameCount = 0;
  let isProcessing = false; // Request queue flag
  let lastProcessedTime = 0;
  const FRAME_PROCESSING_INTERVAL = 2000; // Process at most once every 2 seconds
  const FRAME_SKIP_COUNT = 5; // Skip 4 out of 5 frames (process every 5th)

  // Process complete frame for monitoring with throttling and queuing
  const processMonitoringFrame = async (frameData) => {
    if (!isActive) return;

    frameCount++;
    
    // Throttle: Skip frames if processing too frequently
    const now = Date.now();
    if (now - lastProcessedTime < FRAME_PROCESSING_INTERVAL) {
      return; // Skip this frame
    }
    
    // Skip frames: Only process every Nth frame
    if (frameCount % FRAME_SKIP_COUNT !== 0) {
      return; // Skip this frame
    }
    
    // Queue: Don't process if previous frame is still being processed
    if (isProcessing) {
      return; // Skip this frame, previous one is still processing
    }
    
    isProcessing = true;
    lastProcessedTime = now;
    
    try {
      // Detect faces in the frame
      const { detectFaces, compareFaceDescriptors, compareFaceDescriptorsLocal } = await import('./pythonFaceRecognition.service.js');
      const detectionResult = await detectFaces(frameData);

      let processedDetections = [];
      let matchedEmployee = null;
      let matchScore = 0;

      if (detectionResult.success && detectionResult.detections && detectionResult.detections.length > 0) {
        // Use the best face (largest/most confident)
        const sortedDetections = detectionResult.detections.sort((a, b) => {
          const aSize = (a.bbox?.width || 0) * (a.bbox?.height || 0);
          const bSize = (b.bbox?.width || 0) * (b.bbox?.height || 0);
          const aConf = a.confidence || 0;
          const bConf = b.confidence || 0;
          return (bConf * bSize) - (aConf * aSize);
        });

        const bestFace = sortedDetections[0];
        if (bestFace && bestFace.embedding) {
          // Compare with employee profiles
          // Use 0.60 (60%) threshold for auto punch-in to ensure accuracy
          const threshold = 0.60;
          let bestMatch = null;
          let bestScore = 0;

          // Optimize: Use local comparison first, then Python service only if needed
          // This reduces API calls significantly
          
          // First pass: Quick local comparison to find candidates
          const candidates = [];
          for (const employee of employees) {
            const employeeId = employee._id.toString();
            const profileDescriptor = profileDescriptorCache.get(employeeId);

            if (profileDescriptor) {
              // Use local comparison first (fast, no network call)
              const localComparison = compareFaceDescriptorsLocal(
                bestFace.embedding,
                profileDescriptor,
                threshold
              );
              
              if (localComparison.match && localComparison.similarity > 0.35) { // Lower threshold for candidates
                candidates.push({ employee, similarity: localComparison.similarity });
              }
            }
          }
          
          // Second pass: Only verify top candidates with Python service
          // Sort by similarity and only verify top 3 candidates
          candidates.sort((a, b) => b.similarity - a.similarity);
          const topCandidates = candidates.slice(0, 3);
          
          for (const candidate of topCandidates) {
            const employeeId = candidate.employee._id.toString();
            const profileDescriptor = profileDescriptorCache.get(employeeId);
            
            if (profileDescriptor) {
              const comparison = await compareFaceDescriptors(
                bestFace.embedding,
                profileDescriptor,
                threshold
              );

              if (comparison.match && comparison.similarity > bestScore) {
                bestScore = comparison.similarity;
                bestMatch = candidate.employee;
              }
            }
          }
          
          // If no candidates found locally, do a quick check with first few employees
          if (candidates.length === 0 && employees.length > 0) {
            // Check first 2 employees as fallback
            for (const employee of employees.slice(0, 2)) {
            const employeeId = employee._id.toString();
            const profileDescriptor = profileDescriptorCache.get(employeeId);

            if (profileDescriptor) {
              const comparison = await compareFaceDescriptors(
                bestFace.embedding,
                profileDescriptor,
                threshold
              );

              if (comparison.match && comparison.similarity > bestScore) {
                bestScore = comparison.similarity;
                bestMatch = employee;
                }
              }
            }
          }

          // Process all detections for the cache (optimized: use local comparison for preview)
          // Only use Python service for the best match, use local for others
          for (const detection of detectionResult.detections) {
            let detectionMatch = null;
            let detectionScore = 0;

            // Use local comparison for preview (faster, no network calls)
            // Only verify with Python service if it's the best match
            const isBestDetection = detection === bestFace;
            
            if (isBestDetection && bestMatch) {
              // Already matched above, use that result
              detectionMatch = bestMatch;
              detectionScore = bestScore;
            } else {
              // Quick local comparison for preview (no API call)
              for (const employee of employees.slice(0, 5)) { // Only check first 5 for preview
              const employeeId = employee._id.toString();
              const profileDescriptor = profileDescriptorCache.get(employeeId);

              if (profileDescriptor && detection.embedding) {
                  const localComparison = compareFaceDescriptorsLocal(
                  detection.embedding,
                  profileDescriptor,
                  threshold
                );

                  if (localComparison.match && localComparison.similarity > detectionScore) {
                    detectionScore = localComparison.similarity;
                  detectionMatch = employee;
                  }
                }
              }
            }

            processedDetections.push({
              box: detection.bbox,
              confidence: detectionScore > 0 ? detectionScore : 0.5,
              matched: !!detectionMatch,
              employeeName: detectionMatch ? `${detectionMatch.firstName} ${detectionMatch.lastName}` : null,
              employeeId: detectionMatch ? detectionMatch.employeeId : null,
              matchScore: detectionScore,
              embedding_dimension: detection.embedding?.length || 512,
              threshold_used: threshold
            });
          }

          matchedEmployee = bestMatch;
          matchScore = bestScore;

          // If match found and confidence >= 60%, process auto punch-in
          if (bestMatch && bestScore >= threshold) {
            console.log(`✅ Monitoring: Auto punch-in for ${bestMatch.firstName} ${bestMatch.lastName} (${bestMatch.employeeId}) - confidence: ${(bestScore * 100).toFixed(1)}%`);

            // Process the auto punch-in
            const result = await processAutoPunchIn(
              cameraId,
              frameData,
              'system',
              'MonitoringSSEService',
              null
            );

            if (result.success) {
              console.log(`🎯 Monitoring auto punch-in successful for ${bestMatch.firstName} ${bestMatch.lastName}`);
            } else {
              console.log(`⚠️ Monitoring auto punch-in failed: ${result.error}`);
            }
          } else if (bestMatch && bestScore < threshold) {
            // Log when match found but below threshold (for debugging)
            if (frameCount % 50 === 0) { // Only log occasionally to avoid spam
              console.log(`⏸️ Monitoring: Match found but confidence ${(bestScore * 100).toFixed(1)}% below threshold ${(threshold * 100).toFixed(0)}%`);
            }
          }
        } else {
          // No embeddings, but still store basic detection info
          processedDetections = detectionResult.detections.map(detection => ({
            box: detection.bbox,
            confidence: 0.5,
            matched: false,
            employeeName: null,
            employeeId: null,
            matchScore: null,
            embedding_dimension: 512,
            threshold_used: 0.40
          }));
        }
      }

      // Store results in shared cache for preview to consume
      const frameResult = {
        imageData: frameData.toString('base64'),
        detections: processedDetections,
        timestamp: new Date().toISOString(),
        cameraId: cameraId,
        frameCount: frameCount,
        modelInfo: {
          serviceType: 'InsightFace (Python)',
          serviceUrl: process.env.PYTHON_FACE_SERVICE_URL || 'http://localhost:5001',
          detector: 'InsightFace ArcFace (buffalo_l)',
          loaded: true,
          modelsExist: true
        },
        bestMatch: matchedEmployee ? {
          employeeId: matchedEmployee.employeeId,
          name: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
          similarity: matchScore,
          aboveThreshold: matchScore >= 0.60, // 60% threshold for auto punch-in
          threshold: 0.60
        } : null
      };

      monitoringResultsCache.set(cameraId, frameResult);

    } catch (error) {
      // Only log errors occasionally to avoid spam
      if (frameCount % 20 === 0) {
        console.error(`Monitoring frame processing error (frame ${frameCount}):`, error.message);
      }
    } finally {
      isProcessing = false; // Release processing lock
    }
  };

  // Connect to camera stream
  const connectStream = async () => {
    try {
      console.log(`📡 Connecting SSE monitoring stream for camera ${cameraId}`);
      streamResponse = await axios.get(camera.endpointUrl, config);

      const jpegStart = Buffer.from([0xFF, 0xD8]);
      const jpegEnd = Buffer.from([0xFF, 0xD9]);
      let currentFrameStart = -1;

      streamResponse.data.on('data', (chunk) => {
        if (!isActive) return;

        frameBuffer = Buffer.concat([frameBuffer, chunk]);

        // Look for JPEG start marker
        if (currentFrameStart === -1) {
          currentFrameStart = frameBuffer.indexOf(jpegStart);
          if (currentFrameStart === -1) {
            if (frameBuffer.length > 1024) {
              frameBuffer = frameBuffer.slice(-1024);
            }
            return;
          }
          frameBuffer = frameBuffer.slice(currentFrameStart);
          currentFrameStart = 0;
        }

        // Look for JPEG end marker
        const endIdx = frameBuffer.indexOf(jpegEnd, 1);
        if (endIdx !== -1) {
          // Complete frame found
          const completeFrame = frameBuffer.slice(0, endIdx + 2);
          frameBuffer = frameBuffer.slice(endIdx + 2);
          currentFrameStart = -1;

          // Process frame for monitoring (async, don't await)
          processMonitoringFrame(completeFrame).catch(err => {
            console.error('Error in monitoring frame processing:', err);
          });
        }
      });

      streamResponse.data.on('error', (err) => {
        console.error('SSE monitoring stream error:', err.message);
        if (isActive) {
          // Clean up and reconnect
          if (streamResponse && streamResponse.data) {
            streamResponse.data.destroy();
            streamResponse = null;
          }
          setTimeout(() => {
            if (isActive) {
              connectStream();
            }
          }, 5000);
        }
      });

      streamResponse.data.on('end', () => {
        console.log('SSE monitoring stream ended, reconnecting...');
        if (isActive) {
          if (streamResponse && streamResponse.data) {
            streamResponse.data.destroy();
            streamResponse = null;
          }
          setTimeout(() => {
            if (isActive) {
              connectStream();
            }
          }, 2000);
        }
      });

    } catch (error) {
      console.error('SSE monitoring connection error:', error.message);
      if (isActive) {
        setTimeout(() => {
          if (isActive) {
            connectStream();
          }
        }, 5000);
      }
    }
  };

  // Start the SSE connection
  await connectStream();

  // Return connection object for cleanup
  return {
    stop: () => {
      isActive = false;
      if (streamResponse && streamResponse.data) {
        streamResponse.data.destroy();
      }
    },
    getFrameCount: () => frameCount,
    isActive: () => isActive
  };
}

// Process a single frame for auto punch-in
async function processFrameForAutoPunchIn(cameraId, imageBuffer, camera) {
  try {
    // Get active assignments for this camera
    const assignments = await CameraAssignment.find({
      camera: cameraId,
      isActive: true,
      autoPunchInEnabled: true
    }).populate('employee');

    if (assignments.length === 0) {
      return;
    }

    // Process auto punch-in with the frame
    const result = await processAutoPunchIn(
      cameraId,
      imageBuffer,
      'system',
      'AutoPunchInService',
      null
    );

    if (result.success) {
      console.log(`✅ Real-time auto punch-in: ${result.data.employee.name} via ${camera.name}`);
    }
  } catch (error) {
    // Don't log model loading errors repeatedly
    if (!error.message || !error.message.includes('Failed to load face recognition models')) {
      // Only log occasionally to avoid spam
      if (Math.random() < 0.1) { // Log 10% of errors
        console.error(`Error processing frame for auto punch-in (camera ${cameraId}):`, error.message);
      }
    }
  }
}

// --- Live detection (stream tap) ---
async function detectFacesFromBuffer(imageBuffer, camera) {
  try {
    // Use Python service to detect faces
    const result = await detectFaces(imageBuffer);
    
    if (!result.success || !result.detections || result.detections.length === 0) {
      return [];
    }

    const assignments = await CameraAssignment.find({
      camera: camera._id,
      isActive: true,
      autoPunchInEnabled: true
    }).populate('employee');

    const employees = assignments
      .map(a => a.employee)
      .filter(emp => emp && emp.faceEligible && emp.faceDescriptor && emp.faceDescriptor.length > 0);

    // Use ArcFace recommended threshold (0.40) for face matching
    const threshold = 0.40;
    const detections = [];

    for (const faceDetection of result.detections) {
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

    return detections;
  } catch (error) {
    console.error('Error detecting faces from buffer:', error);
    return [];
  }
}

async function runLiveDetectionOnce(cameraId) {
  // Since we're using SSE-based monitoring now, live detections are handled
  // by the monitoring SSE connection. This function is kept for API compatibility
  // but doesn't do anything since detections are streamed in real-time.
  return;
}

export async function startLiveDetections(cameraId, intervalSeconds = 1) {
  if (liveDetectionIntervals.has(cameraId)) {
    return { success: true, message: 'Live detection already running' };
  }

  const camera = await Camera.findById(cameraId).select('+password');
  if (!camera || !camera.isActive || camera.isUnderMaintenance) {
    return { success: false, message: 'Camera is not available' };
  }

  // Ensure shared stream is running so we can tap frames without extra connections
  try {
    await ensureSharedStream(camera);
  } catch (err) {
    return { success: false, message: err.message || 'Failed to start shared stream' };
  }

  // Run one cycle immediately
  await runLiveDetectionOnce(cameraId);

  const intervalId = setInterval(() => {
    runLiveDetectionOnce(cameraId);
  }, Math.max(intervalSeconds, 1) * 1000);

  liveDetectionIntervals.set(cameraId, intervalId);

  return { success: true, message: 'Live detection started' };
}

export function stopLiveDetections(cameraId) {
  const intervalId = liveDetectionIntervals.get(cameraId);
  if (intervalId) {
    clearInterval(intervalId);
    liveDetectionIntervals.delete(cameraId);
  }
}

export async function getLiveDetections(cameraId, intervalSeconds = 1) {
  // Check if we have an active SSE monitoring connection for this camera
  const monitor = activeMonitors.get(cameraId);
  if (monitor && monitor.isSSE) {
    // Return empty detections for now - the preview will get detections via SSE
    // The actual detections are streamed directly to the client via SSE
    return {
      detections: [],
      timestamp: new Date(),
      usingSSE: true
    };
  }

  // Fallback for non-SSE monitoring (shouldn't happen with new implementation)
  const cache = liveDetectionCache.get(cameraId);
  return {
    detections: cache?.detections || [],
    timestamp: cache?.timestamp || null,
    usingSSE: false
  };
}

// Stop monitoring a camera
export function stopCameraMonitoring(cameraId) {
  const monitor = activeMonitors.get(cameraId);
  if (monitor) {
    // Stop interval-based monitoring
    if (monitor.intervalId) {
      clearInterval(monitor.intervalId);
    }

    // Stop SSE-based monitoring
    if (monitor.connection && monitor.connection.stop) {
      monitor.connection.stop();
    }

    // For real-time streams, the processing loop will stop when the monitor is removed
    activeMonitors.delete(cameraId);
    activeStreams.delete(cameraId);

    // Clear monitoring results cache
    clearMonitoringResults(cameraId);

    // Also stop shared stream if it exists
    stopSharedStream(cameraId);

    console.log(`Stopped monitoring camera ${cameraId}`);
    return { success: true, message: 'Camera monitoring stopped' };
  }
  return { success: false, message: 'Camera is not being monitored' };
}


// Start monitoring all cameras with active assignments
export async function startAllCameraMonitoring() {
  try {
    const cameras = await Camera.find({ isActive: true, isUnderMaintenance: false });
    let started = 0;
    let failed = 0;

    for (const camera of cameras) {
      const assignments = await CameraAssignment.find({
        camera: camera._id,
        isActive: true,
        autoPunchInEnabled: true
      });

      if (assignments.length > 0) {
        const result = await startCameraMonitoring(camera._id.toString(), 5);
        if (result.success) {
          started++;
        } else {
          failed++;
        }
      }
    }

    return {
      success: true,
      message: `Started monitoring ${started} cameras, ${failed} failed`,
      started,
      failed
    };
  } catch (error) {
    console.error('Error starting all camera monitoring:', error);
    return { success: false, message: error.message };
  }
}

// Stop all camera monitoring
export function stopAllCameraMonitoring() {
  const cameraIds = Array.from(activeMonitors.keys());
  let stopped = 0;

  for (const cameraId of cameraIds) {
    const result = stopCameraMonitoring(cameraId);
    if (result.success) {
      stopped++;
    }
  }

  return {
    success: true,
    message: `Stopped monitoring ${stopped} cameras`,
    stopped
  };
}

// Get monitoring status
export function getMonitoringStatus() {
  const status = Array.from(activeMonitors.entries()).map(([cameraId, monitor]) => ({
    cameraId,
    cameraName: monitor.camera?.name || 'Unknown',
    startedAt: monitor.startedAt,
    intervalSeconds: monitor.intervalSeconds,
    isRealTime: monitor.isRealTime || false,
    isSSE: monitor.isSSE || false,
    frameCount: monitor.connection?.getFrameCount ? monitor.connection.getFrameCount() :
                (typeof monitor.frameCount === 'function' ? monitor.frameCount() : null),
    isActive: true
  }));

  return {
    success: true,
    data: status,
    total: status.length
  };
}

// Get monitoring status for a specific camera
export function getCameraMonitoringStatus(cameraId) {
  const monitor = activeMonitors.get(cameraId);
  if (monitor) {
    return {
      success: true,
      data: {
        cameraId,
        cameraName: monitor.camera?.name || 'Unknown',
        startedAt: monitor.startedAt,
        intervalSeconds: monitor.intervalSeconds,
        isActive: true
      }
    };
  }
  return {
    success: false,
    message: 'Camera is not being monitored'
  };
}

