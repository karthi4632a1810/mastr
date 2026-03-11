import Employee from '../models/employee.model.js';
import Attendance from '../models/attendance.model.js';
import AttendanceRegularization from '../models/attendanceRegularization.model.js';
import LeaveRequest from '../models/leaveRequest.model.js';
import LeaveType from '../models/leaveType.model.js';
import ShiftChangeRequest from '../models/shiftChangeRequest.model.js';
import ExpenseClaim from '../models/expense.model.js';
import { Payslip } from '../models/payroll.model.js';
import ShiftAssignment from '../models/shiftAssignment.model.js';
import Shift from '../models/shift.model.js';
import moment from 'moment';
import mongoose from 'mongoose';

/**
 * Get comprehensive ESS Dashboard data for the logged-in employee
 * Story 15.1 – ESS Dashboard (Enhanced)
 */
export const getESSDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find employee associated with this user
    const employee = await Employee.findOne({ userId })
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('reportingManager', 'firstName lastName employeeId')
      .populate('shift', 'name startTime endTime');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee profile not found'
      });
    }

    const today = moment().startOf('day');
    const monthStart = moment().startOf('month');
    const monthEnd = moment().endOf('month');

    // ==================== PROFILE SNAPSHOT ====================
    const profileSnapshot = await getProfileSnapshot(employee);

    // ==================== ATTENDANCE SUMMARY ====================
    const attendanceSummary = await getAttendanceSummary(employee._id, today, monthStart, monthEnd);

    // ==================== LEAVE BALANCE ====================
    const leaveBalance = await getLeaveBalance(employee._id);

    // ==================== RECENT PAYSLIPS ====================
    const recentPayslips = await getRecentPayslips(employee._id);

    // ==================== OPEN REQUESTS ====================
    const openRequests = await getOpenRequests(employee._id);

    // ==================== UPCOMING SHIFTS ====================
    const upcomingShifts = await getUpcomingShifts(employee._id);

    // ==================== NOTIFICATIONS & ALERTS ====================
    const notifications = await getNotificationsForEmployee(employee);

    // ==================== AI INSIGHTS (Future-Ready) ====================
    const insights = await generateInsights(employee._id, attendanceSummary);

    // ==================== QUICK ACTIONS ====================
    const quickActions = getQuickActions();

    // ==================== GAMIFICATION (Future-Ready) ====================
    const badges = await calculateBadges(employee._id, attendanceSummary);

    res.json({
      success: true,
      data: {
        profileSnapshot,
        attendanceSummary,
        leaveBalance,
        recentPayslips,
        openRequests,
        upcomingShifts,
        notifications,
        insights,
        quickActions,
        badges
      }
    });
  } catch (error) {
    console.error('ESS Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Calculate profile completion percentage and snapshot
 */
async function getProfileSnapshot(employee) {
  // Fields to check for profile completion
  const requiredFields = [
    'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender',
    'department', 'designation', 'joiningDate'
  ];
  const optionalFields = [
    'alternatePhone', 'alternateEmail', 'bloodGroup', 'maritalStatus',
    'panNumber', 'aadhaarNumber', 'profilePhoto',
    'address.street', 'address.city', 'address.state', 'address.zipCode',
    'emergencyContact.name', 'emergencyContact.phone',
    'bankDetails.accountNumber', 'bankDetails.bankName', 'bankDetails.ifscCode'
  ];

  let completedRequired = 0;
  let completedOptional = 0;

  // Check required fields
  requiredFields.forEach(field => {
    const value = getNestedValue(employee, field);
    if (value && value !== '') completedRequired++;
  });

  // Check optional fields
  optionalFields.forEach(field => {
    const value = getNestedValue(employee, field);
    if (value && value !== '') completedOptional++;
  });

  const totalFields = requiredFields.length + optionalFields.length;
  const completedFields = completedRequired + completedOptional;
  const completionPercentage = Math.round((completedFields / totalFields) * 100);

  // Calculate tenure
  const joiningDate = moment(employee.joiningDate);
  const tenure = moment().diff(joiningDate, 'months');
  const tenureYears = Math.floor(tenure / 12);
  const tenureMonths = tenure % 12;
  const tenureDisplay = tenureYears > 0 
    ? `${tenureYears}y ${tenureMonths}m` 
    : `${tenureMonths} months`;

  return {
    employeeId: employee.employeeId,
    name: `${employee.firstName} ${employee.lastName}`,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone,
    profilePhoto: employee.profilePhoto,
    department: employee.department?.name || 'Not Assigned',
    designation: employee.designation?.name || 'Not Assigned',
    joiningDate: employee.joiningDate,
    reportingManager: employee.reportingManager 
      ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}`
      : 'Not Assigned',
    reportingManagerId: employee.reportingManager?.employeeId,
    status: employee.status,
    employeeType: employee.employeeType,
    shift: employee.shift?.name || 'Default',
    shiftTiming: employee.shift 
      ? `${employee.shift.startTime} - ${employee.shift.endTime}` 
      : null,
    completionPercentage,
    tenure: tenureDisplay,
    tenureMonths: tenure,
    missingFields: getMissingFields(employee, requiredFields, optionalFields)
  };
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function getMissingFields(employee, required, optional) {
  const missing = [];
  [...required, ...optional].forEach(field => {
    const value = getNestedValue(employee, field);
    if (!value || value === '') {
      missing.push(field.replace('.', ' ').replace(/([A-Z])/g, ' $1').trim());
    }
  });
  return missing.slice(0, 5); // Return top 5 missing fields
}

/**
 * Get attendance summary for current month
 */
async function getAttendanceSummary(employeeId, today, monthStart, monthEnd) {
  // Get today's attendance
  const todayAttendance = await Attendance.findOne({
    employee: employeeId,
    date: today.toDate()
  }).populate('shift', 'name startTime endTime');

  // Get monthly attendance records
  const monthlyAttendance = await Attendance.find({
    employee: employeeId,
    date: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() }
  });

  // Calculate statistics
  const totalDays = monthlyAttendance.length;
  const presentDays = monthlyAttendance.filter(a => a.status === 'present').length;
  const absentDays = monthlyAttendance.filter(a => a.status === 'absent').length;
  const leaveDays = monthlyAttendance.filter(a => a.status === 'leave').length;
  const halfDays = monthlyAttendance.filter(a => a.status === 'half_day').length;
  const holidays = monthlyAttendance.filter(a => a.status === 'holiday').length;
  const weekoffs = monthlyAttendance.filter(a => a.status === 'weekend' || a.status === 'weekoff').length;
  const lateCount = monthlyAttendance.filter(a => a.isLate).length;
  const earlyLeaveCount = monthlyAttendance.filter(a => a.isEarlyLeave).length;

  // Calculate working days in month (excluding weekends)
  const workingDaysInMonth = getWorkingDaysInMonth(monthStart, monthEnd);
  const attendancePercentage = workingDaysInMonth > 0 
    ? Math.round((presentDays / workingDaysInMonth) * 100) 
    : 0;

  // Today's punch status
  let todayStatus = 'not_punched';
  let punchInTime = null;
  let punchOutTime = null;
  let workingHours = 0;

  if (todayAttendance) {
    const punchIn = todayAttendance.punches?.find(p => p.type === 'punch_in');
    const punchOut = todayAttendance.punches?.find(p => p.type === 'punch_out');
    
    if (punchIn) {
      punchInTime = punchIn.time;
      todayStatus = 'punched_in';
    }
    if (punchOut) {
      punchOutTime = punchOut.time;
      todayStatus = 'punched_out';
      workingHours = todayAttendance.workingHours || 0;
    }
  }

  // Total working hours this month
  const totalMonthlyHours = monthlyAttendance.reduce((sum, a) => sum + (a.workingHours || 0), 0);
  const totalOvertimeHours = monthlyAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

  return {
    today: {
      status: todayStatus,
      punchInTime,
      punchOutTime,
      workingHours,
      isLate: todayAttendance?.isLate || false,
      isEarlyLeave: todayAttendance?.isEarlyLeave || false,
      shift: todayAttendance?.shift?.name || 'Default'
    },
    monthly: {
      attendancePercentage,
      presentDays,
      absentDays,
      leaveDays,
      halfDays,
      holidays,
      weekoffs,
      lateCount,
      earlyLeaveCount,
      totalWorkingHours: Math.round(totalMonthlyHours * 10) / 10,
      totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
      workingDaysInMonth
    }
  };
}

function getWorkingDaysInMonth(start, end) {
  let count = 0;
  const current = start.clone();
  while (current.isSameOrBefore(end)) {
    if (current.day() !== 0 && current.day() !== 6) { // Exclude weekends
      count++;
    }
    current.add(1, 'day');
  }
  return count;
}

/**
 * Get leave balance for all leave types
 */
async function getLeaveBalance(employeeId) {
  // Get all active leave types
  const leaveTypes = await LeaveType.find({ isActive: true, isLatest: true });
  
  // Get current year leave requests
  const yearStart = moment().startOf('year');
  const yearEnd = moment().endOf('year');
  
  const leaveRequests = await LeaveRequest.find({
    employee: employeeId,
    startDate: { $gte: yearStart.toDate() },
    status: { $in: ['approved', 'pending'] }
  }).populate('leaveType', 'name code');

  // Calculate balance for each leave type
  const balances = leaveTypes.map(lt => {
    const approved = leaveRequests
      .filter(lr => lr.leaveType?._id.toString() === lt._id.toString() && lr.status === 'approved')
      .reduce((sum, lr) => sum + lr.days, 0);
    
    const pending = leaveRequests
      .filter(lr => lr.leaveType?._id.toString() === lt._id.toString() && lr.status === 'pending')
      .reduce((sum, lr) => sum + lr.days, 0);

    const total = lt.maxDays || 0;
    const available = Math.max(0, total - approved);

    return {
      id: lt._id,
      name: lt.name,
      code: lt.code,
      total,
      used: approved,
      pending,
      available,
      isPaid: lt.isPaid,
      allowHalfDay: lt.rules?.usage?.allowHalfDay || false
    };
  });

  // Get next upcoming holiday (placeholder - would need holiday model)
  const nextHoliday = null; // TODO: Implement holiday lookup

  return {
    balances,
    nextHoliday,
    totalLeavesUsed: balances.reduce((sum, b) => sum + b.used, 0),
    totalLeavesAvailable: balances.reduce((sum, b) => sum + b.available, 0)
  };
}

/**
 * Get recent payslips (last 3 months)
 */
async function getRecentPayslips(employeeId) {
  const payslips = await Payslip.find({ employee: employeeId })
    .sort({ year: -1, month: -1 })
    .limit(3)
    .select('month year netSalary grossSalary totalDeductions paymentStatus createdAt');

  const formatted = payslips.map(p => ({
    id: p._id,
    month: p.month,
    year: p.year,
    monthYear: moment().month(p.month - 1).format('MMMM') + ' ' + p.year,
    netSalary: p.netSalary,
    grossSalary: p.grossSalary,
    totalDeductions: p.totalDeductions,
    paymentStatus: p.paymentStatus,
    generatedAt: p.createdAt
  }));

  // Calculate average net salary
  const avgNetSalary = payslips.length > 0
    ? Math.round(payslips.reduce((sum, p) => sum + p.netSalary, 0) / payslips.length)
    : 0;

  return {
    payslips: formatted,
    avgNetSalary,
    latestNetSalary: payslips[0]?.netSalary || 0
  };
}

/**
 * Get open/pending requests
 */
async function getOpenRequests(employeeId) {
  // Pending leave requests
  const pendingLeaves = await LeaveRequest.find({
    employee: employeeId,
    status: { $in: ['pending', 'info_requested'] }
  })
    .populate('leaveType', 'name code')
    .sort({ createdAt: -1 })
    .limit(5);

  // Pending attendance regularizations
  const pendingRegularizations = await AttendanceRegularization.find({
    employee: employeeId,
    status: 'pending'
  })
    .sort({ createdAt: -1 })
    .limit(5);

  // Pending profile change requests
  const employee = await Employee.findById(employeeId)
    .select('changeRequests');
  
  const pendingProfileChanges = (employee?.changeRequests || [])
    .filter(cr => cr.status === 'pending')
    .slice(0, 5);

  return {
    leaves: {
      count: pendingLeaves.length,
      items: pendingLeaves.map(l => ({
        id: l._id,
        type: l.leaveType?.name || 'Leave',
        startDate: l.startDate,
        endDate: l.endDate,
        days: l.days,
        status: l.status,
        createdAt: l.createdAt
      }))
    },
    regularizations: {
      count: pendingRegularizations.length,
      items: pendingRegularizations.map(r => ({
        id: r._id,
        date: r.date,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt
      }))
    },
    profileChanges: {
      count: pendingProfileChanges.length,
      items: pendingProfileChanges.map(p => ({
        field: p.field,
        newValue: p.newValue,
        status: p.status,
        requestedAt: p.requestedAt
      }))
    },
    totalPending: pendingLeaves.length + pendingRegularizations.length + pendingProfileChanges.length
  };
}

/**
 * Get upcoming shifts for next 7 days
 */
async function getUpcomingShifts(employeeId) {
  const today = moment().startOf('day');
  const nextWeek = moment().add(7, 'days').endOf('day');

  const assignments = await ShiftAssignment.find({
    employee: employeeId,
    date: { $gte: today.toDate(), $lte: nextWeek.toDate() }
  })
    .populate('shift', 'name startTime endTime color')
    .sort({ date: 1 });

  return assignments.map(a => ({
    date: a.date,
    dayName: moment(a.date).format('dddd'),
    dateFormatted: moment(a.date).format('MMM D'),
    shift: a.shift?.name || 'Default',
    startTime: a.shift?.startTime,
    endTime: a.shift?.endTime,
    color: a.shift?.color || '#3B82F6'
  }));
}

/**
 * Get notifications and alerts (internal helper function)
 */
async function getNotificationsForEmployee(employee) {
  const notifications = [];
  const today = moment();

  // Check for pending approvals (if any requests need attention)
  const pendingLeaves = await LeaveRequest.countDocuments({
    employee: employee._id,
    status: 'info_requested'
  });
  if (pendingLeaves > 0) {
    notifications.push({
      id: 'info_requested',
      type: 'warning',
      title: 'Information Requested',
      message: `${pendingLeaves} leave request(s) need additional information`,
      actionUrl: '/leaves',
      priority: 'high'
    });
  }

  // Upcoming work anniversary
  const joiningDate = moment(employee.joiningDate);
  const nextAnniversary = joiningDate.clone().year(today.year());
  if (nextAnniversary.isBefore(today)) {
    nextAnniversary.add(1, 'year');
  }
  const daysToAnniversary = nextAnniversary.diff(today, 'days');
  if (daysToAnniversary <= 30 && daysToAnniversary >= 0) {
    notifications.push({
      id: 'anniversary',
      type: 'celebration',
      title: 'Work Anniversary Coming!',
      message: daysToAnniversary === 0 
        ? 'Happy Work Anniversary! 🎉' 
        : `Your work anniversary is in ${daysToAnniversary} days`,
      priority: 'low'
    });
  }

  // Birthday reminder
  if (employee.dateOfBirth) {
    const birthday = moment(employee.dateOfBirth);
    const nextBirthday = birthday.clone().year(today.year());
    if (nextBirthday.isBefore(today)) {
      nextBirthday.add(1, 'year');
    }
    const daysToBirthday = nextBirthday.diff(today, 'days');
    if (daysToBirthday <= 7 && daysToBirthday >= 0) {
      notifications.push({
        id: 'birthday',
        type: 'celebration',
        title: 'Birthday Coming!',
        message: daysToBirthday === 0 
          ? 'Happy Birthday! 🎂' 
          : `Your birthday is in ${daysToBirthday} days`,
        priority: 'low'
      });
    }
  }

  // Profile completion reminder
  if (employee.completionPercentage < 80) {
    notifications.push({
      id: 'profile_incomplete',
      type: 'info',
      title: 'Complete Your Profile',
      message: 'Complete your profile to unlock all features',
      actionUrl: '/my-profile',
      priority: 'medium'
    });
  }

  // System announcements (placeholder)
  // TODO: Fetch from announcements collection

  return notifications.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Generate AI-driven insights
 */
async function generateInsights(employeeId, attendanceSummary) {
  const insights = [];
  const { monthly } = attendanceSummary;

  // Attendance trend insight
  if (monthly.attendancePercentage >= 95) {
    insights.push({
      id: 'excellent_attendance',
      type: 'positive',
      icon: '🌟',
      title: 'Excellent Attendance',
      message: `You have ${monthly.attendancePercentage}% attendance this month. Keep it up!`
    });
  } else if (monthly.attendancePercentage < 80) {
    insights.push({
      id: 'low_attendance',
      type: 'warning',
      icon: '⚠️',
      title: 'Attendance Alert',
      message: `Your attendance is at ${monthly.attendancePercentage}%. Consider improving your presence.`
    });
  }

  // Late arrival pattern
  if (monthly.lateCount > 3) {
    insights.push({
      id: 'late_pattern',
      type: 'suggestion',
      icon: '⏰',
      title: 'Punctuality Tip',
      message: `You've been late ${monthly.lateCount} times this month. Try setting an earlier alarm!`
    });
  }

  // Early leave pattern
  if (monthly.earlyLeaveCount > 2) {
    insights.push({
      id: 'early_leave_pattern',
      type: 'info',
      icon: '📊',
      title: 'Early Departures Noted',
      message: `${monthly.earlyLeaveCount} early departures this month. Plan your tasks accordingly.`
    });
  }

  // Overtime insight
  if (monthly.totalOvertimeHours > 20) {
    insights.push({
      id: 'high_overtime',
      type: 'suggestion',
      icon: '💪',
      title: 'Great Dedication!',
      message: `You've worked ${monthly.totalOvertimeHours}h overtime. Remember to maintain work-life balance.`
    });
  }

  return insights;
}

/**
 * Get quick action buttons
 */
function getQuickActions() {
  return [
    {
      id: 'punch',
      label: 'Punch In/Out',
      icon: 'Clock',
      url: '/attendance',
      color: 'blue'
    },
    {
      id: 'leave',
      label: 'Apply Leave',
      icon: 'Calendar',
      url: '/leaves',
      color: 'green'
    },
    {
      id: 'payslip',
      label: 'View Payslip',
      icon: 'DollarSign',
      url: '/payroll',
      color: 'purple'
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: 'User',
      url: '/my-profile',
      color: 'orange'
    },
    {
      id: 'roster',
      label: 'My Roster',
      icon: 'CalendarDays',
      url: '/my-roster',
      color: 'teal'
    },
    {
      id: 'regularization',
      label: 'Regularization',
      icon: 'Edit',
      url: '/attendance',
      color: 'amber'
    }
  ];
}

/**
 * Calculate gamified badges
 */
async function calculateBadges(employeeId, attendanceSummary) {
  const badges = [];
  const { monthly } = attendanceSummary;

  // Perfect Attendance Badge
  if (monthly.attendancePercentage === 100 && monthly.lateCount === 0) {
    badges.push({
      id: 'perfect_attendance',
      name: 'Perfect Attendance',
      description: '100% attendance with no late arrivals',
      icon: '🏆',
      color: 'gold',
      earnedAt: new Date()
    });
  }

  // Punctuality Pro Badge
  if (monthly.lateCount === 0 && monthly.presentDays >= 10) {
    badges.push({
      id: 'punctuality_pro',
      name: 'Punctuality Pro',
      description: 'No late arrivals this month',
      icon: '⏰',
      color: 'blue',
      earnedAt: new Date()
    });
  }

  // Early Bird Badge
  if (monthly.presentDays >= 15 && monthly.lateCount === 0) {
    badges.push({
      id: 'early_bird',
      name: 'Early Bird',
      description: 'Consistently on time',
      icon: '🌅',
      color: 'orange',
      earnedAt: new Date()
    });
  }

  // Overtime Champion Badge
  if (monthly.totalOvertimeHours >= 15) {
    badges.push({
      id: 'overtime_champion',
      name: 'Overtime Champion',
      description: 'Dedicated extra hours this month',
      icon: '💪',
      color: 'purple',
      earnedAt: new Date()
    });
  }

  // Consistent Performer Badge
  if (monthly.attendancePercentage >= 90) {
    badges.push({
      id: 'consistent_performer',
      name: 'Consistent Performer',
      description: '90%+ attendance maintained',
      icon: '🎯',
      color: 'green',
      earnedAt: new Date()
    });
  }

  return badges;
}

/**
 * Get team birthdays and anniversaries for the current month
 */
export const getTeamCelebrations = async (req, res) => {
  try {
    const userId = req.user._id;
    const employee = await Employee.findOne({ userId }).select('department');
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const currentMonth = moment().month() + 1;
    
    // Get team members in same department
    const teamMembers = await Employee.find({
      department: employee.department,
      status: 'active'
    }).select('firstName lastName dateOfBirth joiningDate profilePhoto');

    const celebrations = [];

    teamMembers.forEach(member => {
      // Check birthday
      if (member.dateOfBirth) {
        const birthMonth = moment(member.dateOfBirth).month() + 1;
        if (birthMonth === currentMonth) {
          celebrations.push({
            type: 'birthday',
            name: `${member.firstName} ${member.lastName}`,
            date: moment(member.dateOfBirth).format('MMM D'),
            photo: member.profilePhoto,
            icon: '🎂'
          });
        }
      }

      // Check work anniversary
      const joinMonth = moment(member.joiningDate).month() + 1;
      if (joinMonth === currentMonth) {
        const years = moment().diff(moment(member.joiningDate), 'years');
        if (years > 0) {
          celebrations.push({
            type: 'anniversary',
            name: `${member.firstName} ${member.lastName}`,
            date: moment(member.joiningDate).format('MMM D'),
            years,
            photo: member.profilePhoto,
            icon: '🎉'
          });
        }
      }
    });

    res.json({
      success: true,
      data: celebrations.sort((a, b) => moment(a.date, 'MMM D').diff(moment(b.date, 'MMM D')))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get attendance trends for the last 6 months
 */
export const getAttendanceTrends = async (req, res) => {
  try {
    const userId = req.user._id;
    const employee = await Employee.findOne({ userId });
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const trends = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = moment().subtract(i, 'months').startOf('month');
      const monthEnd = moment().subtract(i, 'months').endOf('month');
      
      const attendance = await Attendance.find({
        employee: employee._id,
        date: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() }
      });

      const presentDays = attendance.filter(a => a.status === 'present').length;
      const workingDays = getWorkingDaysInMonth(monthStart, monthEnd);
      const percentage = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
      const lateCount = attendance.filter(a => a.isLate).length;

      trends.push({
        month: monthStart.format('MMM'),
        year: monthStart.year(),
        monthYear: monthStart.format('MMM YYYY'),
        attendancePercentage: percentage,
        presentDays,
        workingDays,
        lateCount
      });
    }

    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Story 15.2 – My Requests View (Enhanced)
 * Get all employee requests with filtering and search
 */
export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const employee = await Employee.findOne({ userId });
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { 
      type, 
      status, 
      startDate, 
      endDate, 
      search,
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build base filters
    const employeeFilter = { employee: employee._id };
    const dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.$gte = startDate ? new Date(startDate) : new Date('2020-01-01');
      dateFilter.$lte = endDate ? new Date(endDate) : new Date('2099-12-31');
    }

    // Collection of all requests
    const allRequests = [];

    // 1. Leave Requests
    if (!type || type === 'leave') {
      const leaveFilter = { ...employeeFilter };
      if (status) leaveFilter.status = status;
      
      const dateConditions = [];
      const searchConditions = [];
      
      if (startDate || endDate) {
        dateConditions.push(
          { startDate: dateFilter },
          { endDate: dateFilter },
          { createdAt: dateFilter }
        );
      }
      
      if (search) {
        // Try to match ObjectId if search looks like an ID
        if (search.match(/^[0-9a-fA-F]{24}$/)) {
          try {
            searchConditions.push({ _id: new mongoose.Types.ObjectId(search) });
          } catch (e) {
            // Invalid ObjectId, continue with text search
          }
        }
        searchConditions.push({ reason: new RegExp(search, 'i') });
      }
      
      if (dateConditions.length > 0 || searchConditions.length > 0) {
        leaveFilter.$or = [...dateConditions, ...searchConditions];
      }

      const leaveRequests = await LeaveRequest.find(leaveFilter)
        .populate('leaveType', 'name code')
        .populate('approvedBy', 'email firstName lastName')
        .lean();

      leaveRequests.forEach(req => {
        allRequests.push({
          id: req._id,
          requestId: `LV-${req._id.toString().substring(0, 8).toUpperCase()}`,
          type: 'leave',
          typeLabel: 'Leave Request',
          submissionDate: req.createdAt,
          lastActivityDate: req.updatedAt,
          status: req.status,
          statusLabel: req.status.charAt(0).toUpperCase() + req.status.slice(1),
          approver: req.approvedBy ? 
            `${req.approvedBy.firstName || ''} ${req.approvedBy.lastName || ''}`.trim() || req.approvedBy.email : 
            null,
          resolutionDate: req.approvedAt || req.updatedAt,
          title: `${req.leaveType?.name || 'Leave'} - ${moment(req.startDate).format('MMM D')} to ${moment(req.endDate).format('MMM D')}`,
          details: {
            leaveType: req.leaveType?.name,
            startDate: req.startDate,
            endDate: req.endDate,
            days: req.days,
            reason: req.reason,
            comments: req.approvalRemarks || req.rejectionReason,
            supportingDocument: req.supportingDocument,
            isHalfDay: req.isHalfDay,
            halfDayType: req.halfDayType
          },
          canCancel: ['pending', 'info_requested'].includes(req.status),
          canEdit: ['pending', 'info_requested'].includes(req.status),
          canReopen: req.status === 'rejected',
          metadata: req
        });
      });
    }

    // 2. Attendance Regularizations
    if (!type || type === 'regularization') {
      const regFilter = { ...employeeFilter };
      if (status) regFilter.status = status;
      
      const regDateConditions = [];
      const regSearchConditions = [];
      
      if (startDate || endDate) {
        regDateConditions.push(
          { date: dateFilter },
          { createdAt: dateFilter }
        );
      }
      
      if (search) {
        if (search.match(/^[0-9a-fA-F]{24}$/)) {
          try {
            regSearchConditions.push({ _id: new mongoose.Types.ObjectId(search) });
          } catch (e) {}
        }
        regSearchConditions.push({ reason: new RegExp(search, 'i') });
      }
      
      if (regDateConditions.length > 0 || regSearchConditions.length > 0) {
        regFilter.$or = [...regDateConditions, ...regSearchConditions];
      }

      const regularizations = await AttendanceRegularization.find(regFilter)
        .populate('approvedBy', 'email firstName lastName')
        .populate('attendance', 'date status')
        .lean();

      regularizations.forEach(req => {
        allRequests.push({
          id: req._id,
          requestId: `AR-${req._id.toString().substring(0, 8).toUpperCase()}`,
          type: 'regularization',
          typeLabel: 'Attendance Regularization',
          submissionDate: req.createdAt,
          lastActivityDate: req.updatedAt,
          status: req.status,
          statusLabel: req.status.charAt(0).toUpperCase() + req.status.slice(1),
          approver: req.approvedBy ? 
            `${req.approvedBy.firstName || ''} ${req.approvedBy.lastName || ''}`.trim() || req.approvedBy.email : 
            null,
          resolutionDate: req.approvedAt || req.updatedAt,
          title: `Regularization for ${moment(req.date).format('MMM D, YYYY')}`,
          details: {
            date: req.date,
            reason: req.reason,
            requestedPunchIn: req.requestedPunchIn,
            requestedPunchOut: req.requestedPunchOut,
            comments: req.rejectionReason || req.comments
          },
          canCancel: req.status === 'pending',
          canEdit: req.status === 'pending',
          canReopen: req.status === 'rejected',
          metadata: req
        });
      });
    }

    // 3. Shift Change Requests
    if (!type || type === 'shift_change') {
      const shiftFilter = { ...employeeFilter };
      if (status) shiftFilter.status = status;
      
      const shiftDateConditions = [];
      const shiftSearchConditions = [];
      
      if (startDate || endDate) {
        shiftDateConditions.push(
          { date: dateFilter },
          { createdAt: dateFilter }
        );
      }
      
      if (search) {
        if (search.match(/^[0-9a-fA-F]{24}$/)) {
          try {
            shiftSearchConditions.push({ _id: new mongoose.Types.ObjectId(search) });
          } catch (e) {}
        }
        shiftSearchConditions.push({ reason: new RegExp(search, 'i') });
      }
      
      if (shiftDateConditions.length > 0 || shiftSearchConditions.length > 0) {
        shiftFilter.$or = [...shiftDateConditions, ...shiftSearchConditions];
      }

      const shiftChanges = await ShiftChangeRequest.find(shiftFilter)
        .populate('currentShift', 'name startTime endTime')
        .populate('requestedShift', 'name startTime endTime')
        .populate('swapWithEmployee', 'firstName lastName employeeId')
        .populate('reviewedBy', 'email firstName lastName')
        .lean();

      shiftChanges.forEach(req => {
        allRequests.push({
          id: req._id,
          requestId: `SC-${req._id.toString().substring(0, 8).toUpperCase()}`,
          type: 'shift_change',
          typeLabel: 'Shift Change Request',
          submissionDate: req.createdAt,
          lastActivityDate: req.updatedAt,
          status: req.status,
          statusLabel: req.status.charAt(0).toUpperCase() + req.status.slice(1),
          approver: req.reviewedBy ? 
            `${req.reviewedBy.firstName || ''} ${req.reviewedBy.lastName || ''}`.trim() || req.reviewedBy.email : 
            null,
          resolutionDate: req.reviewedAt || req.updatedAt,
          title: `${req.type === 'swap' ? 'Shift Swap' : 'Shift Change'} for ${moment(req.date).format('MMM D, YYYY')}`,
          details: {
            date: req.date,
            type: req.type,
            currentShift: req.currentShift?.name,
            requestedShift: req.requestedShift?.name,
            swapWithEmployee: req.swapWithEmployee ? 
              `${req.swapWithEmployee.firstName} ${req.swapWithEmployee.lastName} (${req.swapWithEmployee.employeeId})` : 
              null,
            reason: req.reason,
            comments: req.comments
          },
          canCancel: req.status === 'pending',
          canEdit: req.status === 'pending',
          canReopen: req.status === 'rejected',
          metadata: req
        });
      });
    }

    // 4. Profile Change Requests
    if (!type || type === 'profile_change') {
      const employeeWithChanges = await Employee.findById(employee._id)
        .select('changeRequests')
        .lean();

      const profileChanges = (employeeWithChanges?.changeRequests || [])
        .filter(cr => {
          if (status && cr.status !== status) return false;
          if (startDate || endDate) {
            const reqDate = moment(cr.requestedAt);
            if (startDate && reqDate.isBefore(startDate)) return false;
            if (endDate && reqDate.isAfter(endDate)) return false;
          }
          if (search) {
            const searchLower = search.toLowerCase();
            return cr.field?.toLowerCase().includes(searchLower) || 
                   String(cr.newValue)?.toLowerCase().includes(searchLower);
          }
          return true;
        });

      profileChanges.forEach(req => {
        allRequests.push({
          id: req._id || req.requestedAt?.getTime(),
          requestId: `PC-${(req._id || req.requestedAt?.getTime() || Date.now()).toString().substring(0, 8)}`,
          type: 'profile_change',
          typeLabel: 'Profile Update Request',
          submissionDate: req.requestedAt,
          lastActivityDate: req.reviewedAt || req.requestedAt,
          status: req.status,
          statusLabel: req.status.charAt(0).toUpperCase() + req.status.slice(1),
          approver: req.reviewedBy ? 'HR Team' : null,
          resolutionDate: req.reviewedAt,
          title: `Update ${req.field?.replace(/([A-Z])/g, ' $1').trim() || 'Profile'}`,
          details: {
            field: req.field,
            oldValue: req.oldValue,
            newValue: req.newValue,
            comments: req.comments
          },
          canCancel: req.status === 'pending',
          canEdit: false,
          canReopen: req.status === 'rejected',
          metadata: req
        });
      });
    }

    // 5. Expense Claims (Reimbursements)
    if (!type || type === 'expense') {
      const expenseFilter = { ...employeeFilter };
      if (status) expenseFilter.status = status;
      
      const expenseDateConditions = [];
      const expenseSearchConditions = [];
      
      if (startDate || endDate) {
        expenseDateConditions.push(
          { expenseDate: dateFilter },
          { createdAt: dateFilter }
        );
      }
      
      if (search) {
        if (search.match(/^[0-9a-fA-F]{24}$/)) {
          try {
            expenseSearchConditions.push({ _id: new mongoose.Types.ObjectId(search) });
          } catch (e) {}
        }
        expenseSearchConditions.push(
          { description: new RegExp(search, 'i') },
          { category: new RegExp(search, 'i') }
        );
      }
      
      if (expenseDateConditions.length > 0 || expenseSearchConditions.length > 0) {
        expenseFilter.$or = [...expenseDateConditions, ...expenseSearchConditions];
      }

      const expenses = await ExpenseClaim.find(expenseFilter)
        .populate('approvedBy', 'email firstName lastName')
        .lean();

      expenses.forEach(req => {
        allRequests.push({
          id: req._id,
          requestId: `EX-${req._id.toString().substring(0, 8).toUpperCase()}`,
          type: 'expense',
          typeLabel: 'Expense Claim',
          submissionDate: req.createdAt,
          lastActivityDate: req.updatedAt,
          status: req.status,
          statusLabel: req.status.charAt(0).toUpperCase() + req.status.slice(1),
          approver: req.approvedBy ? 
            `${req.approvedBy.firstName || ''} ${req.approvedBy.lastName || ''}`.trim() || req.approvedBy.email : 
            null,
          resolutionDate: req.approvedAt || req.paidAt || req.updatedAt,
          title: `${req.category} - ₹${req.amount}`,
          details: {
            category: req.category,
            description: req.description,
            amount: req.amount,
            expenseDate: req.expenseDate,
            receipts: req.receipts,
            rejectionReason: req.rejectionReason,
            paymentMethod: req.paymentMethod,
            paidAt: req.paidAt
          },
          canCancel: req.status === 'pending',
          canEdit: req.status === 'pending',
          canReopen: req.status === 'rejected',
          metadata: req
        });
      });
    }

    // Apply search filter if provided (on requestId or title)
    let filteredRequests = allRequests;
    if (search && !type) {
      const searchLower = search.toLowerCase();
      filteredRequests = allRequests.filter(req => 
        req.requestId.toLowerCase().includes(searchLower) ||
        req.title.toLowerCase().includes(searchLower) ||
        req.typeLabel.toLowerCase().includes(searchLower)
      );
    }

    // Sort requests
    filteredRequests.sort((a, b) => {
      const aVal = a[sortBy] || a.lastActivityDate;
      const bVal = b[sortBy] || b.lastActivityDate;
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Pagination
    const total = filteredRequests.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedRequests = filteredRequests.slice(skip, skip + parseInt(limit));

    // Status counts
    const statusCounts = {
      all: filteredRequests.length,
      pending: filteredRequests.filter(r => r.status === 'pending' || r.status === 'info_requested').length,
      approved: filteredRequests.filter(r => r.status === 'approved').length,
      rejected: filteredRequests.filter(r => r.status === 'rejected').length,
      cancelled: filteredRequests.filter(r => r.status === 'cancelled').length
    };

    res.json({
      success: true,
      data: paginatedRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      statusCounts
    });
  } catch (error) {
    console.error('Get My Requests Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get detailed view of a specific request
 */
export const getRequestDetail = async (req, res) => {
  try {
    const userId = req.user._id;
    const employee = await Employee.findOne({ userId });
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { type, id } = req.params;

    let request = null;
    let requestDetail = null;

    switch (type) {
      case 'leave':
        request = await LeaveRequest.findOne({ _id: id, employee: employee._id })
          .populate('leaveType', 'name code')
          .populate('approvedBy', 'email firstName lastName')
          .populate('employee', 'firstName lastName employeeId');
        
        if (request) {
          requestDetail = {
            id: request._id,
            requestId: `LV-${request._id.toString().substring(0, 8).toUpperCase()}`,
            type: 'leave',
            typeLabel: 'Leave Request',
            submissionDate: request.createdAt,
            status: request.status,
            approver: request.approvedBy ? 
              `${request.approvedBy.firstName || ''} ${request.approvedBy.lastName || ''}`.trim() || request.approvedBy.email : 
              null,
            resolutionDate: request.approvedAt,
            details: {
              employee: `${request.employee.firstName} ${request.employee.lastName} (${request.employee.employeeId})`,
              leaveType: request.leaveType?.name,
              startDate: request.startDate,
              endDate: request.endDate,
              days: request.days,
              isHalfDay: request.isHalfDay,
              halfDayType: request.halfDayType,
              reason: request.reason,
              supportingDocument: request.supportingDocument,
              approvalRemarks: request.approvalRemarks,
              rejectionReason: request.rejectionReason,
              infoRequests: request.infoRequests,
              escalationHistory: request.escalationHistory
            },
            timeline: [
              { action: 'Submitted', date: request.createdAt, by: request.employee },
              ...(request.approvedAt ? [{ action: request.status === 'approved' ? 'Approved' : 'Rejected', date: request.approvedAt, by: request.approvedBy }] : [])
            ],
            attachments: request.supportingDocument ? [{ name: 'Supporting Document', url: request.supportingDocument }] : [],
            canCancel: ['pending', 'info_requested'].includes(request.status),
            canEdit: ['pending', 'info_requested'].includes(request.status),
            canReopen: request.status === 'rejected'
          };
        }
        break;

      case 'regularization':
        request = await AttendanceRegularization.findOne({ _id: id, employee: employee._id })
          .populate('attendance', 'date status punches')
          .populate('approvedBy', 'email firstName lastName')
          .populate('employee', 'firstName lastName employeeId');
        
        if (request) {
          requestDetail = {
            id: request._id,
            requestId: `AR-${request._id.toString().substring(0, 8).toUpperCase()}`,
            type: 'regularization',
            typeLabel: 'Attendance Regularization',
            submissionDate: request.createdAt,
            status: request.status,
            approver: request.approvedBy ? 
              `${request.approvedBy.firstName || ''} ${request.approvedBy.lastName || ''}`.trim() || request.approvedBy.email : 
              null,
            resolutionDate: request.approvedAt,
            details: {
              date: request.date,
              reason: request.reason,
              requestedPunchIn: request.requestedPunchIn,
              requestedPunchOut: request.requestedPunchOut,
              rejectionReason: request.rejectionReason,
              attendanceRecord: request.attendance
            },
            timeline: [
              { action: 'Submitted', date: request.createdAt, by: request.employee },
              ...(request.approvedAt ? [{ action: request.status === 'approved' ? 'Approved' : 'Rejected', date: request.approvedAt, by: request.approvedBy }] : [])
            ],
            attachments: [],
            canCancel: request.status === 'pending',
            canEdit: request.status === 'pending',
            canReopen: request.status === 'rejected'
          };
        }
        break;

      case 'shift_change':
        request = await ShiftChangeRequest.findOne({ _id: id, employee: employee._id })
          .populate('currentShift', 'name startTime endTime')
          .populate('requestedShift', 'name startTime endTime')
          .populate('swapWithEmployee', 'firstName lastName employeeId')
          .populate('reviewedBy', 'email firstName lastName')
          .populate('employee', 'firstName lastName employeeId');
        
        if (request) {
          requestDetail = {
            id: request._id,
            requestId: `SC-${request._id.toString().substring(0, 8).toUpperCase()}`,
            type: 'shift_change',
            typeLabel: 'Shift Change Request',
            submissionDate: request.createdAt,
            status: request.status,
            approver: request.reviewedBy ? 
              `${request.reviewedBy.firstName || ''} ${request.reviewedBy.lastName || ''}`.trim() || request.reviewedBy.email : 
              null,
            resolutionDate: request.reviewedAt,
            details: {
              date: request.date,
              type: request.type,
              currentShift: request.currentShift,
              requestedShift: request.requestedShift,
              swapWithEmployee: request.swapWithEmployee,
              reason: request.reason,
              comments: request.comments
            },
            timeline: [
              { action: 'Submitted', date: request.createdAt, by: request.employee },
              ...(request.reviewedAt ? [{ action: request.status === 'approved' ? 'Approved' : 'Rejected', date: request.reviewedAt, by: request.reviewedBy }] : [])
            ],
            attachments: [],
            canCancel: request.status === 'pending',
            canEdit: request.status === 'pending',
            canReopen: request.status === 'rejected'
          };
        }
        break;

      case 'expense':
        request = await ExpenseClaim.findOne({ _id: id, employee: employee._id })
          .populate('approvedBy', 'email firstName lastName')
          .populate('employee', 'firstName lastName employeeId');
        
        if (request) {
          requestDetail = {
            id: request._id,
            requestId: `EX-${request._id.toString().substring(0, 8).toUpperCase()}`,
            type: 'expense',
            typeLabel: 'Expense Claim',
            submissionDate: request.createdAt,
            status: request.status,
            approver: request.approvedBy ? 
              `${request.approvedBy.firstName || ''} ${request.approvedBy.lastName || ''}`.trim() || request.approvedBy.email : 
              null,
            resolutionDate: request.approvedAt || request.paidAt,
            details: {
              category: request.category,
              description: request.description,
              amount: request.amount,
              expenseDate: request.expenseDate,
              receipts: request.receipts,
              rejectionReason: request.rejectionReason,
              paymentMethod: request.paymentMethod,
              paidAt: request.paidAt
            },
            timeline: [
              { action: 'Submitted', date: request.createdAt, by: request.employee },
              ...(request.approvedAt ? [{ action: 'Approved', date: request.approvedAt, by: request.approvedBy }] : []),
              ...(request.paidAt ? [{ action: 'Paid', date: request.paidAt }] : [])
            ],
            attachments: request.receipts || [],
            canCancel: request.status === 'pending',
            canEdit: request.status === 'pending',
            canReopen: request.status === 'rejected'
          };
        }
        break;
    }

    if (!requestDetail) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, data: requestDetail });
  } catch (error) {
    console.error('Get Request Detail Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Cancel a request
 */
export const cancelRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const employee = await Employee.findOne({ userId });
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { type, id } = req.params;

    let request = null;

    switch (type) {
      case 'leave':
        request = await LeaveRequest.findOne({ _id: id, employee: employee._id });
        if (request && ['pending', 'info_requested'].includes(request.status)) {
          request.status = 'cancelled';
          await request.save();
        } else {
          return res.status(400).json({ success: false, message: 'Request cannot be cancelled' });
        }
        break;

      case 'regularization':
        request = await AttendanceRegularization.findOne({ _id: id, employee: employee._id });
        if (request && request.status === 'pending') {
          request.status = 'cancelled';
          await request.save();
        } else {
          return res.status(400).json({ success: false, message: 'Request cannot be cancelled' });
        }
        break;

      case 'shift_change':
        request = await ShiftChangeRequest.findOne({ _id: id, employee: employee._id });
        if (request && request.status === 'pending') {
          // Note: ShiftChangeRequest model may not support 'cancelled' status
          // Delete the request or mark with a comment instead
          await ShiftChangeRequest.deleteOne({ _id: id });
          return res.json({ success: true, message: 'Request cancelled successfully' });
        } else {
          return res.status(400).json({ success: false, message: 'Request cannot be cancelled' });
        }
        break;

      case 'expense':
        request = await ExpenseClaim.findOne({ _id: id, employee: employee._id });
        if (request && request.status === 'pending') {
          request.status = 'cancelled';
          await request.save();
        } else {
          return res.status(400).json({ success: false, message: 'Request cannot be cancelled' });
        }
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid request type' });
    }

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, message: 'Request cancelled successfully', data: request });
  } catch (error) {
    console.error('Cancel Request Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Re-open a rejected request
 */
export const reopenRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const employee = await Employee.findOne({ userId });
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { type, id } = req.params;

    let request = null;

    switch (type) {
      case 'leave':
        request = await LeaveRequest.findOne({ _id: id, employee: employee._id });
        if (request && request.status === 'rejected') {
          request.status = 'pending';
          request.rejectionReason = null;
          request.approvedBy = null;
          request.approvedAt = null;
          await request.save();
        } else {
          return res.status(400).json({ success: false, message: 'Request cannot be re-opened' });
        }
        break;

      case 'regularization':
        request = await AttendanceRegularization.findOne({ _id: id, employee: employee._id });
        if (request && request.status === 'rejected') {
          request.status = 'pending';
          request.rejectionReason = null;
          request.approvedBy = null;
          request.approvedAt = null;
          await request.save();
        } else {
          return res.status(400).json({ success: false, message: 'Request cannot be re-opened' });
        }
        break;

      case 'shift_change':
        request = await ShiftChangeRequest.findOne({ _id: id, employee: employee._id });
        if (request && request.status === 'rejected') {
          request.status = 'pending';
          request.comments = '';
          request.reviewedBy = null;
          request.reviewedAt = null;
          await request.save();
        } else {
          return res.status(400).json({ success: false, message: 'Request cannot be re-opened' });
        }
        break;

      case 'expense':
        request = await ExpenseClaim.findOne({ _id: id, employee: employee._id });
        if (request && request.status === 'rejected') {
          request.status = 'pending';
          request.rejectionReason = null;
          request.approvedBy = null;
          request.approvedAt = null;
          await request.save();
        } else {
          return res.status(400).json({ success: false, message: 'Request cannot be re-opened' });
        }
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid request type' });
    }

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, message: 'Request re-opened successfully', data: request });
  } catch (error) {
    console.error('Reopen Request Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get notifications for admin/HR roles (pending approvals)
 */
async function getNotificationsForAdminHR(userRole) {
  const notifications = [];
  
  // Pending leave requests
  const pendingLeaves = await LeaveRequest.countDocuments({
    status: { $in: ['pending', 'info_requested'] }
  });
  if (pendingLeaves > 0) {
    notifications.push({
      id: 'pending_leaves',
      type: 'warning',
      title: 'Pending Leave Requests',
      message: `${pendingLeaves} leave request(s) pending approval`,
      actionUrl: '/leave-approvals',
      priority: 'high'
    });
  }

  // Pending expense claims
  const pendingExpenses = await ExpenseClaim.countDocuments({
    status: 'pending'
  });
  if (pendingExpenses > 0) {
    notifications.push({
      id: 'pending_expenses',
      type: 'info',
      title: 'Pending Expense Claims',
      message: `${pendingExpenses} expense claim(s) pending approval`,
      actionUrl: '/expense-approvals',
      priority: 'medium'
    });
  }

  // Pending attendance regularizations
  const pendingRegularizations = await AttendanceRegularization.countDocuments({
    status: 'pending'
  });
  if (pendingRegularizations > 0) {
    notifications.push({
      id: 'pending_regularizations',
      type: 'info',
      title: 'Pending Regularizations',
      message: `${pendingRegularizations} attendance regularization(s) pending approval`,
      actionUrl: '/attendance-dashboard',
      priority: 'medium'
    });
  }

  // Pending shift change requests
  const pendingShiftChanges = await ShiftChangeRequest.countDocuments({
    status: 'pending'
  });
  if (pendingShiftChanges > 0) {
    notifications.push({
      id: 'pending_shift_changes',
      type: 'info',
      title: 'Pending Shift Change Requests',
      message: `${pendingShiftChanges} shift change request(s) pending approval`,
      actionUrl: '/shifts/change-requests',
      priority: 'medium'
    });
  }

  // For admin: System-level notifications
  if (userRole === 'admin') {
    // Check for any system issues or maintenance needs
    // This is a placeholder for future system notifications
  }

  return notifications.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Get notifications for the logged-in user
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    let notifications = [];

    // Handle different roles
    if (userRole === 'admin' || userRole === 'hr') {
      // Admin/HR get notifications about pending approvals
      notifications = await getNotificationsForAdminHR(userRole);
    } else if (userRole === 'employee') {
      // Employees get personal notifications
      const employee = await Employee.findOne({ userId })
        .populate('department', 'name')
        .populate('designation', 'name');
      
      if (employee) {
        notifications = await getNotificationsForEmployee(employee);
      } else {
        // Employee record not found, return empty notifications
        notifications = [];
      }
    } else {
      // Unknown role, return empty
      notifications = [];
    }

    // Add read status and timestamps (in a real implementation, these would come from a database)
    const notificationsWithMetadata = notifications.map((notification, index) => ({
      ...notification,
      id: notification.id || `notification-${index}`,
      read: false, // In a real implementation, check from database
      createdAt: new Date().toISOString()
    }));

    res.json({
      success: true,
      data: notificationsWithMetadata
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    // For now, we'll just return success since notifications are generated on-the-fly
    // In a real implementation, you'd store read status in a database
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    // For now, we'll just return success since notifications are generated on-the-fly
    // In a real implementation, you'd store read status in a database
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error.message
    });
  }
};

