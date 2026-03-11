import ShiftAssignment from '../models/shiftAssignment.model.js';
import Shift from '../models/shift.model.js';
import Employee from '../models/employee.model.js';
import ShiftGroup from '../models/shiftGroup.model.js';
import ShiftRotation from '../models/shiftRotation.model.js';
import mongoose from 'mongoose';
import moment from 'moment';

const toDay = (dateStr) => moment(dateStr).startOf('day');

const enumerateDates = (startDate, endDate, recurrence = 'single') => {
  const dates = [];
  const start = toDay(startDate);
  const end = toDay(endDate || startDate);

  if (!start.isValid() || !end.isValid()) return dates;

  if (recurrence === 'monthly') {
    // assign first day of each month within range
    const cursor = start.clone().startOf('month');
    const last = end.clone().endOf('month');
    while (cursor.isSameOrBefore(last, 'day')) {
      dates.push(cursor.clone());
      cursor.add(1, 'month');
    }
    return dates;
  }

  const step = recurrence === 'weekly' ? 7 : 1;
  const cursor = start.clone();
  while (cursor.isSameOrBefore(end, 'day')) {
    dates.push(cursor.clone());
    cursor.add(step, 'day');
  }
  return dates;
};

const parseShiftMinutes = (shift) => {
  const start = moment(shift.startTime, 'HH:mm');
  const end = moment(shift.endTime, 'HH:mm');
  if (!start.isValid() || !end.isValid()) return { start: 0, end: 0 };
  let startMin = start.hours() * 60 + start.minutes();
  let endMin = end.hours() * 60 + end.minutes();
  if (endMin <= startMin) {
    endMin += 24 * 60; // overnight
  }
  return { start: startMin, end: endMin };
};

const restHoursBetween = (prevShift, nextShift) => {
  if (!prevShift || !nextShift) return Infinity;
  const prev = parseShiftMinutes(prevShift);
  const next = parseShiftMinutes(nextShift);
  const restMinutes = next.start - prev.end;
  return restMinutes / 60;
};

const findPrevAssignment = async (employeeId, date) => {
  return ShiftAssignment.findOne({ employee: employeeId, date: { $lt: date } })
    .sort({ date: -1 })
    .populate('shift');
};

export const assignShifts = async (req, res) => {
  try {
    const {
      employeeIds = [],
      groupId,
      shiftId,
      rotationId,
      startDate,
      endDate,
      recurrence = 'single',
      type = 'roster',
      overrideType = null,
      publish = false,
      notes = ''
    } = req.body;

    if (!shiftId && !rotationId) {
      return res.status(400).json({ success: false, message: 'shiftId or rotationId is required' });
    }
    if (!startDate) {
      return res.status(400).json({ success: false, message: 'startDate is required' });
    }

    const rotation = rotationId ? await ShiftRotation.findById(rotationId).populate('pattern.shift') : null;
    const baseShift = shiftId ? await Shift.findById(shiftId) : null;
    if (rotationId && !rotation) return res.status(404).json({ success: false, message: 'Rotation not found' });
    if (shiftId && !baseShift) return res.status(404).json({ success: false, message: 'Shift not found' });
    if (baseShift && !baseShift.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot assign inactive shift' });
    }
    if (rotation) {
      const inactive = rotation.pattern.find(p => !p.shift?.isActive);
      if (inactive) {
        return res.status(400).json({ success: false, message: 'Rotation includes inactive shift' });
      }
    }

    let employees = [];
    if (groupId) {
      const group = await ShiftGroup.findById(groupId);
      if (group) employees = group.employees;
    }
    if (employeeIds?.length) {
      employees = [...new Set([...employees, ...employeeIds])];
    }
    if (!employees.length) {
      return res.status(400).json({ success: false, message: 'No employees provided' });
    }

    const dates = enumerateDates(startDate, endDate, recurrence);
    if (!dates.length) {
      return res.status(400).json({ success: false, message: 'Invalid date range' });
    }

    const created = [];
    const conflicts = [];

    for (const empId of employees) {
      const employee = await Employee.findById(empId);
      if (!employee) continue;

      let patternIndex = 0;
      for (const mDate of dates) {
        const day = mDate.toDate();

        const existing = await ShiftAssignment.findOne({ employee: empId, date: day });
        if (existing) {
          conflicts.push({
            employee: empId,
            date: day,
            conflicts: [{ type: 'duplicate', message: 'Shift already assigned for this date' }]
          });
          continue;
        }

        let chosenShift = baseShift;
        let rotationMeta = null;
        if (rotation) {
          const step = rotation.pattern[patternIndex % rotation.pattern.length];
          chosenShift = step.shift;
          rotationMeta = { patternId: rotation._id, stepIndex: patternIndex % rotation.pattern.length, cycleName: rotation.name };
          // advance patternIndex by step days
          patternIndex += step.days;
        }

        const prev = await findPrevAssignment(empId, day);
        const rest = restHoursBetween(prev?.shift, chosenShift);
        const conflictList = [];
        if (rest < 8) {
          conflictList.push({ type: 'rest', message: `Rest period ${rest.toFixed(2)}h < 8h` });
        }

        const assignment = await ShiftAssignment.create({
          employee: empId,
          shift: chosenShift._id,
          date: day,
          type,
          recurrence,
          range: { startDate, endDate: endDate || startDate },
          overrideType,
          status: publish ? 'published' : 'draft',
          isPublished: publish,
          createdBy: req.user?._id,
          notes,
          conflicts: conflictList,
          rotation: rotationMeta
        });

        if (conflictList.length) {
          conflicts.push({ employee: empId, date: day, conflicts: conflictList });
        }
        created.push(assignment);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Assignments processed',
      data: created,
      conflicts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setDefaultShift = async (req, res) => {
  try {
    const { employeeIds = [], shiftId } = req.body;
    if (!employeeIds.length || !shiftId) {
      return res.status(400).json({ success: false, message: 'employeeIds and shiftId are required' });
    }

    const shift = await Shift.findById(shiftId);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });

    await Employee.updateMany(
      { _id: { $in: employeeIds } },
      { $set: { shift: shiftId } }
    );

    // Optional history record for audit
    const today = moment().startOf('day').toDate();
    const records = employeeIds.map((empId) => ({
      employee: empId,
      shift: shiftId,
      date: today,
      type: 'default',
      recurrence: 'daily',
      status: 'published',
      isPublished: true,
      createdBy: req.user?._id
    }));
    await ShiftAssignment.insertMany(records);

    res.json({ success: true, message: 'Default shift assigned', data: { employeeIds, shiftId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRoster = async (req, res) => {
  try {
    const { month, year, startDate, endDate, employeeId, groupId } = req.query;
    let filter = {};

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = toDay(startDate).toDate();
      if (endDate) filter.date.$lte = toDay(endDate).toDate();
    } else if (month && year) {
      const start = moment(`${year}-${month}-01`).startOf('month');
      const end = start.clone().endOf('month');
      filter.date = { $gte: start.toDate(), $lte: end.toDate() };
    }

    let employeeIds = [];
    if (groupId && req.user.role !== 'employee') {
      const group = await ShiftGroup.findById(groupId);
      if (group) employeeIds = group.employees;
    }
    if (employeeId && req.user.role !== 'employee') {
      employeeIds.push(employeeId);
    }
    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ userId: req.user._id });
      if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
      employeeIds = [emp._id];
    }
    if (employeeIds.length) {
      filter.employee = { $in: employeeIds };
    }

    const roster = await ShiftAssignment.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .populate('shift', 'name code startTime endTime category isActive breakDuration breakType overtimeEligible')
      .sort({ date: 1, 'employee.firstName': 1 });

    res.json({ success: true, data: roster });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const publishRoster = async (req, res) => {
  try {
    const { startDate, endDate, employeeIds = [] } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }

    const filter = {
      date: {
        $gte: toDay(startDate).toDate(),
        $lte: toDay(endDate).toDate()
      }
    };
    if (employeeIds.length) {
      filter.employee = { $in: employeeIds };
    }

    const result = await ShiftAssignment.updateMany(
      filter,
      { $set: { isPublished: true, status: 'published' } }
    );

    res.json({ success: true, message: 'Roster published', updated: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Shift Groups CRUD
export const createShiftGroup = async (req, res) => {
  try {
    const { name, code, employees = [], isActive = true } = req.body;
    const existing = await ShiftGroup.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Shift group name or code already exists' });
    }
    const group = await ShiftGroup.create({ name, code, employees, isActive });
    res.status(201).json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShiftGroups = async (req, res) => {
  try {
    const groups = await ShiftGroup.find().populate('employees', 'firstName lastName employeeId');
    res.json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateShiftGroup = async (req, res) => {
  try {
    const group = await ShiftGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Shift group not found' });

    if (req.body.name || req.body.code) {
      const dup = await ShiftGroup.findOne({
        _id: { $ne: req.params.id },
        $or: [{ name: req.body.name }, { code: req.body.code }]
      });
      if (dup) return res.status(400).json({ success: false, message: 'Shift group name or code already exists' });
    }

    Object.assign(group, req.body);
    await group.save();
    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteShiftGroup = async (req, res) => {
  try {
    await ShiftGroup.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Shift group deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

