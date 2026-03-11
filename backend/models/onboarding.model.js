import mongoose from 'mongoose';

const onboardingTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['general', 'it', 'departmental', 'leadership', 'intern'],
    default: 'general'
  },
  version: {
    type: Number,
    default: 1
  },
  parentTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardingTemplate',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isLatestVersion: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Linking logic - can be linked to multiple departments, designations, etc.
  linkedDepartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  linkedDesignations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation'
  }],
  linkedEmployeeTypes: [{
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'internship']
  }],
  linkedLocations: [{
    type: String
  }],
  tasks: [{
    taskName: {
      type: String,
      required: true
    },
    taskDescription: {
      type: String,
      default: ''
    },
    responsibleRole: {
      type: String,
      enum: ['employee', 'hr', 'manager', 'it', 'admin'],
      default: 'employee',
      required: true
    },
    dueDays: {
      type: Number,
      required: true,
      default: 0
    },
    isMandatory: {
      type: Boolean,
      default: true
    },
    requiresAttachment: {
      type: Boolean,
      default: false
    },
    requiresApproval: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// Indexes for filtering
onboardingTemplateSchema.index({ category: 1, isActive: 1 });
onboardingTemplateSchema.index({ isLatestVersion: 1, isActive: 1 });
onboardingTemplateSchema.index({ linkedDepartments: 1 });
onboardingTemplateSchema.index({ linkedDesignations: 1 });
onboardingTemplateSchema.index({ parentTemplate: 1 });

const onboardingTaskSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardingTemplate',
    required: true
  },
  joiningDate: {
    type: Date,
    required: true
  },
  tasks: [{
    taskName: {
      type: String,
      required: true
    },
    taskDescription: {
      type: String,
      default: ''
    },
    responsibleRole: {
      type: String,
      enum: ['employee', 'hr', 'manager', 'it', 'admin'],
      required: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    isCustom: {
      type: Boolean,
      default: false
    },
    dueDate: {
      type: Date,
      required: true
    },
    requiresAttachment: {
      type: Boolean,
      default: false
    },
    requiresApproval: {
      type: Boolean,
      default: false
    },
    attachment: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue', 'pending_approval'],
      default: 'pending'
    },
    completedAt: {
      type: Date,
      default: null
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    comments: {
      type: String,
      default: ''
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'in_progress'
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  notificationsSent: {
    employee: {
      type: Boolean,
      default: false
    },
    manager: {
      type: Boolean,
      default: false
    },
    it: {
      type: Boolean,
      default: false
    },
    hr: {
      type: Boolean,
      default: false
    }
  },
  complianceChecks: {
    documentsComplete: {
      type: Boolean,
      default: false
    },
    offerAccepted: {
      type: Boolean,
      default: false
    },
    profileComplete: {
      type: Boolean,
      default: false
    },
    checkedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

onboardingTaskSchema.index({ employee: 1, status: 1 });
onboardingTaskSchema.index({ 'tasks.dueDate': 1 });
onboardingTaskSchema.index({ joiningDate: 1 });

export const OnboardingTemplate = mongoose.model('OnboardingTemplate', onboardingTemplateSchema);
export const OnboardingTask = mongoose.model('OnboardingTask', onboardingTaskSchema);
