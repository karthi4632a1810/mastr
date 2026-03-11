import LeaveRequest from '../models/leaveRequest.model.js';
import LeaveType from '../models/leaveType.model.js';
import Employee from '../models/employee.model.js';
import Shift from '../models/shift.model.js';
import ShiftAssignment from '../models/shiftAssignment.model.js';
import Attendance from '../models/attendance.model.js';
import Designation from '../models/designation.model.js';
import moment from 'moment';
import mongoose from 'mongoose';

// Configuration for escalation
const ESCALATION_CONFIG = {
  daysBeforeEscalation: 3, // Days before auto-escalation
  maxTeamLeavesPercent: 30, // Max percentage of team on leave
  criticalRoles: ['manager', 'team_lead', 'senior'] // Critical employee categories
};

// Get leave types
export const getLeaveTypes = async (req, res) => {
  try {
    const { includeInactive = 'false', includeHistory = 'false' } = req.query;
    const filter = includeHistory === 'true' ? {} : { isLatest: true };
    if (includeInactive !== 'true') {
      filter.isActive = true;
    }
    const leaveTypes = await LeaveType.find(filter).sort({ name: 1 });
    res.json({ success: true, data: leaveTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create leave type (Admin/HR only)
export const createLeaveType = async (req, res) => {
  try {
    const existing = await LeaveType.findOne({ $or: [{ name: req.body.name }, { code: req.body.code }], isLatest: true });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Leave type already exists' });
    }

    const leaveType = await LeaveType.create({
      ...req.body,
      version: 1,
      isLatest: true
    });
    res.status(201).json({ success: true, message: 'Leave type created', data: leaveType });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update leave type with versioning
export const updateLeaveType = async (req, res) => {
  try {
    const current = await LeaveType.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Leave type not found' });
    }

    const { name, code } = req.body;
    if (name || code) {
      const dup = await LeaveType.findOne({
        _id: { $ne: req.params.id },
        isLatest: true,
        $or: [{ name }, { code }]
      });
      if (dup) {
        return res.status(400).json({ success: false, message: 'Leave type name or code already exists' });
      }
    }

    const newVersion = (current.version || 1) + 1;
    const versionGroup = current.versionGroup || current._id;

    const merged = {
      ...current.toObject(),
      ...req.body,
      _id: new mongoose.Types.ObjectId(),
      version: newVersion,
      previousVersion: current._id,
      versionGroup,
      isLatest: true,
      createdAt: undefined,
      updatedAt: undefined
    };

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await LeaveType.updateOne({ _id: current._id }, { $set: { isLatest: false } }, { session });
      const [created] = await LeaveType.create([merged], { session });
      await session.commitTransaction();
      res.json({ success: true, message: 'Leave type version created', data: created });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Preview accrual simulator (simplified)
export const previewAccrual = async (req, res) => {
  try {
    const { leaveTypeId, joinDate, months = 12 } = req.body;
    const lt = await LeaveType.findById(leaveTypeId);
    if (!lt) return res.status(404).json({ success: false, message: 'Leave type not found' });
    const freq = lt.rules?.accrual?.frequency || 'none';
    const rate = lt.rules?.accrual?.ratePerCycle || 0;
    const startFrom = lt.rules?.accrual?.startFrom || 'joining';
    const fiscalStart = lt.rules?.accrual?.fiscalYearStartMonth || 4;

    const accruals = [];
    let cursor = moment(joinDate || new Date());
    if (startFrom === 'fiscal_year') {
      const fy = moment().month(fiscalStart - 1).startOf('month');
      if (cursor.isBefore(fy)) cursor = fy;
    }
    for (let i = 0; i < months; i++) {
      const periodStart = cursor.clone();
      let shouldAccrue = freq !== 'none';
      if (lt.rules?.accrual?.prorated && i === 0) {
        const daysInMonth = periodStart.daysInMonth();
        const remaining = daysInMonth - periodStart.date() + 1;
        const prorated = (rate * remaining) / daysInMonth;
        accruals.push({ month: periodStart.format('YYYY-MM'), days: Number(prorated.toFixed(2)) });
      } else if (shouldAccrue) {
        accruals.push({ month: periodStart.format('YYYY-MM'), days: rate });
      }
      if (freq === 'monthly') cursor.add(1, 'month');
      else if (freq === 'quarterly') cursor.add(3, 'months');
      else if (freq === 'yearly') cursor.add(12, 'months');
      else break;
    }
    const total = accruals.reduce((s, r) => s + r.days, 0);
    res.json({ success: true, data: { accruals, total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const DEFAULT_WEEK_OFFS = [0, 6];

const buildLeaveBalances = async (employeeId) => {
  const leaveTypes = await LeaveType.find({ isActive: true, isLatest: true });
  const balances = [];

  for (const leaveType of leaveTypes) {
    const [approved, pending] = await Promise.all([
      LeaveRequest.aggregate([
        { $match: { employee: employeeId, leaveType: leaveType._id, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$days' } } }
      ]),
      LeaveRequest.aggregate([
        { $match: { employee: employeeId, leaveType: leaveType._id, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$days' } } }
      ])
    ]);

    const used = approved[0]?.total || 0;
    const pendingTotal = pending[0]?.total || 0;
    const total = leaveType.maxDays || 0;
    const available = Math.max(total - (used + pendingTotal), 0);

    balances.push({
      leaveType: {
        _id: leaveType._id,
        name: leaveType.name,
        code: leaveType.code,
        category: leaveType.category,
        maxDays: leaveType.maxDays,
        isPaid: leaveType.isPaid
      },
      total,
      used,
      pending: pendingTotal,
      balance: Math.max(total - used, 0),
      available
    });
  }

  return balances;
};

const calculateWorkingPortion = async ({ employee, start, end }) => {
  const shift = employee.shift ? await Shift.findById(employee.shift) : null;
  const weekOffs = shift?.weekOffs?.length ? shift.weekOffs : DEFAULT_WEEK_OFFS;
  const workingHours = shift?.workingHours || 8;

  const holidayAssignments = await ShiftAssignment.find({
    employee: employee._id,
    date: { $gte: start.clone().startOf('day').toDate(), $lte: end.clone().endOf('day').toDate() },
    overrideType: 'holiday'
  }).select('date');

  const holidaySet = new Set(holidayAssignments.map((assignment) => moment(assignment.date).format('YYYY-MM-DD')));

  let workingDays = 0;
  for (let cursor = start.clone(); cursor.isSameOrBefore(end, 'day'); cursor.add(1, 'day')) {
    const dow = cursor.day();
    const key = cursor.format('YYYY-MM-DD');
    if (weekOffs.includes(dow) || holidaySet.has(key)) continue;
    workingDays += 1;
  }

  return { workingDays, weekOffs, workingHours };
};

const validateAndPrepareLeaveRequest = async ({
  employee,
  leaveTypeId,
  startDate,
  endDate,
  partialDayType = 'full_day',
  halfDayType = null,
  hoursRequested = 0,
  applyLop = false,
  reason,
  existingRequestId = null,
  supportingDocumentPath = null
}) => {
  const leaveType = await LeaveType.findOne({ _id: leaveTypeId, isLatest: true });
  if (!leaveType || !leaveType.isActive) {
    return { error: { status: 404, message: 'Leave type not found or inactive' } };
  }

  const start = moment(startDate);
  const end = moment(endDate);
  if (!start.isValid() || !end.isValid()) {
    return { error: { status: 400, message: 'Invalid start or end date' } };
  }
  if (start.isAfter(end)) {
    return { error: { status: 400, message: 'Start date cannot be after end date' } };
  }

  const usageRules = leaveType.rules?.usage || {};
  const isInProbation = usageRules.blockDuringProbation && employee.probationPeriodEndDate
    ? moment().isSameOrBefore(moment(employee.probationPeriodEndDate).endOf('day'))
    : false;
  if (isInProbation) {
    return { error: { status: 400, message: 'This leave type is blocked during probation' } };
  }

  if (usageRules.blockDuringNoticePeriod && employee.status === 'notice_period') {
    return { error: { status: 400, message: 'This leave type is not allowed during notice period' } };
  }

  const normalizedPartialType = ['full_day', 'half_day', 'hourly'].includes(partialDayType)
    ? partialDayType
    : 'full_day';

  const { workingDays, workingHours, weekOffs } = await calculateWorkingPortion({ employee, start, end });

  if (workingDays === 0 && normalizedPartialType === 'full_day') {
    return { error: { status: 400, message: 'Selected range only contains holidays or weekly-offs' } };
  }

  let days = workingDays;
  let normalizedHalfDayType = halfDayType || null;
  let normalizedHours = Number(hoursRequested) || 0;

  if (normalizedPartialType === 'half_day') {
    if (!usageRules.allowHalfDay) {
      return { error: { status: 400, message: 'Half-day is not allowed for this leave type' } };
    }
    if (!start.isSame(end, 'day')) {
      return { error: { status: 400, message: 'Half-day leave must be applied for a single day' } };
    }
    if (workingDays < 1) {
      return { error: { status: 400, message: 'Half-day cannot be applied on a weekly-off/holiday' } };
    }
    days = 0.5;
    normalizedHours = 0;
  } else if (normalizedPartialType === 'hourly') {
    if (!usageRules.allowHourly) {
      return { error: { status: 400, message: 'Hourly leave is not allowed for this leave type' } };
    }
    if (!start.isSame(end, 'day')) {
      return { error: { status: 400, message: 'Hourly leave must be within a single day' } };
    }
    if (workingDays < 1) {
      return { error: { status: 400, message: 'Hourly leave cannot be applied on a weekly-off/holiday' } };
    }
    const maxHoursCap = usageRules.maxHoursPerRequest && usageRules.maxHoursPerRequest > 0
      ? usageRules.maxHoursPerRequest
      : normalizedHours;
    normalizedHours = Math.min(normalizedHours, maxHoursCap || normalizedHours);
    if (!normalizedHours || normalizedHours <= 0) {
      return { error: { status: 400, message: 'Hours requested must be greater than zero for hourly leave' } };
    }
    const dayFraction = Number((normalizedHours / workingHours).toFixed(3));
    if (dayFraction <= 0) {
      return { error: { status: 400, message: 'Requested hours are below minimum working hours' } };
    }
    days = Math.min(dayFraction, 1);
    normalizedHalfDayType = null;
  }

  if (usageRules.minDays > 0 && days < usageRules.minDays) {
    return { error: { status: 400, message: `Minimum ${usageRules.minDays} day(s) required for this leave type` } };
  }

  if (usageRules.maxDaysPerRequest > 0 && days > usageRules.maxDaysPerRequest) {
    return { error: { status: 400, message: `Cannot exceed ${usageRules.maxDaysPerRequest} day(s) per request` } };
  }

  const overlapFilter = {
    employee: employee._id,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: end.toDate() },
    endDate: { $gte: start.toDate() }
  };
  if (existingRequestId) {
    overlapFilter._id = { $ne: new mongoose.Types.ObjectId(existingRequestId) };
  }
  const overlapping = await LeaveRequest.findOne(overlapFilter);
  if (overlapping) {
    return { error: { status: 400, message: 'Leave dates overlap with an existing pending/approved request' } };
  }

  const balances = await buildLeaveBalances(employee._id);
  const selectedBalance = balances.find((b) => b.leaveType._id.toString() === leaveType._id.toString());

  const isPaidType = leaveType.category !== 'LOP' && leaveType.isPaid !== false;
  let lopApplied = !isPaidType;
  let lopDays = 0;

  if (isPaidType && !selectedBalance) {
    return { error: { status: 400, message: 'Balance information unavailable for this leave type' } };
  }

  if (isPaidType && selectedBalance) {
    if (!applyLop && days > selectedBalance.available) {
      const alternatives = balances
        .filter((b) => b.leaveType._id.toString() !== leaveType._id.toString() && b.available >= days)
        .map((b) => ({
          leaveType: b.leaveType,
          available: b.available
        }));
      return {
        error: {
          status: 400,
          message: `Insufficient balance. Available: ${selectedBalance.available} day(s).`,
          suggestions: {
            applyLop: true,
            required: days,
            available: selectedBalance.available,
            alternatives
          }
        }
      };
    }
    if (days > selectedBalance.available) {
      lopApplied = true;
      lopDays = Number((days - selectedBalance.available).toFixed(2));
    }
  } else if (!isPaidType) {
    lopDays = Number(days.toFixed(2));
  }

  if (usageRules.requiresDocument && !supportingDocumentPath) {
    return { error: { status: 400, message: 'Supporting document is required for this leave type' } };
  }

  return {
    data: {
      leaveType,
      start,
      end,
      days: Number(days.toFixed(2)),
      workingDays: Number((normalizedPartialType === 'full_day' ? workingDays : days).toFixed(2)),
      partialDayType: normalizedPartialType,
      halfDayType: normalizedHalfDayType,
      hoursRequested: normalizedPartialType === 'hourly' ? Number(normalizedHours.toFixed(2)) : null,
      lopApplied,
      lopDays,
      weekOffs,
      supportingDocument: supportingDocumentPath || null,
      balanceSnapshot: selectedBalance || null
    }
  };
};

// Apply for leave
export const applyLeave = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (!req.body.reason) {
      return res.status(400).json({ success: false, message: 'Reason is required' });
    }

    const partialDayType = req.body.partialDayType || ((req.body.isHalfDay === true || req.body.isHalfDay === 'true') ? 'half_day' : 'full_day');
    const applyLop = req.body.applyLop === true || req.body.applyLop === 'true';
    const hoursRequested = req.body.hoursRequested ? Number(req.body.hoursRequested) : 0;

    const validation = await validateAndPrepareLeaveRequest({
      employee,
      leaveTypeId: req.body.leaveType,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      partialDayType,
      halfDayType: req.body.halfDayType || null,
      hoursRequested,
      applyLop,
      reason: req.body.reason,
      supportingDocumentPath: req.file ? `/uploads/${req.file.filename}` : null
    });

    if (validation.error) {
      return res.status(validation.error.status || 400).json({
        success: false,
        message: validation.error.message,
        ...(validation.error.suggestions ? { suggestions: validation.error.suggestions } : {})
      });
    }

    const payload = validation.data;

    const leaveRequest = await LeaveRequest.create({
      employee: employee._id,
      leaveType: payload.leaveType._id,
      startDate: payload.start.toDate(),
      endDate: payload.end.toDate(),
      days: payload.days,
      workingDays: payload.workingDays,
      partialDayType: payload.partialDayType,
      hoursRequested: payload.hoursRequested,
      isHalfDay: payload.partialDayType === 'half_day',
      halfDayType: payload.halfDayType,
      reason: req.body.reason,
      status: 'pending',
      supportingDocument: payload.supportingDocument,
      lopApplied: payload.lopApplied,
      lopDays: payload.lopDays
    });

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('leaveType', 'name code category')
      .populate('employee', 'firstName lastName employeeId')
      .populate('approvedBy', 'email');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted',
      data: populated,
      balancePreview: payload.balanceSnapshot
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update an existing pending leave request (employee only)
export const updateLeaveRequest = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const existing = await LeaveRequest.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (!existing.employee.equals(employee._id)) {
      return res.status(403).json({ success: false, message: 'You can only modify your own leave requests' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be modified' });
    }

    const partialDayType = req.body.partialDayType || ((req.body.isHalfDay === true || req.body.isHalfDay === 'true') ? 'half_day' : 'full_day');
    const applyLop = req.body.applyLop === true || req.body.applyLop === 'true';
    const hoursRequested = req.body.hoursRequested ? Number(req.body.hoursRequested) : existing.hoursRequested || 0;

    const validation = await validateAndPrepareLeaveRequest({
      employee,
      leaveTypeId: req.body.leaveType || existing.leaveType,
      startDate: req.body.startDate || existing.startDate,
      endDate: req.body.endDate || existing.endDate,
      partialDayType,
      halfDayType: req.body.halfDayType || existing.halfDayType,
      hoursRequested,
      applyLop,
      reason: req.body.reason || existing.reason,
      existingRequestId: existing._id,
      supportingDocumentPath: req.file ? `/uploads/${req.file.filename}` : existing.supportingDocument
    });

    if (validation.error) {
      return res.status(validation.error.status || 400).json({
        success: false,
        message: validation.error.message,
        ...(validation.error.suggestions ? { suggestions: validation.error.suggestions } : {})
      });
    }

    const payload = validation.data;

    existing.leaveType = payload.leaveType._id;
    existing.startDate = payload.start.toDate();
    existing.endDate = payload.end.toDate();
    existing.days = payload.days;
    existing.workingDays = payload.workingDays;
    existing.partialDayType = payload.partialDayType;
    existing.hoursRequested = payload.hoursRequested;
    existing.isHalfDay = payload.partialDayType === 'half_day';
    existing.halfDayType = payload.halfDayType;
    existing.reason = req.body.reason || existing.reason;
    existing.supportingDocument = payload.supportingDocument || existing.supportingDocument;
    existing.lopApplied = payload.lopApplied;
    existing.lopDays = payload.lopDays;

    await existing.save();

    const populated = await LeaveRequest.findById(existing._id)
      .populate('leaveType', 'name code category')
      .populate('employee', 'firstName lastName employeeId')
      .populate('approvedBy', 'email');

    res.json({
      success: true,
      message: 'Leave request updated',
      data: populated,
      balancePreview: payload.balanceSnapshot
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel a pending leave request (employee only)
export const cancelLeaveRequest = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (!leaveRequest.employee.equals(employee._id)) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own leave requests' });
    }

    if (!['pending', 'info_requested'].includes(leaveRequest.status)) {
      return res.status(400).json({ success: false, message: 'Only pending or info-requested leaves can be cancelled' });
    }

    leaveRequest.status = 'cancelled';
    await leaveRequest.save();

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('leaveType', 'name code category')
      .populate('employee', 'firstName lastName employeeId');

    res.json({ success: true, message: 'Leave request cancelled', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get leave requests
export const getLeaveRequests = async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) filter.employee = employee._id;
    } else if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
    }

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.$or = [
        { startDate: { $gte: new Date(startDate || '2020-01-01'), $lte: new Date(endDate || '2099-12-31') } },
        { endDate: { $gte: new Date(startDate || '2020-01-01'), $lte: new Date(endDate || '2099-12-31') } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate('employee', 'firstName lastName employeeId')
        .populate('leaveType', 'name code')
        .populate('approvedBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LeaveRequest.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: requests,
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

// Approve/Reject leave with enhanced functionality
export const updateLeaveStatus = async (req, res) => {
  try {
    const { status, rejectionReason, approvalRemarks } = req.body;
    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee');

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // Validate rejection reason is mandatory
    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is mandatory' });
    }

    leaveRequest.status = status;
    leaveRequest.approvedBy = req.user._id;
    leaveRequest.approvedAt = new Date();

    if (status === 'rejected') {
      leaveRequest.rejectionReason = rejectionReason;
    }

    if (approvalRemarks) {
      leaveRequest.approvalRemarks = approvalRemarks;
    }

    await leaveRequest.save();

    // Upon approval, update attendance and shift assignments
    if (status === 'approved') {
      await updateAttendanceForApprovedLeave(leaveRequest);
      await bypassShiftAssignmentsForLeave(leaveRequest);
    }

    const updated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('leaveType', 'name code')
      .populate('approvedBy', 'email');

    res.json({ 
      success: true, 
      message: `Leave request ${status}`, 
      data: updated 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update attendance records for approved leave
const updateAttendanceForApprovedLeave = async (leaveRequest) => {
  const start = moment(leaveRequest.startDate);
  const end = moment(leaveRequest.endDate);
  
  for (let cursor = start.clone(); cursor.isSameOrBefore(end, 'day'); cursor.add(1, 'day')) {
    const date = cursor.clone().startOf('day').toDate();
    
    // Check if attendance record exists
    let attendance = await Attendance.findOne({
      employee: leaveRequest.employee._id || leaveRequest.employee,
      date: date
    });

    if (!attendance) {
      // Create new attendance record with leave status
      attendance = await Attendance.create({
        employee: leaveRequest.employee._id || leaveRequest.employee,
        date: date,
        punches: [],
        status: 'leave',
        remarks: `Leave - ${leaveRequest.leaveType?.name || 'Approved'}`
      });
    } else {
      // Update existing record
      attendance.status = 'leave';
      attendance.remarks = `Leave - ${leaveRequest.leaveType?.name || 'Approved'}`;
      await attendance.save();
    }
  }
};

// Bypass shift assignments for leave days
const bypassShiftAssignmentsForLeave = async (leaveRequest) => {
  const start = moment(leaveRequest.startDate);
  const end = moment(leaveRequest.endDate);
  const employeeId = leaveRequest.employee._id || leaveRequest.employee;

  for (let cursor = start.clone(); cursor.isSameOrBefore(end, 'day'); cursor.add(1, 'day')) {
    const date = cursor.clone().startOf('day').toDate();

    // Find or create shift assignment with leave override
    let assignment = await ShiftAssignment.findOne({
      employee: employeeId,
      date: date
    });

    if (assignment) {
      // Update existing assignment
      assignment.overrideType = 'leave';
      assignment.notes = `Leave approved: ${leaveRequest._id}`;
      await assignment.save();
    } else {
      // Get employee's default shift
      const employee = await Employee.findById(employeeId);
      if (employee?.shift) {
        await ShiftAssignment.create({
          employee: employeeId,
          shift: employee.shift,
          date: date,
          type: 'override',
          overrideType: 'leave',
          status: 'published',
          isPublished: true,
          notes: `Leave approved: ${leaveRequest._id}`
        });
      }
    }
  }
};

// Get leave balance
export const getLeaveBalance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const balances = await buildLeaveBalances(employee._id);
    res.json({ success: true, data: balances });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== ENHANCED APPROVAL DASHBOARD FUNCTIONS (Story 7.3) =====

// Get pending approvals with context for HR/Manager dashboard
export const getPendingApprovals = async (req, res) => {
  try {
    const { page = 1, limit = 20, departmentId, employeeId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const filter = { status: { $in: ['pending', 'info_requested'] } };

    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) filter.employee = employee._id;
    }

    let departmentFilter = {};
    if (departmentId) {
      departmentFilter = { department: departmentId };
    }

    // Get employees that match department filter if specified
    let employeeIds = null;
    if (departmentId) {
      const employees = await Employee.find(departmentFilter).select('_id');
      employeeIds = employees.map(e => e._id);
      filter.employee = { $in: employeeIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [requests, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate({
          path: 'employee',
          select: 'firstName lastName employeeId department designation shift employeeCategory',
          populate: [
            { path: 'department', select: 'name' },
            { path: 'designation', select: 'name' },
            { path: 'shift', select: 'name startTime endTime' }
          ]
        })
        .populate('leaveType', 'name code category isPaid maxDays rules')
        .populate('approvedBy', 'email')
        .populate('infoRequests.requestedBy', 'email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      LeaveRequest.countDocuments(filter)
    ]);

    // Enrich each request with additional context
    const enrichedRequests = await Promise.all(requests.map(async (request) => {
      const requestObj = request.toObject();
      
      // Get employee's leave balance
      if (request.employee?._id) {
        requestObj.leaveBalance = await buildLeaveBalances(request.employee._id);
      }

      // Get overlapping team leaves
      requestObj.overlappingTeamLeaves = await getOverlappingTeamLeaves(
        request.employee?._id,
        request.employee?.department?._id,
        request.startDate,
        request.endDate
      );

      // Get employee's shift schedule for leave period
      if (request.employee?._id) {
        requestObj.shiftSchedule = await getShiftScheduleForPeriod(
          request.employee._id,
          request.startDate,
          request.endDate
        );
      }

      // Detect conflicts
      requestObj.conflicts = await detectConflicts(request);

      // Calculate escalation status
      const daysSinceCreated = moment().diff(moment(request.createdAt), 'days');
      requestObj.isOverdue = daysSinceCreated >= ESCALATION_CONFIG.daysBeforeEscalation;
      requestObj.daysPending = daysSinceCreated;

      return requestObj;
    }));

    res.json({
      success: true,
      data: enrichedRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: {
        totalPending: total,
        overdue: enrichedRequests.filter(r => r.isOverdue).length,
        withConflicts: enrichedRequests.filter(r => r.conflicts?.length > 0).length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get overlapping team leaves
const getOverlappingTeamLeaves = async (employeeId, departmentId, startDate, endDate) => {
  if (!departmentId) return [];

  const teamEmployees = await Employee.find({ department: departmentId, _id: { $ne: employeeId } }).select('_id');
  const teamEmployeeIds = teamEmployees.map(e => e._id);

  const overlapping = await LeaveRequest.find({
    employee: { $in: teamEmployeeIds },
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: new Date(endDate) },
    endDate: { $gte: new Date(startDate) }
  })
    .populate('employee', 'firstName lastName employeeId')
    .populate('leaveType', 'name code')
    .select('employee leaveType startDate endDate days status');

  return overlapping;
};

// Get shift schedule for a period
const getShiftScheduleForPeriod = async (employeeId, startDate, endDate) => {
  const assignments = await ShiftAssignment.find({
    employee: employeeId,
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  })
    .populate('shift', 'name startTime endTime')
    .sort({ date: 1 });

  return assignments.map(a => ({
    date: a.date,
    shift: a.shift,
    type: a.type,
    overrideType: a.overrideType
  }));
};

// Detect conflicts for a leave request
const detectConflicts = async (leaveRequest) => {
  const conflicts = [];
  const employee = leaveRequest.employee;
  
  if (!employee?.department) return conflicts;

  // Check team overlap percentage
  const teamEmployees = await Employee.find({ 
    department: employee.department._id || employee.department, 
    status: 'active' 
  }).select('_id');
  
  const teamSize = teamEmployees.length;
  const teamEmployeeIds = teamEmployees.map(e => e._id);

  const overlappingApproved = await LeaveRequest.countDocuments({
    employee: { $in: teamEmployeeIds },
    _id: { $ne: leaveRequest._id },
    status: 'approved',
    startDate: { $lte: new Date(leaveRequest.endDate) },
    endDate: { $gte: new Date(leaveRequest.startDate) }
  });

  const overlappingPending = await LeaveRequest.countDocuments({
    employee: { $in: teamEmployeeIds },
    _id: { $ne: leaveRequest._id },
    status: 'pending',
    startDate: { $lte: new Date(leaveRequest.endDate) },
    endDate: { $gte: new Date(leaveRequest.startDate) }
  });

  const totalOverlapping = overlappingApproved + overlappingPending + 1; // +1 for current request
  const overlapPercent = (totalOverlapping / teamSize) * 100;

  if (overlapPercent >= ESCALATION_CONFIG.maxTeamLeavesPercent) {
    conflicts.push({
      type: 'max_team_leaves',
      message: `${Math.round(overlapPercent)}% of team (${totalOverlapping}/${teamSize}) will be on leave during this period`,
      severity: overlapPercent >= 50 ? 'critical' : 'warning'
    });
  }

  // Check for critical role conflicts
  if (ESCALATION_CONFIG.criticalRoles.includes(employee.employeeCategory)) {
    const sameRoleOnLeave = await LeaveRequest.find({
      employee: { $in: teamEmployeeIds, $ne: leaveRequest.employee._id },
      status: { $in: ['pending', 'approved'] },
      startDate: { $lte: new Date(leaveRequest.endDate) },
      endDate: { $gte: new Date(leaveRequest.startDate) }
    }).populate('employee', 'employeeCategory');

    const criticalRolesOnLeave = sameRoleOnLeave.filter(
      r => ESCALATION_CONFIG.criticalRoles.includes(r.employee?.employeeCategory)
    );

    if (criticalRolesOnLeave.length > 0) {
      conflicts.push({
        type: 'critical_role',
        message: `${criticalRolesOnLeave.length} other employee(s) with critical roles are also on leave during this period`,
        severity: 'critical'
      });
    }
  }

  // Check if multiple team members already overlapping
  if (overlappingApproved >= 2) {
    conflicts.push({
      type: 'team_overlap',
      message: `${overlappingApproved} team members already have approved leaves overlapping this period`,
      severity: 'warning'
    });
  }

  return conflicts;
};

// Request more information from employee
export const requestMoreInfo = async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Can only request info for pending requests' });
    }

    leaveRequest.status = 'info_requested';
    leaveRequest.infoRequests.push({
      requestedBy: req.user._id,
      message,
      requestedAt: new Date()
    });

    await leaveRequest.save();

    const updated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('leaveType', 'name code')
      .populate('infoRequests.requestedBy', 'email');

    res.json({ 
      success: true, 
      message: 'Information requested from employee', 
      data: updated 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Employee responds to info request
export const respondToInfoRequest = async (req, res) => {
  try {
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).json({ success: false, message: 'Response is required' });
    }

    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (!leaveRequest.employee.equals(employee._id)) {
      return res.status(403).json({ success: false, message: 'You can only respond to your own leave requests' });
    }

    if (leaveRequest.status !== 'info_requested') {
      return res.status(400).json({ success: false, message: 'No pending information request' });
    }

    // Find the latest unanswered info request
    const latestInfoRequest = leaveRequest.infoRequests[leaveRequest.infoRequests.length - 1];
    if (latestInfoRequest && !latestInfoRequest.response) {
      latestInfoRequest.response = response;
      latestInfoRequest.respondedAt = new Date();
    }

    // Set status back to pending
    leaveRequest.status = 'pending';

    await leaveRequest.save();

    const updated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('leaveType', 'name code')
      .populate('infoRequests.requestedBy', 'email');

    res.json({ 
      success: true, 
      message: 'Response submitted successfully', 
      data: updated 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk approve leaves
export const bulkApproveLeaves = async (req, res) => {
  try {
    const { requestIds, approvalRemarks } = req.body;
    
    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Request IDs array is required' });
    }

    const results = { approved: [], failed: [] };

    for (const requestId of requestIds) {
      try {
        const leaveRequest = await LeaveRequest.findById(requestId).populate('employee');
        
        if (!leaveRequest) {
          results.failed.push({ id: requestId, reason: 'Not found' });
          continue;
        }

        if (leaveRequest.status !== 'pending') {
          results.failed.push({ id: requestId, reason: `Invalid status: ${leaveRequest.status}` });
          continue;
        }

        leaveRequest.status = 'approved';
        leaveRequest.approvedBy = req.user._id;
        leaveRequest.approvedAt = new Date();
        leaveRequest.approvalRemarks = approvalRemarks || 'Bulk approved';

        await leaveRequest.save();

        // Update attendance and shift assignments
        await updateAttendanceForApprovedLeave(leaveRequest);
        await bypassShiftAssignmentsForLeave(leaveRequest);

        results.approved.push(requestId);
      } catch (err) {
        results.failed.push({ id: requestId, reason: err.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk approval completed: ${results.approved.length} approved, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Auto-escalate pending leaves (typically called via cron job)
export const escalatePendingLeaves = async (req, res) => {
  try {
    const escalationThreshold = moment().subtract(ESCALATION_CONFIG.daysBeforeEscalation, 'days').toDate();
    
    const overdueRequests = await LeaveRequest.find({
      status: 'pending',
      createdAt: { $lte: escalationThreshold },
      currentApprovalLevel: 1 // Only escalate from level 1
    }).populate('employee', 'reportingManager');

    const escalated = [];

    for (const request of overdueRequests) {
      request.currentApprovalLevel = 2;
      request.escalationHistory.push({
        fromLevel: 1,
        toLevel: 2,
        escalatedAt: new Date(),
        escalatedTo: request.employee?.reportingManager || null,
        reason: 'auto_escalation'
      });
      request.escalationDueDate = moment().add(ESCALATION_CONFIG.daysBeforeEscalation, 'days').toDate();
      
      await request.save();
      escalated.push(request._id);
    }

    res.json({
      success: true,
      message: `Escalated ${escalated.length} leave requests`,
      data: { escalatedCount: escalated.length, escalatedIds: escalated }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get leave balance for a specific employee (HR view)
export const getEmployeeLeaveBalance = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const balances = await buildLeaveBalances(employee._id);
    res.json({ success: true, data: balances });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get leave calendar for team/department
export const getTeamLeaveCalendar = async (req, res) => {
  try {
    const { month, year, departmentId } = req.query;
    const targetMonth = month && year ? moment(`${year}-${month}-01`) : moment();
    const startDate = moment(targetMonth).startOf('month').toDate();
    const endDate = moment(targetMonth).endOf('month').toDate();

    let filter = {
      status: { $in: ['pending', 'approved'] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    };

    if (departmentId) {
      const employees = await Employee.find({ department: departmentId }).select('_id');
      filter.employee = { $in: employees.map(e => e._id) };
    }

    const leaves = await LeaveRequest.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('leaveType', 'name code')
      .select('employee leaveType startDate endDate days status');

    // Build calendar data
    const daysInMonth = moment(targetMonth).daysInMonth();
    const calendar = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = moment(targetMonth).date(day);
      const dayLeaves = leaves.filter(leave => 
        currentDate.isBetween(moment(leave.startDate), moment(leave.endDate), 'day', '[]')
      );

      calendar.push({
        date: currentDate.format('YYYY-MM-DD'),
        dayOfWeek: currentDate.day(),
        leaves: dayLeaves.map(l => ({
          employee: l.employee,
          leaveType: l.leaveType,
          status: l.status
        }))
      });
    }

    res.json({ success: true, data: calendar });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== ENHANCED LEAVE BALANCE FUNCTIONS (Story 7.4) =====

// Get enhanced leave balance with detailed breakdown
export const getEnhancedLeaveBalance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const leaveTypes = await LeaveType.find({ isActive: true, isLatest: true });
    const currentYear = moment().year();
    const yearStart = moment().startOf('year').toDate();
    const yearEnd = moment().endOf('year').toDate();

    const detailedBalances = [];

    for (const leaveType of leaveTypes) {
      // Get all leave requests for this type
      const [approved, pending, cancelled] = await Promise.all([
        LeaveRequest.find({
          employee: employee._id,
          leaveType: leaveType._id,
          status: 'approved',
          startDate: { $gte: yearStart, $lte: yearEnd }
        }).select('days startDate endDate lopDays'),
        LeaveRequest.find({
          employee: employee._id,
          leaveType: leaveType._id,
          status: { $in: ['pending', 'info_requested'] },
          startDate: { $gte: yearStart, $lte: yearEnd }
        }).select('days startDate endDate'),
        LeaveRequest.find({
          employee: employee._id,
          leaveType: leaveType._id,
          status: 'cancelled',
          startDate: { $gte: yearStart, $lte: yearEnd }
        }).select('days startDate endDate')
      ]);

      const usedDays = approved.reduce((sum, req) => sum + (req.days || 0), 0);
      const pendingDays = pending.reduce((sum, req) => sum + (req.days || 0), 0);
      const lopDays = approved.reduce((sum, req) => sum + (req.lopDays || 0), 0);
      const totalQuota = leaveType.maxDays || 0;

      // Calculate carry forward (simplified - based on rules)
      const carryForwardRules = leaveType.rules?.carryForward || {};
      const carryForwardEnabled = carryForwardRules.enabled || false;
      const maxCarryForward = carryForwardRules.maxDays || 0;
      
      // Simplified carry forward calculation (would need previous year data in production)
      const carriedForward = 0; // In production, calculate from previous year

      // Calculate encashment (simplified)
      const encashmentRules = leaveType.rules?.encashment || {};
      const encashmentEnabled = encashmentRules.enabled || false;
      const encashedDays = 0; // Would track actual encashments

      // Calculate accrual
      const accrualRules = leaveType.rules?.accrual || {};
      const accrualFrequency = accrualRules.frequency || 'none';
      const accrualRate = accrualRules.ratePerCycle || 0;

      // Calculate credited so far this year
      let creditedThisYear = 0;
      if (accrualFrequency === 'monthly') {
        const monthsElapsed = moment().month() + 1;
        creditedThisYear = monthsElapsed * accrualRate;
      } else if (accrualFrequency === 'quarterly') {
        const quartersElapsed = Math.floor((moment().month() + 1) / 3);
        creditedThisYear = quartersElapsed * accrualRate;
      } else if (accrualFrequency === 'yearly') {
        creditedThisYear = accrualRate;
      } else {
        creditedThisYear = totalQuota; // Lump sum at start
      }

      const totalCredits = Math.min(creditedThisYear + carriedForward, totalQuota);
      const availableBalance = Math.max(totalCredits - usedDays - pendingDays, 0);

      detailedBalances.push({
        leaveType: {
          _id: leaveType._id,
          name: leaveType.name,
          code: leaveType.code,
          category: leaveType.category,
          isPaid: leaveType.isPaid,
          maxDays: totalQuota
        },
        summary: {
          totalQuota,
          creditedThisYear: Number(creditedThisYear.toFixed(2)),
          carriedForward,
          totalCredits: Number(totalCredits.toFixed(2)),
          used: Number(usedDays.toFixed(2)),
          pending: Number(pendingDays.toFixed(2)),
          encashed: encashedDays,
          lop: Number(lopDays.toFixed(2)),
          available: Number(availableBalance.toFixed(2)),
          balance: Number(Math.max(totalCredits - usedDays, 0).toFixed(2))
        },
        rules: {
          accrual: {
            frequency: accrualFrequency,
            ratePerCycle: accrualRate,
            prorated: accrualRules.prorated || false
          },
          carryForward: {
            enabled: carryForwardEnabled,
            maxDays: maxCarryForward,
            expiresAfterMonths: carryForwardRules.expiresAfterMonths || 0
          },
          encashment: {
            enabled: encashmentEnabled,
            maxEncashable: encashmentRules.maxEncashable || 0
          },
          usage: {
            allowHalfDay: leaveType.rules?.usage?.allowHalfDay || false,
            allowHourly: leaveType.rules?.usage?.allowHourly || false,
            requiresDocument: leaveType.rules?.usage?.requiresDocument || false
          }
        },
        transactions: {
          approved: approved.map(r => ({
            days: r.days,
            startDate: r.startDate,
            endDate: r.endDate,
            lopDays: r.lopDays
          })),
          pending: pending.map(r => ({
            days: r.days,
            startDate: r.startDate,
            endDate: r.endDate
          }))
        }
      });
    }

    res.json({
      success: true,
      data: {
        employee: {
          _id: employee._id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          joiningDate: employee.joiningDate
        },
        year: currentYear,
        balances: detailedBalances,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get monthly leave usage for charts
export const getMonthlyLeaveUsage = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { year = moment().year() } = req.query;
    const yearStart = moment(`${year}-01-01`).startOf('year').toDate();
    const yearEnd = moment(`${year}-12-31`).endOf('year').toDate();

    // Get all approved leaves for the year
    const approvedLeaves = await LeaveRequest.find({
      employee: employee._id,
      status: 'approved',
      startDate: { $lte: yearEnd },
      endDate: { $gte: yearStart }
    })
      .populate('leaveType', 'name code category isPaid')
      .sort({ startDate: 1 });

    // Build monthly breakdown
    const monthlyUsage = [];
    for (let month = 0; month < 12; month++) {
      const monthStart = moment(`${year}-${String(month + 1).padStart(2, '0')}-01`);
      const monthEnd = monthStart.clone().endOf('month');

      const monthData = {
        month: month + 1,
        monthName: monthStart.format('MMM'),
        leavesByType: {},
        totalDays: 0
      };

      // Calculate days per leave type for this month
      for (const leave of approvedLeaves) {
        const leaveStart = moment(leave.startDate);
        const leaveEnd = moment(leave.endDate);

        // Check if leave overlaps with this month
        if (leaveStart.isSameOrBefore(monthEnd) && leaveEnd.isSameOrAfter(monthStart)) {
          const overlapStart = moment.max(leaveStart, monthStart);
          const overlapEnd = moment.min(leaveEnd, monthEnd);
          
          // Count working days in overlap (simplified - counts all days)
          let daysInMonth = 0;
          for (let d = overlapStart.clone(); d.isSameOrBefore(overlapEnd); d.add(1, 'day')) {
            const dayOfWeek = d.day();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude weekends
              daysInMonth += 1;
            }
          }

          // Adjust for partial days
          if (leave.partialDayType === 'half_day' && daysInMonth > 0) {
            daysInMonth = 0.5;
          }

          const typeKey = leave.leaveType?.code || 'OTHER';
          if (!monthData.leavesByType[typeKey]) {
            monthData.leavesByType[typeKey] = {
              code: typeKey,
              name: leave.leaveType?.name || 'Other',
              days: 0,
              isPaid: leave.leaveType?.isPaid !== false
            };
          }
          monthData.leavesByType[typeKey].days += daysInMonth;
          monthData.totalDays += daysInMonth;
        }
      }

      monthlyUsage.push(monthData);
    }

    // Calculate burn rate (cumulative usage as percentage)
    const leaveTypes = await LeaveType.find({ isActive: true, isLatest: true });
    const totalQuota = leaveTypes.reduce((sum, lt) => sum + (lt.maxDays || 0), 0);
    
    let cumulativeUsage = 0;
    const burnRate = monthlyUsage.map((month, idx) => {
      cumulativeUsage += month.totalDays;
      const expectedBurnRate = ((idx + 1) / 12) * 100; // Linear expectation
      const actualBurnRate = totalQuota > 0 ? (cumulativeUsage / totalQuota) * 100 : 0;
      
      return {
        month: month.month,
        monthName: month.monthName,
        expected: Number(expectedBurnRate.toFixed(1)),
        actual: Number(actualBurnRate.toFixed(1)),
        cumulative: Number(cumulativeUsage.toFixed(1))
      };
    });

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        monthlyUsage,
        burnRate,
        totalQuota,
        totalUsed: Number(cumulativeUsage.toFixed(1)),
        remainingQuota: Number(Math.max(totalQuota - cumulativeUsage, 0).toFixed(1))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get leave transaction history
export const getLeaveHistory = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { year, leaveTypeId, status, page = 1, limit = 20 } = req.query;
    const filter = { employee: employee._id };

    if (year) {
      const yearStart = moment(`${year}-01-01`).startOf('year').toDate();
      const yearEnd = moment(`${year}-12-31`).endOf('year').toDate();
      filter.startDate = { $gte: yearStart, $lte: yearEnd };
    }

    if (leaveTypeId) {
      filter.leaveType = leaveTypeId;
    }

    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leaves, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate('leaveType', 'name code category isPaid')
        .populate('approvedBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LeaveRequest.countDocuments(filter)
    ]);

    const history = leaves.map(leave => ({
      _id: leave._id,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      days: leave.days,
      partialDayType: leave.partialDayType,
      status: leave.status,
      reason: leave.reason,
      rejectionReason: leave.rejectionReason,
      approvedBy: leave.approvedBy,
      approvedAt: leave.approvedAt,
      lopApplied: leave.lopApplied,
      lopDays: leave.lopDays,
      createdAt: leave.createdAt
    }));

    res.json({
      success: true,
      data: history,
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

// Get upcoming leave credits/accruals
export const getUpcomingCredits = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const leaveTypes = await LeaveType.find({ isActive: true, isLatest: true });
    const upcomingCredits = [];
    const today = moment();

    for (const leaveType of leaveTypes) {
      const accrualRules = leaveType.rules?.accrual || {};
      const frequency = accrualRules.frequency || 'none';
      const rate = accrualRules.ratePerCycle || 0;

      if (frequency === 'none' || rate <= 0) continue;

      // Calculate next credit date
      let nextCreditDate = null;
      let nextCreditAmount = rate;

      if (frequency === 'monthly') {
        nextCreditDate = today.clone().add(1, 'month').startOf('month');
      } else if (frequency === 'quarterly') {
        const currentQuarter = Math.floor(today.month() / 3);
        nextCreditDate = today.clone().month((currentQuarter + 1) * 3).startOf('month');
        if (nextCreditDate.isSameOrBefore(today)) {
          nextCreditDate.add(3, 'months');
        }
      } else if (frequency === 'yearly') {
        const fiscalStart = accrualRules.fiscalYearStartMonth || 4;
        nextCreditDate = today.clone().month(fiscalStart - 1).startOf('month');
        if (nextCreditDate.isSameOrBefore(today)) {
          nextCreditDate.add(1, 'year');
        }
      }

      if (nextCreditDate) {
        upcomingCredits.push({
          leaveType: {
            _id: leaveType._id,
            name: leaveType.name,
            code: leaveType.code
          },
          creditDate: nextCreditDate.toDate(),
          creditAmount: nextCreditAmount,
          frequency
        });
      }
    }

    // Sort by credit date
    upcomingCredits.sort((a, b) => new Date(a.creditDate) - new Date(b.creditDate));

    res.json({
      success: true,
      data: upcomingCredits
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get company holidays
export const getCompanyHolidays = async (req, res) => {
  try {
    const { year = moment().year() } = req.query;
    const yearStart = moment(`${year}-01-01`).startOf('year').toDate();
    const yearEnd = moment(`${year}-12-31`).endOf('year').toDate();

    // Get holidays from shift assignments with overrideType = 'holiday'
    const holidays = await ShiftAssignment.find({
      overrideType: 'holiday',
      date: { $gte: yearStart, $lte: yearEnd }
    })
      .select('date notes')
      .sort({ date: 1 });

    // Remove duplicates and format
    const uniqueHolidays = [];
    const seenDates = new Set();

    for (const holiday of holidays) {
      const dateKey = moment(holiday.date).format('YYYY-MM-DD');
      if (!seenDates.has(dateKey)) {
        seenDates.add(dateKey);
        uniqueHolidays.push({
          date: holiday.date,
          name: holiday.notes || 'Company Holiday',
          dayOfWeek: moment(holiday.date).day(),
          dayName: moment(holiday.date).format('dddd')
        });
      }
    }

    // Calculate upcoming holidays
    const today = moment().startOf('day');
    const upcomingHolidays = uniqueHolidays.filter(h => moment(h.date).isSameOrAfter(today));
    const pastHolidays = uniqueHolidays.filter(h => moment(h.date).isBefore(today));

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        totalHolidays: uniqueHolidays.length,
        upcoming: upcomingHolidays,
        past: pastHolidays,
        all: uniqueHolidays
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
