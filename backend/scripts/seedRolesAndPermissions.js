import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Permission from '../models/permission.model.js';
import Role from '../models/role.model.js';

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Define all permissions
const permissions = [
  // Employee permissions
  { name: 'Create Employee', code: 'EMP_CREATE', module: 'employees', action: 'create' },
  { name: 'Read Employee', code: 'EMP_READ', module: 'employees', action: 'read' },
  { name: 'Update Employee', code: 'EMP_UPDATE', module: 'employees', action: 'update' },
  { name: 'Delete Employee', code: 'EMP_DELETE', module: 'employees', action: 'delete' },
  { name: 'Import Employees', code: 'EMP_IMPORT', module: 'employees', action: 'import' },
  { name: 'Export Employees', code: 'EMP_EXPORT', module: 'employees', action: 'export' },

  // Attendance permissions
  { name: 'Create Attendance', code: 'ATT_CREATE', module: 'attendance', action: 'create' },
  { name: 'Read Attendance', code: 'ATT_READ', module: 'attendance', action: 'read' },
  { name: 'Update Attendance', code: 'ATT_UPDATE', module: 'attendance', action: 'update' },
  { name: 'Manage Attendance', code: 'ATT_MANAGE', module: 'attendance', action: 'manage' },
  { name: 'Export Attendance', code: 'ATT_EXPORT', module: 'attendance', action: 'export' },

  // Leave permissions
  { name: 'Create Leave Request', code: 'LEAVE_CREATE', module: 'leave', action: 'create' },
  { name: 'Read Leave Request', code: 'LEAVE_READ', module: 'leave', action: 'read' },
  { name: 'Approve Leave', code: 'LEAVE_APPROVE', module: 'leave', action: 'approve' },
  { name: 'Reject Leave', code: 'LEAVE_REJECT', module: 'leave', action: 'reject' },
  { name: 'Manage Leave Types', code: 'LEAVE_MANAGE', module: 'leave', action: 'manage' },

  // Payroll permissions
  { name: 'Create Payroll', code: 'PAY_CREATE', module: 'payroll', action: 'create' },
  { name: 'Read Payroll', code: 'PAY_READ', module: 'payroll', action: 'read' },
  { name: 'Update Payroll', code: 'PAY_UPDATE', module: 'payroll', action: 'update' },
  { name: 'Process Payroll', code: 'PAY_PROCESS', module: 'payroll', action: 'manage' },
  { name: 'Export Payroll', code: 'PAY_EXPORT', module: 'payroll', action: 'export' },

  // Recruitment permissions
  { name: 'Create Job Opening', code: 'REC_CREATE', module: 'recruitment', action: 'create' },
  { name: 'Read Recruitment', code: 'REC_READ', module: 'recruitment', action: 'read' },
  { name: 'Update Candidate Stage', code: 'REC_UPDATE', module: 'recruitment', action: 'update' },
  { name: 'Manage Recruitment', code: 'REC_MANAGE', module: 'recruitment', action: 'manage' },

  // Onboarding permissions
  { name: 'Create Onboarding', code: 'ONB_CREATE', module: 'onboarding', action: 'create' },
  { name: 'Read Onboarding', code: 'ONB_READ', module: 'onboarding', action: 'read' },
  { name: 'Update Onboarding', code: 'ONB_UPDATE', module: 'onboarding', action: 'update' },
  { name: 'Manage Onboarding', code: 'ONB_MANAGE', module: 'onboarding', action: 'manage' },

  // Asset permissions
  { name: 'Create Asset', code: 'AST_CREATE', module: 'assets', action: 'create' },
  { name: 'Read Asset', code: 'AST_READ', module: 'assets', action: 'read' },
  { name: 'Update Asset', code: 'AST_UPDATE', module: 'assets', action: 'update' },
  { name: 'Manage Assets', code: 'AST_MANAGE', module: 'assets', action: 'manage' },

  // Expense permissions
  { name: 'Create Expense', code: 'EXP_CREATE', module: 'expenses', action: 'create' },
  { name: 'Read Expense', code: 'EXP_READ', module: 'expenses', action: 'read' },
  { name: 'Approve Expense', code: 'EXP_APPROVE', module: 'expenses', action: 'approve' },
  { name: 'Reject Expense', code: 'EXP_REJECT', module: 'expenses', action: 'reject' },

  // Grievance permissions
  { name: 'Create Grievance', code: 'GRV_CREATE', module: 'grievances', action: 'create' },
  { name: 'Read Grievance', code: 'GRV_READ', module: 'grievances', action: 'read' },
  { name: 'Update Grievance Status', code: 'GRV_UPDATE', module: 'grievances', action: 'update' },

  // Department permissions
  { name: 'Create Department', code: 'DEPT_CREATE', module: 'departments', action: 'create' },
  { name: 'Read Department', code: 'DEPT_READ', module: 'departments', action: 'read' },
  { name: 'Update Department', code: 'DEPT_UPDATE', module: 'departments', action: 'update' },
  { name: 'Delete Department', code: 'DEPT_DELETE', module: 'departments', action: 'delete' },

  // Designation permissions
  { name: 'Create Designation', code: 'DESG_CREATE', module: 'designations', action: 'create' },
  { name: 'Read Designation', code: 'DESG_READ', module: 'designations', action: 'read' },
  { name: 'Update Designation', code: 'DESG_UPDATE', module: 'designations', action: 'update' },
  { name: 'Delete Designation', code: 'DESG_DELETE', module: 'designations', action: 'delete' },

  // Branch permissions
  { name: 'Create Branch', code: 'BRANCH_CREATE', module: 'branches', action: 'create' },
  { name: 'Read Branch', code: 'BRANCH_READ', module: 'branches', action: 'read' },
  { name: 'Update Branch', code: 'BRANCH_UPDATE', module: 'branches', action: 'update' },
  { name: 'Delete Branch', code: 'BRANCH_DELETE', module: 'branches', action: 'delete' },

  // Shift permissions
  { name: 'Create Shift', code: 'SHIFT_CREATE', module: 'shifts', action: 'create' },
  { name: 'Read Shift', code: 'SHIFT_READ', module: 'shifts', action: 'read' },
  { name: 'Update Shift', code: 'SHIFT_UPDATE', module: 'shifts', action: 'update' },
  { name: 'Delete Shift', code: 'SHIFT_DELETE', module: 'shifts', action: 'delete' },

  // Settings permissions
  { name: 'Manage Settings', code: 'SETT_MANAGE', module: 'settings', action: 'manage' },

  // Audit permissions
  { name: 'Read Audit Log', code: 'AUDIT_READ', module: 'audit', action: 'read' },

  // Analytics permissions
  { name: 'Read Analytics', code: 'ANAL_READ', module: 'analytics', action: 'read' },

  // Document permissions
  { name: 'Create Document', code: 'DOC_CREATE', module: 'documents', action: 'create' },
  { name: 'Read Document', code: 'DOC_READ', module: 'documents', action: 'read' },
  { name: 'Delete Document', code: 'DOC_DELETE', module: 'documents', action: 'delete' },

  // Role & Permission permissions
  { name: 'Manage Roles', code: 'ROLE_MANAGE', module: 'settings', action: 'manage' },
  { name: 'Manage Permissions', code: 'PERM_MANAGE', module: 'settings', action: 'manage' },

  // Company permissions
  { name: 'Create Company', code: 'COMP_CREATE', module: 'company', action: 'create' },
  { name: 'Read Company', code: 'COMP_READ', module: 'company', action: 'read' },
  { name: 'Update Company', code: 'COMP_UPDATE', module: 'company', action: 'update' },
  { name: 'Delete Company', code: 'COMP_DELETE', module: 'company', action: 'delete' },

  // Camera permissions
  { name: 'Create Camera', code: 'CAM_CREATE', module: 'cameras', action: 'create' },
  { name: 'Read Camera', code: 'CAM_READ', module: 'cameras', action: 'read' },
  { name: 'Update Camera', code: 'CAM_UPDATE', module: 'cameras', action: 'update' },
  { name: 'Delete Camera', code: 'CAM_DELETE', module: 'cameras', action: 'delete' },
  { name: 'Manage Camera', code: 'CAM_MANAGE', module: 'cameras', action: 'manage' },

  // Camera Assignment permissions
  { name: 'Create Camera Assignment', code: 'CAM_ASSIGN_CREATE', module: 'cameraAssignments', action: 'create' },
  { name: 'Read Camera Assignment', code: 'CAM_ASSIGN_READ', module: 'cameraAssignments', action: 'read' },
  { name: 'Update Camera Assignment', code: 'CAM_ASSIGN_UPDATE', module: 'cameraAssignments', action: 'update' },
  { name: 'Delete Camera Assignment', code: 'CAM_ASSIGN_DELETE', module: 'cameraAssignments', action: 'delete' },

  // Camera Monitoring permissions
  { name: 'View Monitoring', code: 'CAM_MON_READ', module: 'cameraMonitoring', action: 'read' },
  { name: 'Start Monitoring', code: 'CAM_MON_START', module: 'cameraMonitoring', action: 'manage' },
  { name: 'Stop Monitoring', code: 'CAM_MON_STOP', module: 'cameraMonitoring', action: 'manage' },

  // GeoFence permissions
  { name: 'Create GeoFence', code: 'GEOF_CREATE', module: 'geoFences', action: 'create' },
  { name: 'Read GeoFence', code: 'GEOF_READ', module: 'geoFences', action: 'read' },
  { name: 'Update GeoFence', code: 'GEOF_UPDATE', module: 'geoFences', action: 'update' },
  { name: 'Delete GeoFence', code: 'GEOF_DELETE', module: 'geoFences', action: 'delete' },
  { name: 'Review Violations', code: 'GEOF_VIOL_REVIEW', module: 'geoFences', action: 'update' },

  // Attendance Mode Config permissions
  { name: 'Create Attendance Mode Config', code: 'ATT_MODE_CREATE', module: 'attendanceModeConfig', action: 'create' },
  { name: 'Read Attendance Mode Config', code: 'ATT_MODE_READ', module: 'attendanceModeConfig', action: 'read' },
  { name: 'Update Attendance Mode Config', code: 'ATT_MODE_UPDATE', module: 'attendanceModeConfig', action: 'update' },
  { name: 'Delete Attendance Mode Config', code: 'ATT_MODE_DELETE', module: 'attendanceModeConfig', action: 'delete' },

  // Shift Assignment permissions
  { name: 'Assign Shifts', code: 'SHIFT_ASSIGN_CREATE', module: 'shiftAssignments', action: 'create' },
  { name: 'Read Roster', code: 'SHIFT_ASSIGN_READ', module: 'shiftAssignments', action: 'read' },
  { name: 'Publish Roster', code: 'SHIFT_ASSIGN_PUBLISH', module: 'shiftAssignments', action: 'update' },
  { name: 'Manage Shift Groups', code: 'SHIFT_GROUP_MANAGE', module: 'shiftAssignments', action: 'manage' },

  // Shift Change permissions
  { name: 'Create Shift Change Request', code: 'SHIFT_CHG_CREATE', module: 'shiftChanges', action: 'create' },
  { name: 'Read Shift Change Request', code: 'SHIFT_CHG_READ', module: 'shiftChanges', action: 'read' },
  { name: 'Update Shift Change Request', code: 'SHIFT_CHG_UPDATE', module: 'shiftChanges', action: 'update' },
  { name: 'Approve Shift Change Request', code: 'SHIFT_CHG_APPROVE', module: 'shiftChanges', action: 'approve' },

  // Shift Rotation permissions
  { name: 'Create Shift Rotation', code: 'SHIFT_ROT_CREATE', module: 'shiftRotations', action: 'create' },
  { name: 'Read Shift Rotation', code: 'SHIFT_ROT_READ', module: 'shiftRotations', action: 'read' },
  { name: 'Update Shift Rotation', code: 'SHIFT_ROT_UPDATE', module: 'shiftRotations', action: 'update' },
  { name: 'Delete Shift Rotation', code: 'SHIFT_ROT_DELETE', module: 'shiftRotations', action: 'delete' },

  // Performance Cycle permissions
  { name: 'Create Performance Cycle', code: 'PERF_CYCLE_CREATE', module: 'performanceCycles', action: 'create' },
  { name: 'Read Performance Cycle', code: 'PERF_CYCLE_READ', module: 'performanceCycles', action: 'read' },
  { name: 'Update Performance Cycle', code: 'PERF_CYCLE_UPDATE', module: 'performanceCycles', action: 'update' },
  { name: 'Activate Performance Cycle', code: 'PERF_CYCLE_ACTIVATE', module: 'performanceCycles', action: 'manage' },
  { name: 'Freeze Performance Cycle', code: 'PERF_CYCLE_FREEZE', module: 'performanceCycles', action: 'manage' },
  { name: 'Close Performance Cycle', code: 'PERF_CYCLE_CLOSE', module: 'performanceCycles', action: 'manage' },

  // Performance Review permissions
  { name: 'Create Performance Review', code: 'PERF_REV_CREATE', module: 'performanceReviews', action: 'create' },
  { name: 'Read Performance Review', code: 'PERF_REV_READ', module: 'performanceReviews', action: 'read' },
  { name: 'Update Performance Review', code: 'PERF_REV_UPDATE', module: 'performanceReviews', action: 'update' },
  { name: 'Finalize Performance Review', code: 'PERF_REV_FINALIZE', module: 'performanceReviews', action: 'manage' },

  // Goal permissions
  { name: 'Create Goal', code: 'GOAL_CREATE', module: 'goals', action: 'create' },
  { name: 'Read Goal', code: 'GOAL_READ', module: 'goals', action: 'read' },
  { name: 'Update Goal', code: 'GOAL_UPDATE', module: 'goals', action: 'update' },
  { name: 'Approve Goal', code: 'GOAL_APPROVE', module: 'goals', action: 'approve' },
  { name: 'Reject Goal', code: 'GOAL_REJECT', module: 'goals', action: 'reject' },

  // Self Assessment permissions
  { name: 'Create Self Assessment', code: 'SELF_ASSESS_CREATE', module: 'selfAssessments', action: 'create' },
  { name: 'Read Self Assessment', code: 'SELF_ASSESS_READ', module: 'selfAssessments', action: 'read' },
  { name: 'Update Self Assessment', code: 'SELF_ASSESS_UPDATE', module: 'selfAssessments', action: 'update' },
  { name: 'Submit Self Assessment', code: 'SELF_ASSESS_SUBMIT', module: 'selfAssessments', action: 'update' },

  // Resignation permissions
  { name: 'Create Resignation', code: 'RESIGN_CREATE', module: 'resignations', action: 'create' },
  { name: 'Read Resignation', code: 'RESIGN_READ', module: 'resignations', action: 'read' },
  { name: 'Update Resignation', code: 'RESIGN_UPDATE', module: 'resignations', action: 'update' },
  { name: 'Review Resignation', code: 'RESIGN_REVIEW', module: 'resignations', action: 'update' },

  // Final Settlement permissions
  { name: 'Create Final Settlement', code: 'FNF_CREATE', module: 'finalSettlements', action: 'create' },
  { name: 'Read Final Settlement', code: 'FNF_READ', module: 'finalSettlements', action: 'read' },
  { name: 'Update Final Settlement', code: 'FNF_UPDATE', module: 'finalSettlements', action: 'update' },
  { name: 'Verify Final Settlement', code: 'FNF_VERIFY', module: 'finalSettlements', action: 'approve' },
  { name: 'Pay Final Settlement', code: 'FNF_PAY', module: 'finalSettlements', action: 'approve' },

  // Face Attendance Log permissions
  { name: 'Read Face Attendance Log', code: 'FACE_LOG_READ', module: 'faceAttendanceLogs', action: 'read' },
  { name: 'Review Face Attendance Log', code: 'FACE_LOG_REVIEW', module: 'faceAttendanceLogs', action: 'update' },

  // Auto Punch In Config permissions
  { name: 'Read Auto Punch In Config', code: 'AUTO_PUNCH_READ', module: 'autoPunchIn', action: 'read' },
  { name: 'Update Auto Punch In Config', code: 'AUTO_PUNCH_UPDATE', module: 'autoPunchIn', action: 'update' }
];

// Seed permissions
const seedPermissions = async () => {
  try {
    console.log('📝 Seeding permissions...');
    
    for (const perm of permissions) {
      await Permission.findOneAndUpdate(
        { code: perm.code },
        perm,
        { upsert: true, new: true }
      );
    }

    const count = await Permission.countDocuments();
    console.log(`✅ Seeded ${count} permissions`);
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
};

// Seed roles with permissions
const seedRoles = async () => {
  try {
    console.log('📝 Seeding roles...');

    // Get all permissions
    const allPermissions = await Permission.find({ isActive: true });
    const permMap = {};
    allPermissions.forEach(p => {
      permMap[p.code] = p._id;
    });

    // Admin role - all permissions
    const adminPermissions = allPermissions.map(p => p._id);
    await Role.findOneAndUpdate(
      { code: 'ADMIN' },
      {
        name: 'Admin',
        code: 'ADMIN',
        description: 'System administrator with full access',
        permissions: adminPermissions,
        isSystemRole: true,
        isActive: true
      },
      { upsert: true, new: true }
    );

    // HR role - HR-related permissions
    const hrPermissionCodes = [
      'EMP_CREATE', 'EMP_READ', 'EMP_UPDATE', 'EMP_IMPORT', 'EMP_EXPORT',
      'ATT_READ', 'ATT_UPDATE', 'ATT_MANAGE', 'ATT_EXPORT',
      'LEAVE_CREATE', 'LEAVE_READ', 'LEAVE_APPROVE', 'LEAVE_REJECT', 'LEAVE_MANAGE',
      'PAY_READ', 'PAY_EXPORT',
      'REC_CREATE', 'REC_READ', 'REC_UPDATE', 'REC_MANAGE',
      'ONB_CREATE', 'ONB_READ', 'ONB_UPDATE', 'ONB_MANAGE',
      'AST_CREATE', 'AST_READ', 'AST_UPDATE', 'AST_MANAGE',
      'EXP_READ', 'EXP_APPROVE', 'EXP_REJECT',
      'GRV_READ', 'GRV_UPDATE',
      'DEPT_CREATE', 'DEPT_READ', 'DEPT_UPDATE',
      'DESG_CREATE', 'DESG_READ', 'DESG_UPDATE',
      'BRANCH_CREATE', 'BRANCH_READ', 'BRANCH_UPDATE',
      'SHIFT_CREATE', 'SHIFT_READ', 'SHIFT_UPDATE',
      'SHIFT_ASSIGN_CREATE', 'SHIFT_ASSIGN_READ', 'SHIFT_ASSIGN_PUBLISH', 'SHIFT_GROUP_MANAGE',
      'SHIFT_CHG_READ', 'SHIFT_CHG_UPDATE', 'SHIFT_CHG_APPROVE',
      'SHIFT_ROT_CREATE', 'SHIFT_ROT_READ', 'SHIFT_ROT_UPDATE',
      'CAM_CREATE', 'CAM_READ', 'CAM_UPDATE', 'CAM_MANAGE',
      'CAM_ASSIGN_CREATE', 'CAM_ASSIGN_READ', 'CAM_ASSIGN_UPDATE', 'CAM_ASSIGN_DELETE',
      'CAM_MON_READ', 'CAM_MON_START', 'CAM_MON_STOP',
      'GEOF_CREATE', 'GEOF_READ', 'GEOF_UPDATE', 'GEOF_VIOL_REVIEW',
      'FACE_LOG_READ', 'FACE_LOG_REVIEW',
      'PERF_CYCLE_READ',
      'PERF_REV_CREATE', 'PERF_REV_READ', 'PERF_REV_UPDATE', 'PERF_REV_FINALIZE',
      'GOAL_READ', 'GOAL_APPROVE', 'GOAL_REJECT',
      'SELF_ASSESS_READ',
      'RESIGN_READ', 'RESIGN_REVIEW',
      'FNF_CREATE', 'FNF_READ', 'FNF_UPDATE', 'FNF_VERIFY', 'FNF_PAY',
      'DOC_CREATE', 'DOC_READ', 'DOC_DELETE',
      'ANAL_READ',
      'AUTO_PUNCH_READ'
    ];
    const hrPermissions = hrPermissionCodes
      .filter(code => permMap[code])
      .map(code => permMap[code]);
    
    await Role.findOneAndUpdate(
      { code: 'HR' },
      {
        name: 'HR',
        code: 'HR',
        description: 'Human Resources role with HR management permissions',
        permissions: hrPermissions,
        isSystemRole: true,
        isActive: true
      },
      { upsert: true, new: true }
    );

    // Employee role - limited permissions
    const empPermissionCodes = [
      'EMP_READ', // Own profile
      'ATT_READ', 'ATT_CREATE', // Own attendance
      'LEAVE_CREATE', 'LEAVE_READ', // Own leaves
      'PAY_READ', // Own payslip
      'EXP_CREATE', 'EXP_READ', // Own expenses
      'GRV_CREATE', 'GRV_READ', // Own grievances
      'ONB_READ', // Own onboarding
      'DOC_READ', // Own documents
      'SHIFT_CHG_CREATE', 'SHIFT_CHG_READ', // Own shift change requests
      'GEOF_READ', // Own geo fences
      'PERF_REV_READ', // Own performance reviews
      'GOAL_CREATE', 'GOAL_READ', 'GOAL_UPDATE', // Own goals
      'SELF_ASSESS_CREATE', 'SELF_ASSESS_READ', 'SELF_ASSESS_UPDATE', 'SELF_ASSESS_SUBMIT', // Own self assessments
      'RESIGN_CREATE', 'RESIGN_READ', 'RESIGN_UPDATE' // Own resignation
    ];
    const empPermissions = empPermissionCodes
      .filter(code => permMap[code])
      .map(code => permMap[code]);
    
    await Role.findOneAndUpdate(
      { code: 'EMPLOYEE' },
      {
        name: 'Employee',
        code: 'EMPLOYEE',
        description: 'Employee role with limited self-service permissions',
        permissions: empPermissions,
        isSystemRole: true,
        isActive: true
      },
      { upsert: true, new: true }
    );

    const roleCount = await Role.countDocuments();
    console.log(`✅ Seeded ${roleCount} roles`);
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    throw error;
  }
};

// Main seed function
const seed = async () => {
  try {
    await connectDB();
    await seedPermissions();
    await seedRoles();
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seed
seed();

