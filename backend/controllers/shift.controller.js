import Shift from '../models/shift.model.js';
import Employee from '../models/employee.model.js';
import mongoose from 'mongoose';
import moment from 'moment';

const calculateWorkingHours = (startTime, endTime, breakDuration = 0, breakType = 'unpaid') => {
  if (!startTime || !endTime) return 0;
  const start = moment(startTime, 'HH:mm');
  const end = moment(endTime, 'HH:mm');
  if (!start.isValid() || !end.isValid()) return 0;
  if (!end.isAfter(start)) {
    end.add(1, 'day');
  }
  const diffMinutes = end.diff(start, 'minutes');
  const unpaidBreak = breakType === 'unpaid' ? (breakDuration || 0) : 0;
  const net = Math.max(diffMinutes - unpaidBreak, 0);
  return Number((net / 60).toFixed(2));
};

// Get all shifts
export const getShifts = async (req, res) => {
  try {
    const { search, isActive, includeHistory } = req.query;
    const filter = includeHistory === 'true' ? {} : { isLatest: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const shifts = await Shift.find(filter).sort({ name: 1 });
    res.json({ success: true, data: shifts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single shift
export const getShift = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }
    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create shift
export const createShift = async (req, res) => {
  try {
    const {
      name,
      code,
      category,
      startTime,
      endTime,
      breakDuration,
      breakType,
      isFlexible,
      graceLateMinutes,
      graceEarlyMinutes,
      minHoursPresent,
      halfDayHours,
      overtimeEligible,
      autoBreakDeduction,
      weekOffs,
      isActive
    } = req.body;

    const existing = await Shift.findOne({ $or: [{ name }, { code }], isLatest: true });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Shift name or code already exists' });
    }

    const computedWorkingHours = calculateWorkingHours(startTime, endTime, breakDuration, breakType);

    const shift = await Shift.create({
      name,
      code,
      category: category || 'regular',
      startTime,
      endTime,
      breakDuration: breakDuration || 0,
      breakType: breakType || 'unpaid',
      workingHours: computedWorkingHours,
      isFlexible: isFlexible || false,
      graceLateMinutes: graceLateMinutes || 10,
      graceEarlyMinutes: graceEarlyMinutes || 10,
      minHoursPresent: minHoursPresent || 8,
      halfDayHours: halfDayHours || 4,
      overtimeEligible: overtimeEligible || false,
      autoBreakDeduction: {
        isEnabled: autoBreakDeduction?.isEnabled || false,
        thresholdHours: autoBreakDeduction?.thresholdHours || 0,
        durationMinutes: autoBreakDeduction?.durationMinutes || 0
      },
      weekOffs: weekOffs || [],
      isActive: isActive !== undefined ? isActive : true,
      version: 1,
      isLatest: true
    });

    res.status(201).json({ success: true, message: 'Shift created successfully', data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update shift
export const updateShift = async (req, res) => {
  try {
    const existingShift = await Shift.findById(req.params.id);
    if (!existingShift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    const { name, code } = req.body;
    if (name || code) {
      const duplicate = await Shift.findOne({
        _id: { $ne: req.params.id },
        isLatest: true,
        $or: [{ name }, { code }]
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Shift name or code already exists' });
      }
    }

    const newVersion = (existingShift.version || 1) + 1;
    const versionGroup = existingShift.versionGroup || existingShift._id;

    const merged = {
      ...existingShift.toObject(),
      ...req.body,
      _id: new mongoose.Types.ObjectId(),
      version: newVersion,
      previousVersion: existingShift._id,
      versionGroup,
      isLatest: true,
    };

    merged.workingHours = calculateWorkingHours(
      merged.startTime,
      merged.endTime,
      merged.breakDuration,
      merged.breakType
    );

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Shift.updateOne({ _id: existingShift._id }, { $set: { isLatest: false } }, { session });
      const created = await Shift.create([merged], { session });
      await session.commitTransaction();
      res.json({ success: true, message: 'Shift version created', data: created[0] });
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

// Clone shift
export const cloneShift = async (req, res) => {
  try {
    const source = await Shift.findById(req.params.id);
    if (!source) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    const { name, code } = req.body;
    const finalName = name || `${source.name} Copy`;
    const finalCode = code || `${source.code}-COPY`;

    const duplicate = await Shift.findOne({
      isLatest: true,
      $or: [{ name: finalName }, { code: finalCode }]
    });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Shift name or code already exists' });
    }

    const cloned = await Shift.create({
      ...source.toObject(),
      _id: undefined,
      name: finalName,
      code: finalCode,
      version: 1,
      versionGroup: new mongoose.Types.ObjectId(),
      previousVersion: null,
      isLatest: true,
      createdAt: undefined,
      updatedAt: undefined
    });

    res.status(201).json({ success: true, message: 'Shift cloned successfully', data: cloned });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete shift
export const deleteShift = async (req, res) => {
  try {
    const employees = await Employee.countDocuments({ shift: req.params.id });
    if (employees > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete shift. ${employees} employee(s) are assigned to this shift.` 
      });
    }

    await Shift.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Shift deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
