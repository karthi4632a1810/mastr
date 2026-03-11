import PrivilegeCategory from '../models/privilegeCategory.model.js';
import PrivilegeCommittee from '../models/privilegeCommittee.model.js';
import PrivilegeRequest from '../models/privilegeRequest.model.js';
import DoctorPrivilege from '../models/doctorPrivilege.model.js';
import Employee from '../models/employee.model.js';
import mongoose from 'mongoose';
import moment from 'moment';

// ===== PRIVILEGE CATEGORIES =====

export const getPrivilegeCategories = async (req, res) => {
  try {
    const { categoryType, isActive = 'true', search } = req.query;
    const filter = {};
    
    if (isActive === 'true') filter.isActive = true;
    if (categoryType) filter.categoryType = categoryType;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const categories = await PrivilegeCategory.find(filter)
      .populate('requirements.requiredTraining', 'name code')
      .populate('createdBy', 'email')
      .sort({ name: 1 });
    
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPrivilegeCategory = async (req, res) => {
  try {
    const category = await PrivilegeCategory.findById(req.params.id)
      .populate('requirements.requiredTraining', 'name code')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Privilege category not found' });
    }
    
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPrivilegeCategory = async (req, res) => {
  try {
    const existing = await PrivilegeCategory.findOne({ 
      $or: [{ name: req.body.name }, { code: req.body.code }] 
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Privilege category name or code already exists' });
    }
    
    const category = await PrivilegeCategory.create({
      ...req.body,
      createdBy: req.user._id
    });
    
    const populated = await PrivilegeCategory.findById(category._id)
      .populate('createdBy', 'email');
    
    res.status(201).json({ success: true, message: 'Privilege category created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePrivilegeCategory = async (req, res) => {
  try {
    const category = await PrivilegeCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Privilege category not found' });
    }
    
    if (req.body.name || req.body.code) {
      const existing = await PrivilegeCategory.findOne({
        _id: { $ne: req.params.id },
        $or: [{ name: req.body.name }, { code: req.body.code }]
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Privilege category name or code already exists' });
      }
    }
    
    Object.assign(category, req.body);
    category.updatedBy = req.user._id;
    await category.save();
    
    const populated = await PrivilegeCategory.findById(category._id)
      .populate('updatedBy', 'email');
    
    res.json({ success: true, message: 'Privilege category updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== PRIVILEGE COMMITTEES =====

export const getPrivilegeCommittees = async (req, res) => {
  try {
    const { isActive = 'true' } = req.query;
    const filter = {};
    
    if (isActive === 'true') filter.isActive = true;
    
    const committees = await PrivilegeCommittee.find(filter)
      .populate('members.employee', 'firstName lastName employeeId designation')
      .populate('createdBy', 'email')
      .sort({ name: 1 });
    
    res.json({ success: true, data: committees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPrivilegeCommittee = async (req, res) => {
  try {
    const committee = await PrivilegeCommittee.findById(req.params.id)
      .populate('members.employee', 'firstName lastName employeeId designation')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');
    
    if (!committee) {
      return res.status(404).json({ success: false, message: 'Privilege committee not found' });
    }
    
    res.json({ success: true, data: committee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPrivilegeCommittee = async (req, res) => {
  try {
    const committee = await PrivilegeCommittee.create({
      ...req.body,
      createdBy: req.user._id
    });
    
    const populated = await PrivilegeCommittee.findById(committee._id)
      .populate('members.employee', 'firstName lastName employeeId')
      .populate('createdBy', 'email');
    
    res.status(201).json({ success: true, message: 'Privilege committee created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePrivilegeCommittee = async (req, res) => {
  try {
    const committee = await PrivilegeCommittee.findById(req.params.id);
    if (!committee) {
      return res.status(404).json({ success: false, message: 'Privilege committee not found' });
    }
    
    Object.assign(committee, req.body);
    committee.updatedBy = req.user._id;
    await committee.save();
    
    const populated = await PrivilegeCommittee.findById(committee._id)
      .populate('members.employee', 'firstName lastName employeeId');
    
    res.json({ success: true, message: 'Privilege committee updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== PRIVILEGE REQUESTS =====

export const getPrivilegeRequests = async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const filter = {};
    
    // Role-based filtering
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
      else return res.json({ success: true, data: [] });
    } else if (employeeId) {
      filter.employee = employeeId;
    }
    
    if (status) filter.status = status;
    
    const requests = await PrivilegeRequest.find(filter)
      .populate('employee', 'firstName lastName employeeId department designation')
      .populate('requestedPrivileges.privilegeCategory', 'name code categoryType')
      .populate('reviewedByHod.reviewer', 'email')
      .populate('reviewedByCommittee.committee', 'name')
      .populate('reviewedByMedicalSuperintendent.reviewer', 'email')
      .populate('finalDecision.decidedBy', 'email')
      .sort({ applicationDate: -1 });
    
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPrivilegeRequest = async (req, res) => {
  try {
    const request = await PrivilegeRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department designation')
      .populate('requestedPrivileges.privilegeCategory', 'name code categoryType requirements')
      .populate('relevantTraining.trainingProgram', 'name code')
      .populate('reviewedByHod.reviewer', 'email')
      .populate('reviewedByCommittee.committee', 'name')
      .populate('reviewedByCommittee.recommendations.privilegeCategory', 'name code')
      .populate('reviewedByMedicalSuperintendent.reviewer', 'email')
      .populate('finalDecision.decidedBy', 'email')
      .populate('finalDecision.approvedPrivileges.privilegeCategory', 'name code')
      .populate('finalDecision.rejectedPrivileges.privilegeCategory', 'name code')
      .populate('createdBy', 'email');
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Privilege request not found' });
    }
    
    // Check access for employees
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee || employee._id.toString() !== request.employee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    
    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPrivilegeRequest = async (req, res) => {
  try {
    const { employeeId, ...otherData } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    const request = await PrivilegeRequest.create({
      employee: employeeId,
      ...otherData,
      createdBy: req.user._id
    });
    
    const populated = await PrivilegeRequest.findById(request._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('requestedPrivileges.privilegeCategory', 'name code');
    
    res.status(201).json({ success: true, message: 'Privilege request created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reviewByHod = async (req, res) => {
  try {
    const { decision, comments } = req.body;
    const request = await PrivilegeRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Privilege request not found' });
    }
    
    if (request.status !== 'submitted' && request.status !== 'under_review') {
      return res.status(400).json({ success: false, message: 'Request is not in a state for HOD review' });
    }
    
    request.reviewedByHod = {
      reviewer: req.user._id,
      reviewedAt: new Date(),
      comments: comments || '',
      decision: decision
    };
    
    if (decision === 'approved') {
      request.status = 'hod_approved';
    } else if (decision === 'rejected') {
      request.status = 'rejected';
      request.finalDecision = {
        decision: 'rejected',
        decisionDate: new Date(),
        decidedBy: req.user._id,
        rejectionReason: comments || ''
      };
    } else {
      request.status = 'under_review';
    }
    
    request.updatedBy = req.user._id;
    await request.save();
    
    const populated = await PrivilegeRequest.findById(request._id)
      .populate('reviewedByHod.reviewer', 'email');
    
    res.json({ success: true, message: 'HOD review completed', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reviewByCommittee = async (req, res) => {
  try {
    const { committeeId, meetingDate, comments, decision, recommendations } = req.body;
    const request = await PrivilegeRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Privilege request not found' });
    }
    
    if (request.status !== 'hod_approved') {
      return res.status(400).json({ success: false, message: 'Request must be HOD approved before committee review' });
    }
    
    request.reviewedByCommittee = {
      committee: committeeId,
      meetingDate: meetingDate ? new Date(meetingDate) : new Date(),
      reviewedAt: new Date(),
      comments: comments || '',
      decision: decision,
      recommendations: recommendations || []
    };
    
    if (decision === 'approved') {
      request.status = 'committee_review';
    } else if (decision === 'rejected') {
      request.status = 'rejected';
      request.finalDecision = {
        decision: 'rejected',
        decisionDate: new Date(),
        decidedBy: req.user._id,
        rejectionReason: comments || ''
      };
    } else {
      request.status = 'committee_review';
    }
    
    request.updatedBy = req.user._id;
    await request.save();
    
    const populated = await PrivilegeRequest.findById(request._id)
      .populate('reviewedByCommittee.committee', 'name');
    
    res.json({ success: true, message: 'Committee review completed', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reviewByMedicalSuperintendent = async (req, res) => {
  try {
    const { decision, comments, approvedPrivileges, rejectedPrivileges } = req.body;
    const request = await PrivilegeRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Privilege request not found' });
    }
    
    if (request.status !== 'committee_review') {
      return res.status(400).json({ success: false, message: 'Request must be committee reviewed first' });
    }
    
    request.reviewedByMedicalSuperintendent = {
      reviewer: req.user._id,
      reviewedAt: new Date(),
      comments: comments || '',
      decision: decision
    };
    
    if (decision === 'approved') {
      request.status = 'medical_superintendent_approved';
      request.finalDecision = {
        decision: approvedPrivileges && rejectedPrivileges?.length > 0 ? 'partially_approved' : 'approved',
        approvedPrivileges: approvedPrivileges || [],
        rejectedPrivileges: rejectedPrivileges || [],
        decisionDate: new Date(),
        decidedBy: req.user._id
      };
      request.status = 'approved';
    } else if (decision === 'rejected') {
      request.status = 'rejected';
      request.finalDecision = {
        decision: 'rejected',
        decisionDate: new Date(),
        decidedBy: req.user._id,
        rejectionReason: comments || ''
      };
    }
    
    request.updatedBy = req.user._id;
    await request.save();
    
    // Create DoctorPrivilege records for approved privileges
    if (decision === 'approved' && approvedPrivileges) {
      for (const approved of approvedPrivileges) {
        const category = await PrivilegeCategory.findById(approved.privilegeCategory);
        if (category) {
          await DoctorPrivilege.create({
            employee: request.employee,
            privilegeCategory: approved.privilegeCategory,
            privilegeRequest: request._id,
            restrictions: approved.restrictions || '',
            conditions: approved.conditions || '',
            validityPeriod: category.defaultValidityPeriod || 36,
            renewalRequired: category.renewalRequired !== false,
            grantedBy: req.user._id,
            createdBy: req.user._id
          });
        }
      }
    }
    
    const populated = await PrivilegeRequest.findById(request._id)
      .populate('reviewedByMedicalSuperintendent.reviewer', 'email')
      .populate('finalDecision.decidedBy', 'email');
    
    res.json({ success: true, message: 'Medical Superintendent review completed', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== DOCTOR PRIVILEGES =====

export const getDoctorPrivileges = async (req, res) => {
  try {
    const { employeeId, status, isExpired, renewalRequired } = req.query;
    const filter = {};
    
    // Role-based filtering
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
      else return res.json({ success: true, data: [] });
    } else if (employeeId) {
      filter.employee = employeeId;
    }
    
    if (status) filter.status = status;
    if (isExpired === 'true') filter.isExpired = true;
    if (renewalRequired === 'true') filter.renewalRequired = true;
    
    const privileges = await DoctorPrivilege.find(filter)
      .populate('employee', 'firstName lastName employeeId department designation')
      .populate('privilegeCategory', 'name code categoryType')
      .populate('grantedBy', 'email')
      .sort({ validFrom: -1 });
    
    res.json({ success: true, data: privileges });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDoctorPrivilege = async (req, res) => {
  try {
    const privilege = await DoctorPrivilege.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('privilegeCategory', 'name code categoryType')
      .populate('privilegeRequest', 'applicationDate')
      .populate('grantedBy', 'email')
      .populate('renewalHistory.renewedBy', 'email')
      .populate('suspension.suspendedBy', 'email')
      .populate('suspension.liftedBy', 'email')
      .populate('revocation.revokedBy', 'email');
    
    if (!privilege) {
      return res.status(404).json({ success: false, message: 'Doctor privilege not found' });
    }
    
    res.json({ success: true, data: privilege });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const suspendPrivilege = async (req, res) => {
  try {
    const { suspendedFrom, suspendedTo, reason } = req.body;
    const privilege = await DoctorPrivilege.findById(req.params.id);
    
    if (!privilege) {
      return res.status(404).json({ success: false, message: 'Doctor privilege not found' });
    }
    
    privilege.suspension = {
      suspended: true,
      suspendedFrom: suspendedFrom ? new Date(suspendedFrom) : new Date(),
      suspendedTo: suspendedTo ? new Date(suspendedTo) : null,
      suspendedAt: new Date(),
      suspendedBy: req.user._id,
      reason: reason || ''
    };
    privilege.status = 'suspended';
    privilege.updatedBy = req.user._id;
    
    await privilege.save();
    
    const populated = await DoctorPrivilege.findById(privilege._id)
      .populate('suspension.suspendedBy', 'email');
    
    res.json({ success: true, message: 'Privilege suspended', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const liftSuspension = async (req, res) => {
  try {
    const privilege = await DoctorPrivilege.findById(req.params.id);
    
    if (!privilege) {
      return res.status(404).json({ success: false, message: 'Doctor privilege not found' });
    }
    
    if (!privilege.suspension.suspended) {
      return res.status(400).json({ success: false, message: 'Privilege is not suspended' });
    }
    
    privilege.suspension.liftedAt = new Date();
    privilege.suspension.liftedBy = req.user._id;
    privilege.suspension.suspended = false;
    privilege.status = 'active';
    privilege.updatedBy = req.user._id;
    
    await privilege.save();
    
    res.json({ success: true, message: 'Suspension lifted', data: privilege });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const revokePrivilege = async (req, res) => {
  try {
    const { reason } = req.body;
    const privilege = await DoctorPrivilege.findById(req.params.id);
    
    if (!privilege) {
      return res.status(404).json({ success: false, message: 'Doctor privilege not found' });
    }
    
    privilege.revocation = {
      revoked: true,
      revokedAt: new Date(),
      revokedBy: req.user._id,
      reason: reason || ''
    };
    privilege.status = 'revoked';
    privilege.updatedBy = req.user._id;
    
    await privilege.save();
    
    const populated = await DoctorPrivilege.findById(privilege._id)
      .populate('revocation.revokedBy', 'email');
    
    res.json({ success: true, message: 'Privilege revoked', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpiringPrivileges = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const thresholdDate = moment().add(parseInt(days), 'days').toDate();
    
    const privileges = await DoctorPrivilege.find({
      validTo: { $lte: thresholdDate, $gte: new Date() },
      isExpired: false,
      status: 'active'
    })
      .populate('employee', 'firstName lastName employeeId email')
      .populate('privilegeCategory', 'name code')
      .sort({ validTo: 1 });
    
    res.json({ success: true, data: privileges });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== DASHBOARD =====

export const getPrivilegingDashboard = async (req, res) => {
  try {
    const { departmentId } = req.query;
    
    // Build employee filter - filter by user role
    const employeeFilter = {};
    if (req.user.role === 'employee') {
      // Employee can only see their own data
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee) {
        return res.json({
          success: true,
          data: {
            statistics: {
              totalPrivileges: 0,
              activePrivileges: 0,
              expiredPrivileges: 0,
              suspendedPrivileges: 0,
              dueForRenewal: 0,
              pendingRequests: 0
            }
          }
        });
      }
      employeeFilter._id = employee._id;
    } else {
      // Admin/HR can see all or filtered by department
      if (departmentId) {
        employeeFilter.department = departmentId;
      }
    }
    
    const employees = await Employee.find(employeeFilter).select('_id');
    const employeeIds = employees.map(emp => emp._id);
    
    // Statistics
    const totalPrivileges = await DoctorPrivilege.countDocuments({ employee: { $in: employeeIds } });
    const activePrivileges = await DoctorPrivilege.countDocuments({ 
      employee: { $in: employeeIds },
      status: 'active' 
    });
    const expiredPrivileges = await DoctorPrivilege.countDocuments({ 
      employee: { $in: employeeIds },
      isExpired: true 
    });
    const suspendedPrivileges = await DoctorPrivilege.countDocuments({ 
      employee: { $in: employeeIds },
      status: 'suspended' 
    });
    const dueForRenewal = await DoctorPrivilege.countDocuments({
      employee: { $in: employeeIds },
      renewalRequired: true,
      renewalDueDate: { $lte: moment().add(90, 'days').toDate(), $gte: new Date() },
      isExpired: false,
      status: 'active'
    });
    
    // Pending requests
    const pendingRequests = await PrivilegeRequest.countDocuments({ 
      employee: { $in: employeeIds },
      status: { $in: ['submitted', 'under_review', 'hod_approved', 'committee_review'] }
    });
    
    res.json({
      success: true,
      data: {
        statistics: {
          totalPrivileges,
          activePrivileges,
          expiredPrivileges,
          suspendedPrivileges,
          dueForRenewal,
          pendingRequests
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

