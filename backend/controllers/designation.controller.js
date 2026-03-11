import Designation from '../models/designation.model.js';
import Employee from '../models/employee.model.js';

// Get all designations
export const getDesignations = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const designations = await Designation.find(filter).sort({ name: 1 });
    res.json({ success: true, data: designations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single designation
export const getDesignation = async (req, res) => {
  try {
    const designation = await Designation.findById(req.params.id);
    if (!designation) {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }
    res.json({ success: true, data: designation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create designation
export const createDesignation = async (req, res) => {
  try {
    const { name, code, description, level } = req.body;

    const existing = await Designation.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Designation name or code already exists' });
    }

    const designation = await Designation.create({ name, code, description, level });
    res.status(201).json({ success: true, message: 'Designation created successfully', data: designation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update designation
export const updateDesignation = async (req, res) => {
  try {
    const { name, code, description, level, isActive } = req.body;

    const designation = await Designation.findById(req.params.id);
    if (!designation) {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }

    if (name || code) {
      const existing = await Designation.findOne({
        _id: { $ne: req.params.id },
        $or: [{ name }, { code }]
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Designation name or code already exists' });
      }
    }

    Object.assign(designation, { name, code, description, level, isActive });
    await designation.save();

    res.json({ success: true, message: 'Designation updated successfully', data: designation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete designation
export const deleteDesignation = async (req, res) => {
  try {
    const employees = await Employee.countDocuments({ designation: req.params.id });
    if (employees > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete designation. ${employees} employee(s) have this designation.` 
      });
    }

    await Designation.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Designation deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
