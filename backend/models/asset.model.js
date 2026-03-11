import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  assetId: { type: String, required: true, unique: true },
  barcodeToken: { type: String, default: null },
  qrToken: { type: String, default: null },

  name: { type: String, required: true },
  category: { type: String, required: true },
  brand: { type: String, default: '' },
  model: { type: String, default: '' },
  serialNumber: { type: String, default: '' },
  imei: { type: String, default: '' },
  sku: { type: String, default: '' },

  purchaseDate: { type: Date, default: null },
  purchaseCost: { type: Number, default: 0 },
  currentValue: { type: Number, default: 0 },
  vendor: { type: String, default: '' },
  warrantyExpiry: { type: Date, default: null },
  warrantyProvider: { type: String, default: '' },

  location: { type: String, default: '' },
  subLocation: { type: String, default: '' },

  condition: {
    type: String,
    enum: ['new', 'good', 'fair', 'damaged'],
    default: 'new'
  },
  status: {
    type: String,
    enum: ['available', 'in_use', 'reserved', 'maintenance', 'retired'],
    default: 'available'
  },

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  assignedDate: { type: Date, default: null },
  returnedDate: { type: Date, default: null },
  expectedReturnDate: { type: Date, default: null },
  assignmentPurpose: { type: String, default: '' },
  costCenter: { type: String, default: '' },
  conditionNote: { type: String, default: '' },
  conditionPhoto: { type: String, default: null },

  approval: {
    required: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'not_required'], default: 'not_required' },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    note: { type: String, default: '' }
  },

  assignmentAcknowledgement: {
    acknowledged: { type: Boolean, default: false },
    method: { type: String, enum: ['checkbox', 'esign', 'otp', null], default: null },
    acknowledgedAt: { type: Date, default: null }
  },

  reminderDate: { type: Date, default: null },

  description: { type: String, default: '' },
  customAttributes: [{
    key: { type: String },
    value: { type: String }
  }],

  attachments: [{
    type: { type: String, enum: ['invoice', 'warranty', 'photo', 'other'], default: 'other' },
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// assetId already has unique: true in schema definition above
assetSchema.index({ category: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ location: 1, subLocation: 1 });
assetSchema.index({ warrantyExpiry: 1 });

const assetHistorySchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  action: {
    type: String,
    enum: ['created', 'assigned', 'returned', 'scrapped', 'updated', 'acknowledged', 'return_requested', 'maintenance_requested'],
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export const Asset = mongoose.model('Asset', assetSchema);
export const AssetHistory = mongoose.model('AssetHistory', assetHistorySchema);
