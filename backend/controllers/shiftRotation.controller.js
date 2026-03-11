import ShiftRotation from '../models/shiftRotation.model.js';
import Shift from '../models/shift.model.js';

export const createRotation = async (req, res) => {
  try {
    const { name, code, cycle, pattern, notes } = req.body;
    if (!name || !code || !pattern?.length) {
      return res.status(400).json({ success: false, message: 'name, code, and pattern are required' });
    }

    const existing = await ShiftRotation.findOne({ $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Rotation name or code already exists' });
    }

    // validate shifts
    const shiftIds = pattern.map(p => p.shift).filter(Boolean);
    if (shiftIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one shift is required in the pattern' });
    }
    
    const shifts = await Shift.find({ _id: { $in: shiftIds } });
    if (shifts.length !== shiftIds.length) {
      return res.status(400).json({ success: false, message: 'One or more shifts not found' });
    }

    const rotation = await ShiftRotation.create({ 
      name: name.trim(), 
      code: code.trim().toUpperCase(), 
      cycle, 
      pattern, 
      notes: notes?.trim() || '' 
    });
    
    const populated = await ShiftRotation.findById(rotation._id)
      .populate({
        path: 'pattern.shift',
        select: 'name code startTime endTime category isActive',
        strictPopulate: false
      });
    
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Error creating shift rotation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

export const getRotations = async (req, res) => {
  try {
    const rotations = await ShiftRotation.find()
      .populate({
        path: 'pattern.shift',
        select: 'name code startTime endTime category isActive',
        strictPopulate: false
      })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: rotations || [] });
  } catch (error) {
    console.error('Error fetching shift rotations:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

export const updateRotation = async (req, res) => {
  try {
    const rotation = await ShiftRotation.findById(req.params.id);
    if (!rotation) {
      return res.status(404).json({ success: false, message: 'Rotation not found' });
    }

    if (req.body.name || req.body.code) {
      const dup = await ShiftRotation.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(req.body.name ? [{ name: req.body.name.trim() }] : []),
          ...(req.body.code ? [{ code: req.body.code.trim().toUpperCase() }] : [])
        ]
      });
      if (dup) {
        return res.status(400).json({ success: false, message: 'Rotation name or code already exists' });
      }
    }

    // Validate pattern shifts if provided
    if (req.body.pattern && Array.isArray(req.body.pattern)) {
      const shiftIds = req.body.pattern.map(p => p.shift).filter(Boolean);
      if (shiftIds.length > 0) {
        const shifts = await Shift.find({ _id: { $in: shiftIds } });
        if (shifts.length !== shiftIds.length) {
          return res.status(400).json({ success: false, message: 'One or more shifts in pattern not found' });
        }
      }
    }

    // Update fields
    if (req.body.name) rotation.name = req.body.name.trim();
    if (req.body.code) rotation.code = req.body.code.trim().toUpperCase();
    if (req.body.cycle) rotation.cycle = req.body.cycle;
    if (req.body.pattern) rotation.pattern = req.body.pattern;
    if (req.body.isActive !== undefined) rotation.isActive = req.body.isActive;
    if (req.body.notes !== undefined) rotation.notes = req.body.notes.trim() || '';

    await rotation.save();
    
    const populated = await ShiftRotation.findById(rotation._id)
      .populate({
        path: 'pattern.shift',
        select: 'name code startTime endTime category isActive',
        strictPopulate: false
      });
    
    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Error updating shift rotation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

export const deleteRotation = async (req, res) => {
  try {
    const rotation = await ShiftRotation.findById(req.params.id);
    if (!rotation) {
      return res.status(404).json({ success: false, message: 'Rotation not found' });
    }
    
    await ShiftRotation.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Rotation deleted' });
  } catch (error) {
    console.error('Error deleting shift rotation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

