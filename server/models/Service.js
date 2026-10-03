const { Schema, model } = require('mongoose');
module.exports = model('Service', new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  prefix: { type: String, required: true, uppercase: true, maxlength: 2 },
  avgServiceMinutes: { type: Number, default: 5 }, // auto-calibrated from real service times
  isOpen: { type: Boolean, default: true },
}, { timestamps: true }));
