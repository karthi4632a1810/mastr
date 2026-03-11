import Document from '../models/document.model.js';
import Employee from '../models/employee.model.js';

export const getDocuments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employeeId) {
      const employee = await Employee.findOne({ employeeId: req.query.employeeId });
      if (employee) filter.employee = employee._id;
    } else if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
    }

    const documents = await Document.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const employee = await Employee.findById(req.body.employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const document = await Document.create({
      employee: employee._id,
      name: req.body.name || req.file.originalname,
      type: req.body.type,
      file: `/uploads/${req.file.filename}`,
      uploadedBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Document uploaded', data: document });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
