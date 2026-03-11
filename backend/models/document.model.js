import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'general'
  },
  file: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    file: String,
    version: Number,
    uploadedAt: Date
  }],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiryDate: {
    type: Date,
    default: null
  },
  isExpired: {
    type: Boolean,
    default: false
  },
  accessControl: {
    viewableBy: [{
      type: String,
      enum: ['employee', 'hr', 'admin']
    }],
    editableBy: [{
      type: String,
      enum: ['hr', 'admin']
    }]
  },
  tags: [String],
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export default mongoose.model('Document', documentSchema);
