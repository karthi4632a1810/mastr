import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  module: {
    type: String,
    required: true,
    enum: [
      'employees',
      'attendance',
      'leave',
      'payroll',
      'recruitment',
      'onboarding',
      'assets',
      'expenses',
      'grievances',
      'departments',
      'designations',
      'branches',
      'shifts',
      'settings',
      'audit',
      'analytics',
      'documents'
    ]
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'export', 'import', 'manage']
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

permissionSchema.index({ module: 1, action: 1 });

export default mongoose.model('Permission', permissionSchema);

