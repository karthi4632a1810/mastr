import mongoose from 'mongoose';

const privilegeCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  categoryType: {
    type: String,
    enum: ['general', 'procedure', 'specialty', 'emergency'],
    required: true
  },
  // Requirements for this privilege
  requirements: {
    minimumQualification: {
      type: String,
      default: ''
    },
    minimumExperience: {
      years: {
        type: Number,
        default: 0
      },
      months: {
        type: Number,
        default: 0
      }
    },
    requiredTraining: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrainingProgram'
    }],
    requiredCompetencies: [{
      type: String
    }],
    specialRequirements: {
      type: String,
      default: ''
    }
  },
  // Validity & Renewal
  defaultValidityPeriod: {
    type: Number, // in months
    default: 36 // Typically 3 years
  },
  renewalRequired: {
    type: Boolean,
    default: true
  },
  renewalRequirements: {
    cmeHours: {
      type: Number,
      default: 0
    },
    caseLogRequired: {
      type: Boolean,
      default: false
    },
    minimumCases: {
      type: Number,
      default: 0
    },
    reassessmentRequired: {
      type: Boolean,
      default: false
    }
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes
privilegeCategorySchema.index({ code: 1, isActive: 1 });
privilegeCategorySchema.index({ categoryType: 1, isActive: 1 });

export default mongoose.model('PrivilegeCategory', privilegeCategorySchema);

