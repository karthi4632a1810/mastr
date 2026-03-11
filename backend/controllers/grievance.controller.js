import Grievance from '../models/grievance.model.js';
import Employee from '../models/employee.model.js';

export const getGrievances = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const grievances = await Grievance.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .populate('assignedTo', 'email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: grievances });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGrievance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const grievance = await Grievance.create({ ...req.body, employee: employee._id });
    const populated = await Grievance.findById(grievance._id).populate('employee', 'firstName lastName');
    res.status(201).json({ success: true, message: 'Grievance submitted', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGrievanceStatus = async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found' });

    grievance.status = req.body.status;
    if (req.body.status === 'resolved') {
      grievance.resolvedAt = new Date();
      grievance.resolvedBy = req.user._id;
      grievance.resolution = req.body.resolution;
    }
    if (req.body.assignedTo) grievance.assignedTo = req.body.assignedTo;

    await grievance.save();
    res.json({ success: true, message: 'Grievance updated', data: grievance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
