import mongoose from 'mongoose';

const privilegeCommitteeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  // Committee members
  members: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    role: {
      type: String,
      enum: ['chairperson', 'member', 'secretary'],
      default: 'member'
    },
    designation: {
      type: String,
      default: ''
    }
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
privilegeCommitteeSchema.index({ isActive: 1 });
privilegeCommitteeSchema.index({ 'members.employee': 1 });

export default mongoose.model('PrivilegeCommittee', privilegeCommitteeSchema);

