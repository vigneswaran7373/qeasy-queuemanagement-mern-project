const { Schema, model } = require('mongoose');
// One document per service per day; gives atomic, gap-free token numbers that reset daily.
module.exports = model('Counter', new Schema({
  service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  day: { type: String, required: true },
  seq: { type: Number, default: 0 },
}).index({ service: 1, day: 1 }, { unique: true }));
