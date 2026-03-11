import mongoose from 'mongoose';

const trainingProgramSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
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
  category: {
    type: String,
    enum: [
      'bls', // Basic Life Support
      'acls', // Advanced Cardiac Life Support
      'infection_control',
      'fire_safety',
      'radiation_safety',
      'biomedical_waste',
      'patient_safety',
      'nabh_standards',
      'clinical_skills',
      'medication_safety',
      'other'
    ],
    required: true
  },
  isMandatory: {
    type: Boolean,
    default: false
  },
  // Role/Department specific mandatory requirements
  mandatoryFor: {
    roles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    }],
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    }],
    designations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation'
    }]
  },
  validityPeriod: {
    type: Number, // in months
    default: null // null means no expiry
  },
  renewalRequired: {
    type: Boolean,
    default: false
  },
  // Training method
  trainingMethod: {
    type: String,
    enum: ['classroom', 'online', 'hands_on', 'hybrid', 'external'],
    default: 'classroom'
  },
  duration: {
    hours: {
      type: Number,
      default: 0
    },
    days: {
      type: Number,
      default: 0
    }
  },
  // Assessment requirements
  requiresAssessment: {
    type: Boolean,
    default: true
  },
  passingScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 70
  },
  requiresCertificate: {
    type: Boolean,
    default: true
  },
  // NABH compliance
  nabhClauses: [{
    type: String // e.g., "HR.4.1", "HR.4.2"
  }],
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
trainingProgramSchema.index({ code: 1, isActive: 1 });
trainingProgramSchema.index({ category: 1, isActive: 1 });
trainingProgramSchema.index({ isMandatory: 1, isActive: 1 });

export default mongoose.model('TrainingProgram', trainingProgramSchema);

