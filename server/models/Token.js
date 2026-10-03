const { Schema, model } = require('mongoose');
const schema = new Schema({
  service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  day: { type: String, required: true },
  number: { type: Number, required: true },
  label: { type: String, required: true },
  customerName: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  status: { type: String, enum: ['waiting', 'serving', 'completed', 'skipped', 'cancelled'], default: 'waiting' },
  calledAt: Date,
  completedAt: Date,
}, { timestamps: true });
schema.index({ service: 1, day: 1, number: 1 }, { unique: true });
schema.index({ service: 1, day: 1, status: 1 });
module.exports = model('Token', schema);
