import mongoose from 'mongoose';

const cameraAssignmentSchema = new mongoose.Schema({
  camera: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camera',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  // Auto punch-in enabled for this assignment
  autoPunchInEnabled: {
    type: Boolean,
    default: true
  },
  // Priority for this assignment (lower = higher priority)
  priority: {
    type: Number,
    default: 1
  },
  // Assignment metadata
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
cameraAssignmentSchema.index({ camera: 1, employee: 1 }, { unique: true });
cameraAssignmentSchema.index({ employee: 1, isActive: 1 });
cameraAssignmentSchema.index({ camera: 1, isActive: 1 });
cameraAssignmentSchema.index({ autoPunchInEnabled: 1, isActive: 1 });

export default mongoose.model('CameraAssignment', cameraAssignmentSchema);

