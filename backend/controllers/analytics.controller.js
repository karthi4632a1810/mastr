import Employee from '../models/employee.model.js';
import Attendance from '../models/attendance.model.js';
import LeaveRequest from '../models/leaveRequest.model.js';
import Department from '../models/department.model.js';
import ShiftAssignment from '../models/shiftAssignment.model.js';
import ShiftChangeRequest from '../models/shiftChangeRequest.model.js';
import Shift from '../models/shift.model.js';
import moment from 'moment';

export const getDashboardStats = async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments({ status: 'active' });
    const departments = await Department.countDocuments({ isActive: true });
    const todayAttendance = await Attendance.countDocuments({
      date: moment().startOf('day').toDate(),
      status: 'present'
    });
    const pendingLeaves = await LeaveRequest.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      data: {
        totalEmployees,
        departments,
        todayAttendance,
        pendingLeaves
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHeadcountTrend = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const data = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = moment().subtract(i, 'months');
      const count = await Employee.countDocuments({
        joiningDate: { $lte: date.endOf('month').toDate() },
        status: 'active'
      });
      data.push({ month: date.format('YYYY-MM'), count });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDepartmentStrength = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true });
    const data = await Promise.all(
      departments.map(async (dept) => {
        const count = await Employee.countDocuments({ department: dept._id, status: 'active' });
        return { name: dept.name, count };
      })
    );

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const buildDateRange = (startDate, endDate, month, year) => {
  let start;
  let end;
  if (startDate || endDate) {
    start = startDate ? moment(startDate).startOf('day') : moment().startOf('day');
    end = endDate ? moment(endDate).endOf('day') : moment(start).endOf('day');
  } else if (month && year) {
    start = moment(`${year}-${month}-01`).startOf('month');
    end = start.clone().endOf('month');
  } else {
    start = moment().startOf('month');
    end = start.clone().endOf('month');
  }
  return { start: start.toDate(), end: end.toDate() };
};

export const getShiftOccupancy = async (req, res) => {
  try {
    const { startDate, endDate, month, year, granularity = 'day' } = req.query;
    const { start, end } = buildDateRange(startDate, endDate, month, year);

    const groupFormat = granularity === 'month' ? '%Y-%m' : granularity === 'week' ? '%Y-%U' : '%Y-%m-%d';

    const data = await ShiftAssignment.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $lookup: {
          from: 'shifts',
          localField: 'shift',
          foreignField: '_id',
          as: 'shift'
        }
      },
      { $unwind: '$shift' },
      {
        $group: {
          _id: { period: { $dateToString: { format: groupFormat, date: '$date' } }, shift: '$shift.name' },
          count: { $sum: 1 }
        }
      },
      { $project: { period: '$_id.period', shift: '$_id.shift', count: 1, _id: 0 } },
      { $sort: { period: 1, shift: 1 } }
    ]);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOvertimeTrends = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const data = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = moment().subtract(i, 'months').startOf('month');
      const end = start.clone().endOf('month');
      const total = await Attendance.aggregate([
        { $match: { date: { $gte: start.toDate(), $lte: end.toDate() } } },
        { $group: { _id: null, hours: { $sum: '$overtimeHours' } } }
      ]);
      data.push({ month: start.format('YYYY-MM'), overtimeHours: total[0]?.hours || 0 });
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShiftCompliance = async (req, res) => {
  try {
    const { startDate, endDate, month, year } = req.query;
    const { start, end } = buildDateRange(startDate, endDate, month, year);
    const attendance = await Attendance.find({ date: { $gte: start, $lte: end } });

    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const late = attendance.filter(a => a.isLate).length;
    const early = attendance.filter(a => a.isEarlyLeave).length;
    const absent = attendance.filter(a => a.status === 'absent').length;

    res.json({
      success: true,
      data: { total, present, absent, late, earlyLeave: early }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShiftChangeSummary = async (req, res) => {
  try {
    const { startDate, endDate, month, year } = req.query;
    const { start, end } = buildDateRange(startDate, endDate, month, year);
    const summary = await ShiftChangeRequest.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const map = summary.reduce((acc, cur) => ({ ...acc, [cur._id]: cur.count }), {});
    res.json({
      success: true,
      data: {
        pending: map.pending || 0,
        approved: map.approved || 0,
        rejected: map.rejected || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStaffingSignals = async (req, res) => {
  try {
    const { startDate, endDate, month, year, threshold = 1 } = req.query;
    const { start, end } = buildDateRange(startDate, endDate, month, year);
    const daily = await ShiftAssignment.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } },
          count: { $sum: 1 }
        }
      },
      { $project: { day: '$_id.day', count: 1, _id: 0 } },
      { $sort: { day: 1 } }
    ]);
    const understaffed = daily.filter(d => d.count < Number(threshold));
    const overstaffed = daily.filter(d => d.count > Number(threshold) * 2); // simple heuristic
    res.json({ success: true, data: { daily, understaffed, overstaffed } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toCSV = (rows) => {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const data = rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...data].join('\n');
};

export const exportShiftAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, month, year, format = 'csv' } = req.query;
    const { start, end } = buildDateRange(startDate, endDate, month, year);

    const occupancy = await ShiftAssignment.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, shift: '$shift' },
          count: { $sum: 1 }
        }
      },
      { $lookup: { from: 'shifts', localField: '_id.shift', foreignField: '_id', as: 'shift' } },
      { $unwind: '$shift' },
      { $project: { day: '$_id.day', shift: '$shift.name', count: 1, _id: 0 } },
      { $sort: { day: 1, shift: 1 } }
    ]);

    if (format === 'csv' || format === 'excel') {
      const csv = toCSV(occupancy);
      res.setHeader('Content-Disposition', `attachment; filename="shift-analytics.${format === 'csv' ? 'csv' : 'csv'}"`);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }

    // Basic JSON fallback (PDF generation not implemented)
    res.json({ success: true, data: occupancy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
