import AuditLog from '../models/auditLog.model.js';

export const auditLog = async (req, res, next) => {
  const originalSend = res.json;
  
  res.json = async function(data) {
    // Log the action after response is sent
    if (req.user && req.method !== 'GET') {
      try {
        await AuditLog.create({
          userId: req.user._id,
          userEmail: req.user.email,
          action: `${req.method} ${req.originalUrl}`,
          resource: req.originalUrl.split('/').pop(),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          statusCode: res.statusCode,
          requestBody: req.method !== 'GET' ? req.body : undefined,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Audit log error:', error);
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};
