import PerformanceReview from '../models/performanceReview.model.js';
import PerformanceCycle from '../models/performanceCycle.model.js';
import SelfAssessment from '../models/selfAssessment.model.js';
import Goal from '../models/goal.model.js';
import Employee from '../models/employee.model.js';

// Get all performance reviews for a cycle
export const getPerformanceReviews = async (req, res) => {
  try {
    const { performanceCycleId, employeeId, status, search } = req.query;
    const filter = {};

    if (performanceCycleId) filter.performanceCycle = performanceCycleId;
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;

    const reviews = await PerformanceReview.find(filter)
      .populate('performanceCycle', 'name cycleType startDate endDate status')
      .populate('employee', 'firstName lastName employeeId email department designation')
      .populate('selfAssessment', 'weightedScore submittedAt status')
      .populate('finalizedBy', 'email')
      .sort({ createdAt: -1 });

    // Filter by search if provided
    let filtered = reviews;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = reviews.filter(review => 
        review.employee?.firstName?.toLowerCase().includes(searchLower) ||
        review.employee?.lastName?.toLowerCase().includes(searchLower) ||
        review.employee?.employeeId?.toLowerCase().includes(searchLower) ||
        review.employee?.email?.toLowerCase().includes(searchLower)
      );
    }

    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single performance review with all details
export const getPerformanceReview = async (req, res) => {
  try {
    const review = await PerformanceReview.findById(req.params.id)
      .populate('performanceCycle', 'name cycleType startDate endDate status workflowWindows')
      .populate('employee', 'firstName lastName employeeId email department designation reportingManager')
      .populate('selfAssessment')
      .populate('managerEvaluation')
      .populate('finalizedBy', 'email firstName lastName')
      .populate('unlockedBy', 'email firstName lastName');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Performance review not found' });
    }

    // Get all goals for this employee in this cycle
    const goals = await Goal.find({
      performanceCycle: review.performanceCycle._id,
      employee: review.employee._id,
      status: { $in: ['approved', 'reopened'] }
    })
      .populate('assignedBy', 'email')
      .sort({ createdAt: 1 });

    // Get self-assessment details with goal ratings
    let selfAssessmentDetails = null;
    if (review.selfAssessment) {
      selfAssessmentDetails = await SelfAssessment.findById(review.selfAssessment)
        .populate('goalRatings.goal', 'title description category weightage successCriteria');
    }

    // Calculate aggregated rating from self-assessment
    const aggregatedRating = selfAssessmentDetails?.weightedScore || null;

    res.json({
      success: true,
      data: {
        ...review.toObject(),
        goals,
        selfAssessmentDetails,
        aggregatedRating
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create or get performance review
export const getOrCreatePerformanceReview = async (req, res) => {
  try {
    const { performanceCycleId, employeeId } = req.body;

    if (!performanceCycleId || !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Performance cycle and employee are required'
      });
    }

    let review = await PerformanceReview.findOne({
      performanceCycle: performanceCycleId,
      employee: employeeId
    });

    if (!review) {
      // Get self-assessment if exists
      const selfAssessment = await SelfAssessment.findOne({
        performanceCycle: performanceCycleId,
        employee: employeeId
      });

      review = await PerformanceReview.create({
        performanceCycle: performanceCycleId,
        employee: employeeId,
        selfAssessment: selfAssessment?._id || null,
        status: 'pending'
      });
    }

    const populated = await PerformanceReview.findById(review._id)
      .populate('performanceCycle', 'name')
      .populate('employee', 'firstName lastName employeeId')
      .populate('selfAssessment', 'weightedScore');

    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update final rating
export const updateFinalRating = async (req, res) => {
  try {
    const { finalRating, hrComments, justification, status, visibleToEmployee } = req.body;
    const review = await PerformanceReview.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ success: false, message: 'Performance review not found' });
    }

    // Check if locked and cycle is still active
    if (review.isLocked && review.status === 'finalized') {
      const cycle = await PerformanceCycle.findById(review.performanceCycle);
      if (cycle.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update finalized review for a closed cycle. Unlock it first.'
        });
      }
    }

    // Update fields
    if (finalRating !== undefined) {
      if (finalRating.ratingType === 'numeric') {
        review.finalRating.numeric = finalRating.numeric;
        review.finalRating.grade = null;
        review.finalRating.ratingType = 'numeric';
      } else if (finalRating.ratingType === 'grade') {
        review.finalRating.grade = finalRating.grade;
        review.finalRating.numeric = null;
        review.finalRating.ratingType = 'grade';
      }
    }

    if (hrComments !== undefined) review.hrComments = hrComments;
    if (justification !== undefined) review.justification = justification;
    if (status) review.status = status;
    if (visibleToEmployee !== undefined) {
      review.visibleToEmployee = visibleToEmployee;
      if (visibleToEmployee && !review.visibleAt) {
        review.visibleAt = new Date();
      }
    }

    // Unlock if status is not finalized
    if (status !== 'finalized') {
      review.isLocked = false;
    }

    await review.save();

    const populated = await PerformanceReview.findById(review._id)
      .populate('performanceCycle', 'name')
      .populate('employee', 'firstName lastName employeeId email')
      .populate('selfAssessment', 'weightedScore');

    res.json({
      success: true,
      message: 'Final rating updated successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Finalize performance review
export const finalizePerformanceReview = async (req, res) => {
  try {
    const { visibleToEmployee } = req.body;
    const review = await PerformanceReview.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ success: false, message: 'Performance review not found' });
    }

    if (review.status === 'finalized') {
      return res.status(400).json({ success: false, message: 'Review is already finalized' });
    }

    // Validate final rating is provided
    if (!review.finalRating.numeric && !review.finalRating.grade) {
      return res.status(400).json({
        success: false,
        message: 'Final rating is required before finalizing'
      });
    }

    // Finalize
    review.status = 'finalized';
    review.isLocked = true;
    review.finalizedBy = req.user._id;
    review.finalizedAt = new Date();
    
    if (visibleToEmployee !== undefined) {
      review.visibleToEmployee = visibleToEmployee;
      if (visibleToEmployee) {
        review.visibleAt = new Date();
      }
    }

    await review.save();

    const populated = await PerformanceReview.findById(review._id)
      .populate('performanceCycle', 'name')
      .populate('employee', 'firstName lastName email')
      .populate('finalizedBy', 'email');

    // TODO: Send notification to employee if visible
    if (review.visibleToEmployee) {
      console.log(`[NOTIFICATION] Final performance rating visible to ${populated.employee.email}`);
    }

    res.json({
      success: true,
      message: 'Performance review finalized successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Unlock/reopen performance review
export const unlockPerformanceReview = async (req, res) => {
  try {
    const { reason } = req.body;
    const review = await PerformanceReview.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ success: false, message: 'Performance review not found' });
    }

    if (!review.isLocked) {
      return res.status(400).json({ success: false, message: 'Review is not locked' });
    }

    // Check if cycle is still active
    const cycle = await PerformanceCycle.findById(review.performanceCycle);
    if (cycle.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot unlock review for a cycle that is not active'
      });
    }

    review.isLocked = false;
    review.status = review.status === 'finalized' ? 'needs_review' : review.status;
    review.unlockedBy = req.user._id;
    review.unlockedAt = new Date();
    review.unlockReason = reason || '';

    await review.save();

    const populated = await PerformanceReview.findById(review._id)
      .populate('performanceCycle', 'name')
      .populate('employee', 'firstName lastName email')
      .populate('unlockedBy', 'email');

    // TODO: Send notification
    console.log(`[NOTIFICATION] Performance review unlocked for ${populated.employee.email}. Reason: ${reason}`);

    res.json({
      success: true,
      message: 'Performance review unlocked successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get employee's own performance review (if visible)
export const getMyPerformanceReview = async (req, res) => {
  try {
    console.log('getMyPerformanceReview called - Route is working!');
    const { performanceCycleId } = req.query;
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    let cycleId = performanceCycleId;
    if (!cycleId) {
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

    const review = await PerformanceReview.findOne({
      performanceCycle: cycleId,
      employee: employee._id,
      visibleToEmployee: true
    })
      .populate('performanceCycle', 'name cycleType startDate endDate')
      .populate('employee', 'firstName lastName employeeId')
      .populate('finalizedBy', 'email firstName lastName');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Performance review not available or not yet visible'
      });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Auto-create performance reviews for all eligible employees in a cycle
export const createReviewsForCycle = async (req, res) => {
  try {
    const { performanceCycleId } = req.body;
    
    if (!performanceCycleId) {
      return res.status(400).json({ success: false, message: 'Performance cycle ID is required' });
    }

    const cycle = await PerformanceCycle.findById(performanceCycleId);
    if (!cycle) {
      return res.status(404).json({ success: false, message: 'Performance cycle not found' });
    }

    // Get eligible employees
    const eligibleEmployees = await cycle.getEligibleEmployees();
    
    // Get existing reviews
    const existingReviews = await PerformanceReview.find({
      performanceCycle: performanceCycleId
    }).select('employee');

    const existingEmployeeIds = new Set(
      existingReviews.map(r => r.employee.toString())
    );

    // Create reviews for employees who don't have one
    const reviewsToCreate = [];
    for (const employee of eligibleEmployees) {
      if (!existingEmployeeIds.has(employee._id.toString())) {
        // Get self-assessment if exists
        const selfAssessment = await SelfAssessment.findOne({
          performanceCycle: performanceCycleId,
          employee: employee._id
        });

        reviewsToCreate.push({
          performanceCycle: performanceCycleId,
          employee: employee._id,
          selfAssessment: selfAssessment?._id || null,
          status: 'pending'
        });
      }
    }

    if (reviewsToCreate.length > 0) {
      await PerformanceReview.insertMany(reviewsToCreate);
    }

    res.json({
      success: true,
      message: `Created ${reviewsToCreate.length} performance reviews`,
      data: {
        created: reviewsToCreate.length,
        total: eligibleEmployees.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

