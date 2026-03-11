import Goal from '../models/goal.model.js';
import PerformanceCycle from '../models/performanceCycle.model.js';
import Employee from '../models/employee.model.js';

// Get goals with filtering
export const getGoals = async (req, res) => {
  try {
    const { performanceCycleId, employeeId, status, category, search } = req.query;
    const filter = {};

    if (performanceCycleId) filter.performanceCycle = performanceCycleId;
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // If employee, only show approved goals (unless they proposed them)
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee) {
        return res.status(404).json({ 
          success: false, 
          message: 'Employee profile not found. Please contact HR to set up your employee profile.' 
        });
      }
      // Override any employeeId filter and show only their own goals
      delete filter.employee;
      filter.$or = [
        { employee: employee._id, status: { $in: ['approved', 'reopened'] } },
        { employee: employee._id, proposedBy: 'employee', status: { $ne: 'approved' } }
      ];
    }

    const goals = await Goal.find(filter)
      .populate('performanceCycle', 'name cycleType startDate endDate')
      .populate('employee', 'firstName lastName employeeId email')
      .populate('assignedBy', 'email')
      .populate('approvedBy', 'email')
      .populate('rejectedBy', 'email')
      .populate('reopenedBy', 'email')
      .populate('comments.user', 'email firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: goals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single goal
export const getGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id)
      .populate('performanceCycle', 'name cycleType startDate endDate')
      .populate('employee', 'firstName lastName employeeId email department designation')
      .populate('assignedBy', 'email firstName lastName')
      .populate('approvedBy', 'email firstName lastName')
      .populate('rejectedBy', 'email firstName lastName')
      .populate('reopenedBy', 'email firstName lastName')
      .populate('comments.user', 'email firstName lastName');

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    // Check visibility
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee && goal.employee._id.toString() !== employee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this goal' });
      }
      if (goal.status !== 'approved' && goal.status !== 'reopened' && goal.proposedBy !== 'employee') {
        return res.status(403).json({ success: false, message: 'Goal not yet approved' });
      }
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Validate total weightage for an employee in a cycle
const validateTotalWeightage = async (performanceCycleId, employeeId, excludeGoalId = null) => {
  const filter = {
    performanceCycle: performanceCycleId,
    employee: employeeId,
    status: { $in: ['approved', 'reopened', 'pending_approval'] }
  };
  if (excludeGoalId) {
    filter._id = { $ne: excludeGoalId };
  }

  const goals = await Goal.find(filter);
  const totalWeightage = goals.reduce((sum, goal) => sum + (goal.weightage || 0), 0);
  return totalWeightage;
};

// Create goal
export const createGoal = async (req, res) => {
  try {
    const { performanceCycleId, employeeId, title, description, category, weightage, dueDate, successCriteria, proposedBy, isMandatory } = req.body;

    // Validate required fields
    if (!performanceCycleId || !employeeId || !title || !category || weightage === undefined || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Performance cycle, employee, title, category, weightage, and due date are required'
      });
    }

    // Validate performance cycle exists and is active
    const cycle = await PerformanceCycle.findById(performanceCycleId);
    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Performance cycle not found' });
    }

    if (cycle.status !== 'active' && cycle.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create goals for a cycle that is not active or draft'
      });
    }

    // Validate employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Determine if this is an employee proposal
    const employeeUser = await Employee.findOne({ userId: req.user._id });
    const isEmployeeProposal = req.user.role === 'employee' && employeeUser && employeeUser._id.toString() === employeeId;

    // Check for duplicate title
    const duplicate = await Goal.findOne({
      performanceCycle: performanceCycleId,
      employee: employeeId,
      title: title.trim()
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'A goal with this title already exists for this employee in this cycle'
      });
    }

    // Validate weightage
    if (weightage < 0 || weightage > 100) {
      return res.status(400).json({
        success: false,
        message: 'Weightage must be between 0 and 100'
      });
    }

    // Check total weightage (if approving, must total 100%)
    const existingWeightage = await validateTotalWeightage(performanceCycleId, employeeId);
    const newTotal = existingWeightage + weightage;

    if (newTotal > 100) {
      return res.status(400).json({
        success: false,
        message: `Total weightage would exceed 100%. Current total: ${existingWeightage}%, adding ${weightage}% would make it ${newTotal}%`
      });
    }

    // Create goal
    const goalData = {
      performanceCycle: performanceCycleId,
      employee: employeeId,
      title: title.trim(),
      description: description || '',
      category,
      weightage,
      dueDate: new Date(dueDate),
      successCriteria: successCriteria || '',
      proposedBy: isEmployeeProposal ? 'employee' : (proposedBy || (req.user.role === 'hr' ? 'hr' : 'manager')),
      assignedBy: req.user._id,
      status: isEmployeeProposal ? 'pending_approval' : (req.user.role === 'admin' || req.user.role === 'hr' ? 'approved' : 'pending_approval'),
      isMandatory: isMandatory || false
    };

    if (!isEmployeeProposal && (req.user.role === 'admin' || req.user.role === 'hr')) {
      goalData.approvedBy = req.user._id;
      goalData.approvedAt = new Date();
    }

    const goal = await Goal.create(goalData);

    const populated = await Goal.findById(goal._id)
      .populate('performanceCycle', 'name')
      .populate('employee', 'firstName lastName employeeId')
      .populate('assignedBy', 'email');

    // TODO: Send notification to employee/manager
    if (isEmployeeProposal) {
      console.log(`[NOTIFICATION] Employee ${employee.email} proposed a new goal: ${title}`);
    } else if (goal.status === 'approved') {
      console.log(`[NOTIFICATION] Goal "${title}" assigned to ${employee.email}`);
    }

    res.status(201).json({
      success: true,
      message: isEmployeeProposal 
        ? 'Goal proposed successfully. Waiting for approval.'
        : goal.status === 'approved'
        ? 'Goal created and approved successfully'
        : 'Goal created successfully. Waiting for approval.',
      data: populated,
      totalWeightage: newTotal
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update goal
export const updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    // Check authorization
    const employeeUser = await Employee.findOne({ userId: req.user._id });
    const isEmployee = req.user.role === 'employee' && employeeUser;
    
    // Employees can only edit their own goals if they proposed them and status is pending_approval or draft
    if (isEmployee) {
      if (goal.employee.toString() !== employeeUser._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this goal' });
      }
      if (goal.status === 'approved' || goal.status === 'reopened') {
        return res.status(400).json({
          success: false,
          message: 'Cannot edit approved goals. Contact HR to reopen the goal.'
        });
      }
      if (goal.proposedBy !== 'employee' && goal.status !== 'draft') {
        return res.status(403).json({ success: false, message: 'Not authorized to edit this goal' });
      }
    } else if (goal.status === 'approved' || goal.status === 'reopened') {
      // HR/Manager can only edit approved goals if they reopen them
      return res.status(400).json({
        success: false,
        message: 'Cannot edit approved goals. Reopen the goal first to make changes.'
      });
    }

    // Validate weightage if being changed
    if (req.body.weightage !== undefined) {
      const newWeightage = req.body.weightage;
      if (newWeightage < 0 || newWeightage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Weightage must be between 0 and 100'
        });
      }

      const existingWeightage = await validateTotalWeightage(goal.performanceCycle.toString(), goal.employee.toString(), goal._id);
      const newTotal = existingWeightage + newWeightage;

      if (newTotal > 100) {
        return res.status(400).json({
          success: false,
          message: `Total weightage would exceed 100%. Current total: ${existingWeightage}%, adding ${newWeightage}% would make it ${newTotal}%`
        });
      }
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== '__v' && key !== 'performanceCycle' && key !== 'employee') {
        if (key === 'dueDate') {
          goal[key] = new Date(req.body[key]);
        } else {
          goal[key] = req.body[key];
        }
      }
    });

    await goal.save();

    const populated = await Goal.findById(goal._id)
      .populate('performanceCycle', 'name')
      .populate('employee', 'firstName lastName employeeId')
      .populate('assignedBy', 'email');

    res.json({
      success: true,
      message: 'Goal updated successfully',
      data: populated
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve goal
export const approveGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    if (goal.status !== 'pending_approval' && goal.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve goal with status '${goal.status}'`
      });
    }

    // Validate total weightage equals 100%
    const existingWeightage = await validateTotalWeightage(goal.performanceCycle.toString(), goal.employee.toString(), goal._id);
    const newTotal = existingWeightage + goal.weightage;

    // Warning if not exactly 100%, but allow approval
    if (newTotal !== 100) {
      // This is just a warning, not an error
      console.warn(`Total weightage for employee ${goal.employee} in cycle ${goal.performanceCycle} is ${newTotal}%, not 100%`);
    }

    goal.status = 'approved';
    goal.approvedBy = req.user._id;
    goal.approvedAt = new Date();
    await goal.save();

    const populated = await Goal.findById(goal._id)
      .populate('performanceCycle', 'name')
      .populate('employee', 'firstName lastName email')
      .populate('approvedBy', 'email');

    // TODO: Send notification
    console.log(`[NOTIFICATION] Goal "${goal.title}" approved for ${populated.employee.email}`);

    res.json({
      success: true,
      message: 'Goal approved successfully',
      data: populated,
      totalWeightage: newTotal,
      warning: newTotal !== 100 ? `Total weightage is ${newTotal}%, not 100%` : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject goal
export const rejectGoal = async (req, res) => {
  try {
    const { reason } = req.body;
    const goal = await Goal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    if (goal.status !== 'pending_approval' && goal.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject goal with status '${goal.status}'`
      });
    }

    goal.status = 'rejected';
    goal.rejectedBy = req.user._id;
    goal.rejectedAt = new Date();
    goal.rejectionReason = reason || '';

    await goal.save();

    const populated = await Goal.findById(goal._id)
      .populate('performanceCycle', 'name')
      .populate('employee', 'firstName lastName email')
      .populate('rejectedBy', 'email');

    // TODO: Send notification
    console.log(`[NOTIFICATION] Goal "${goal.title}" rejected for ${populated.employee.email}. Reason: ${reason}`);

    res.json({
      success: true,
      message: 'Goal rejected successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reopen goal
export const reopenGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    if (goal.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Can only reopen approved goals. Current status: ${goal.status}`
      });
    }

    goal.status = 'reopened';
    goal.isReopened = true;
    goal.reopenedBy = req.user._id;
    goal.reopenedAt = new Date();
    await goal.save();

    const populated = await Goal.findById(goal._id)
      .populate('performanceCycle', 'name')
      .populate('employee', 'firstName lastName email')
      .populate('reopenedBy', 'email');

    // TODO: Send notification
    console.log(`[NOTIFICATION] Goal "${goal.title}" reopened for ${populated.employee.email}`);

    res.json({
      success: true,
      message: 'Goal reopened successfully. It can now be edited.',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get total weightage for an employee in a cycle
export const getEmployeeWeightage = async (req, res) => {
  try {
    const { performanceCycleId, employeeId } = req.params;
    const { exclude } = req.query; // Goal ID to exclude from calculation
    
    const totalWeightage = await validateTotalWeightage(performanceCycleId, employeeId, exclude || null);

    const filter = {
      performanceCycle: performanceCycleId,
      employee: employeeId,
      status: { $in: ['approved', 'reopened', 'pending_approval'] }
    };
    if (exclude) {
      filter._id = { $ne: exclude };
    }

    const goals = await Goal.find(filter).select('title weightage status');

    res.json({
      success: true,
      data: {
        totalWeightage,
        isComplete: totalWeightage === 100,
        goals: goals.map(g => ({ title: g.title, weightage: g.weightage, status: g.status }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add comment to goal
export const addComment = async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }

    const goal = await Goal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    goal.comments.push({
      user: req.user._id,
      comment: comment.trim()
    });

    await goal.save();

    const populated = await Goal.findById(goal._id)
      .populate('comments.user', 'email firstName lastName');

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

