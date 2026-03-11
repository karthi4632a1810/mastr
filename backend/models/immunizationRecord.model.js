import mongoose from 'mongoose';

const immunizationRecordSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  vaccineType: {
    type: String,
    enum: ['hbv', 'tt', 'covid', 'influenza', 'mmr', 'varicella', 'hepatitis_a', 'other'],
    required: true
  },
  vaccineName: {
    type: String,
    default: '' // e.g., "Covishield", "Covaxin" for COVID
  },
  doseNumber: {
    type: Number,
    required: true,
    min: 1
  },
  totalDosesRequired: {
    type: Number,
    default: 1 // e.g., HBV requires 3 doses, COVID may require 2-3
  },
  vaccinationDate: {
    type: Date,
    required: true
  },
  nextDueDate: {
    type: Date,
    default: null
  },
  // Vaccine details
  batchNumber: {
    type: String,
    default: ''
  },
  manufacturer: {
    type: String,
    default: ''
  },
  vaccinationSite: {
    type: String,
    default: '' // Hospital name or clinic
  },
  administeredBy: {
    type: String,
    default: '' // Name of healthcare provider
  },
  // Certificate/Document
  certificateFile: {
    type: String,
    default: null
  },
  certificateNumber: {
    type: String,
    default: ''
  },
  // Status
  status: {
    type: String,
    enum: ['completed', 'pending', 'declined', 'exempt'],
    default: 'completed'
  },
  declineReason: {
    type: String,
    default: ''
  },
  declineFormFile: {
    type: String,
    default: null // For non-immunized staff
  },
  // NABH compliance
  nabhClauses: [{
    type: String // e.g., "HR.6.1"
  }],
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
immunizationRecordSchema.index({ employee: 1, vaccineType: 1, doseNumber: 1 });
immunizationRecordSchema.index({ employee: 1, status: 1 });
immunizationRecordSchema.index({ nextDueDate: 1, status: 1 });
immunizationRecordSchema.index({ vaccinationDate: -1 });

// Pre-save middleware to calculate next due date for multi-dose vaccines
immunizationRecordSchema.pre('save', function(next) {
  // Calculate next due date based on vaccine type and dose number
  if (this.nextDueDate === null && this.vaccinationDate) {
    const dueDate = new Date(this.vaccinationDate);
    
    if (this.vaccineType === 'hbv') {
      // HBV: Dose 1 → Dose 2 after 1 month, Dose 2 → Dose 3 after 5 months
      if (this.doseNumber === 1) {
        dueDate.setMonth(dueDate.getMonth() + 1);
        this.nextDueDate = dueDate;
      } else if (this.doseNumber === 2) {
        dueDate.setMonth(dueDate.getMonth() + 5);
        this.nextDueDate = dueDate;
      }
    } else if (this.vaccineType === 'covid') {
      // COVID: Dose 1 → Dose 2 after 4-6 weeks, Dose 2 → Booster after 6-9 months
      if (this.doseNumber === 1) {
        dueDate.setMonth(dueDate.getMonth() + 1);
        this.nextDueDate = dueDate;
      } else if (this.doseNumber === 2) {
        dueDate.setMonth(dueDate.getMonth() + 6);
        this.nextDueDate = dueDate;
      }
    } else if (this.vaccineType === 'tt') {
      // TT: Booster every 10 years
      dueDate.setFullYear(dueDate.getFullYear() + 10);
      this.nextDueDate = dueDate;
    } else if (this.vaccineType === 'influenza') {
      // Influenza: Annual
      dueDate.setFullYear(dueDate.getFullYear() + 1);
      this.nextDueDate = dueDate;
    }
  }
  
  next();
});

export default mongoose.model('ImmunizationRecord', immunizationRecordSchema);

