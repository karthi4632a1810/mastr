import PerformanceCycle from '../models/performanceCycle.model.js';
import Employee from '../models/employee.model.js';

// Get all performance cycles
export const getPerformanceCycles = async (req, res) => {
  try {
    const { status, cycleType, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (cycleType) filter.cycleType = cycleType;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const cycles = await PerformanceCycle.find(filter)
      .populate('associatedDepartments', 'name')
      .populate('createdBy', 'email')
      .populate('activatedBy', 'email')
      .populate('employeeInclusion.includedEmployees', 'firstName lastName employeeId')
      .populate('employeeInclusion.excludedEmployees', 'firstName lastName employeeId')
      .sort({ startDate: -1 });

    res.json({ success: true, data: cycles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single performance cycle
export const getPerformanceCycle = async (req, res) => {
  try {
    const cycle = await PerformanceCycle.findById(req.params.id)
      .populate('associatedDepartments', 'name')
      .populate('createdBy', 'email')
      .populate('activatedBy', 'email')
      .populate('frozenBy', 'email')
      .populate('closedBy', 'email')
      .populate('employeeInclusion.includedEmployees', 'firstName lastName employeeId email department designation')
      .populate('employeeInclusion.excludedEmployees', 'firstName lastName employeeId email');

    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Performance cycle not found' });
    }

    // Get eligible employees count
    const eligibleEmployees = await cycle.getEligibleEmployees();
    const eligibleCount = eligibleEmployees.length;

    res.json({ 
      success: true, 
      data: {
        ...cycle.toObject(),
        eligibleEmployeeCount: eligibleCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create performance cycle
export const createPerformanceCycle = async (req, res) => {
  try {
    const cycleData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Validate dates
    if (new Date(cycleData.startDate) >= new Date(cycleData.endDate)) {
      return res.status(400).json({ 
        success: false, 
        message: 'End date must be after start date' 
      });
    }

    // Validate workflow windows
    if (cycleData.workflowWindows) {
      const windows = cycleData.workflowWindows;
      
      // Goal setting window should be within cycle dates
      if (windows.goalSetting?.startDate && windows.goalSetting?.endDate) {
        if (new Date(windows.goalSetting.startDate) < new Date(cycleData.startDate) ||
            new Date(windows.goalSetting.endDate) > new Date(cycleData.endDate)) {
          return res.status(400).json({
            success: false,
            message: 'Goal setting window must be within cycle dates'
          });
        }
      }

      // Self-assessment window should be after goal setting
      if (windows.selfAssessment?.startDate && windows.goalSetting?.endDate) {
        if (new Date(windows.selfAssessment.startDate) < new Date(windows.goalSetting.endDate)) {
          return res.status(400).json({
            success: false,
            message: 'Self-assessment window should start after goal setting window ends'
          });
        }
      }

      // Manager review window should be after self-assessment
      if (windows.managerReview?.startDate && windows.selfAssessment?.endDate) {
        if (new Date(windows.managerReview.startDate) < new Date(windows.selfAssessment.endDate)) {
          return res.status(400).json({
            success: false,
            message: 'Manager review window should start after self-assessment window ends'
          });
        }
      }
    }

    const cycle = await PerformanceCycle.create(cycleData);
    
    const populated = await PerformanceCycle.findById(cycle._id)
      .populate('associatedDepartments', 'name')
      .populate('createdBy', 'email');

    res.status(201).json({
      success: true,
      message: 'Performance cycle created successfully',
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

// Update performance cycle
export const updatePerformanceCycle = async (req, res) => {
  try {
    const cycle = await PerformanceCycle.findById(req.params.id);
    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Performance cycle not found' });
    }

    // Prevent updates to active/closed cycles (only draft/frozen can be updated)
    if (cycle.status === 'active' || cycle.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: `Cannot update cycle with status '${cycle.status}'. Change status first.`
      });
    }

    // Validate dates if provided
    const startDate = req.body.startDate ? new Date(req.body.startDate) : cycle.startDate;
    const endDate = req.body.endDate ? new Date(req.body.endDate) : cycle.endDate;
    
    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== '__v' && key !== 'createdBy') {
        cycle[key] = req.body[key];
      }
    });

    await cycle.save();

    const populated = await PerformanceCycle.findById(cycle._id)
      .populate('associatedDepartments', 'name')
      .populate('createdBy', 'email');

    res.json({
      success: true,
      message: 'Performance cycle updated successfully',
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

// Activate performance cycle
export const activatePerformanceCycle = async (req, res) => {
  try {
    const cycle = await PerformanceCycle.findById(req.params.id);
    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Performance cycle not found' });
    }

    if (cycle.status === 'active') {
      return res.status(400).json({ success: false, message: 'Cycle is already active' });
    }

    if (cycle.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cannot activate a closed cycle' });
    }

    // Check for overlapping active cycles
    const overlapping = await PerformanceCycle.findOne({
      _id: { $ne: cycle._id },
      status: 'active',
      $or: [
        {
          startDate: { $lte: cycle.endDate },
          endDate: { $gte: cycle.startDate }
        }
      ]
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: 'Another active cycle overlaps with this cycle\'s dates'
      });
    }

    cycle.status = 'active';
    cycle.activatedAt = new Date();
    cycle.activatedBy = req.user._id;
    await cycle.save();

    // TODO: Send notifications for goal setting window if enabled
    if (cycle.notifications.goalSettingEnabled && cycle.workflowWindows.goalSetting?.enabled) {
      console.log(`[NOTIFICATION] Performance cycle ${cycle.name} activated. Goal setting window starts.`);
    }

    const populated = await PerformanceCycle.findById(cycle._id)
      .populate('associatedDepartments', 'name')
      .populate('activatedBy', 'email');

    res.json({
      success: true,
      message: 'Performance cycle activated successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Deactivate/Freeze performance cycle
export const freezePerformanceCycle = async (req, res) => {
  try {
    const cycle = await PerformanceCycle.findById(req.params.id);
    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Performance cycle not found' });
    }

    if (cycle.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot freeze cycle with status '${cycle.status}'` 
      });
    }

    cycle.status = 'frozen';
    cycle.frozenAt = new Date();
    cycle.frozenBy = req.user._id;
    await cycle.save();

    const populated = await PerformanceCycle.findById(cycle._id)
      .populate('frozenBy', 'email');

    res.json({
      success: true,
      message: 'Performance cycle frozen successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Close performance cycle
export const closePerformanceCycle = async (req, res) => {
  try {
    const cycle = await PerformanceCycle.findById(req.params.id);
    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Performance cycle not found' });
    }

    if (cycle.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cycle is already closed' });
    }

    cycle.status = 'closed';
    cycle.closedAt = new Date();
    cycle.closedBy = req.user._id;
    await cycle.save();

    const populated = await PerformanceCycle.findById(cycle._id)
      .populate('closedBy', 'email');

    res.json({
      success: true,
      message: 'Performance cycle closed successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get eligible employees for a cycle
export const getEligibleEmployees = async (req, res) => {
  try {
    const cycle = await PerformanceCycle.findById(req.params.id);
    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Performance cycle not found' });
    }

    const eligibleEmployees = await cycle.getEligibleEmployees();
    
    const populated = await Employee.populate(eligibleEmployees, [
      { path: 'department', select: 'name' },
      { path: 'designation', select: 'name' },
      { path: 'reportingManager', select: 'firstName lastName employeeId' }
    ]);

    res.json({
      success: true,
      data: populated,
      count: populated.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Sync employees (update eligible employees list)
export const syncEmployees = async (req, res) => {
  try {
    const cycle = await PerformanceCycle.findById(req.params.id);
    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Performance cycle not found' });
    }

    // Get current eligible employees
    const eligibleEmployees = await cycle.getEligibleEmployees();
    const eligibleIds = eligibleEmployees.map(e => e._id.toString());

    // Update included employees if includeAllActive is true
    if (cycle.employeeInclusion.includeAllActive) {
      // Remove employees who are no longer eligible from included list
      cycle.employeeInclusion.includedEmployees = cycle.employeeInclusion.includedEmployees.filter(
        empId => eligibleIds.includes(empId.toString())
      );
      
      // Add newly eligible employees to included list
      eligibleEmployees.forEach(emp => {
        const empId = emp._id.toString();
        if (!cycle.employeeInclusion.includedEmployees.some(e => e.toString() === empId) &&
            !cycle.employeeInclusion.excludedEmployees.some(e => e.toString() === empId)) {
          cycle.employeeInclusion.includedEmployees.push(emp._id);
        }
      });
    }

    await cycle.save();

    const populated = await PerformanceCycle.findById(cycle._id)
      .populate('employeeInclusion.includedEmployees', 'firstName lastName employeeId');

    res.json({
      success: true,
      message: 'Employees synced successfully',
      data: populated,
      eligibleCount: eligibleEmployees.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Manage employee inclusion/exclusion
export const manageEmployeeInclusion = async (req, res) => {
  try {
    const { action, employeeIds } = req.body; // action: 'include' or 'exclude'

    if (!action || !employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({
        success: false,
        message: 'Action and employeeIds array are required'
      });
    }

    const cycle = await PerformanceCycle.findById(req.params.id);
    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Performance cycle not found' });
    }

    if (action === 'include') {
      // Add to included, remove from excluded
      employeeIds.forEach(empId => {
        if (!cycle.employeeInclusion.includedEmployees.includes(empId)) {
          cycle.employeeInclusion.includedEmployees.push(empId);
        }
        cycle.employeeInclusion.excludedEmployees = cycle.employeeInclusion.excludedEmployees.filter(
          e => e.toString() !== empId.toString()
        );
      });
    } else if (action === 'exclude') {
      // Add to excluded, remove from included
      employeeIds.forEach(empId => {
        if (!cycle.employeeInclusion.excludedEmployees.includes(empId)) {
          cycle.employeeInclusion.excludedEmployees.push(empId);
        }
        cycle.employeeInclusion.includedEmployees = cycle.employeeInclusion.includedEmployees.filter(
          e => e.toString() !== empId.toString()
        );
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Use "include" or "exclude"' });
    }

    await cycle.save();

    const populated = await PerformanceCycle.findById(cycle._id)
      .populate('employeeInclusion.includedEmployees', 'firstName lastName employeeId')
      .populate('employeeInclusion.excludedEmployees', 'firstName lastName employeeId');

    res.json({
      success: true,
      message: `Employees ${action}d successfully`,
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

