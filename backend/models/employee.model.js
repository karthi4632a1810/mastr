import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  alternatePhone: {
    type: String,
    default: null
  },
  alternateEmail: {
    type: String,
    default: null,
    lowercase: true
  },
  linkedInProfile: {
    type: String,
    default: null
  },
  skypeId: {
    type: String,
    default: null
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    default: null
  },
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed'],
    default: null
  },
  nationality: {
    type: String,
    default: 'Indian'
  },
  panNumber: {
    type: String,
    default: null,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number format']
  },
  aadhaarNumber: {
    type: String,
    default: null,
    match: [/^\d{12}$/, 'Aadhaar number must be 12 digits']
  },
  passportNumber: {
    type: String,
    default: null
  },
  profilePhoto: {
    type: String,
    default: null
  },
  faceEligible: {
    type: Boolean,
    default: false
  },
  faceDescriptor: {
    type: [Number], // Array of 128 numbers (face descriptor vector)
    default: null,
    select: false // Don't include in default queries for security
  },
  faceDescriptorGeneratedAt: {
    type: Date,
    default: null
  },
  faceDescriptorGeneratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: false // Optional for self-created profiles (e.g., admin)
  },
  designation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    required: false // Optional for self-created profiles (e.g., admin)
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    default: null
  },
  joiningDate: {
    type: Date,
    required: true
  },
  employeeType: {
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'intern', 'consultant'],
    default: 'full_time'
  },
  employmentType: {
    type: String,
    enum: ['permanent', 'temporary', 'contractual'],
    default: 'permanent'
  },
  probationPeriodEndDate: {
    type: Date,
    default: null
  },
  confirmationDate: {
    type: Date,
    default: null
  },
  reportingManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  workLocation: {
    type: String,
    default: null
  },
  employeeCategory: {
    type: String,
    enum: ['executive', 'manager', 'senior', 'junior', 'trainee'],
    default: null
  },
  grade: {
    type: String,
    default: null
  },
  costCenter: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'notice_period', 'inactive'],
    default: 'active'
  },
  noticePeriodEndDate: {
    type: Date,
    default: null
  },
  salary: {
    type: Number,
    default: 0
  },
  
  // ===== SALARY STRUCTURE ASSIGNMENT (Story 8.2) =====
  salaryStructure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryStructure',
    default: null
  },
  ctc: {
    type: Number,
    default: 0  // Annual CTC
  },
  salaryMode: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly'
  },
  salaryEffectiveFrom: {
    type: Date,
    default: null
  },
  calculatedComponents: {
    basic: { type: Number, default: 0 },
    grossMonthly: { type: Number, default: 0 },
    netMonthly: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    employerContributions: { type: Number, default: 0 }
  },
  salaryHistory: [{
    salaryStructure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryStructure'
    },
    structureName: String, // Snapshot of name at time of assignment
    ctc: Number,
    basic: Number,
    grossMonthly: Number,
    netMonthly: Number,
    effectiveFrom: {
      type: Date,
      required: true
    },
    effectiveTo: {
      type: Date,
      default: null
    },
    reason: {
      type: String,
      enum: ['initial', 'increment', 'promotion', 'correction', 'structure_change', 'demotion', 'other'],
      default: 'initial'
    },
    remarks: String,
    incrementPercentage: Number,
    incrementAmount: Number,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  bankDetails: {
    accountNumber: {
      type: String,
      default: null
    },
    bankName: {
      type: String,
      default: null
    },
    ifscCode: {
      type: String,
      default: null,
      uppercase: true
    },
    branchName: {
      type: String,
      default: null
    },
    accountHolderName: {
      type: String,
      default: null
    }
  },
  statutoryDetails: {
    uan: {
      type: String,
      default: null,
      match: [/^\d{12}$/, 'UAN must be 12 digits']
    },
    esiNumber: {
      type: String,
      default: null
    },
    pfNumber: {
      type: String,
      default: null
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relation: String,
    phone: String,
    address: String
  },
  education: [{
    degree: String,
    institution: String,
    fieldOfStudy: String,
    yearOfCompletion: Number,
    percentage: Number,
    grade: String
  }],
  skills: [{
    name: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert']
    }
  }],
  certifications: [{
    name: String,
    issuer: String,
    issueDate: Date,
    expiryDate: Date,
    certificateNumber: String,
    certificateFile: String
  }],
  languages: [{
    name: String,
    proficiency: {
      type: String,
      enum: ['basic', 'conversational', 'fluent', 'native']
    }
  }],
  documents: [{
    type: {
      type: String,
      enum: ['id_proof', 'certificate', 'contract', 'other']
    },
    name: String,
    file: String,
    uploadedAt: Date
  }],
  history: [{
    type: {
      type: String,
      enum: ['department_change', 'designation_change', 'salary_revision', 'status_change', 'location_change']
    },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  changeRequests: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    comments: String
  }]
}, {
  timestamps: true
});

export default mongoose.model('Employee', employeeSchema);
