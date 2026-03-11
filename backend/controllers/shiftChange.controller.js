import ShiftChangeRequest from '../models/shiftChangeRequest.model.js';
import Employee from '../models/employee.model.js';
import Shift from '../models/shift.model.js';
import moment from 'moment';

export const createShiftChange = async (req, res) => {
  try {
    const { date, currentShift, requestedShift, type = 'change', swapWithEmployee, reason } = req.body;
    if (!date || !currentShift || !reason) {
      return res.status(400).json({ success: false, message: 'date, currentShift, and reason are required' });
    }
    if (!['change', 'swap'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }

    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const current = await Shift.findById(currentShift);
    if (!current) return res.status(404).json({ success: false, message: 'Current shift not found' });

    if (requestedShift) {
      const reqShift = await Shift.findById(requestedShift);
      if (!reqShift) return res.status(404).json({ success: false, message: 'Requested shift not found' });
    }

    const record = await ShiftChangeRequest.create({
      employee: employee._id,
      date: moment(date).startOf('day').toDate(),
      currentShift,
      requestedShift: requestedShift || null,
      type,
      swapWithEmployee: swapWithEmployee || null,
      reason
    });

    const populated = await ShiftChangeRequest.findById(record._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('currentShift', 'name code startTime endTime')
      .populate('requestedShift', 'name code startTime endTime')
      .populate('swapWithEmployee', 'firstName lastName employeeId');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShiftChanges = async (req, res) => {
  try {
    const { status, limit } = req.query;
    const filter = {};
    if (status && status.trim()) {
      filter.status = status.trim();
    }

    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }
      filter.employee = employee._id;
    }

    let query = ShiftChangeRequest.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .populate({
        path: 'currentShift',
        select: 'name code startTime endTime',
        strictPopulate: false
      })
      .populate({
        path: 'requestedShift',
        select: 'name code startTime endTime',
        strictPopulate: false
      })
      .populate({
        path: 'swapWithEmployee',
        select: 'firstName lastName employeeId',
        strictPopulate: false
      })
      .sort({ createdAt: -1 });

    if (limit && limit.trim()) {
      const limitValue = parseInt(limit);
      if (!isNaN(limitValue) && limitValue > 0) {
        query = query.limit(limitValue);
      }
    }

    const requests = await query;

    res.json({ success: true, data: requests || [] });
  } catch (error) {
    console.error('Error fetching shift changes:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

export const updateShiftChangeStatus = async (req, res) => {
  try {
    if (!['approved', 'rejected'].includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const request = await ShiftChangeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.status = req.body.status;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.comments = req.body.comments || '';
    await request.save();

    const populated = await ShiftChangeRequest.findById(request._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('currentShift', 'name code startTime endTime')
      .populate('requestedShift', 'name code startTime endTime')
      .populate('swapWithEmployee', 'firstName lastName employeeId');

    res.json({ success: true, data: populated, message: `Request ${req.body.status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR/Admin modify request (e.g., change requested shift or swap target) before decision
export const modifyShiftChange = async (req, res) => {
  try {
    const request = await ShiftChangeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be modified' });
    }

    const { requestedShift, swapWithEmployee, comments } = req.body;
    if (requestedShift) {
      const shift = await Shift.findById(requestedShift);
      if (!shift) return res.status(404).json({ success: false, message: 'Requested shift not found' });
      request.requestedShift = requestedShift;
    }
    if (swapWithEmployee !== undefined) {
      if (swapWithEmployee) {
        const emp = await Employee.findById(swapWithEmployee);
        if (!emp) return res.status(404).json({ success: false, message: 'Swap employee not found' });
        request.swapWithEmployee = swapWithEmployee;
      } else {
        request.swapWithEmployee = null;
      }
    }
    if (comments) request.comments = comments;

    await request.save();
    const populated = await ShiftChangeRequest.findById(request._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('currentShift', 'name code startTime endTime')
      .populate('requestedShift', 'name code startTime endTime')
      .populate('swapWithEmployee', 'firstName lastName employeeId');

    res.json({ success: true, data: populated, message: 'Request modified' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

