import mongoose from 'mongoose';

const transferItemSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  accessories: [{ type: String }]
}, { _id: false });

const transferRequestSchema = new mongoose.Schema({
  fromEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
  toEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
  fromLocation: { type: String, default: '' },
  toLocation: { type: String, default: '' },
  items: [transferItemSchema],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvals: [{
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decision: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    decidedAt: { type: Date, default: null },
    note: { type: String, default: '' }
  }],
  note: { type: String, default: '' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

transferRequestSchema.index({ status: 1 });

export default mongoose.model('TransferRequest', transferRequestSchema);

