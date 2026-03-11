import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Employee from '../models/employee.model.js';
import Company from '../models/company.model.js';
import Branch from '../models/branch.model.js';
import Department from '../models/department.model.js';
import Designation from '../models/designation.model.js';
import Shift from '../models/shift.model.js';
import LeaveType from '../models/leaveType.model.js';
import LeaveRequest from '../models/leaveRequest.model.js';
import Attendance from '../models/attendance.model.js';
import { Asset } from '../models/asset.model.js';
import Document from '../models/document.model.js';
import { Payslip, PayrollRun, SalaryStructure, SalaryComponent } from '../models/payroll.model.js';
import Goal from '../models/goal.model.js';
import ExpenseClaim from '../models/expense.model.js';
import Grievance from '../models/grievance.model.js';
import PerformanceCycle from '../models/performanceCycle.model.js';
import TrainingProgram from '../models/trainingProgram.model.js';
import TrainingRecord from '../models/trainingRecord.model.js';
import CompetencyMatrix from '../models/competencyMatrix.model.js';
import CompetencyAssessment from '../models/competencyAssessment.model.js';
import ImmunizationRecord from '../models/immunizationRecord.model.js';
import HealthCheckup from '../models/healthCheckup.model.js';
import OccupationalExposure from '../models/occupationalExposure.model.js';
import IncidentReport from '../models/incidentReport.model.js';
import PrivilegeCategory from '../models/privilegeCategory.model.js';
import PrivilegeCommittee from '../models/privilegeCommittee.model.js';
import PrivilegeRequest from '../models/privilegeRequest.model.js';
import DoctorPrivilege from '../models/doctorPrivilege.model.js';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearDatabase = async () => {
  try {
    console.log('🗑️  Clearing existing data...');
    await DoctorPrivilege.deleteMany({});
    await PrivilegeRequest.deleteMany({});
    await PrivilegeCommittee.deleteMany({});
    await PrivilegeCategory.deleteMany({});
    await IncidentReport.deleteMany({});
    await OccupationalExposure.deleteMany({});
    await HealthCheckup.deleteMany({});
    await ImmunizationRecord.deleteMany({});
    await CompetencyAssessment.deleteMany({});
    await CompetencyMatrix.deleteMany({});
    await TrainingRecord.deleteMany({});
    await TrainingProgram.deleteMany({});
    await Payslip.deleteMany({});
    await PayrollRun.deleteMany({});
    await SalaryStructure.deleteMany({});
    await SalaryComponent.deleteMany({});
    await ExpenseClaim.deleteMany({});
    await Grievance.deleteMany({});
    await Goal.deleteMany({});
    await PerformanceCycle.deleteMany({});
    await Document.deleteMany({});
    await Asset.deleteMany({});
    await Attendance.deleteMany({});
    await LeaveRequest.deleteMany({});
    await LeaveType.deleteMany({});
    await Shift.deleteMany({});
    await Employee.deleteMany({});
    await User.deleteMany({});
    await Designation.deleteMany({});
    await Department.deleteMany({});
    await Branch.deleteMany({});
    await Company.deleteMany({});
    console.log('✅ Database cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

// Seed Companies
const seedCompanies = async () => {
  console.log('🏢 Creating companies...');
  const company = await Company.create({
    name: 'vaaltic Healthcare',
    code: 'VAALTIC',
    legalName: 'vaaltic Healthcare Private Limited',
    registrationNumber: 'U72900KA2020PTC123456',
    taxId: 'GSTIN123456789',
    address: {
      street: '123 Tech Park',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India'
    },
    phone: '+91-80-12345678',
    email: 'info@vaaltic.com',
    website: 'https://vaaltic.com',
    isActive: true
  });
  return company;
};

// Seed Branches
const seedBranches = async (company) => {
  console.log('🏢 Creating branches...');
  const branches = await Branch.insertMany([
    {
      name: 'Head Office',
      code: 'HO',
      address: {
        street: '123 Tech Park',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        country: 'India'
      },
      phone: '+91-80-12345678',
      email: 'hospital@vaaltic.com',
      company: company._id,
      isActive: true
    },
    {
      name: 'Mumbai Branch',
      code: 'MUM',
      address: {
        street: '456 Business Tower',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India'
      },
      phone: '+91-22-98765432',
      email: 'mumbai@vaaltic.com',
      company: company._id,
      isActive: true
    }
  ]);
  return branches;
};

// Seed Departments
const seedDepartments = async (company, branches) => {
  console.log('📁 Creating departments...');
  const departments = await Department.insertMany([
    {
      name: 'Human Resources',
      code: 'HR',
      description: 'Human Resources Department',
      company: company._id,
      branch: branches[0]._id,
      isActive: true
    },
    {
      name: 'Cardiology',
      code: 'CARD',
      description: 'Cardiology Department',
      company: company._id,
      branch: branches[0]._id,
      isActive: true
    },
    {
      name: 'Orthopedics',
      code: 'ORTHO',
      description: 'Orthopedics Department',
      company: company._id,
      branch: branches[0]._id,
      isActive: true
    },
    {
      name: 'Pediatrics',
      code: 'PED',
      description: 'Pediatrics Department',
      company: company._id,
      branch: branches[0]._id,
      isActive: true
    },
    {
      name: 'Emergency Medicine',
      code: 'ER',
      description: 'Emergency Department',
      company: company._id,
      branch: branches[0]._id,
      isActive: true
    },
    {
      name: 'Nursing',
      code: 'NURS',
      description: 'Nursing Department',
      company: company._id,
      branch: branches[0]._id,
      isActive: true
    },
    {
      name: 'Laboratory',
      code: 'LAB',
      description: 'Laboratory Department',
      company: company._id,
      branch: branches[0]._id,
      isActive: true
    },
    {
      name: 'Radiology',
      code: 'RAD',
      description: 'Radiology Department',
      company: company._id,
      branch: branches[0]._id,
      isActive: true
    },
    {
      name: 'Pharmacy',
      code: 'PHARM',
      description: 'Pharmacy Department',
      company: company._id,
      branch: branches[0]._id,
      isActive: true
    },
    {
      name: 'Information Technology',
      code: 'IT',
      description: 'IT Department',
      company: company._id,
      branch: branches[0]._id,
      isActive: true
    },
    {
      name: 'Finance',
      code: 'FIN',
      description: 'Finance Department',
      company: company._id,
      branch: branches[0]._id,
      isActive: true
    },
    {
      name: 'Administration',
      code: 'ADMIN',
      description: 'Administration Department',
      company: company._id,
      branch: branches[1]._id,
      isActive: true
    }
  ]);
  return departments;
};

// Seed Designations
const seedDesignations = async () => {
  console.log('👔 Creating designations...');
  const designations = await Designation.insertMany([
    { name: 'CEO', code: 'CEO', level: 10, isActive: true },
    { name: 'Medical Director', code: 'MD', level: 9, isActive: true },
    { name: 'Chief Medical Officer', code: 'CMO', level: 9, isActive: true },
    { name: 'HR Manager', code: 'HRM', level: 8, isActive: true },
    { name: 'Senior Doctor', code: 'SRDOC', level: 8, isActive: true },
    { name: 'Doctor', code: 'DOC', level: 7, isActive: true },
    { name: 'Senior Nurse', code: 'SRNUR', level: 6, isActive: true },
    { name: 'Staff Nurse', code: 'NUR', level: 5, isActive: true },
    { name: 'Lab Technician', code: 'LABTECH', level: 5, isActive: true },
    { name: 'Radiologist', code: 'RAD', level: 7, isActive: true },
    { name: 'Pharmacist', code: 'PHARM', level: 5, isActive: true },
    { name: 'IT Manager', code: 'ITM', level: 8, isActive: true },
    { name: 'Senior Developer', code: 'SDEV', level: 6, isActive: true },
    { name: 'Developer', code: 'DEV', level: 5, isActive: true },
    { name: 'HR Executive', code: 'HRE', level: 5, isActive: true },
    { name: 'Finance Executive', code: 'FE', level: 5, isActive: true },
    { name: 'Admin Executive', code: 'AE', level: 5, isActive: true },
    { name: 'Junior Developer', code: 'JDEV', level: 4, isActive: true },
    { name: 'Intern', code: 'INT', level: 1, isActive: true }
  ]);
  return designations;
};

// Seed Shifts
const seedShifts = async () => {
  console.log('⏰ Creating shifts...');
  const shifts = await Shift.insertMany([
    {
      name: 'General Shift',
      code: 'GEN',
      category: 'regular',
      startTime: '09:00',
      endTime: '18:00',
      breakDuration: 60,
      breakType: 'unpaid',
      workingHours: 8,
      graceLateMinutes: 15,
      graceEarlyMinutes: 15,
      weekOffs: [0], // Sunday
      isActive: true
    },
    {
      name: 'Night Shift',
      code: 'NIGHT',
      category: 'night',
      startTime: '20:00',
      endTime: '05:00',
      breakDuration: 60,
      breakType: 'unpaid',
      workingHours: 8,
      graceLateMinutes: 15,
      weekOffs: [0],
      isActive: true
    },
    {
      name: 'Flexible Shift',
      code: 'FLEX',
      category: 'regular',
      startTime: '10:00',
      endTime: '19:00',
      breakDuration: 60,
      breakType: 'unpaid',
      workingHours: 8,
      isFlexible: true,
      weekOffs: [0, 6], // Sunday and Saturday
      isActive: true
    }
  ]);
  return shifts;
};

// Seed Leave Types
const seedLeaveTypes = async () => {
  console.log('📅 Creating leave types...');
  const leaveTypes = await LeaveType.insertMany([
    {
      name: 'Casual Leave',
      code: 'CL',
      category: 'general',
      isPaid: true,
      maxDays: 12,
      rules: {
        accrual: {
          frequency: 'monthly',
          ratePerCycle: 1,
          prorated: true,
          startFrom: 'joining'
        },
        carryForward: {
          enabled: true,
          maxDays: 3
        },
        usage: {
          minDays: 0.5,
          maxDaysPerRequest: 5,
          allowHalfDay: true
        }
      },
      requiresApproval: true,
      isActive: true
    },
    {
      name: 'Sick Leave',
      code: 'SL',
      category: 'general',
      isPaid: true,
      maxDays: 12,
      rules: {
        accrual: {
          frequency: 'monthly',
          ratePerCycle: 1,
          prorated: true
        },
        usage: {
          requiresDocument: true,
          mandatoryDocumentTypes: ['medical_certificate']
        }
      },
      requiresApproval: true,
      isActive: true
    },
    {
      name: 'Earned Leave',
      code: 'EL',
      category: 'general',
      isPaid: true,
      maxDays: 15,
      rules: {
        accrual: {
          frequency: 'monthly',
          ratePerCycle: 1.25,
          prorated: true
        },
        carryForward: {
          enabled: true,
          maxDays: 10
        },
        encashment: {
          enabled: true,
          maxEncashable: 5
        }
      },
      requiresApproval: true,
      isActive: true
    },
    {
      name: 'Maternity Leave',
      code: 'MAT',
      category: 'general',
      isPaid: true,
      maxDays: 180,
      rules: {
        usage: {
          requiresDocument: true,
          blockDuringProbation: false
        }
      },
      requiresApproval: true,
      isActive: true
    }
  ]);
  return leaveTypes;
};

// Seed Users and Employees
const seedUsersAndEmployees = async (departments, designations, shifts, branches) => {
  console.log('👥 Creating users and employees...');
  
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria', 'William', 'Patricia', 'Richard', 'Jennifer', 'Joseph', 'Linda'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor'];
  
  const users = [];
  const employees = [];
  
  // Create Admin User (password will be hashed by User model pre-save hook)
  const adminUser = await User.create({
    email: 'admin@vaaltic.com',
    password: 'Admin@123', // Will be hashed automatically by User model
    role: 'admin',
    isActive: true
  });
  
  const adminEmployee = await Employee.create({
    employeeId: 'EMP00001',
    userId: adminUser._id,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@vaaltic.com',
    phone: '+91-9876543210',
    dateOfBirth: new Date('1980-01-15'),
    gender: 'male',
    joiningDate: new Date('2020-01-01'),
    status: 'active',
    department: departments[0]._id,
    designation: designations[2]._id,
    shift: shifts[0]._id,
    branch: branches[0]._id
  });
  
  users.push(adminUser);
  employees.push(adminEmployee);
  
  // Create HR User (password will be hashed by User model pre-save hook)
  const hrUser = await User.create({
    email: 'hr@vaaltic.com',
    password: 'Hr@12345', // Will be hashed automatically by User model
    role: 'hr',
    isActive: true
  });
  
  const hrEmployee = await Employee.create({
    employeeId: 'EMP00002',
    userId: hrUser._id,
    firstName: 'HR',
    lastName: 'Manager',
    email: 'hr@vaaltic.com',
    phone: '+91-9876543211',
    dateOfBirth: new Date('1985-05-20'),
    gender: 'female',
    joiningDate: new Date('2020-02-01'),
    status: 'active',
    department: departments[0]._id,
    designation: designations[2]._id,
    shift: shifts[0]._id,
    branch: branches[0]._id,
    reportingManager: adminEmployee._id
  });
  
  users.push(hrUser);
  employees.push(hrEmployee);
  
  // Create Employee Users (80 employees for comprehensive testing)
  for (let i = 0; i < 80; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const email = `employee${i + 1}@vaaltic.com`;
    const empId = `EMP${String(i + 3).padStart(5, '0')}`;
    
    const user = await User.create({
      email,
      password: 'Employee@123', // Will be hashed automatically by User model
      role: 'employee',
      isActive: true
    });
    
    const deptIndex = i % (departments.length - 1) + 1; // Skip HR dept for employees
    const desigIndex = Math.min(5 + (i % 7), designations.length - 1);
    const shiftIndex = i % shifts.length;
    const branchIndex = i % branches.length;
    
    const employee = await Employee.create({
      employeeId: empId,
      userId: user._id,
      firstName,
      lastName,
      email,
      phone: `+91-9876543${String(200 + i).padStart(3, '0')}`,
      dateOfBirth: new Date(1985 + (i % 15), (i % 12), (i % 28) + 1),
      gender: i % 2 === 0 ? 'male' : 'female',
      joiningDate: new Date(2021 + (i % 3), (i % 12), (i % 28) + 1),
      status: 'active',
      department: departments[deptIndex]._id,
      designation: designations[desigIndex]._id,
      shift: shifts[shiftIndex]._id,
      branch: branches[branchIndex]._id,
      reportingManager: i < 5 ? hrEmployee._id : (i < 10 ? employees[Math.floor(i / 2) + 1]?._id : adminEmployee._id),
      bloodGroup: ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'][i % 8],
      maritalStatus: ['single', 'married', 'single', 'married'][i % 4],
      address: {
        street: `${100 + i} Main Street`,
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: `56000${i + 1}`,
        country: 'India'
      }
    });
    
    users.push(user);
    employees.push(employee);
  }
  
  return { users, employees, adminUser, adminEmployee, hrUser, hrEmployee };
};

// Seed Attendance
const seedAttendance = async (employees, shifts) => {
  console.log('⏰ Creating attendance records...');
  const today = new Date();
  const attendanceRecords = [];
  
  for (const employee of employees) {
    // Create attendance for last 90 days (3 months) for better historical reports
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      // Randomly mark some as absent (10% chance)
      if (Math.random() < 0.1) continue;
      
      const shift = shifts.find(s => s._id.toString() === employee.shift?.toString()) || shifts[0];
      const startTime = shift.startTime.split(':');
      const punchInHour = parseInt(startTime[0]) + (Math.random() < 0.2 ? 1 : 0); // 20% late
      const punchInMinute = Math.floor(Math.random() * 30);
      
      const punchIn = new Date(date);
      punchIn.setHours(punchInHour, punchInMinute, 0, 0);
      
      const punchOut = new Date(punchIn);
      punchOut.setHours(punchIn.getHours() + 8 + Math.floor(Math.random() * 2), punchIn.getMinutes() + Math.floor(Math.random() * 30));
      
      const attendance = await Attendance.create({
        employee: employee._id,
        date: date,
        punches: [
          {
            type: 'punch_in',
            time: punchIn,
            method: 'manual',
            location: {
              latitude: 12.9716 + (Math.random() * 0.1),
              longitude: 77.5946 + (Math.random() * 0.1),
              address: 'Bangalore, Karnataka'
            }
          },
          {
            type: 'punch_out',
            time: punchOut,
            method: 'manual',
            location: {
              latitude: 12.9716 + (Math.random() * 0.1),
              longitude: 77.5946 + (Math.random() * 0.1),
              address: 'Bangalore, Karnataka'
            }
          }
        ],
        shift: shift._id,
        status: 'present',
        workingHours: 8 + (Math.random() * 0.5),
        isLate: punchInHour > parseInt(startTime[0]),
        isEarlyLeave: false
      });
      
      attendanceRecords.push(attendance);
    }
  }
  
  return attendanceRecords;
};

// Seed Leave Requests
const seedLeaveRequests = async (employees, leaveTypes, hrEmployee) => {
  console.log('📅 Creating leave requests...');
  const leaveRequests = [];
  const statuses = ['pending', 'approved', 'rejected', 'approved', 'approved'];
  
  // Create more leave requests for better reporting (past and future)
  for (let i = 0; i < 200; i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Mix of past, present, and future leave requests
    const startDate = new Date();
    const daysOffset = Math.floor(Math.random() * 180) - 60; // -60 to +120 days
    startDate.setDate(startDate.getDate() + daysOffset);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 5) + 1);
    
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    const leaveRequest = await LeaveRequest.create({
      employee: employee._id,
      leaveType: leaveType._id,
      startDate,
      endDate,
      days,
      reason: ['Family emergency', 'Personal work', 'Medical appointment', 'Vacation', 'Sick leave'][Math.floor(Math.random() * 5)],
      status,
      approvedBy: status === 'approved' ? hrEmployee._id : null,
      approvedAt: status === 'approved' ? new Date() : null
    });
    
    leaveRequests.push(leaveRequest);
  }
  
  return leaveRequests;
};

// Seed Assets
const seedAssets = async (employees) => {
  console.log('💼 Creating assets...');
  const assets = [];
  const assetTypes = [
    { name: 'Laptop', category: 'IT Equipment', brand: 'Dell' },
    { name: 'Laptop', category: 'IT Equipment', brand: 'HP' },
    { name: 'Laptop', category: 'IT Equipment', brand: 'Lenovo' },
    { name: 'Mobile Phone', category: 'IT Equipment', brand: 'Samsung' },
    { name: 'Mobile Phone', category: 'IT Equipment', brand: 'Apple' },
    { name: 'Monitor', category: 'IT Equipment', brand: 'LG' },
    { name: 'Keyboard', category: 'IT Equipment', brand: 'Logitech' },
    { name: 'Mouse', category: 'IT Equipment', brand: 'Logitech' }
  ];
  
  // Increase assets for better reporting
  for (let i = 0; i < 150; i++) {
    const assetType = assetTypes[Math.floor(Math.random() * assetTypes.length)];
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const status = ['available', 'in_use', 'in_use', 'in_use'][Math.floor(Math.random() * 4)];
    
    const asset = await Asset.create({
      assetId: `AST${String(i + 1).padStart(5, '0')}`,
      name: `${assetType.brand} ${assetType.name}`,
      category: assetType.category,
      brand: assetType.brand,
      model: `Model-${i + 1}`,
      serialNumber: `SN${String(i + 1).padStart(8, '0')}`,
      purchaseDate: new Date(2022 + (i % 3), (i % 12), (i % 28) + 1),
      purchaseCost: 30000 + (Math.random() * 50000),
      currentValue: 20000 + (Math.random() * 30000),
      vendor: ['TechMart', 'IT Solutions', 'Global Tech'][Math.floor(Math.random() * 3)],
      location: 'Head Office',
      condition: ['new', 'good', 'good', 'fair'][Math.floor(Math.random() * 4)],
      status,
      assignedTo: status === 'in_use' ? employee._id : null,
      assignedDate: status === 'in_use' ? new Date(2023 + (i % 2), (i % 12), (i % 28) + 1) : null
    });
    
    assets.push(asset);
  }
  
  return assets;
};

// Seed Performance Cycles
const seedPerformanceCycles = async (adminUser) => {
  console.log('📊 Creating performance cycles...');
  const cycles = [];
  
  const currentYear = new Date().getFullYear();
  // Create 3 performance cycles for better historical reporting
  for (let i = 0; i < 3; i++) {
    const cycle = await PerformanceCycle.create({
      name: `FY ${currentYear - i} - ${currentYear - i + 1}`,
      cycleType: 'annual',
      startDate: new Date(currentYear - i, 3, 1), // April 1
      endDate: new Date(currentYear - i + 1, 2, 31), // March 31
      status: i === 0 ? 'active' : 'closed',
      createdBy: adminUser._id,
      activatedBy: i === 0 ? adminUser._id : null,
      activatedAt: i === 0 ? new Date() : null,
      closedBy: i === 1 ? adminUser._id : null,
      closedAt: i === 1 ? new Date() : null,
      employeeInclusion: {
        includeAllActive: true
      },
      workflowWindows: {
        goalSetting: {
          startDate: new Date(currentYear - i, 3, 1),
          endDate: new Date(currentYear - i, 4, 30),
          enabled: true
        },
        selfAssessment: {
          startDate: new Date(currentYear - i + 1, 1, 1),
          endDate: new Date(currentYear - i + 1, 2, 15),
          enabled: true
        }
      }
    });
    cycles.push(cycle);
  }
  
  return cycles;
};

// Seed Expenses
const seedExpenses = async (employees, hrEmployee) => {
  console.log('💰 Creating expenses...');
  const expenses = [];
  const categories = ['Travel', 'Meals', 'Accommodation', 'Office Supplies', 'Internet', 'Phone'];
  const statuses = ['pending', 'approved', 'rejected', 'approved', 'approved'];
  
  // Increase expenses for better reporting
  for (let i = 0; i < 200; i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const startDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 3));
    
    const amount = 500 + (Math.random() * 5000);
    
    const expense = await ExpenseClaim.create({
      employee: employee._id,
      title: `${category} Expense - ${employee.firstName}`,
      tripType: ['local', 'domestic', 'domestic'][Math.floor(Math.random() * 3)],
      purpose: `${category} expense for business purpose`,
      startDate,
      endDate,
      items: [{
        expenseDate: startDate,
        category,
        amount,
        currency: 'INR',
        notes: `${category} expense`
      }],
      totalAmount: amount,
      status,
      approvedBy: status === 'approved' ? hrEmployee._id : null,
      approvedAt: status === 'approved' ? new Date() : null
    });
    
    expenses.push(expense);
  }
  
  return expenses;
};

// Seed Goals
const seedGoals = async (employees, performanceCycles, hrEmployee) => {
  console.log('🎯 Creating goals...');
  const goals = [];
  const goalTitles = [
    'Complete Q1 Project',
    'Improve Code Quality',
    'Increase Sales by 20%',
    'Complete Training Program',
    'Launch New Feature',
    'Reduce Bug Count',
    'Improve Customer Satisfaction',
    'Complete Certification'
  ];
  const categories = ['productivity', 'leadership', 'behavioural', 'technical'];
  const statuses = ['draft', 'pending_approval', 'approved', 'approved', 'approved'];
  
  const activeCycle = performanceCycles.find(c => c.status === 'active') || performanceCycles[0];
  
  // Track goals per employee to avoid duplicates within same cycle
  const employeeGoals = new Map();
  
  // Increase goals for better performance reporting
  for (let i = 0; i < 200; i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const employeeId = employee._id.toString();
    
    // Initialize employee goals array if not exists
    if (!employeeGoals.has(employeeId)) {
      employeeGoals.set(employeeId, []);
    }
    
    // Get available goal titles (not yet assigned to this employee in this cycle)
    const usedTitles = employeeGoals.get(employeeId);
    const availableTitles = goalTitles.filter(title => !usedTitles.includes(title));
    
    // If all titles used for this employee, skip or use unique title with index
    if (availableTitles.length === 0) {
      const uniqueTitle = `Goal ${i + 1} - ${goalTitles[Math.floor(Math.random() * goalTitles.length)]}`;
      usedTitles.push(uniqueTitle);
      
      const goal = await Goal.create({
        performanceCycle: activeCycle._id,
        employee: employee._id,
        title: uniqueTitle,
        description: `Goal: ${uniqueTitle}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        weightage: 10 + (Math.floor(Math.random() * 20)),
        dueDate: new Date(2024, Math.floor(Math.random() * 6) + 6, Math.floor(Math.random() * 28) + 1),
        successCriteria: `Success criteria for ${uniqueTitle}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        assignedBy: hrEmployee._id,
        approvedBy: null,
        approvedAt: null
      });
      goals.push(goal);
      continue;
    }
    
    const title = availableTitles[Math.floor(Math.random() * availableTitles.length)];
    usedTitles.push(title);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    const goal = await Goal.create({
      performanceCycle: activeCycle._id,
      employee: employee._id,
      title,
      description: `Goal: ${title}`,
      category,
      weightage: 10 + (Math.floor(Math.random() * 20)),
      dueDate: new Date(2024, Math.floor(Math.random() * 6) + 6, Math.floor(Math.random() * 28) + 1),
      successCriteria: `Success criteria for ${title}`,
      status,
      assignedBy: hrEmployee._id,
      approvedBy: status === 'approved' ? hrEmployee._id : null,
      approvedAt: status === 'approved' ? new Date() : null
    });
    
    goals.push(goal);
  }
  
  return goals;
};

// Seed Documents
const seedDocuments = async (employees) => {
  console.log('📄 Creating documents...');
  const documents = [];
  const docTypes = ['aadhaar', 'pan', 'passport', 'resume', 'offer_letter', 'appointment_letter', 'id_card'];
  
  // Increase documents for better reporting
  for (let i = 0; i < 100; i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const docType = docTypes[Math.floor(Math.random() * docTypes.length)];
    
    const document = await Document.create({
      employee: employee._id,
      type: docType,
      name: `${docType.replace('_', ' ').toUpperCase()} - ${employee.firstName} ${employee.lastName}`,
      description: `${docType.replace('_', ' ')} document`,
      file: `/documents/${employee.employeeId}/${docType}.pdf`,
      uploadedBy: employee.userId,
      category: 'general'
    });
    
    documents.push(document);
  }
  
  return documents;
};

// Seed Training Programs (NABH)
const seedTrainingPrograms = async (adminUser) => {
  console.log('🎓 Creating training programs...');
  const programs = await TrainingProgram.insertMany([
    {
      name: 'Basic Life Support (BLS)',
      code: 'BLS001',
      description: 'Basic Life Support training for healthcare workers',
      category: 'bls',
      isMandatory: true,
      duration: 4,
      durationUnit: 'hours',
      createdBy: adminUser._id,
      isActive: true
    },
    {
      name: 'Advanced Cardiac Life Support (ACLS)',
      code: 'ACLS001',
      description: 'Advanced Cardiac Life Support training',
      category: 'acls',
      isMandatory: false,
      duration: 16,
      durationUnit: 'hours',
      createdBy: adminUser._id,
      isActive: true
    },
    {
      name: 'Infection Control',
      code: 'IC001',
      description: 'Infection prevention and control training',
      category: 'infection_control',
      isMandatory: true,
      duration: 2,
      durationUnit: 'hours',
      createdBy: adminUser._id,
      isActive: true
    },
    {
      name: 'Fire Safety',
      code: 'FS001',
      description: 'Fire safety and evacuation procedures',
      category: 'fire_safety',
      isMandatory: true,
      duration: 2,
      durationUnit: 'hours',
      createdBy: adminUser._id,
      isActive: true
    },
    {
      name: 'Patient Safety',
      code: 'PS001',
      description: 'Patient safety protocols and best practices',
      category: 'patient_safety',
      isMandatory: true,
      duration: 3,
      durationUnit: 'hours',
      createdBy: adminUser._id,
      isActive: true
    }
  ]);
  return programs;
};

// Seed Training Records
const seedTrainingRecords = async (employees, trainingPrograms, hrEmployee) => {
  console.log('📚 Creating training records...');
  const records = [];
  
  // Increase training records for better compliance reporting
  for (let i = 0; i < 400; i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const program = trainingPrograms[Math.floor(Math.random() * trainingPrograms.length)];
    const status = ['completed', 'completed', 'completed', 'in_progress', 'scheduled'][Math.floor(Math.random() * 5)];
    
    const trainingDate = new Date();
    trainingDate.setDate(trainingDate.getDate() - Math.floor(Math.random() * 365));
    
    let completionDate = null;
    if (status === 'completed') {
      const duration = program.duration || 4;
      completionDate = new Date(trainingDate);
      completionDate.setHours(completionDate.getHours() + duration);
    }
    
    const record = await TrainingRecord.create({
      employee: employee._id,
      trainingProgram: program._id,
      trainingDate,
      completionDate,
      status,
      score: status === 'completed' ? 70 + Math.floor(Math.random() * 30) : null,
      certificateIssued: status === 'completed' && Math.random() > 0.3,
      conductedBy: hrEmployee.userId,
      createdBy: hrEmployee.userId,
      remarks: status === 'completed' ? 'Training completed successfully' : 'Training in progress'
    });
    records.push(record);
  }
  
  return records;
};

// Seed Immunization Records
const seedImmunizations = async (employees) => {
  console.log('💉 Creating immunization records...');
  const immunizations = [];
  const vaccines = ['hbv', 'tt', 'covid', 'influenza', 'mmr'];
  
  for (const employee of employees) {
    // Each employee gets 2-4 vaccines
    const numVaccines = 2 + Math.floor(Math.random() * 3);
    const selectedVaccines = vaccines.slice(0, numVaccines);
    
    for (const vaccineType of selectedVaccines) {
      const totalDoses = vaccineType === 'hbv' ? 3 : (vaccineType === 'covid' ? 2 : 1);
      const doseNumber = totalDoses > 1 ? Math.floor(Math.random() * totalDoses) + 1 : 1;
      
      const vaccinationDate = new Date();
      vaccinationDate.setDate(vaccinationDate.getDate() - Math.floor(Math.random() * 365));
      
      const immunization = await ImmunizationRecord.create({
        employee: employee._id,
        vaccineType,
        vaccineName: vaccineType === 'covid' ? (Math.random() > 0.5 ? 'Covishield' : 'Covaxin') : '',
        doseNumber,
        totalDosesRequired: totalDoses,
        vaccinationDate,
        nextDueDate: doseNumber < totalDoses ? new Date(vaccinationDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null,
        batchNumber: `BATCH${Math.floor(Math.random() * 10000)}`,
        manufacturer: 'Vaccine Manufacturer',
        vaccinationSite: 'Hospital Clinic',
        administeredBy: 'Dr. Medical Officer',
        status: doseNumber < totalDoses ? 'partial' : 'completed'
      });
      immunizations.push(immunization);
    }
  }
  
  return immunizations;
};

// Seed Health Checkups
const seedHealthCheckups = async (employees, hrEmployee) => {
  console.log('🏥 Creating health checkup records...');
  const checkups = [];
  
  // Increase health checkups for better reporting
  for (let i = 0; i < 200; i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const checkupDate = new Date();
    checkupDate.setMonth(checkupDate.getMonth() - Math.floor(Math.random() * 12));
    
    const checkup = await HealthCheckup.create({
      employee: employee._id,
      checkupDate,
      checkupType: 'annual',
      conductedBy: 'Hospital Medical Officer',
      findings: 'Normal health parameters',
      recommendations: 'Continue regular health monitoring',
      nextDueDate: new Date(checkupDate.getTime() + 365 * 24 * 60 * 60 * 1000),
      status: 'completed',
      reportFile: `/health-checkups/${employee.employeeId}/${checkupDate.getTime()}.pdf`
    });
    checkups.push(checkup);
  }
  
  return checkups;
};

// Seed Privilege Categories
const seedPrivilegeCategories = async () => {
  console.log('🛡️ Creating privilege categories...');
  const categories = await PrivilegeCategory.insertMany([
    {
      name: 'Cardiac Procedures',
      code: 'CARD_PROC',
      description: 'Cardiac and cardiovascular procedures',
      isActive: true
    },
    {
      name: 'Orthopedic Surgery',
      code: 'ORTHO_SURG',
      description: 'Orthopedic surgical procedures',
      isActive: true
    },
    {
      name: 'Pediatric Care',
      code: 'PED_CARE',
      description: 'Pediatric patient care procedures',
      isActive: true
    },
    {
      name: 'Emergency Procedures',
      code: 'ER_PROC',
      description: 'Emergency medical procedures',
      isActive: true
    },
    {
      name: 'General Surgery',
      code: 'GEN_SURG',
      description: 'General surgical procedures',
      isActive: true
    }
  ]);
  return categories;
};

// Seed Privilege Committees
const seedPrivilegeCommittees = async (employees, adminEmployee) => {
  console.log('👥 Creating privilege committees...');
  const committeeMembers = employees.filter((e, i) => i < 5);
  
  const committee = await PrivilegeCommittee.create({
    name: 'Medical Privileging Committee',
    code: 'MPC001',
    description: 'Committee responsible for reviewing and approving medical privileges',
    members: committeeMembers.map(e => ({
      employee: e._id,
      role: 'member',
      designation: 'Senior Doctor'
    })),
    chairperson: adminEmployee._id,
    isActive: true,
    createdBy: adminEmployee.userId
  });
  
  return [committee];
};

// Seed Doctor Privileges
const seedDoctorPrivileges = async (employees, privilegeCategories, privilegeCommittees) => {
  console.log('👨‍⚕️ Creating doctor privileges...');
  const privileges = [];
  const doctors = employees.filter((e, i) => i < 20); // First 20 as doctors
  
  for (const doctor of doctors) {
    const category = privilegeCategories[Math.floor(Math.random() * privilegeCategories.length)];
    const validFrom = new Date();
    validFrom.setDate(validFrom.getDate() - Math.floor(Math.random() * 365));
    const validTo = new Date(validFrom);
    validTo.setMonth(validTo.getMonth() + 36);
    
    const privilege = await DoctorPrivilege.create({
      employee: doctor._id,
      privilegeCategory: category._id,
      validFrom,
      validTo,
      validityPeriod: 36,
      status: validTo > new Date() ? 'active' : 'expired',
      isExpired: validTo < new Date(),
      approvedBy: privilegeCommittees[0]._id,
      approvedAt: validFrom
    });
    privileges.push(privilege);
  }
  
  return privileges;
};

// Seed Incident Reports
const seedIncidentReports = async (employees, hrEmployee) => {
  console.log('⚠️ Creating incident reports...');
  const incidents = [];
  const types = ['near_miss', 'incident', 'adverse_event', 'medication_error', 'equipment_failure'];
  
  // Increase incident reports for better reporting
  for (let i = 0; i < 150; i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const incidentDate = new Date();
    incidentDate.setDate(incidentDate.getDate() - Math.floor(Math.random() * 90));
    const type = types[Math.floor(Math.random() * types.length)];
    
    const incident = await IncidentReport.create({
      employee: employee._id,
      incidentType: type,
      incidentDate,
      description: `Incident description for ${type}`,
      severity: ['low', 'medium', 'medium', 'high'][Math.floor(Math.random() * 4)],
      status: ['reported', 'under_investigation', 'resolved', 'closed'][Math.floor(Math.random() * 4)],
      reportedBy: employee.userId,
      actionsTaken: 'Investigation and corrective measures implemented'
    });
    incidents.push(incident);
  }
  
  return incidents;
};

// Seed Competency Matrices
const seedCompetencyMatrices = async (employees, trainingPrograms, hrEmployee) => {
  console.log('📊 Creating competency matrices...');
  const matrices = [];
  const departments = ['Cardiology', 'Orthopedics', 'Pediatrics', 'Emergency', 'General Surgery'];
  
  for (let i = 0; i < 10; i++) {
    const deptEmployees = employees.filter((e, idx) => idx % 5 === i % 5).slice(0, 10);
    const program = trainingPrograms[Math.floor(Math.random() * trainingPrograms.length)];
    
    const matrix = await CompetencyMatrix.create({
      name: `${departments[i % departments.length]} Competency Matrix`,
      code: `CM${String(i + 1).padStart(3, '0')}`,
      description: `Competency matrix for ${departments[i % departments.length]} department`,
      department: deptEmployees[0]?.department || null,
      trainingProgram: program._id,
      competencies: deptEmployees.map((emp, idx) => ({
        employee: emp._id,
        competencyLevel: ['beginner', 'intermediate', 'advanced', 'expert'][Math.floor(Math.random() * 4)],
        lastAssessed: new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000),
        nextAssessmentDue: new Date(Date.now() + Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000),
        status: ['current', 'needs_improvement', 'excellent'][Math.floor(Math.random() * 3)]
      })),
      isActive: true,
      createdBy: hrEmployee.userId
    });
    matrices.push(matrix);
  }
  
  return matrices;
};

// Seed Competency Assessments
const seedCompetencyAssessments = async (employees, competencyMatrices, hrEmployee) => {
  console.log('📝 Creating competency assessments...');
  const assessments = [];
  
  for (let i = 0; i < 200; i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const matrix = competencyMatrices[Math.floor(Math.random() * competencyMatrices.length)];
    const assessmentDate = new Date();
    assessmentDate.setDate(assessmentDate.getDate() - Math.floor(Math.random() * 180));
    
    const assessment = await CompetencyAssessment.create({
      employee: employee._id,
      competencyMatrix: matrix._id,
      assessmentDate,
      assessedBy: hrEmployee.userId,
      competencyLevel: ['beginner', 'intermediate', 'advanced', 'expert'][Math.floor(Math.random() * 4)],
      score: 60 + Math.floor(Math.random() * 40),
      remarks: 'Assessment completed successfully',
      status: 'completed'
    });
    assessments.push(assessment);
  }
  
  return assessments;
};

// Seed Occupational Exposures
const seedOccupationalExposures = async (employees, hrEmployee) => {
  console.log('🦠 Creating occupational exposures...');
  const exposures = [];
  const exposureTypes = ['needlestick', 'blood_splash', 'chemical', 'radiation', 'biological'];
  
  for (let i = 0; i < 100; i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const exposureDate = new Date();
    exposureDate.setDate(exposureDate.getDate() - Math.floor(Math.random() * 180));
    const type = exposureTypes[Math.floor(Math.random() * exposureTypes.length)];
    
    const exposure = await OccupationalExposure.create({
      employee: employee._id,
      exposureType: type,
      incidentDate: exposureDate,
      description: `Occupational exposure incident: ${type}`,
      severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      immediateAction: 'First aid administered',
      followUpRequired: Math.random() > 0.3,
      followUpTests: Math.random() > 0.3 ? [
        {
          testType: 'blood_test',
          testDate: new Date(exposureDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          result: 'negative',
          status: 'completed'
        }
      ] : [],
      status: ['reported', 'under_treatment', 'resolved', 'monitoring'][Math.floor(Math.random() * 4)],
      reportedBy: employee.userId
    });
    exposures.push(exposure);
  }
  
  return exposures;
};

// Seed Privilege Requests
const seedPrivilegeRequests = async (employees, privilegeCategories, privilegeCommittees) => {
  console.log('📋 Creating privilege requests...');
  const requests = [];
  const doctors = employees.filter((e, i) => i < 30); // First 30 as doctors
  
  for (let i = 0; i < 50; i++) {
    const doctor = doctors[Math.floor(Math.random() * doctors.length)];
    const category = privilegeCategories[Math.floor(Math.random() * privilegeCategories.length)];
    const requestDate = new Date();
    requestDate.setDate(requestDate.getDate() - Math.floor(Math.random() * 90));
    
    const statuses = ['submitted', 'under_review', 'hod_approved', 'committee_review', 'approved', 'rejected'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const request = await PrivilegeRequest.create({
      employee: doctor._id,
      privilegeCategory: category._id,
      requestDate,
      requestedPrivileges: [category._id],
      justification: `Request for ${category.name} privileges based on experience and qualifications`,
      supportingDocuments: [],
      status,
      submittedBy: doctor.userId,
      ...(status === 'hod_approved' && {
        hodReview: {
          reviewedBy: employees[0].userId,
          reviewedAt: new Date(requestDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          recommendation: 'approved',
          comments: 'HOD recommendation: Approved'
        }
      }),
      ...(status === 'approved' && {
        committeeReview: {
          reviewedBy: privilegeCommittees[0]._id,
          reviewedAt: new Date(requestDate.getTime() + 14 * 24 * 60 * 60 * 1000),
          recommendation: 'approved',
          comments: 'Committee recommendation: Approved'
        }
      })
    });
    requests.push(request);
  }
  
  return requests;
};

// Seed Salary Components
const seedSalaryComponents = async () => {
  console.log('💰 Creating salary components...');
  const components = await SalaryComponent.insertMany([
    { name: 'Basic Salary', code: 'BASIC', type: 'earning', category: 'basic', calculationType: 'fixed', defaultValue: 0, isActive: true },
    { name: 'HRA', code: 'HRA', type: 'earning', category: 'hra', calculationType: 'percentage_of_basic', defaultValue: 40, isActive: true },
    { name: 'Conveyance Allowance', code: 'CONV', type: 'earning', category: 'conveyance', calculationType: 'fixed', defaultValue: 1600, isActive: true },
    { name: 'Medical Allowance', code: 'MED', type: 'earning', category: 'medical', calculationType: 'fixed', defaultValue: 15000, isActive: true },
    { name: 'PF Employee', code: 'PF_EMP', type: 'deduction', category: 'pf', calculationType: 'percentage_of_basic', defaultValue: 12, isStatutory: true, statutoryType: 'pf_employee', isActive: true },
    { name: 'PF Employer', code: 'PF_EMP_ER', type: 'earning', category: 'pf', calculationType: 'percentage_of_basic', defaultValue: 12, isStatutory: true, statutoryType: 'pf_employer', isActive: true },
    { name: 'ESI Employee', code: 'ESI_EMP', type: 'deduction', category: 'esi', calculationType: 'percentage_of_ctc', defaultValue: 0.75, isStatutory: true, statutoryType: 'esi_employee', isActive: true },
    { name: 'Professional Tax', code: 'PT', type: 'deduction', category: 'pt', calculationType: 'fixed', defaultValue: 200, isStatutory: true, statutoryType: 'pt', isActive: true },
    { name: 'TDS', code: 'TDS', type: 'deduction', category: 'tds', calculationType: 'formula', formula: 'CALC_TDS', isStatutory: true, statutoryType: 'tds', isActive: true }
  ]);
  return components;
};

// Seed Salary Structures
const seedSalaryStructures = async (designations, salaryComponents, hrEmployee) => {
  console.log('💼 Creating salary structures...');
  const structures = [];
  
  for (let i = 0; i < 5; i++) {
    const designation = designations[i + 3]; // Skip CEO, MD, CMO
    const basic = [50000, 75000, 100000, 150000, 200000][i];
    
    const structure = await SalaryStructure.create({
      name: `${designation.name} Structure`,
      code: `STR${String(i + 1).padStart(3, '0')}`,
      description: `Salary structure for ${designation.name}`,
      applicableDesignations: [designation._id],
      components: [
        { component: salaryComponents[0]._id, amount: basic, formula: null }, // Basic
        { component: salaryComponents[1]._id, amount: null, formula: 'BASIC * 0.40' }, // HRA
        { component: salaryComponents[2]._id, amount: 1600, formula: null }, // Conveyance
        { component: salaryComponents[3]._id, amount: 15000, formula: null }, // Medical
      ],
      isActive: true,
      createdBy: hrEmployee.userId
    });
    structures.push(structure);
  }
  
  return structures;
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting comprehensive seed process...\n');
    
    // 1. Companies
    const company = await seedCompanies();
    
    // 2. Branches
    const branches = await seedBranches(company);
    
    // 3. Departments
    const departments = await seedDepartments(company, branches);
    
    // 4. Designations
    const designations = await seedDesignations();
    
    // 5. Shifts
    const shifts = await seedShifts();
    
    // 6. Leave Types
    const leaveTypes = await seedLeaveTypes();
    
    // 7. Users and Employees
    const { users, employees, adminUser, adminEmployee, hrUser, hrEmployee } = await seedUsersAndEmployees(
      departments, designations, shifts, branches
    );
    
    // 8. Performance Cycles
    const performanceCycles = await seedPerformanceCycles(adminUser);
    
    // 9. Attendance
    const attendanceRecords = await seedAttendance(employees, shifts);
    
    // 10. Leave Requests
    const leaveRequests = await seedLeaveRequests(employees, leaveTypes, hrEmployee);
    
    // 11. Assets
    const assets = await seedAssets(employees);
    
    // 12. Expenses
    const expenses = await seedExpenses(employees, hrEmployee);
    
    // 13. Goals
    const goals = await seedGoals(employees, performanceCycles, hrEmployee);
    
    // 14. Documents
    const documents = await seedDocuments(employees);
    
    // 15. Training Programs (NABH)
    const trainingPrograms = await seedTrainingPrograms(adminUser);
    
    // 16. Training Records (NABH)
    const trainingRecords = await seedTrainingRecords(employees, trainingPrograms, hrEmployee);
    
    // 17. Immunization Records (NABH)
    const immunizations = await seedImmunizations(employees);
    
    // 18. Health Checkups (NABH)
    const healthCheckups = await seedHealthCheckups(employees, hrEmployee);
    
    // 19. Privilege Categories (NABH)
    const privilegeCategories = await seedPrivilegeCategories();
    
    // 20. Privilege Committees (NABH)
    const privilegeCommittees = await seedPrivilegeCommittees(employees, adminEmployee);
    
    // 21. Doctor Privileges (NABH)
    const doctorPrivileges = await seedDoctorPrivileges(employees, privilegeCategories, privilegeCommittees);
    
    // 22. Incident Reports (NABH)
    const incidentReports = await seedIncidentReports(employees, hrEmployee);
    
    // 22a. Competency Matrices (NABH)
    const competencyMatrices = await seedCompetencyMatrices(employees, trainingPrograms, hrEmployee);
    
    // 22b. Competency Assessments (NABH)
    const competencyAssessments = await seedCompetencyAssessments(employees, competencyMatrices, hrEmployee);
    
    // 22c. Occupational Exposures (NABH)
    const occupationalExposures = await seedOccupationalExposures(employees, hrEmployee);
    
    // 22d. Privilege Requests (NABH)
    const privilegeRequests = await seedPrivilegeRequests(employees, privilegeCategories, privilegeCommittees);
    
    // 23. Salary Components
    const salaryComponents = await seedSalaryComponents();
    
    // 24. Salary Structures
    const salaryStructures = await seedSalaryStructures(designations, salaryComponents, hrEmployee);
    
    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Companies: 1`);
    console.log(`   - Branches: ${branches.length}`);
    console.log(`   - Departments: ${departments.length}`);
    console.log(`   - Designations: ${designations.length}`);
    console.log(`   - Shifts: ${shifts.length}`);
    console.log(`   - Leave Types: ${leaveTypes.length}`);
    console.log(`   - Performance Cycles: ${performanceCycles.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Employees: ${employees.length}`);
    console.log(`   - Attendance Records: ${attendanceRecords.length}`);
    console.log(`   - Leave Requests: ${leaveRequests.length}`);
    console.log(`   - Assets: ${assets.length}`);
    console.log(`   - Expenses: ${expenses.length}`);
    console.log(`   - Goals: ${goals.length}`);
    console.log(`   - Documents: ${documents.length}`);
    console.log(`   - Training Programs: ${trainingPrograms.length}`);
    console.log(`   - Training Records: ${trainingRecords.length}`);
    console.log(`   - Immunization Records: ${immunizations.length}`);
    console.log(`   - Health Checkups: ${healthCheckups.length}`);
    console.log(`   - Privilege Categories: ${privilegeCategories.length}`);
    console.log(`   - Privilege Committees: ${privilegeCommittees.length}`);
    console.log(`   - Doctor Privileges: ${doctorPrivileges.length}`);
    console.log(`   - Incident Reports: ${incidentReports.length}`);
    console.log(`   - Competency Matrices: ${competencyMatrices.length}`);
    console.log(`   - Competency Assessments: ${competencyAssessments.length}`);
    console.log(`   - Occupational Exposures: ${occupationalExposures.length}`);
    console.log(`   - Privilege Requests: ${privilegeRequests.length}`);
    console.log(`   - Salary Components: ${salaryComponents.length}`);
    console.log(`   - Salary Structures: ${salaryStructures.length}`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('   Admin:');
    console.log('     Email: admin@vaaltic.com');
    console.log('     Password: Admin@123');
    console.log('   HR:');
    console.log('     Email: hr@vaaltic.com');
    console.log('     Password: Hr@12345');
    console.log('   Employees:');
    console.log('     Email: employee1@vaaltic.com to employee80@vaaltic.com');
    console.log('     Password: Employee@123');
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    await clearDatabase();
    await seedDatabase();
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed script failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed script
main();

