import Resignation from '../models/resignation.model.js';
import Employee from '../models/employee.model.js';
import ExitChecklist from '../models/exitChecklist.model.js';
import ExitChecklistTemplate from '../models/exitChecklistTemplate.model.js';
import LeaveRequest from '../models/leaveRequest.model.js';
import LeaveType from '../models/leaveType.model.js';
import { Asset } from '../models/asset.model.js';
import moment from 'moment';

// Get resignation details for HR review
export const getResignationForReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID parameter
    if (!id || id === 'undefined') {
      return res.status(400).json({ success: false, message: 'Resignation ID is required' });
    }

    const resignation = await Resignation.findById(id)
      .populate('employee', 'firstName lastName employeeId email department designation reportingManager joiningDate workLocation employeeCategory')
      .populate('employee.department', 'name')
      .populate('employee.designation', 'name')
      .populate('employee.reportingManager', 'firstName lastName employeeId')
      .populate('approvedBy', 'email firstName lastName')
      .populate('auditLog.performedBy', 'email firstName lastName');

    if (!resignation) {
      return res.status(404).json({ success: false, message: 'Resignation not found' });
    }

    const employee = resignation.employee;
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found for this resignation' });
    }

    // Get leave balance
    const leaveTypes = await LeaveType.find({ isActive: true, isLatest: true });
    const leaveBalance = [];
    
    for (const leaveType of leaveTypes) {
      const [approved, pending] = await Promise.all([
        LeaveRequest.aggregate([
          { $match: { employee: employee._id, leaveType: leaveType._id, status: 'approved' } },
          { $group: { _id: null, total: { $sum: '$days' } } }
        ]),
        LeaveRequest.aggregate([
          { $match: { employee: employee._id, leaveType: leaveType._id, status: 'pending' } },
          { $group: { _id: null, total: { $sum: '$days' } } }
        ])
      ]);

      const used = approved[0]?.total || 0;
      const pendingTotal = pending[0]?.total || 0;
      const total = leaveType.maxDays || 0;
      const available = Math.max(total - (used + pendingTotal), 0);

      leaveBalance.push({
        leaveType: {
          _id: leaveType._id,
          name: leaveType.name,
          code: leaveType.code,
          isPaid: leaveType.isPaid
        },
        total,
        used,
        pending: pendingTotal,
        available
      });
    }

    // Get asset assignments
    const assets = await Asset.find({
      assignedTo: employee._id,
      status: { $in: ['assigned', 'in_use'] }
    }).populate('category', 'name').populate('location', 'name');

    // Get previous resignations
    const previousResignations = await Resignation.find({
      employee: employee._id,
      _id: { $ne: resignation._id }
    }).sort({ submittedAt: -1 }).limit(5);

    // Calculate notice period served
    const today = moment();
    const noticePeriodStart = moment(resignation.submittedAt);
    const noticePeriodServed = today.diff(noticePeriodStart, 'days');
    const noticePeriodRemaining = Math.max(0, resignation.noticePeriodDays - noticePeriodServed);

    res.json({
      success: true,
      data: {
        resignation,
        employee,
        leaveBalance,
        assets: assets || [],
        previousResignations,
        noticePeriodServed,
        noticePeriodRemaining
      }
    });
  } catch (error) {
    console.error('Error fetching resignation for review:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// Approve resignation
export const approveResignation = async (req, res) => {
  try {
    const { comments } = req.body;
    const resignation = await Resignation.findById(req.params.id);
    
    if (!resignation) {
      return res.status(404).json({ success: false, message: 'Resignation not found' });
    }

    if (resignation.status !== 'pending' && resignation.status !== 'clarification_requested') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve resignation with status: ${resignation.status}`
      });
    }

    // Update resignation
    resignation.status = 'approved';
    resignation.approvedBy = req.user._id;
    resignation.approvedAt = new Date();
    resignation.auditLog.push({
      action: 'approved',
      performedBy: req.user._id,
      performedAt: new Date(),
      comments: comments || 'Resignation approved',
      previousStatus: resignation.status,
      newStatus: 'approved'
    });

    await resignation.save();

    // Update exit steps
    resignation.exitSteps.approval.status = 'completed';
    resignation.exitSteps.approval.completedAt = new Date();
    await resignation.save();

    // Generate exit checklist
    await generateExitChecklist(resignation);

    const populated = await Resignation.findById(resignation._id)
      .populate('employee', 'firstName lastName email')
      .populate('approvedBy', 'email');

    // TODO: Send notification to employee
    console.log(`[NOTIFICATION] Resignation approved for ${populated.employee.email}`);

    // TODO: Notify relevant departments about checklist items
    const checklist = await ExitChecklist.findOne({ resignation: resignation._id });
    if (checklist) {
      console.log(`[NOTIFICATION] Exit checklist generated with ${checklist.items.length} items`);
    }

    res.json({
      success: true,
      message: 'Resignation approved and exit checklist generated',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject resignation
export const rejectResignation = async (req, res) => {
  try {
    const { comments } = req.body;
    
    if (!comments || !comments.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is mandatory'
      });
    }

    const resignation = await Resignation.findById(req.params.id);
    
    if (!resignation) {
      return res.status(404).json({ success: false, message: 'Resignation not found' });
    }

    if (resignation.status !== 'pending' && resignation.status !== 'clarification_requested') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject resignation with status: ${resignation.status}`
      });
    }

    // Update resignation
    resignation.status = 'rejected';
    resignation.rejectionReason = comments;
    resignation.auditLog.push({
      action: 'rejected',
      performedBy: req.user._id,
      performedAt: new Date(),
      comments: comments,
      previousStatus: resignation.status,
      newStatus: 'rejected'
    });

    // Update employee status back to active
    const employee = await Employee.findById(resignation.employee);
    if (employee) {
      employee.status = 'active';
      employee.noticePeriodEndDate = null;
      await employee.save();
    }

    await resignation.save();

    const populated = await Resignation.findById(resignation._id)
      .populate('employee', 'firstName lastName email');

    // TODO: Send notification to employee
    console.log(`[NOTIFICATION] Resignation rejected for ${populated.employee.email}. Reason: ${comments}`);

    res.json({
      success: true,
      message: 'Resignation rejected',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Request clarification
export const requestClarification = async (req, res) => {
  try {
    const { clarificationRequest } = req.body;
    
    if (!clarificationRequest || !clarificationRequest.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Clarification request is required'
      });
    }

    const resignation = await Resignation.findById(req.params.id);
    
    if (!resignation) {
      return res.status(404).json({ success: false, message: 'Resignation not found' });
    }

    if (resignation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot request clarification for resignation with status: ${resignation.status}`
      });
    }

    resignation.clarificationRequested = true;
    resignation.clarificationRequest = clarificationRequest;
    resignation.clarificationRequestedBy = req.user._id;
    resignation.clarificationRequestedAt = new Date();
    resignation.auditLog.push({
      action: 'clarification_requested',
      performedBy: req.user._id,
      performedAt: new Date(),
      comments: clarificationRequest,
      previousStatus: resignation.status,
      newStatus: resignation.status
    });

    await resignation.save();

    const populated = await Resignation.findById(resignation._id)
      .populate('employee', 'firstName lastName email');

    // TODO: Send notification to employee
    console.log(`[NOTIFICATION] Clarification requested from ${populated.employee.email}`);

    res.json({
      success: true,
      message: 'Clarification requested',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Employee responds to clarification
export const respondToClarification = async (req, res) => {
  try {
    const { clarificationResponse } = req.body;
    const employee = await Employee.findOne({ userId: req.user._id });
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const resignation = await Resignation.findById(req.params.id);
    
    if (!resignation) {
      return res.status(404).json({ success: false, message: 'Resignation not found' });
    }

    if (resignation.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!resignation.clarificationRequested) {
      return res.status(400).json({
        success: false,
        message: 'No clarification request found'
      });
    }

    resignation.clarificationResponse = clarificationResponse || '';
    resignation.clarificationRespondedAt = new Date();
    resignation.status = 'pending'; // Reset to pending for re-review
    resignation.auditLog.push({
      action: 'clarification_responded',
      performedBy: req.user._id,
      performedAt: new Date(),
      comments: clarificationResponse,
      previousStatus: resignation.status,
      newStatus: 'pending'
    });

    await resignation.save();

    // TODO: Send notification to HR
    console.log(`[NOTIFICATION] Clarification response received from employee`);

    res.json({
      success: true,
      message: 'Clarification response submitted',
      data: resignation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate exit checklist based on template
const generateExitChecklist = async (resignation) => {
  try {
    const employee = await Employee.findById(resignation.employee)
      .populate('department', 'name')
      .populate('designation', 'name');

    if (!employee) return;

    // Find applicable template
    let template = await ExitChecklistTemplate.findOne({
      isDefault: true,
      isActive: true
    });

    // Try to find department/designation specific template
    if (employee.department || employee.designation) {
      const specificTemplate = await ExitChecklistTemplate.findOne({
        isActive: true,
        $or: [
          { 'applicableTo.departments': employee.department?._id },
          { 'applicableTo.designations': employee.designation?._id }
        ]
      });
      if (specificTemplate) {
        template = specificTemplate;
      }
    }

    if (!template) {
      // Create default checklist if no template found
      template = await createDefaultTemplate();
    }

    // Get assets
    const assets = await Asset.find({
      assignedTo: employee._id,
      status: { $in: ['assigned', 'in_use'] }
    });

    // Build checklist items from template
    const checklistItems = [];

    for (const templateItem of template.items) {
      let shouldInclude = true;

      // Check conditions
      if (templateItem.conditions.requiresAssets && assets.length === 0) {
        shouldInclude = false;
      }

      if (templateItem.conditions.departmentSpecific && templateItem.conditions.departmentSpecific.length > 0) {
        if (!employee.department || !templateItem.conditions.departmentSpecific.includes(employee.department._id)) {
          shouldInclude = false;
        }
      }

      if (templateItem.conditions.designationSpecific && templateItem.conditions.designationSpecific.length > 0) {
        if (!employee.designation || !templateItem.conditions.designationSpecific.includes(employee.designation._id)) {
          shouldInclude = false;
        }
      }

      if (shouldInclude) {
        checklistItems.push({
          title: templateItem.title,
          description: templateItem.description,
          category: templateItem.category,
          responsibleDepartment: templateItem.responsibleDepartment,
          isMandatory: templateItem.isMandatory,
          status: 'pending',
          sortOrder: templateItem.sortOrder || 0
        });
      }
    }

    // Add asset return items if assets exist
    if (assets.length > 0) {
      assets.forEach(asset => {
        checklistItems.push({
          title: `Return Asset: ${asset.name || asset.assetId}`,
          description: `Return assigned asset: ${asset.name || asset.assetId}`,
          category: 'asset_return',
          responsibleDepartment: 'admin',
          isMandatory: true,
          status: 'pending'
        });
      });
    }

    // Create exit checklist
    const exitChecklist = await ExitChecklist.create({
      resignation: resignation._id,
      employee: employee._id,
      items: checklistItems,
      status: 'pending',
      generatedAt: new Date(),
      generatedBy: resignation.approvedBy
    });

    return exitChecklist;
  } catch (error) {
    console.error('Error generating exit checklist:', error);
    throw error;
  }
};

// Create default template if none exists
const createDefaultTemplate = async () => {
  const defaultItems = [
    {
      title: 'Return ID Card',
      description: 'Return company ID card to HR',
      category: 'id_card_return',
      responsibleDepartment: 'hr',
      isMandatory: true,
      sortOrder: 1
    },
    {
      title: 'IT Account Deactivation',
      description: 'Deactivate all IT accounts and access',
      category: 'it_deactivation',
      responsibleDepartment: 'it',
      isMandatory: true,
      sortOrder: 2
    },
    {
      title: 'Finance Clearance',
      description: 'Complete finance clearance and final settlement',
      category: 'finance_clearance',
      responsibleDepartment: 'finance',
      isMandatory: true,
      sortOrder: 3
    },
    {
      title: 'Final Attendance Approval',
      description: 'Approve final attendance and timesheet',
      category: 'attendance_approval',
      responsibleDepartment: 'hr',
      isMandatory: true,
      sortOrder: 4
    },
    {
      title: 'Knowledge Transfer',
      description: 'Complete knowledge transfer to team members',
      category: 'knowledge_transfer',
      responsibleDepartment: 'manager',
      isMandatory: false,
      sortOrder: 5
    }
  ];

  const template = await ExitChecklistTemplate.create({
    name: 'Default Exit Checklist',
    description: 'Default checklist for all employees',
    isDefault: true,
    isActive: true,
    items: defaultItems
  });

  return template;
};

