import AuditLog from '../models/auditLog.model.js';

export const getAuditLogs = async (req, res) => {
  try {
    const { action, module, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (module) filter.module = module;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAuditLog = async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('userId', 'email role');

    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
