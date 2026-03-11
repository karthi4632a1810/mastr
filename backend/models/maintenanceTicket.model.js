import mongoose from 'mongoose';

const partSchema = new mongoose.Schema({
  name: String,
  quantity: Number,
  cost: Number
}, { _id: false });

const maintenanceTicketSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  vendor: { type: String, default: '' },
  expectedCost: { type: Number, default: 0 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  status: { type: String, enum: ['planned', 'in_progress', 'completed'], default: 'planned' },
  parts: [partSchema],
  attachments: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  underWarranty: { type: Boolean, default: false },
  note: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

maintenanceTicketSchema.index({ status: 1 });
maintenanceTicketSchema.index({ asset: 1, status: 1 });

export default mongoose.model('MaintenanceTicket', maintenanceTicketSchema);

