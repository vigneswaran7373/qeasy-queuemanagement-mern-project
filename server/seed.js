require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Staff = require('./models/Staff');
const Service = require('./models/Service');
const Token = require('./models/Token');
const Counter = require('./models/Counter');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([Staff.deleteMany({}), Service.deleteMany({}), Token.deleteMany({}), Counter.deleteMany({})]);
  await Staff.create({ name: 'Queue Manager', email: 'manager@qeasy.com', password: await bcrypt.hash('password123', 10) });
  await Service.insertMany([
    { name: 'General Enquiry', prefix: 'G', avgServiceMinutes: 4 },
    { name: 'Billing & Payments', prefix: 'B', avgServiceMinutes: 6 },
    { name: 'Account Opening', prefix: 'A', avgServiceMinutes: 12 },
  ]);
  console.log('Seeded. Staff login: manager@qeasy.com / password123');
  process.exit(0);
})();
