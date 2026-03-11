import mongoose from 'mongoose';

const competencyMatrixSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  // Scope: role-based, department-based, or designation-based
  scope: {
    type: String,
    enum: ['role', 'department', 'designation', 'global'],
    required: true
  },
  scopeIds: [{
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'scopeRef'
  }],
  scopeRef: {
    type: String,
    enum: ['Role', 'Department', 'Designation', null],
    default: null
  },
  competencies: [{
    competencyName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      enum: ['clinical', 'technical', 'behavioral', 'safety', 'administrative', 'other'],
      default: 'clinical'
    },
    isMandatory: {
      type: Boolean,
      default: true
    },
    requiredLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    assessmentMethod: {
      type: String,
      enum: ['written_test', 'practical', 'observation', 'simulation', 'peer_review', 'combined'],
      default: 'practical'
    },
    renewalPeriod: {
      type: Number, // in months
      default: null // null means no renewal required
    },
    linkedTrainingPrograms: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrainingProgram'
    }],
    nabhClauses: [{
      type: String
    }]
  }],
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
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
competencyMatrixSchema.index({ scope: 1, scopeIds: 1, isActive: 1 });
competencyMatrixSchema.index({ isActive: 1 });

export default mongoose.model('CompetencyMatrix', competencyMatrixSchema);

