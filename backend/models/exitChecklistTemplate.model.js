import mongoose from 'mongoose';

const templateItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['asset_return', 'access_revocation', 'knowledge_transfer', 'attendance_approval', 'finance_clearance', 'id_card_return', 'it_deactivation', 'other'],
    required: true
  },
  responsibleDepartment: {
    type: String,
    enum: ['hr', 'it', 'admin', 'finance', 'manager', 'employee'],
    required: true
  },
  isMandatory: {
    type: Boolean,
    default: true
  },
  conditions: {
    // Conditions for when this item should be included
    requiresAssets: {
      type: Boolean,
      default: false
    },
    requiresITAccess: {
      type: Boolean,
      default: false
    },
    requiresFinanceClearance: {
      type: Boolean,
      default: false
    },
    departmentSpecific: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    }],
    designationSpecific: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation'
    }],
    locationSpecific: [{
      type: String
    }]
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { _id: true });

const exitChecklistTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  items: [templateItemSchema],
  applicableTo: {
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    }],
    designations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation'
    }],
    locations: [{
      type: String
    }],
    employeeCategories: [{
      type: String,
      enum: ['executive', 'manager', 'senior', 'junior', 'trainee']
    }]
  }
}, {
  timestamps: true
});

// Indexes
exitChecklistTemplateSchema.index({ isDefault: 1, isActive: 1 });
exitChecklistTemplateSchema.index({ 'applicableTo.departments': 1 });
exitChecklistTemplateSchema.index({ 'applicableTo.designations': 1 });

export default mongoose.model('ExitChecklistTemplate', exitChecklistTemplateSchema);

