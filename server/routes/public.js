const router = require('express').Router();
const Service = require('../models/Service');
const Token = require('../models/Token');
const Counter = require('../models/Counter');
const { today, eta, serviceSnapshot } = require('../utils');

router.get('/services', async (_req, res, next) => {
  try {
    const services = await Service.find().sort({ name: 1 });
    res.json(await Promise.all(services.map(serviceSnapshot)));
  } catch (e) { next(e); }
});

// Join a queue
router.post('/tokens', async (req, res, next) => {
  try {
    const { serviceId, name, phone } = req.body;
    if (!serviceId || !name?.trim()) return res.status(400).json({ message: 'Service and name are required' });
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    if (!service.isOpen) return res.status(400).json({ message: 'This queue is closed right now' });

    const day = today();
    // $inc is atomic on MongoDB; the retry loop is a safety net so a rare duplicate-number
    // collision (e.g. on a MongoDB-compatible DB) is never shown to the customer.
    let token;
    for (let attempt = 0; attempt < 10 && !token; attempt++) {
      const { seq } = await Counter.findOneAndUpdate(
        { service: service._id, day }, { $inc: { seq: 1 } }, { upsert: true, new: true });
      try {
        token = await Token.create({
          service: service._id, day, number: seq, customerName: name, phone,
          label: `${service.prefix}-${String(seq).padStart(3, '0')}`,
        });
      } catch (e) {
        if (e.code !== 11000) throw e;
      }
    }
    if (!token) return res.status(503).json({ message: 'Queue is busy, please try again' });
    res.status(201).json({ id: token._id, label: token.label });
  } catch (e) { next(e); }
});

// Live ticket status
router.get('/tokens/:id', async (req, res, next) => {
  try {
    const t = await Token.findById(req.params.id).populate('service');
    if (!t) return res.status(404).json({ message: 'Ticket not found' });
    const serving = await Token.findOne({ service: t.service._id, day: t.day, status: 'serving' });
    const out = {
      id: t._id, label: t.label, name: t.customerName, status: t.status,
      service: t.service.name, nowServing: serving?.label || null, position: null, estimatedWaitMinutes: null,
    };
    if (t.status === 'waiting') {
      const ahead = await Token.countDocuments({ service: t.service._id, day: t.day, status: 'waiting', number: { $lt: t.number } });
      out.position = ahead + 1;
      out.estimatedWaitMinutes = eta(ahead, t.service.avgServiceMinutes, !!serving);
    }
    res.json(out);
  } catch (e) { next(e); }
});

router.patch('/tokens/:id/cancel', async (req, res, next) => {
  try {
    const t = await Token.findOneAndUpdate({ _id: req.params.id, status: 'waiting' }, { status: 'cancelled' }, { new: true });
    t ? res.json({ message: 'Cancelled' }) : res.status(400).json({ message: 'Only waiting tickets can be cancelled' });
  } catch (e) { next(e); }
});

module.exports = router;
