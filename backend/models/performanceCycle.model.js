import mongoose from 'mongoose';

const performanceCycleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  cycleType: {
    type: String,
    enum: ['half_yearly', 'annual', 'quarterly'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'frozen', 'closed'],
    default: 'draft'
  },
  associatedDepartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  visibilitySettings: {
    goalStatusVisibleTo: [{
      type: String,
      enum: ['employee', 'manager', 'hr', 'admin']
    }],
    ratingsVisibleTo: [{
      type: String,
      enum: ['employee', 'manager', 'hr', 'admin']
    }]
  },
  employeeInclusion: {
    includeAllActive: {
      type: Boolean,
      default: true
    },
    excludeNoticePeriod: {
      type: Boolean,
      default: false
    },
    includedEmployees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }],
    excludedEmployees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }]
  },
  workflowWindows: {
    goalSetting: {
      startDate: {
        type: Date,
        default: null
      },
      endDate: {
        type: Date,
        default: null
      },
      enabled: {
        type: Boolean,
        default: true
      }
    },
    selfAssessment: {
      startDate: {
        type: Date,
        default: null
      },
      endDate: {
        type: Date,
        default: null
      },
      enabled: {
        type: Boolean,
        default: true
      }
    },
    managerReview: {
      startDate: {
        type: Date,
        default: null
      },
      endDate: {
        type: Date,
        default: null
      },
      enabled: {
        type: Boolean,
        default: true
      }
    }
  },
  notifications: {
    goalSettingEnabled: {
      type: Boolean,
      default: true
    },
    selfAssessmentEnabled: {
      type: Boolean,
      default: true
    },
    managerReviewEnabled: {
      type: Boolean,
      default: true
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activatedAt: {
    type: Date,
    default: null
  },
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  frozenAt: {
    type: Date,
    default: null
  },
  frozenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes
performanceCycleSchema.index({ status: 1, startDate: -1 });
performanceCycleSchema.index({ associatedDepartments: 1 });
performanceCycleSchema.index({ 'employeeInclusion.includedEmployees': 1 });
performanceCycleSchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if cycle is currently active
performanceCycleSchema.virtual('isCurrentlyActive').get(function() {
  if (this.status !== 'active') return false;
  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
});

// Method to get eligible employees
performanceCycleSchema.methods.getEligibleEmployees = async function() {
  const Employee = mongoose.model('Employee');
  let query = { status: 'active' };

  // Filter by departments if specified
  if (this.associatedDepartments && this.associatedDepartments.length > 0) {
    query.department = { $in: this.associatedDepartments };
  }

  // Exclude notice period employees if setting is enabled
  if (this.employeeInclusion.excludeNoticePeriod) {
    query.$or = [
      { noticePeriodEndDate: null },
      { noticePeriodEndDate: { $gt: new Date() } }
    ];
  }

  let employees = await Employee.find(query);

  // Apply manual inclusions/exclusions
  if (this.employeeInclusion.includeAllActive) {
    // Remove excluded employees
    if (this.employeeInclusion.excludedEmployees && this.employeeInclusion.excludedEmployees.length > 0) {
      const excludedIds = this.employeeInclusion.excludedEmployees.map(e => e.toString());
      employees = employees.filter(e => !excludedIds.includes(e._id.toString()));
    }
    // Add manually included employees
    if (this.employeeInclusion.includedEmployees && this.employeeInclusion.includedEmployees.length > 0) {
      const includedIds = this.employeeInclusion.includedEmployees.map(e => e.toString());
      const includedEmployees = await Employee.find({ _id: { $in: this.employeeInclusion.includedEmployees } });
      const existingIds = employees.map(e => e._id.toString());
      includedEmployees.forEach(emp => {
        if (!existingIds.includes(emp._id.toString())) {
          employees.push(emp);
        }
      });
    }
  } else {
    // Only include manually specified employees
    employees = await Employee.find({ _id: { $in: this.employeeInclusion.includedEmployees } });
  }

  return employees;
};

export default mongoose.model('PerformanceCycle', performanceCycleSchema);

