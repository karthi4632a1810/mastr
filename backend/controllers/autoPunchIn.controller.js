import { processAutoPunchIn } from '../services/autoPunchIn.service.js';
import { captureSnapshotFromCamera } from '../services/cameraValidation.service.js';
import Camera from '../models/camera.model.js';
import AutoPunchInConfig from '../models/autoPunchInConfig.model.js';
import AuditLog from '../models/auditLog.model.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

// Process auto punch-in from camera snapshot
export const processAutoPunchInFromCamera = async (req, res) => {
  try {
    const { cameraId, location } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const device = req.headers['user-agent'];

    if (!cameraId) {
      return res.status(400).json({
        success: false,
        message: 'Camera ID is required'
      });
    }

    // Capture snapshot from camera
    const camera = await Camera.findById(cameraId).select('+password');
    if (!camera) {
      return res.status(404).json({
        success: false,
        message: 'Camera not found'
      });
    }

    const snapshotResult = await captureSnapshotFromCamera(camera);
    if (!snapshotResult.success) {
      return res.status(400).json({
        success: false,
        message: snapshotResult.error || 'Failed to capture snapshot from camera'
      });
    }

    // Process auto punch-in
    const result = await processAutoPunchIn(
      cameraId,
      snapshotResult.imageBuffer,
      ipAddress,
      device,
      location
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        data: result
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process auto punch-in'
    });
  }
};

// Process auto punch-in from uploaded image
export const processAutoPunchInFromImage = async (req, res) => {
  try {
    const { cameraId, imageData, location } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const device = req.headers['user-agent'];

    if (!cameraId || !imageData) {
      return res.status(400).json({
        success: false,
        message: 'Camera ID and image data are required'
      });
    }

    // Convert base64 data URL to buffer
    let imageBuffer;
    try {
      if (imageData.startsWith('data:')) {
        const base64Data = imageData.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else {
        imageBuffer = Buffer.from(imageData, 'base64');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image data format'
      });
    }

    // Process auto punch-in
    const result = await processAutoPunchIn(
      cameraId,
      imageBuffer,
      ipAddress,
      device,
      location
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        data: result
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process auto punch-in'
    });
  }
};

// Get auto punch-in configuration
export const getAutoPunchInConfig = async (req, res) => {
  try {
    const configs = await AutoPunchInConfig.find({ isEnabled: true })
      .populate('cameras.cameraId', 'name type endpointUrl isActive')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email')
      .sort({ scope: 1, createdAt: -1 });

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create/Update auto punch-in configuration
export const updateAutoPunchInConfig = async (req, res) => {
  try {
    const {
      isEnabled,
      faceMatchThreshold,
      cooldownWindowMinutes,
      cameras,
      scope,
      scopeValue,
      notifications,
      allowRetryOnFailure,
      requireGeoValidation
    } = req.body;

    // Find existing config or create new
    let config = await AutoPunchInConfig.findOne({ scope, scopeValue: scopeValue || null });
    
    if (!config) {
      config = new AutoPunchInConfig({
        createdBy: req.user._id
      });
    }

    if (isEnabled !== undefined) config.isEnabled = isEnabled;
    if (faceMatchThreshold !== undefined) config.faceMatchThreshold = faceMatchThreshold;
    if (cooldownWindowMinutes !== undefined) config.cooldownWindowMinutes = cooldownWindowMinutes;
    if (cameras !== undefined) config.cameras = cameras;
    if (scope !== undefined) config.scope = scope;
    if (scopeValue !== undefined) config.scopeValue = scopeValue || null;
    if (notifications !== undefined) config.notifications = notifications;
    if (allowRetryOnFailure !== undefined) config.allowRetryOnFailure = allowRetryOnFailure;
    if (requireGeoValidation !== undefined) config.requireGeoValidation = requireGeoValidation;
    
    config.updatedBy = req.user._id;

    await config.save();

    const populatedConfig = await AutoPunchInConfig.findById(config._id)
      .populate('cameras.cameraId', 'name type endpointUrl isActive')
      .populate('updatedBy', 'email');

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE_AUTO_PUNCH_IN_CONFIG',
      resource: `autoPunchInConfig:${config._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: req.body,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Auto punch-in configuration updated successfully',
      data: populatedConfig
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

