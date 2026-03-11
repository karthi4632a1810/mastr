import mongoose from 'mongoose';
import moment from 'moment';

const shiftSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true
  },
  category: {
    type: String,
    enum: ['regular', 'night', 'rotational', 'weekend'],
    default: 'regular'
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  breakDuration: {
    type: Number,
    default: 0
  },
  breakType: {
    type: String,
    enum: ['paid', 'unpaid'],
    default: 'unpaid'
  },
  workingHours: {
    type: Number,
    default: 0
  },
  isFlexible: {
    type: Boolean,
    default: false
  },
  graceLateMinutes: { type: Number, default: 10 },
  graceEarlyMinutes: { type: Number, default: 10 },
  minHoursPresent: { type: Number, default: 8 },
  halfDayHours: { type: Number, default: 4 },
  overtimeEligible: { type: Boolean, default: false },
  autoBreakDeduction: {
    isEnabled: { type: Boolean, default: false },
    thresholdHours: { type: Number, default: 0 },
    durationMinutes: { type: Number, default: 0 }
  },
  weekOffs: {
    type: [Number], // 0=Sunday ... 6=Saturday
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  version: { type: Number, default: 1 },
  versionGroup: { type: mongoose.Schema.Types.ObjectId, index: true, default: () => new mongoose.Types.ObjectId() },
  previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
  isLatest: { type: Boolean, default: true }
}, {
  timestamps: true
});

shiftSchema.index({ code: 1, isLatest: 1 }, { unique: true, partialFilterExpression: { isLatest: true } });
shiftSchema.index({ name: 1, isLatest: 1 }, { unique: true, partialFilterExpression: { isLatest: true } });
shiftSchema.index({ versionGroup: 1, version: 1 }, { unique: true });

const calculateWorkingHours = (startTime, endTime, breakDuration = 0, breakType = 'unpaid') => {
  if (!startTime || !endTime) return 0;
  const start = moment(startTime, 'HH:mm');
  const end = moment(endTime, 'HH:mm');
  if (!start.isValid() || !end.isValid()) return 0;
  if (!end.isAfter(start)) {
    end.add(1, 'day'); // overnight
  }
  const diffMinutes = end.diff(start, 'minutes');
  const unpaidBreak = breakType === 'unpaid' ? (breakDuration || 0) : 0;
  const net = Math.max(diffMinutes - unpaidBreak, 0);
  return Number((net / 60).toFixed(2));
};

shiftSchema.pre('validate', function(next) {
  this.workingHours = calculateWorkingHours(
    this.startTime,
    this.endTime,
    this.breakDuration,
    this.breakType
  );
  if (!this.versionGroup) {
    this.versionGroup = this._id;
  }
  next();
});

export default mongoose.model('Shift', shiftSchema);
