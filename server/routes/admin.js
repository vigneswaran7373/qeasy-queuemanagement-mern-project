const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');
const Service = require('../models/Service');
const Token = require('../models/Token');
const auth = require('../middleware/auth');
const { today, serviceSnapshot, learnServiceTime } = require('../utils');

router.post('/login', async (req, res, next) => {
  try {
    const s = await Staff.findOne({ email: (req.body.email || '').toLowerCase() });
    if (!s || !(await bcrypt.compare(req.body.password || '', s.password))) return res.status(401).json({ message: 'Invalid email or password' });
    res.json({ token: jwt.sign({ id: s._id, name: s.name }, process.env.JWT_SECRET, { expiresIn: '12h' }), name: s.name });
  } catch (e) { next(e); }
});

router.use(auth);

router.post('/services', async (req, res, next) => {
  try {
    const { name, prefix, avgServiceMinutes } = req.body;
    if (!name || !prefix) return res.status(400).json({ message: 'Name and prefix are required' });
    res.status(201).json(await Service.create({ name, prefix, avgServiceMinutes: avgServiceMinutes || 5 }));
  } catch (e) { e.code === 11000 ? res.status(409).json({ message: 'Service name already exists' }) : next(e); }
});

router.patch('/services/:id/toggle', async (req, res, next) => {
  try {
    const s = await Service.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Not found' });
    s.isOpen = !s.isOpen; await s.save();
    res.json(await serviceSnapshot(s));
  } catch (e) { next(e); }
});

// Console data: serving + waiting list + today's stats
router.get('/services/:id/queue', async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Not found' });
    const day = today();
    const tokens = await Token.find({ service: service._id, day }).sort({ number: 1 });
    const done = tokens.filter((t) => t.status === 'completed' && t.calledAt && t.completedAt);
    const avgHandle = done.length ? done.reduce((a, t) => a + (t.completedAt - t.calledAt), 0) / done.length / 60000 : null;
    res.json({
      service: await serviceSnapshot(service),
      serving: tokens.find((t) => t.status === 'serving') || null,
      waiting: tokens.filter((t) => t.status === 'waiting'),
      stats: {
        total: tokens.length, completed: done.length,
        skipped: tokens.filter((t) => t.status === 'skipped').length,
        cancelled: tokens.filter((t) => t.status === 'cancelled').length,
        avgHandleMinutes: avgHandle === null ? null : Math.round(avgHandle * 10) / 10,
      },
    });
  } catch (e) { next(e); }
});

// Serialises actions per service so a double-click (or two staff clicking at once)
// can never leave two customers "serving" at the same time.
const tails = new Map();
function withLock(key, fn) {
  const prev = tails.get(key) || Promise.resolve();
  const run = prev.then(fn);
  const tail = run.catch(() => {});
  tails.set(key, tail);
  tail.then(() => { if (tails.get(key) === tail) tails.delete(key); });
  return run;
}

async function closeServing(serviceId, status) {
  const cur = await Token.findOneAndUpdate(
    { service: serviceId, day: today(), status: 'serving' }, { status, completedAt: new Date() }, { new: true });
  if (cur && status === 'completed') await learnServiceTime(serviceId, cur.calledAt, cur.completedAt);
  return cur;
}

// Call next: finishes whoever is being served, then calls the next waiting ticket
router.post('/services/:id/next', async (req, res, next) => {
  try {
    const nextToken = await withLock(req.params.id, async () => {
      await closeServing(req.params.id, 'completed');
      return Token.findOneAndUpdate(
        { service: req.params.id, day: today(), status: 'waiting' },
        { status: 'serving', calledAt: new Date() }, { sort: { number: 1 }, new: true });
    });
    res.json({ serving: nextToken });
  } catch (e) { next(e); }
});

router.post('/services/:id/complete', async (req, res, next) => {
  try { res.json({ completed: await withLock(req.params.id, () => closeServing(req.params.id, 'completed')) }); } catch (e) { next(e); }
});

router.post('/services/:id/skip', async (req, res, next) => {
  try { res.json({ skipped: await withLock(req.params.id, () => closeServing(req.params.id, 'skipped')) }); } catch (e) { next(e); }
});

module.exports = router;
