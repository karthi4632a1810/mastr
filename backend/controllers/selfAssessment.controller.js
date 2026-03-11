import SelfAssessment from '../models/selfAssessment.model.js';
import PerformanceCycle from '../models/performanceCycle.model.js';
import Goal from '../models/goal.model.js';
import Employee from '../models/employee.model.js';

// Get self-assessment for current employee and cycle
export const getSelfAssessment = async (req, res) => {
  try {
    const { performanceCycleId } = req.query;
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    let cycleId = performanceCycleId;
    if (!cycleId) {
      // Get current active cycle
      const activeCycle = await PerformanceCycle.findOne({
        status: 'active',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      });
      if (activeCycle) {
        cycleId = activeCycle._id;
      } else {
        return res.status(404).json({ success: false, message: 'No active performance cycle found' });
      }
    }

    let selfAssessment = await SelfAssessment.findOne({
      performanceCycle: cycleId,
      employee: employee._id
    })
      .populate('performanceCycle', 'name cycleType startDate endDate workflowWindows')
      .populate('employee', 'firstName lastName employeeId email')
      .populate('goalRatings.goal', 'title description category weightage dueDate successCriteria');

    // If no self-assessment exists, create a draft one
    if (!selfAssessment) {
      // Get all approved goals for this employee in this cycle
      const goals = await Goal.find({
        performanceCycle: cycleId,
        employee: employee._id,
        status: { $in: ['approved', 'reopened'] }
      }).select('_id title description category weightage dueDate successCriteria');

      selfAssessment = await SelfAssessment.create({
        performanceCycle: cycleId,
        employee: employee._id,
        goalRatings: goals.map(goal => ({
          goal: goal._id,
          rating: 0,
          comment: ''
        })),
        status: 'draft'
      });

      selfAssessment = await SelfAssessment.findById(selfAssessment._id)
        .populate('performanceCycle', 'name cycleType startDate endDate workflowWindows')
        .populate('employee', 'firstName lastName employeeId email')
        .populate('goalRatings.goal', 'title description category weightage dueDate successCriteria');
    }

    res.json({ success: true, data: selfAssessment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get self-assessment by ID (for HR/Admin viewing)
export const getSelfAssessmentById = async (req, res) => {
  try {
    const selfAssessment = await SelfAssessment.findById(req.params.id)
      .populate('performanceCycle', 'name cycleType startDate endDate')
      .populate('employee', 'firstName lastName employeeId email department designation')
      .populate('goalRatings.goal', 'title description category weightage dueDate successCriteria')
      .populate('reopenedBy', 'email');

    if (!selfAssessment) {
      return res.status(404).json({ success: false, message: 'Self-assessment not found' });
    }

    // Check authorization
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee && selfAssessment.employee._id.toString() !== employee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this assessment' });
      }
    }

    res.json({ success: true, data: selfAssessment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update self-assessment (draft only)
export const updateSelfAssessment = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const selfAssessment = await SelfAssessment.findById(req.params.id);
    if (!selfAssessment) {
      return res.status(404).json({ success: false, message: 'Self-assessment not found' });
    }

    // Check authorization - only employee can update their own assessment
    if (selfAssessment.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this assessment' });
    }

    // Check if self-assessment window is open
    const cycle = await PerformanceCycle.findById(selfAssessment.performanceCycle);
    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Performance cycle not found' });
    }

    if (cycle.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update self-assessment for a cycle that is not active'
      });
    }

    const now = new Date();
    const selfAssessmentWindow = cycle.workflowWindows?.selfAssessment;
    if (selfAssessmentWindow?.enabled) {
      if (selfAssessmentWindow.startDate && new Date(selfAssessmentWindow.startDate) > now) {
        return res.status(400).json({
          success: false,
          message: `Self-assessment window opens on ${new Date(selfAssessmentWindow.startDate).toLocaleDateString()}`
        });
      }
      if (selfAssessmentWindow.endDate && new Date(selfAssessmentWindow.endDate) < now) {
        return res.status(400).json({
          success: false,
          message: `Self-assessment window closed on ${new Date(selfAssessmentWindow.endDate).toLocaleDateString()}`
        });
      }
    }

    // Cannot update if already submitted (unless reopened)
    if (selfAssessment.status === 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update submitted assessment. Contact HR to reopen it.'
      });
    }

    // Update goal ratings
    if (req.body.goalRatings) {
      // Validate all goals have ratings
      const invalidRatings = req.body.goalRatings.filter(gr => !gr.rating || gr.rating < 1 || gr.rating > 5);
      if (invalidRatings.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'All goals must have a valid rating between 1 and 5'
        });
      }

      // Validate all goals exist and belong to this employee
      const goalIds = req.body.goalRatings.map(gr => gr.goal);
      const goals = await Goal.find({
        _id: { $in: goalIds },
        performanceCycle: selfAssessment.performanceCycle,
        employee: employee._id,
        status: { $in: ['approved', 'reopened'] }
      });

      if (goals.length !== goalIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some goals are invalid or not approved'
        });
      }

      selfAssessment.goalRatings = req.body.goalRatings.map(gr => ({
        goal: gr.goal,
        rating: gr.rating,
        comment: gr.comment || ''
      }));
    }

    if (req.body.overallComments !== undefined) {
      selfAssessment.overallComments = req.body.overallComments;
    }

    await selfAssessment.save();

    const populated = await SelfAssessment.findById(selfAssessment._id)
      .populate('performanceCycle', 'name')
      .populate('goalRatings.goal', 'title description weightage');

    res.json({
      success: true,
      message: 'Self-assessment updated successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit self-assessment
export const submitSelfAssessment = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const selfAssessment = await SelfAssessment.findById(req.params.id);
    if (!selfAssessment) {
      return res.status(404).json({ success: false, message: 'Self-assessment not found' });
    }

    // Check authorization
    if (selfAssessment.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to submit this assessment' });
    }

    // Check if already submitted
    if (selfAssessment.status === 'submitted') {
      return res.status(400).json({ success: false, message: 'Assessment already submitted' });
    }

    // Check if self-assessment window is open
    const cycle = await PerformanceCycle.findById(selfAssessment.performanceCycle);
    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Performance cycle not found' });
    }

    const now = new Date();
    const selfAssessmentWindow = cycle.workflowWindows?.selfAssessment;
    if (selfAssessmentWindow?.enabled) {
      if (selfAssessmentWindow.startDate && new Date(selfAssessmentWindow.startDate) > now) {
        return res.status(400).json({
          success: false,
          message: `Self-assessment window opens on ${new Date(selfAssessmentWindow.startDate).toLocaleDateString()}`
        });
      }
      if (selfAssessmentWindow.endDate && new Date(selfAssessmentWindow.endDate) < now) {
        return res.status(400).json({
          success: false,
          message: `Self-assessment window closed on ${new Date(selfAssessmentWindow.endDate).toLocaleDateString()}`
        });
      }
    }

    // Validate all goals are rated
    const unratedGoals = selfAssessment.goalRatings.filter(gr => !gr.rating || gr.rating < 1 || gr.rating > 5);
    if (unratedGoals.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please rate all goals before submitting. All goals must have a rating between 1 and 5.'
      });
    }

    // Check if overall comments are mandatory (based on HR policy - for now optional, can be configured later)
    // This can be extended with a policy check

    // Submit assessment
    selfAssessment.status = 'submitted';
    selfAssessment.submittedAt = new Date();

    // Weighted score will be calculated in pre-save hook
    await selfAssessment.save();

    const populated = await SelfAssessment.findById(selfAssessment._id)
      .populate('performanceCycle', 'name')
      .populate('employee', 'firstName lastName email reportingManager')
      .populate('goalRatings.goal', 'title weightage');

    // TODO: Send notifications to Manager and HR
    console.log(`[NOTIFICATION] Self-assessment submitted by ${populated.employee.email}`);
    if (populated.employee.reportingManager) {
      const manager = await Employee.findById(populated.employee.reportingManager).populate('userId', 'email');
      if (manager?.userId?.email) {
        console.log(`[NOTIFICATION] Manager ${manager.userId.email} notified of self-assessment submission`);
      }
    }

    // Notify HR users
    const User = (await import('../models/user.model.js')).default;
    const hrUsers = await User.find({ role: 'hr' });
    hrUsers.forEach(user => {
      console.log(`[NOTIFICATION] HR user ${user.email} notified of self-assessment submission by ${populated.employee.email}`);
    });

    res.json({
      success: true,
      message: 'Self-assessment submitted successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reopen self-assessment (HR only)
export const reopenSelfAssessment = async (req, res) => {
  try {
    const { reason } = req.body;
    const selfAssessment = await SelfAssessment.findById(req.params.id);
    if (!selfAssessment) {
      return res.status(404).json({ success: false, message: 'Self-assessment not found' });
    }

    if (selfAssessment.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: `Can only reopen submitted assessments. Current status: ${selfAssessment.status}`
      });
    }

    selfAssessment.status = 'reopened';
    selfAssessment.reopenedBy = req.user._id;
    selfAssessment.reopenedAt = new Date();
    selfAssessment.reopenReason = reason || '';

    await selfAssessment.save();

    const populated = await SelfAssessment.findById(selfAssessment._id)
      .populate('performanceCycle', 'name')
      .populate('employee', 'firstName lastName email')
      .populate('reopenedBy', 'email');

    // TODO: Send notification to employee
    console.log(`[NOTIFICATION] Self-assessment reopened for ${populated.employee.email}. Reason: ${reason}`);

    res.json({
      success: true,
      message: 'Self-assessment reopened successfully. Employee can now edit it.',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all self-assessments (for HR/Manager)
export const getSelfAssessments = async (req, res) => {
  try {
    const { performanceCycleId, employeeId, status, search } = req.query;
    const filter = {};

    if (performanceCycleId) filter.performanceCycle = performanceCycleId;
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;

    const selfAssessments = await SelfAssessment.find(filter)
      .populate('performanceCycle', 'name cycleType startDate endDate')
      .populate('employee', 'firstName lastName employeeId email')
      .populate('reopenedBy', 'email')
      .sort({ submittedAt: -1, createdAt: -1 });

    // Filter by search if provided
    let filtered = selfAssessments;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = selfAssessments.filter(sa => 
        sa.employee?.firstName?.toLowerCase().includes(searchLower) ||
        sa.employee?.lastName?.toLowerCase().includes(searchLower) ||
        sa.employee?.employeeId?.toLowerCase().includes(searchLower) ||
        sa.employee?.email?.toLowerCase().includes(searchLower)
      );
    }

    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

