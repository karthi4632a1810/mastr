import Resignation from '../models/resignation.model.js';
import Employee from '../models/employee.model.js';
import ExitChecklist from '../models/exitChecklist.model.js';
import ExitChecklistTemplate from '../models/exitChecklistTemplate.model.js';
import moment from 'moment';

// Get notice period policy (can be configured per employee category/role)
const getNoticePeriodDays = (employee) => {
  // Default notice period based on employee category
  // This can be enhanced with a policy configuration model
  const noticePeriodMap = {
    'executive': 90,
    'manager': 60,
    'senior': 30,
    'junior': 30,
    'trainee': 15
  };
  
  return noticePeriodMap[employee.employeeCategory] || 30; // Default 30 days
};

// Get minimum service period (in days)
const getMinimumServicePeriod = (employee) => {
  // Default minimum service period
  // This can be enhanced with a policy configuration model
  return 180; // 6 months default
};

// Submit resignation
export const submitResignation = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check if employee is active
    if (employee.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot submit resignation. Current status: ${employee.status}`
      });
    }

    // Check if there's already a pending resignation
    const existingResignation = await Resignation.findOne({
      employee: employee._id,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingResignation) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending or approved resignation'
      });
    }

    const { tentativeLastWorkingDate, reason, reasonText, additionalComments } = req.body;

    if (!tentativeLastWorkingDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Tentative Last Working Date and reason are required'
      });
    }

    const tlwd = moment(tentativeLastWorkingDate);
    const today = moment().startOf('day');
    const joiningDate = moment(employee.joiningDate);

    // Validate TLWD is in the future
    if (tlwd.isSameOrBefore(today)) {
      return res.status(400).json({
        success: false,
        message: 'Tentative Last Working Date must be in the future'
      });
    }

    // Check minimum service period
    const minimumServiceDays = getMinimumServicePeriod(employee);
    const serviceDays = today.diff(joiningDate, 'days');
    const minimumServicePeriodMet = serviceDays >= minimumServiceDays;

    if (!minimumServicePeriodMet) {
      return res.status(400).json({
        success: false,
        message: `Minimum service period not met. Required: ${minimumServiceDays} days, Current: ${serviceDays} days`
      });
    }

    // Calculate notice period
    const noticePeriodDays = getNoticePeriodDays(employee);
    const noticePeriodEndDate = moment(today).add(noticePeriodDays, 'days');
    const expectedRelievingDate = moment.min(tlwd, noticePeriodEndDate);

    // Validate TLWD meets minimum notice period
    const daysUntilTLWD = tlwd.diff(today, 'days');
    if (daysUntilTLWD < noticePeriodDays) {
      return res.status(400).json({
        success: false,
        message: `Tentative Last Working Date must be at least ${noticePeriodDays} days from today (notice period requirement)`
      });
    }

    // Handle file uploads
    const supportingDocuments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        supportingDocuments.push({
          filename: file.filename,
          originalName: file.originalname,
          path: `/uploads/resignations/${file.filename}`,
          uploadedAt: new Date()
        });
      });
    }

    const resignation = await Resignation.create({
      employee: employee._id,
      tentativeLastWorkingDate: tlwd.toDate(),
      reason,
      reasonText: reasonText || '',
      additionalComments: additionalComments || '',
      supportingDocuments,
      noticePeriodDays,
      noticePeriodEndDate: noticePeriodEndDate.toDate(),
      expectedRelievingDate: expectedRelievingDate.toDate(),
      minimumServicePeriodMet,
      status: 'pending',
      submittedAt: new Date()
    });

    // Update employee status to notice_period
    employee.status = 'notice_period';
    employee.noticePeriodEndDate = noticePeriodEndDate.toDate();
    await employee.save();

    const populated = await Resignation.findById(resignation._id)
      .populate('employee', 'firstName lastName employeeId email department designation');

    // TODO: Send acknowledgment notification to employee
    console.log(`[NOTIFICATION] Resignation acknowledgment sent to ${populated.employee.email}`);

    // TODO: Send alert to HR and Manager
    if (employee.reportingManager) {
      const manager = await Employee.findById(employee.reportingManager).populate('userId', 'email');
      if (manager?.userId?.email) {
        console.log(`[NOTIFICATION] Manager ${manager.userId.email} notified of resignation from ${populated.employee.email}`);
      }
    }

    const User = (await import('../models/user.model.js')).default;
    const hrUsers = await User.find({ role: 'hr' });
    hrUsers.forEach(user => {
      console.log(`[NOTIFICATION] HR user ${user.email} notified of new resignation from ${populated.employee.email}`);
    });

    res.json({
      success: true,
      message: 'Resignation submitted successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get employee's resignation
export const getMyResignation = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const resignation = await Resignation.findOne({ employee: employee._id })
      .populate('employee', 'firstName lastName employeeId email department designation')
      .sort({ submittedAt: -1 });

    if (!resignation) {
      return res.status(404).json({
        success: false,
        message: 'No resignation found'
      });
    }

    res.json({ success: true, data: resignation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Withdraw resignation
export const withdrawResignation = async (req, res) => {
  try {
    const { reason } = req.body;
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const resignation = await Resignation.findOne({
      employee: employee._id,
      status: 'pending'
    });

    if (!resignation) {
      return res.status(404).json({
        success: false,
        message: 'No pending resignation found to withdraw'
      });
    }

    // Check if withdrawal is allowed (HR policy check - for now always allowed if pending)
    // This can be enhanced with policy configuration

    resignation.status = 'withdrawn';
    resignation.withdrawnAt = new Date();
    resignation.withdrawalReason = reason || '';

    await resignation.save();

    // Update employee status back to active
    employee.status = 'active';
    employee.noticePeriodEndDate = null;
    await employee.save();

    const populated = await Resignation.findById(resignation._id)
      .populate('employee', 'firstName lastName email');

    // TODO: Send notification to HR
    console.log(`[NOTIFICATION] Resignation withdrawn by ${populated.employee.email}`);

    res.json({
      success: true,
      message: 'Resignation withdrawn successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all resignations (HR/Admin)
export const getResignations = async (req, res) => {
  try {
    const { status, search, startDate, endDate } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.tentativeLastWorkingDate = {};
      if (startDate) filter.tentativeLastWorkingDate.$gte = new Date(startDate);
      if (endDate) filter.tentativeLastWorkingDate.$lte = new Date(endDate);
    }

    const resignations = await Resignation.find(filter)
      .populate('employee', 'firstName lastName employeeId email department designation')
      .populate('approvedBy', 'email')
      .sort({ submittedAt: -1 });

    // Filter by search if provided
    let filtered = resignations;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = resignations.filter(res => 
        res.employee?.firstName?.toLowerCase().includes(searchLower) ||
        res.employee?.lastName?.toLowerCase().includes(searchLower) ||
        res.employee?.employeeId?.toLowerCase().includes(searchLower) ||
        res.employee?.email?.toLowerCase().includes(searchLower)
      );
    }

    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get resignation by ID (HR/Admin)
export const getResignation = async (req, res) => {
  try {
    const resignation = await Resignation.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId email department designation reportingManager')
      .populate('approvedBy', 'email firstName lastName');

    if (!resignation) {
      return res.status(404).json({ success: false, message: 'Resignation not found' });
    }

    res.json({ success: true, data: resignation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get notice period policy details
export const getNoticePeriodPolicy = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const noticePeriodDays = getNoticePeriodDays(employee);
    const minimumServiceDays = getMinimumServicePeriod(employee);
    const serviceDays = moment().diff(moment(employee.joiningDate), 'days');
    const minimumServicePeriodMet = serviceDays >= minimumServiceDays;

    res.json({
      success: true,
      data: {
        noticePeriodDays,
        minimumServiceDays,
        currentServiceDays: serviceDays,
        minimumServicePeriodMet,
        employeeCategory: employee.employeeCategory,
        joiningDate: employee.joiningDate
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

