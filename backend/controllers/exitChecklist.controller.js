import ExitChecklist from '../models/exitChecklist.model.js';
import Resignation from '../models/resignation.model.js';
import Employee from '../models/employee.model.js';
import moment from 'moment';

// Get exit checklist for a resignation
export const getExitChecklist = async (req, res) => {
  try {
    const { resignationId } = req.params;
    
    const checklist = await ExitChecklist.findOne({ resignation: resignationId })
      .populate('employee', 'firstName lastName employeeId email department designation')
      .populate('resignation', 'tentativeLastWorkingDate status')
      .populate('items.assignedTo', 'email firstName lastName')
      .populate('items.completedBy', 'email firstName lastName')
      .populate('generatedBy', 'email firstName lastName');

    if (!checklist) {
      return res.status(404).json({ success: false, message: 'Exit checklist not found' });
    }

    res.json({ success: true, data: checklist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all exit checklists
export const getExitChecklists = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;

    const checklists = await ExitChecklist.find(filter)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('resignation', 'tentativeLastWorkingDate status')
      .sort({ createdAt: -1 });

    // Filter by search if provided
    let filtered = checklists;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = checklists.filter(cl => 
        cl.employee?.firstName?.toLowerCase().includes(searchLower) ||
        cl.employee?.lastName?.toLowerCase().includes(searchLower) ||
        cl.employee?.employeeId?.toLowerCase().includes(searchLower) ||
        cl.employee?.email?.toLowerCase().includes(searchLower)
      );
    }

    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update checklist item status
export const updateChecklistItem = async (req, res) => {
  try {
    const { checklistId, itemId } = req.params;
    const { status, comments, assignedTo } = req.body;

    const checklist = await ExitChecklist.findById(checklistId);
    if (!checklist) {
      return res.status(404).json({ success: false, message: 'Exit checklist not found' });
    }

    const item = checklist.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Checklist item not found' });
    }

    // Update item
    if (status) {
      item.status = status;
      if (status === 'completed') {
        item.completedAt = new Date();
        item.completedBy = req.user._id;
      }
    }
    if (comments !== undefined) item.comments = comments;
    if (assignedTo) item.assignedTo = assignedTo;

    await checklist.save();

    // Check if all mandatory items are completed
    const allMandatoryCompleted = checklist.items
      .filter(item => item.isMandatory)
      .every(item => item.status === 'completed' || item.status === 'not_applicable');

    if (allMandatoryCompleted && checklist.items.some(item => item.status === 'completed')) {
      checklist.status = 'completed';
      checklist.completedAt = new Date();
      checklist.completedBy = req.user._id;
      await checklist.save();

      // Update resignation status
      const resignation = await Resignation.findById(checklist.resignation);
      if (resignation) {
        resignation.exitSteps.clearance.status = 'completed';
        resignation.exitSteps.clearance.completedAt = new Date();
        resignation.exitSteps.finalSettlement.status = 'completed';
        resignation.exitSteps.finalSettlement.completedAt = new Date();
        resignation.status = 'completed';
        
        // Update employee status to inactive
        const employee = await Employee.findById(checklist.employee);
        if (employee) {
          employee.status = 'inactive';
          await employee.save();
        }
        
        await resignation.save();
      }
    } else if (checklist.items.some(item => item.status === 'in_progress' || item.status === 'completed')) {
      checklist.status = 'in_progress';
      await checklist.save();
    }

    const populated = await ExitChecklist.findById(checklist._id)
      .populate('items.assignedTo', 'email')
      .populate('items.completedBy', 'email');

    res.json({
      success: true,
      message: 'Checklist item updated successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add custom checklist item
export const addChecklistItem = async (req, res) => {
  try {
    const { checklistId } = req.params;
    const { title, description, category, responsibleDepartment, isMandatory } = req.body;

    const checklist = await ExitChecklist.findById(checklistId);
    if (!checklist) {
      return res.status(404).json({ success: false, message: 'Exit checklist not found' });
    }

    checklist.items.push({
      title,
      description: description || '',
      category: category || 'other',
      responsibleDepartment: responsibleDepartment || 'hr',
      isMandatory: isMandatory !== undefined ? isMandatory : true,
      status: 'pending'
    });

    await checklist.save();

    const populated = await ExitChecklist.findById(checklist._id)
      .populate('items.assignedTo', 'email');

    res.json({
      success: true,
      message: 'Checklist item added successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete checklist item
export const deleteChecklistItem = async (req, res) => {
  try {
    const { checklistId, itemId } = req.params;

    const checklist = await ExitChecklist.findById(checklistId);
    if (!checklist) {
      return res.status(404).json({ success: false, message: 'Exit checklist not found' });
    }

    const item = checklist.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Checklist item not found' });
    }

    // Cannot delete if already completed
    if (item.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed checklist item'
      });
    }

    checklist.items.pull(itemId);
    await checklist.save();

    res.json({
      success: true,
      message: 'Checklist item deleted successfully',
      data: checklist
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

