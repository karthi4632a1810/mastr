import Employee from '../models/employee.model.js';
import User from '../models/user.model.js';
import Department from '../models/department.model.js';
import Designation from '../models/designation.model.js';
import Branch from '../models/branch.model.js';
import Settings from '../models/settings.model.js';
import AuditLog from '../models/auditLog.model.js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { generateFaceDescriptor } from '../services/pythonFaceRecognition.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate unique employee ID
const generateEmployeeId = async () => {
  const prefix = 'EMP';
  const count = await Employee.countDocuments();
  const number = String(count + 1).padStart(6, '0');
  return `${prefix}${number}`;
};

// Get all employees
export const getEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, department, status, designation } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) query.department = department;
    if (status) query.status = status;
    if (designation) query.designation = designation;

    const employees = await Employee.find(query)
      .populate('department', 'name code')
      .populate('designation', 'name code')
      .populate('branch', 'name code')
      .populate('shift', 'name code')
      .populate('reportingManager', 'firstName lastName employeeId')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Employee.countDocuments(query);

    res.json({
      success: true,
      data: employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single employee
export const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('department', 'name code')
      .populate('designation', 'name code')
      .populate('branch', 'name code')
      .populate('shift', 'name code')
      .populate('reportingManager', 'firstName lastName employeeId email')
      .populate('userId', 'email role isActive');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my profile (current user's employee profile)
export const getMyProfile = async (req, res) => {
  try {
    // Try to find employee by userId
    let employee = await Employee.findOne({ userId: req.user._id })
      .populate('department', 'name code')
      .populate('designation', 'name code')
      .populate('branch', 'name code')
      .populate('shift', 'name code')
      .populate('reportingManager', 'firstName lastName employeeId email');

    // If not found by userId, try to find by email (for cases where userId might not match)
    if (!employee && req.user.email) {
      employee = await Employee.findOne({ email: req.user.email })
        .populate('department', 'name code')
        .populate('designation', 'name code')
        .populate('branch', 'name code')
        .populate('shift', 'name code')
        .populate('reportingManager', 'firstName lastName employeeId email');
      
      // If found by email but userId doesn't match, update it
      if (employee && employee.userId?.toString() !== req.user._id.toString()) {
        employee.userId = req.user._id;
        await employee.save();
      }
    }

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create my profile (current user creates their own employee profile)
export const createMyProfile = async (req, res) => {
  try {
    // Check if profile already exists
    const existingEmployee = await Employee.findOne({ userId: req.user._id });
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: 'Employee profile already exists' });
    }

    // Check if email already exists in another employee
    if (req.body.email) {
      const emailExists = await Employee.findOne({ 
        email: req.body.email.toLowerCase().trim(),
        userId: { $ne: req.user._id }
      });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    }

    // Generate employee ID
    const employeeId = await generateEmployeeId();

    // For self-created profiles, department and designation are optional (especially for admin)
    const employeeData = {
      ...req.body,
      employeeId,
      userId: req.user._id,
      email: req.body.email || req.user.email,
      // Department and designation are optional for self-created profiles
      department: req.body.department || null,
      designation: req.body.designation || null,
      branch: req.body.branch || null,
      shift: req.body.shift || null,
      status: req.body.status || 'active',
      joiningDate: req.body.joiningDate || new Date(),
    };

    const employee = await Employee.create(employeeData);

    const populatedEmployee = await Employee.findById(employee._id)
      .populate('department', 'name code')
      .populate('designation', 'name code')
      .populate('branch', 'name code')
      .populate('shift', 'name code');

    res.status(201).json({
      success: true,
      message: 'Employee profile created successfully',
      data: populatedEmployee
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create employee
export const createEmployee = async (req, res) => {
  try {
    const employeeId = await generateEmployeeId();

    // Check if email already exists
    const existingEmployee = await Employee.findOne({ email: req.body.email });
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Create user account if requested
    let userId = req.body.userId;
    if (req.body.createUserAccount && !userId) {
      const requestedRole = (req.body.role || 'employee').toLowerCase();
      const allowedRoles = ['admin', 'hr', 'employee'];
      if (!allowedRoles.includes(requestedRole)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }

      // HR users are not allowed to create admin accounts
      if (req.user?.role !== 'admin' && requestedRole === 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can create admin users' });
      }

      // Determine password strategy
      const passwordOption = req.body.passwordOption || (req.body.password ? 'custom' : 'default');
      let password = req.body.password || 'Temp@123';

      if (passwordOption === 'random') {
        password = crypto.randomBytes(8).toString('hex');
      } else if (passwordOption === 'custom') {
        if (!req.body.password) {
          return res.status(400).json({ success: false, message: 'Password is required for custom option' });
        }
        password = req.body.password;
      } else if (passwordOption === 'default') {
        password = 'Temp@123';
      }

      const user = await User.create({
        email: req.body.email,
        password,
        role: requestedRole
      });
      userId = user._id;
    }

    const employeeData = {
      ...req.body,
      employeeId,
      userId: userId || req.body.userId
    };

    const employee = await Employee.create(employeeData);
    const populatedEmployee = await Employee.findById(employee._id)
      .populate('department', 'name code')
      .populate('designation', 'name code')
      .populate('branch', 'name code')
      .populate('shift', 'name code');

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: populatedEmployee
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate field value' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update employee
export const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Track changes for history
    const changes = [];
    const historyEntry = {
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: req.body.reason || 'Employee details updated'
    };

    // Track department change
    if (req.body.department && req.body.department !== employee.department.toString()) {
      const oldDept = await Department.findById(employee.department);
      const newDept = await Department.findById(req.body.department);
      if (oldDept && newDept) {
        employee.history.push({
          type: 'department_change',
          oldValue: oldDept.name,
          newValue: newDept.name,
          ...historyEntry
        });
        changes.push(`Department: ${oldDept.name} → ${newDept.name}`);
      }
    }

    // Track designation change
    if (req.body.designation && req.body.designation !== employee.designation.toString()) {
      const oldDesg = await Designation.findById(employee.designation);
      const newDesg = await Designation.findById(req.body.designation);
      if (oldDesg && newDesg) {
        employee.history.push({
          type: 'designation_change',
          oldValue: oldDesg.name,
          newValue: newDesg.name,
          ...historyEntry
        });
        changes.push(`Designation: ${oldDesg.name} → ${newDesg.name}`);
      }
    }

    // Track status change
    if (req.body.status && req.body.status !== employee.status) {
      employee.history.push({
        type: 'status_change',
        oldValue: employee.status,
        newValue: req.body.status,
        ...historyEntry
      });
      changes.push(`Status: ${employee.status} → ${req.body.status}`);
    }

    // Track email change and sync to User account
    if (req.body.email && req.body.email !== employee.email) {
      const oldEmail = employee.email;
      const newEmail = req.body.email.toLowerCase().trim();
      
      // Check if new email already exists in User collection
      const existingUser = await User.findOne({ email: newEmail });
      if (existingUser && existingUser._id.toString() !== employee.userId?.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists in user accounts'
        });
      }
      
      // Sync email to linked User account
      if (employee.userId) {
        const user = await User.findById(employee.userId);
        if (user) {
          user.email = newEmail;
          await user.save();
          changes.push(`Email: ${oldEmail} → ${newEmail} (synced to user account)`);
        }
      }
      
      employee.history.push({
        type: 'email_change',
        oldValue: oldEmail,
        newValue: newEmail,
        ...historyEntry
      });
    }

    // Update employee
    Object.assign(employee, req.body);
    await employee.save();

    const updatedEmployee = await Employee.findById(employee._id)
      .populate('department', 'name code')
      .populate('designation', 'name code')
      .populate('branch', 'name code')
      .populate('shift', 'name code');

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee,
      changes: changes.length > 0 ? changes : undefined
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Store userId before deletion to optionally delete user account
    const userId = employee.userId;

    // Hard delete - remove employee from database
    await Employee.findByIdAndDelete(req.params.id);

    // Optionally delete associated user account if it exists
    if (userId) {
      try {
        await User.findByIdAndDelete(userId);
      } catch (userError) {
        // Log but don't fail if user deletion fails (user might already be deleted)
        console.log('User account deletion note:', userError.message);
      }
    }

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload my own profile photo (for employees)
export const uploadMyProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Find employee by userId
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Convert image buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    const imageDataUri = `data:${req.file.mimetype};base64,${base64Image}`;
    
    // Store base64 image in MongoDB
    employee.profilePhoto = imageDataUri;

    // For face recognition, we need to save temporarily to disk
    let tempFilePath = null;
    if (req.file.buffer) {
      // Create temporary file for face recognition processing
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const tempFileName = `temp-${uniqueSuffix}-${req.file.originalname}`;
      tempFilePath = path.join(__dirname, '../uploads', tempFileName);
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Write buffer to temporary file
      fs.writeFileSync(tempFilePath, req.file.buffer);
    }

    // Check if Profile-Only Face Attendance is enabled
    const faceAttendanceSetting = await Settings.findOne({ key: 'profileOnlyFaceAttendance' });
    const isFaceAttendanceEnabled = faceAttendanceSetting?.value === true;

    let faceEligible = false;
    let faceStatusMessage = '';
    let faceDescriptor = null;

    // Process face recognition if enabled
    if (isFaceAttendanceEnabled && employee.employeeId && tempFilePath) {
      try {
        const faceResult = await generateFaceDescriptor(tempFilePath);
        
        if (faceResult.success) {
          faceDescriptor = faceResult.descriptor;
          faceEligible = true;
          faceStatusMessage = 'Face Attendance: Enabled';
          
          // Store face descriptor
          employee.faceDescriptor = faceDescriptor;
          employee.faceEligible = true;
          employee.faceDescriptorGeneratedAt = new Date();
          employee.faceDescriptorGeneratedBy = req.user._id;

          // Audit log
          await AuditLog.create({
            userId: req.user._id,
            userEmail: req.user.email,
            action: 'GENERATE_FACE_DESCRIPTOR',
            resource: `employee:${employee._id}`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            statusCode: 200,
            requestBody: {
              source: 'profile_picture_upload',
              reason: 'Profile picture uploaded/updated by employee',
              employeeId: employee.employeeId
            },
            timestamp: new Date()
          });
        } else {
          faceEligible = false;
          faceStatusMessage = faceResult.error || 'Face recognition failed';
          employee.faceEligible = false;
          employee.faceDescriptor = null;
          
          // Audit log for failure
          await AuditLog.create({
            userId: req.user._id,
            userEmail: req.user.email,
            action: 'FACE_DESCRIPTOR_GENERATION_FAILED',
            resource: `employee:${employee._id}`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            statusCode: 400,
            requestBody: {
              source: 'profile_picture_upload',
              reason: faceResult.error,
              employeeId: employee.employeeId
            },
            timestamp: new Date()
          });
        }
      } catch (faceError) {
        console.error('Face recognition error:', faceError);
        faceEligible = false;
        faceStatusMessage = 'Face recognition processing failed. Please try again.';
        employee.faceEligible = false;
        employee.faceDescriptor = null;
      }
    } else if (!isFaceAttendanceEnabled) {
      // Face attendance not enabled
      employee.faceEligible = false;
      employee.faceDescriptor = null;
    }

    await employee.save();

    // Clean up temporary file after processing
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error('Error deleting temporary file:', err);
      }
    }

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profilePhoto: employee.profilePhoto,
        faceEligible,
        faceStatusMessage
      }
    });
  } catch (error) {
    // Clean up temporary file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error('Error deleting temporary file on error:', err);
      }
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload profile photo
export const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const filePath = path.join(__dirname, '../uploads', req.file.filename);
    employee.profilePhoto = `/uploads/${req.file.filename}`;

    // Check if Profile-Only Face Attendance is enabled
    const faceAttendanceSetting = await Settings.findOne({ key: 'profileOnlyFaceAttendance' });
    const isFaceAttendanceEnabled = faceAttendanceSetting?.value === true;

    let faceEligible = false;
    let faceStatusMessage = '';
    let faceDescriptor = null;

    // Process face recognition if enabled
    if (isFaceAttendanceEnabled && employee.employeeId) {
      try {
        const faceResult = await generateFaceDescriptor(filePath);
        
        if (faceResult.success) {
          faceDescriptor = faceResult.descriptor;
          faceEligible = true;
          faceStatusMessage = 'Face Attendance: Enabled';
          
          // Store face descriptor
          employee.faceDescriptor = faceDescriptor;
          employee.faceEligible = true;
          employee.faceDescriptorGeneratedAt = new Date();
          employee.faceDescriptorGeneratedBy = req.user._id;

          // Audit log
          await AuditLog.create({
            userId: req.user._id,
            userEmail: req.user.email,
            action: 'GENERATE_FACE_DESCRIPTOR',
            resource: `employee:${employee._id}`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            statusCode: 200,
            requestBody: {
              source: 'profile_picture_upload',
              reason: 'Profile picture uploaded/updated',
              employeeId: employee.employeeId
            },
            timestamp: new Date()
          });
        } else {
          faceEligible = false;
          faceStatusMessage = faceResult.error || 'Face recognition failed';
          employee.faceEligible = false;
          employee.faceDescriptor = null;
          
          // Audit log for failure
          await AuditLog.create({
            userId: req.user._id,
            userEmail: req.user.email,
            action: 'FACE_DESCRIPTOR_GENERATION_FAILED',
            resource: `employee:${employee._id}`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            statusCode: 400,
            requestBody: {
              source: 'profile_picture_upload',
              reason: faceResult.error,
              employeeId: employee.employeeId
            },
            timestamp: new Date()
          });
        }
      } catch (faceError) {
        console.error('Face recognition error:', faceError);
        faceEligible = false;
        faceStatusMessage = 'Face recognition processing failed. Please try again.';
        employee.faceEligible = false;
        employee.faceDescriptor = null;
      }
    } else if (!isFaceAttendanceEnabled) {
      // Face attendance not enabled
      employee.faceEligible = false;
      employee.faceDescriptor = null;
    }

    await employee.save();

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profilePhoto: employee.profilePhoto,
        faceEligible,
        faceStatusMessage
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Force regenerate face descriptor (HR/Admin only)
export const regenerateFaceDescriptor = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (!employee.profilePhoto) {
      return res.status(400).json({ success: false, message: 'Employee does not have a profile photo' });
    }

    // Check if Profile-Only Face Attendance is enabled
    const faceAttendanceSetting = await Settings.findOne({ key: 'profileOnlyFaceAttendance' });
    const isFaceAttendanceEnabled = faceAttendanceSetting?.value === true;

    if (!isFaceAttendanceEnabled) {
      return res.status(400).json({ success: false, message: 'Profile-Only Face Attendance is not enabled' });
    }

    const filePath = path.join(__dirname, '../uploads', employee.profilePhoto.replace('/uploads/', ''));
    
    try {
      const faceResult = await generateFaceDescriptor(filePath);
      
      if (faceResult.success) {
        employee.faceDescriptor = faceResult.descriptor;
        employee.faceEligible = true;
        employee.faceDescriptorGeneratedAt = new Date();
        employee.faceDescriptorGeneratedBy = req.user._id;

        await employee.save();

        // Audit log
        await AuditLog.create({
          userId: req.user._id,
          userEmail: req.user.email,
          action: 'GENERATE_FACE_DESCRIPTOR',
          resource: `employee:${employee._id}`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          statusCode: 200,
          requestBody: {
            source: 'force_regenerate',
            reason: 'HR/Admin forced face descriptor regeneration',
            employeeId: employee.employeeId
          },
          timestamp: new Date()
        });

        res.json({
          success: true,
          message: 'Face descriptor regenerated successfully',
          data: {
            faceEligible: true,
            faceStatusMessage: 'Face Attendance: Enabled'
          }
        });
      } else {
        employee.faceEligible = false;
        employee.faceDescriptor = null;
        await employee.save();

        // Audit log for failure
        await AuditLog.create({
          userId: req.user._id,
          userEmail: req.user.email,
          action: 'FACE_DESCRIPTOR_GENERATION_FAILED',
          resource: `employee:${employee._id}`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          statusCode: 400,
          requestBody: {
            source: 'force_regenerate',
            reason: faceResult.error,
            employeeId: employee.employeeId
          },
          timestamp: new Date()
        });

        res.status(400).json({
          success: false,
          message: faceResult.error || 'Face recognition failed',
          data: {
            faceEligible: false,
            faceStatusMessage: faceResult.error
          }
        });
      }
    } catch (faceError) {
      console.error('Face recognition error:', faceError);
      employee.faceEligible = false;
      employee.faceDescriptor = null;
      await employee.save();

      res.status(500).json({
        success: false,
        message: 'Face recognition processing failed',
        data: {
          faceEligible: false,
          faceStatusMessage: 'Face recognition processing failed. Please try again.'
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload document
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (!employee.documents) {
      employee.documents = [];
    }

    employee.documents.push({
      type: req.body.type || 'other',
      name: req.body.name || req.file.originalname,
      file: `/uploads/${req.file.filename}`,
      uploadedAt: new Date()
    });

    await employee.save();

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: employee.documents[employee.documents.length - 1]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk import employees
export const bulkImportEmployees = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { createUserAccounts, passwordType, fixedPassword, defaultRole } = req.body;
    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = {
      succeeded: 0,
      failed: 0,
      errors: [],
      credentials: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Validate required fields
        if (!row['First Name'] || !row['Last Name'] || !row['Email'] || !row['Department'] || !row['Designation']) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: 'Missing required fields: First Name, Last Name, Email, Department, Designation are required'
          });
          continue;
        }

        // Find department by name or code
        const department = await Department.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${row['Department']}$`, 'i') } },
            { code: { $regex: new RegExp(`^${row['Department']}$`, 'i') } }
          ]
        });

        if (!department) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            employee: `${row['First Name']} ${row['Last Name']}`,
            error: `Department not found: ${row['Department']}`
          });
          continue;
        }

        // Find designation by name or code
        const designation = await Designation.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${row['Designation']}$`, 'i') } },
            { code: { $regex: new RegExp(`^${row['Designation']}$`, 'i') } }
          ]
        });

        if (!designation) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            employee: `${row['First Name']} ${row['Last Name']}`,
            error: `Designation not found: ${row['Designation']}`
          });
          continue;
        }

        // Check if email already exists
        const existingEmployee = await Employee.findOne({ email: row['Email'].toLowerCase() });
        if (existingEmployee) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            employee: `${row['First Name']} ${row['Last Name']}`,
            error: 'Email already exists'
          });
          continue;
        }

        // Create user account if requested
        let userId = null;
        let password = null;
        if (createUserAccounts === 'true') {
          const requestedRole = (row['Role'] || defaultRole || 'employee').toLowerCase();
          const allowedRoles = ['admin', 'hr', 'employee'];

          if (!allowedRoles.includes(requestedRole)) {
            results.failed++;
            results.errors.push({
              row: i + 2,
              employee: `${row['First Name']} ${row['Last Name']}`,
              error: `Invalid role: ${row['Role'] || defaultRole}`
            });
            continue;
          }

          // HR users cannot create admin accounts
          if (req.user?.role !== 'admin' && requestedRole === 'admin') {
            results.failed++;
            results.errors.push({
              row: i + 2,
              employee: `${row['First Name']} ${row['Last Name']}`,
              error: 'Only admins can create admin users'
            });
            continue;
          }

          if (passwordType === 'fixed' && !fixedPassword) {
            results.failed++;
            results.errors.push({
              row: i + 2,
              employee: `${row['First Name']} ${row['Last Name']}`,
              error: 'Fixed password is required when password type is fixed'
            });
            continue;
          }

          if (passwordType === 'default') {
            password = 'Temp@123';
          } else {
            password = passwordType === 'fixed'
              ? fixedPassword
              : crypto.randomBytes(8).toString('hex');
          }

          const user = await User.create({
            email: row['Email'].toLowerCase(),
            password: password,
            role: requestedRole
          });
          userId = user._id;

          results.credentials.push({
            employeeId: null, // Will be set after employee creation
            name: `${row['First Name']} ${row['Last Name']}`,
            email: row['Email'].toLowerCase(),
            password: password,
            role: requestedRole
          });
        }

        // Generate employee ID
        const employeeId = await generateEmployeeId();

        // Create employee
        const employeeData = {
          employeeId,
          userId: userId || undefined,
          firstName: row['First Name'],
          lastName: row['Last Name'],
          email: row['Email'].toLowerCase(),
          phone: row['Phone'] || '',
          dateOfBirth: row['Date of Birth'] ? new Date(row['Date of Birth']) : new Date(),
          gender: row['Gender']?.toLowerCase() || 'other',
          department: department._id,
          designation: designation._id,
          joiningDate: row['Joining Date'] ? new Date(row['Joining Date']) : new Date(),
          status: row['Status']?.toLowerCase() || 'active',
          employeeType: row['Employee Type']?.toLowerCase() || 'full_time',
          employmentType: row['Employment Type']?.toLowerCase() || 'permanent'
        };

        // Add optional fields
        if (row['Branch']) {
          const branch = await Branch.findOne({
            $or: [
              { name: { $regex: new RegExp(`^${row['Branch']}$`, 'i') } },
              { code: { $regex: new RegExp(`^${row['Branch']}$`, 'i') } }
            ]
          });
          if (branch) employeeData.branch = branch._id;
        }

        if (row['Alternate Phone']) employeeData.alternatePhone = row['Alternate Phone'];
        if (row['Alternate Email']) employeeData.alternateEmail = row['Alternate Email'];
        if (row['Blood Group']) employeeData.bloodGroup = row['Blood Group'];
        if (row['Marital Status']) employeeData.maritalStatus = row['Marital Status'].toLowerCase();
        if (row['PAN Number']) employeeData.panNumber = row['PAN Number'];
        if (row['Aadhaar Number']) employeeData.aadhaarNumber = row['Aadhaar Number'];

        const employee = await Employee.create(employeeData);

        // Update credentials with employee ID
        if (results.credentials.length > 0 && results.credentials[results.credentials.length - 1].employeeId === null) {
          results.credentials[results.credentials.length - 1].employeeId = employeeId;
        }

        results.succeeded++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          employee: `${row['First Name'] || 'Unknown'} ${row['Last Name'] || ''}`,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Bulk import completed. ${results.succeeded} succeeded, ${results.failed} failed.`,
      summary: {
        succeeded: results.succeeded,
        failed: results.failed,
        total: data.length
      },
      errors: results.errors,
      credentials: results.credentials
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Download credentials (from provided array or fetch all)
export const downloadCredentials = async (req, res) => {
  try {
    const { credentials } = req.body;

    let credentialsToExport = [];

    // If credentials array is provided, use it
    if (credentials && Array.isArray(credentials) && credentials.length > 0) {
      credentialsToExport = credentials;
    } else {
      // Otherwise, fetch all employees with user accounts
      const employees = await Employee.find({ userId: { $exists: true, $ne: null } })
        .populate('userId', 'email role')
        .select('employeeId firstName lastName email userId');

      if (employees.length === 0) {
        return res.status(404).json({ success: false, message: 'No employees with user accounts found' });
      }

      // Note: We cannot retrieve plain text passwords as they are hashed
      // This endpoint will only export employee info and indicate that passwords need to be reset
      credentialsToExport = employees.map(emp => ({
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email || emp.userId?.email || '',
        password: '[Password is hashed - cannot be retrieved. Use password reset.]',
        role: emp.userId?.role || 'employee'
      }));
    }

    // Create CSV content
    const csvRows = ['Employee ID,Name,Email,Password,Role'];
    credentialsToExport.forEach(cred => {
      csvRows.push(`"${cred.employeeId}","${cred.name}","${cred.email}","${cred.password}","${cred.role}"`);
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=employee-credentials-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Download template
export const downloadTemplate = async (req, res) => {
  try {
    const templateData = [
      {
        'First Name': 'John',
        'Last Name': 'Doe',
        'Email': 'john.doe@example.com',
        'Phone': '1234567890',
        'Date of Birth': '1990-01-01',
        'Gender': 'male',
        'Department': 'IT',
        'Designation': 'Software Engineer',
        'Branch': 'HQ',
        'Joining Date': '2024-01-01',
        'Status': 'active',
        'Employee Type': 'full_time',
        'Employment Type': 'permanent',
        'Role': 'employee',
        'Alternate Phone': '',
        'Alternate Email': '',
        'Blood Group': 'O+',
        'Marital Status': 'single',
        'PAN Number': '',
        'Aadhaar Number': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=employee-import-template.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign employee to organization units (department and location)
export const assignEmployeeToUnits = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { department, branch, reason } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Validate department
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required' });
    }

    const dept = await Department.findById(department);
    if (!dept) {
      return res.status(400).json({ success: false, message: 'Department not found' });
    }
    if (!dept.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot assign to inactive department' });
    }

    // Validate branch if provided (required for active employees)
    if (employee.status === 'active' && !branch) {
      return res.status(400).json({ success: false, message: 'Branch/Location is required for active employees' });
    }

    if (branch) {
      const branchObj = await Branch.findById(branch);
      if (!branchObj) {
        return res.status(400).json({ success: false, message: 'Branch not found' });
      }
      if (!branchObj.isActive) {
        return res.status(400).json({ success: false, message: 'Cannot assign to inactive branch' });
      }
    }

    // Ensure history array exists
    if (!employee.history) {
      employee.history = [];
    }

    const changes = [];

    // Track department change
    if (department !== employee.department.toString()) {
      const oldDept = await Department.findById(employee.department);
      employee.history.push({
        type: 'department_change',
        oldValue: oldDept ? oldDept.name : employee.department.toString(),
        newValue: dept.name,
        changedBy: req.user._id,
        changedAt: new Date(),
        reason: reason || 'Department assignment changed'
      });
      changes.push(`Department: ${oldDept?.name || 'N/A'} → ${dept.name}`);
    }

    // Track branch/location change
    const oldBranchId = employee.branch ? employee.branch.toString() : null;
    const newBranchId = branch ? branch.toString() : null;
    
    if (oldBranchId !== newBranchId) {
      const oldBranch = employee.branch ? await Branch.findById(employee.branch) : null;
      const newBranch = branch ? await Branch.findById(branch) : null;
      
      employee.history.push({
        type: 'location_change',
        oldValue: oldBranch ? oldBranch.name : 'Not Assigned',
        newValue: newBranch ? newBranch.name : 'Not Assigned',
        changedBy: req.user._id,
        changedAt: new Date(),
        reason: reason || 'Location/Branch assignment changed'
      });
      changes.push(`Location: ${oldBranch?.name || 'Not Assigned'} → ${newBranch?.name || 'Not Assigned'}`);
    }

    // Update employee
    employee.department = department;
    if (branch) {
      employee.branch = branch;
    }
    await employee.save();

    const updatedEmployee = await Employee.findById(employee._id)
      .populate('department', 'name code')
      .populate('branch', 'name code')
      .populate('designation', 'name code');

    res.json({
      success: true,
      message: 'Employee assigned to units successfully',
      data: updatedEmployee,
      changes: changes.length > 0 ? changes : undefined
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create change request
export const createChangeRequest = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const { field, newValue, comments } = req.body;

    // Allowed fields for employee change requests (matching frontend)
    const allowedFields = [
      'phone',
      'alternatePhone',
      'alternateEmail',
      'address',
      'emergencyContact',
      'linkedInProfile',
      'skypeId',
      'panNumber',
      'aadhaarNumber',
      'passportNumber',
      'bankDetails',
      'statutoryDetails'
    ];
    
    if (!field || !allowedFields.includes(field)) {
      return res.status(400).json({ success: false, message: 'Invalid or not allowed field for change request' });
    }

    // Get old value - handle nested objects
    let oldValue;
    if (field === 'address' || field === 'emergencyContact' || field === 'bankDetails' || field === 'statutoryDetails') {
      oldValue = employee[field] || {};
    } else {
      oldValue = employee[field] || null;
    }

    // Validate newValue is provided
    if (!newValue || (typeof newValue === 'object' && Object.keys(newValue).length === 0)) {
      return res.status(400).json({ success: false, message: 'New value is required' });
    }

    if (!employee.changeRequests) {
      employee.changeRequests = [];
    }

    employee.changeRequests.push({
      field,
      oldValue,
      newValue,
      status: 'pending',
      requestedAt: new Date(),
      comments: comments || null
    });

    await employee.save();

    res.json({
      success: true,
      message: 'Change request created successfully',
      data: employee.changeRequests[employee.changeRequests.length - 1]
    });
  } catch (error) {
    console.error('Error in createChangeRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// Get change requests
export const getChangeRequests = async (req, res) => {
  try {
    const { status, employeeId, limit } = req.query;
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let query = {};
    
    try {
      if (req.user.role === 'employee') {
        const employee = await Employee.findOne({ userId: req.user._id }).select('_id').lean();
        if (!employee) {
          return res.json({ success: true, data: [] });
        }
        query = { _id: employee._id };
      } else if (employeeId) {
        // employeeId from query params is the employee's employeeId string (e.g., "EMP000001"), not MongoDB _id
        query = { employeeId: employeeId };
      }
      // If admin/hr and no employeeId specified, query remains {} to get all employees
    } catch (queryError) {
      console.error('Error building query:', queryError);
      return res.status(500).json({ success: false, message: 'Error building query: ' + queryError.message });
    }

    let employees = [];
    try {
      let employeeQuery = Employee.find(query)
        .select('employeeId firstName lastName email changeRequests');
      
      // If querying all employees (admin/hr view), limit to prevent performance issues
      // Individual employee queries don't need limit
      if (Object.keys(query).length === 0) {
        employeeQuery = employeeQuery.limit(1000); // Reasonable limit for admin view
      }
      
      employees = await employeeQuery.lean();
    } catch (findError) {
      console.error('Error finding employees:', findError);
      return res.status(500).json({ success: false, message: 'Error finding employees: ' + findError.message });
    }

    const allRequests = [];
    
    try {
      for (const emp of employees) {
        if (!emp || typeof emp !== 'object') continue;
        
        const changeRequests = Array.isArray(emp.changeRequests) ? emp.changeRequests : [];
        
        for (const req of changeRequests) {
          if (!req || typeof req !== 'object') continue;
          
          // Apply status filter
          if (status && req.status !== status) {
            continue;
          }

          try {
            // Safely extract and convert values
            let requestId = undefined;
            if (req._id) {
              if (typeof req._id === 'object' && req._id.toString) {
                requestId = req._id.toString();
              } else {
                requestId = String(req._id);
              }
            }

            let reviewedById = null;
            if (req.reviewedBy) {
              if (typeof req.reviewedBy === 'object' && req.reviewedBy.toString) {
                reviewedById = req.reviewedBy.toString();
              } else {
                reviewedById = String(req.reviewedBy);
              }
            }

            const firstName = emp.firstName ? String(emp.firstName) : '';
            const lastName = emp.lastName ? String(emp.lastName) : '';
            const employeeName = `${firstName} ${lastName}`.trim() || 'Unknown';

            allRequests.push({
              _id: requestId,
              employeeId: emp.employeeId ? String(emp.employeeId) : '',
              employeeCode: emp.employeeId ? String(emp.employeeId) : '', // Alias for frontend compatibility
              employeeName: employeeName,
              employeeEmail: emp.email ? String(emp.email) : '',
              field: req.field ? String(req.field) : '',
              oldValue: req.oldValue !== undefined ? req.oldValue : null,
              newValue: req.newValue !== undefined ? req.newValue : null,
              status: req.status ? String(req.status) : 'pending',
              requestedAt: req.requestedAt || null,
              reviewedBy: reviewedById,
              reviewedAt: req.reviewedAt || null,
              comments: req.comments ? String(req.comments) : null
            });
          } catch (itemError) {
            console.error('Error processing change request item:', itemError);
            // Continue processing other items
            continue;
          }
        }
      }
    } catch (processError) {
      console.error('Error processing change requests:', processError);
      return res.status(500).json({ success: false, message: 'Error processing requests: ' + processError.message });
    }

    // Sort by requestedAt descending
    try {
      allRequests.sort((a, b) => {
        try {
          const dateA = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
          const dateB = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
          return dateB - dateA;
        } catch {
          return 0;
        }
      });
    } catch (sortError) {
      console.error('Error sorting requests:', sortError);
      // Continue even if sorting fails
    }

    // Apply limit
    let result = allRequests;
    try {
      if (limit && !isNaN(parseInt(limit)) && parseInt(limit) > 0) {
        result = allRequests.slice(0, parseInt(limit));
      }
    } catch (limitError) {
      console.error('Error applying limit:', limitError);
      // Continue without limit
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in getChangeRequests:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// Review change request
export const reviewChangeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, status, comments } = req.body;

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' });
    }

    // Handle both 'action' (from frontend: 'approve'/'reject') and 'status' (direct: 'approved'/'rejected')
    let reviewStatus;
    if (action) {
      reviewStatus = action === 'approve' ? 'approved' : 'rejected';
    } else if (status) {
      reviewStatus = status;
    } else {
      return res.status(400).json({ success: false, message: 'Action or status is required' });
    }

    if (!['approved', 'rejected'].includes(reviewStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid action/status. Must be approve/approved or reject/rejected' });
    }

    // Find employee with the change request
    const employee = await Employee.findOne({ 'changeRequests._id': requestId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Change request not found' });
    }

    // Get the specific change request
    const request = employee.changeRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Change request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Change request already reviewed' });
    }

    request.status = reviewStatus;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    if (comments) {
      request.comments = comments;
    }

    // If approved, update the employee field
    if (reviewStatus === 'approved') {
      const field = request.field;
      const newValue = request.newValue;
      
      // Handle nested objects (address, emergencyContact, bankDetails, statutoryDetails)
      if (field === 'address' || field === 'emergencyContact' || field === 'bankDetails' || field === 'statutoryDetails') {
        if (typeof newValue === 'object' && newValue !== null) {
          // Merge with existing values, only updating provided fields
          employee[field] = {
            ...(employee[field] || {}),
            ...newValue
          };
        } else {
          employee[field] = newValue;
        }
      } else {
        employee[field] = newValue;
      }
    }

    await employee.save();

    res.json({
      success: true,
      message: `Change request ${reviewStatus} successfully`,
      data: request
    });
  } catch (error) {
    console.error('Error in reviewChangeRequest:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};
