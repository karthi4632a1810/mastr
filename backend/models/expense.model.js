import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  name: String,
  url: String,
  hash: String,
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const expenseItemSchema = new mongoose.Schema({
  expenseDate: { type: Date, required: true },
  category: { type: String, required: true },
  subCategory: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  notes: { type: String, default: '' },
  attachments: [attachmentSchema]
}, { _id: false });

const approvalStepSchema = new mongoose.Schema({
  level: { type: String, default: 'manager' }, // manager/hr/finance
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  decidedAt: { type: Date, default: null },
  note: { type: String, default: '' }
}, { _id: false });

const expenseClaimSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  title: { type: String, required: true },
  tripType: { type: String, enum: ['local', 'domestic', 'international'], default: 'local' },
  purpose: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  costCenter: { type: String, default: '' },
  project: { type: String, default: '' },
  currency: { type: String, default: 'INR' },

  items: { type: [expenseItemSchema], default: [] },
  totalAmount: { type: Number, default: 0 },

  attachments: [attachmentSchema],

  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'paid'],
    default: 'pending'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null },
  paidAt: { type: Date, default: null },
  paymentMethod: { type: String, enum: ['bank_transfer', 'cash', 'cheque', null], default: null },
  paymentTxnId: { type: String, default: '' },
  paymentDate: { type: Date, default: null },

  approvals: { type: [approvalStepSchema], default: [] },
  approverNote: { type: String, default: '' }
}, { timestamps: true });

expenseClaimSchema.index({ employee: 1, startDate: 1, endDate: 1 });
expenseClaimSchema.index({ status: 1 });

export default mongoose.model('ExpenseClaim', expenseClaimSchema);
