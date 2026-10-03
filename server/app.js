require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', require('./routes/public'));
app.use('/api/admin', require('./routes/admin'));
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, _req, res, _next) => {
  if (!process.env.QUIET_ERRORS) console.error(err);
  if (err.name === 'CastError') return res.status(404).json({ message: 'Not found' });
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;
