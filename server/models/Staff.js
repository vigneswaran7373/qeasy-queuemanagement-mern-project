const { Schema, model } = require('mongoose');
module.exports = model('Staff', new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
}, { timestamps: true }));
