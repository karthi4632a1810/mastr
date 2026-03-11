import mongoose from 'mongoose';

const jobOpeningSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  designation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: [String],
  location: {
    type: String,
    required: true
  },
  locationType: {
    type: String,
    enum: ['onsite', 'remote', 'hybrid'],
    default: 'onsite',
    required: true
  },
  vacancyCount: {
    type: Number,
    required: true,
    min: 1
  },
  employmentType: {
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'internship'],
    default: 'full_time',
    required: true
  },
  experienceRange: {
    min: {
      type: Number,
      default: 0,
      min: 0
    },
    max: {
      type: Number,
      default: null,
      min: 0
    }
  },
  salaryRange: {
    min: {
      type: Number,
      default: null,
      min: 0
    },
    max: {
      type: Number,
      default: null,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  requiredSkills: [{
    type: String,
    trim: true
  }],
  hiringManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  applicationStartDate: {
    type: Date,
    default: Date.now
  },
  applicationEndDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'closed'],
    default: 'draft',
    required: true
  },
  publishedTo: {
    internal: {
      type: Boolean,
      default: false
    },
    public: {
      type: Boolean,
      default: false
    },
    linkedin: {
      type: Boolean,
      default: false
    },
    naukri: {
      type: Boolean,
      default: false
    },
    indeed: {
      type: Boolean,
      default: false
    }
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postedDate: {
    type: Date,
    default: null
  },
  closingDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

jobOpeningSchema.index({ status: 1, department: 1 });
jobOpeningSchema.index({ 'publishedTo.internal': 1, status: 1 });
jobOpeningSchema.index({ 'publishedTo.public': 1, status: 1 });

const candidateSchema = new mongoose.Schema({
  jobOpening: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobOpening',
    required: true
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
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  experience: {
    years: {
      type: Number,
      default: 0,
      min: 0
    },
    months: {
      type: Number,
      default: 0,
      min: 0,
      max: 11
    }
  },
  source: {
    type: String,
    enum: ['referral', 'job_portal', 'website', 'walk_in', 'agency', 'linkedin', 'naukri', 'indeed', 'other'],
    default: 'other'
  },
  resume: {
    type: String,
    required: true
  },
  resumeFileName: {
    type: String,
    default: ''
  },
  coverLetter: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  extractedSkills: [{
    type: String,
    trim: true
  }],
  assignedRecruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stage: {
    type: String,
    enum: ['applied', 'screening', 'shortlisted', 'interview', 'hr_interview', 'manager_round', 'offer', 'hired', 'rejected'],
    default: 'applied'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  interviews: [{
    round: {
      type: String,
      enum: ['technical', 'hr', 'manager', 'cultural', 'final', 'other'],
      default: 'other'
    },
    scheduledDate: {
      type: Date,
      required: true
    },
    scheduledTime: {
      type: String,
      default: ''
    },
    mode: {
      type: String,
      enum: ['in_person', 'video', 'phone'],
      default: 'in_person'
    },
    location: {
      type: String,
      default: ''
    },
    meetingLink: {
      type: String,
      default: ''
    },
    interviewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    feedback: {
      writtenComments: {
        type: String,
        default: ''
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      },
      technicalScore: {
        type: Number,
        min: 0,
        max: 10,
        default: null
      },
      communicationScore: {
        type: Number,
        min: 0,
        max: 10,
        default: null
      },
      cultureFitScore: {
        type: Number,
        min: 0,
        max: 10,
        default: null
      },
      recommendation: {
        type: String,
        enum: ['proceed', 'hold', 'reject'],
        default: null
      },
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      submittedAt: {
        type: Date,
        default: null
      }
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled'
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    cancellationReason: {
      type: String,
      default: ''
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    candidateNotified: {
      type: Boolean,
      default: false
    },
    calendarSynced: {
      type: Boolean,
      default: false
    },
    calendarEventId: {
      type: String,
      default: ''
    }
  }],
  convertedToEmployee: {
    type: Boolean,
    default: false
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for duplicate checking
candidateSchema.index({ email: 1, jobOpening: 1 });
candidateSchema.index({ phone: 1, jobOpening: 1 });
candidateSchema.index({ jobOpening: 1, stage: 1 });
candidateSchema.index({ assignedRecruiter: 1 });

const jobHistorySchema = new mongoose.Schema({
  jobOpening: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobOpening',
    required: true
  },
  action: {
    type: String,
    enum: ['created', 'updated', 'status_changed', 'published', 'unpublished', 'duplicated', 'approved'],
    required: true
  },
  field: {
    type: String,
    default: null
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

jobHistorySchema.index({ jobOpening: 1, createdAt: -1 });

const candidateStageHistorySchema = new mongoose.Schema({
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  fromStage: {
    type: String,
    enum: ['applied', 'screening', 'shortlisted', 'interview', 'hr_interview', 'manager_round', 'offer', 'hired', 'rejected'],
    default: null
  },
  toStage: {
    type: String,
    enum: ['applied', 'screening', 'shortlisted', 'interview', 'hr_interview', 'manager_round', 'offer', 'hired', 'rejected'],
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comments: {
    type: String,
    default: ''
  },
  notifiedCandidate: {
    type: Boolean,
    default: false
  },
  notifiedInterviewer: {
    type: Boolean,
    default: false
  },
  isOverride: {
    type: Boolean,
    default: false
  },
  overrideReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

candidateStageHistorySchema.index({ candidate: 1, createdAt: -1 });
candidateStageHistorySchema.index({ changedBy: 1 });

export const JobOpening = mongoose.model('JobOpening', jobOpeningSchema);
export const Candidate = mongoose.model('Candidate', candidateSchema);
export const JobHistory = mongoose.model('JobHistory', jobHistorySchema);
export const CandidateStageHistory = mongoose.model('CandidateStageHistory', candidateStageHistorySchema);
