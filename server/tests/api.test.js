process.env.JWT_SECRET = 'test-secret';
process.env.QUIET_ERRORS = '1';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../app');
const Staff = require('../models/Staff');
const Service = require('../models/Service');
const Token = require('../models/Token');
const Counter = require('../models/Counter');
const { sweepStaleTickets } = require('../utils');

const URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/qeasy_test';
const server = app.listen(0);
const api = request(server);
const auth = (t) => ({ Authorization: `Bearer ${t}` });
let tok, svc;

before(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await Promise.all([Token.init(), Counter.init(), Service.init(), Staff.init()]);
  await Staff.create({ name: 'Desk', email: 'staff@t.com', password: await bcrypt.hash('secret123', 4) });
  svc = await Service.create({ name: 'Billing', prefix: 'b', avgServiceMinutes: 10 });
  tok = (await api.post('/api/admin/login').send({ email: 'staff@t.com', password: 'secret123' })).body.token;
});
after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });

const join = (name = 'Cust', serviceId = svc._id) => api.post('/api/tokens').send({ serviceId, name });

test('staff login and route protection', async () => {
  assert.ok(tok);
  assert.equal((await api.post('/api/admin/login').send({ email: 'staff@t.com', password: 'bad' })).status, 401);
  assert.equal((await api.get(`/api/admin/services/${svc._id}/queue`)).status, 401);
  assert.equal((await api.post(`/api/admin/services/${svc._id}/next`)).status, 401);
});

test('services list shows snapshot', async () => {
  const r = await api.get('/api/services');
  assert.equal(r.body[0].name, 'Billing'); assert.equal(r.body[0].waiting, 0); assert.equal(r.body[0].nowServing, null);
});

test('join validates and issues sequential labels', async () => {
  assert.equal((await api.post('/api/tokens').send({ name: 'x' })).status, 400);
  assert.equal((await api.post('/api/tokens').send({ serviceId: svc._id, name: '  ' })).status, 400);
  assert.equal((await api.post('/api/tokens').send({ serviceId: new mongoose.Types.ObjectId(), name: 'x' })).status, 404);
  assert.equal((await join('A')).body.label, 'B-001');
  assert.equal((await join('B')).body.label, 'B-002');
});

test('concurrent joins get unique gap-free numbers', async () => {
  const res = await Promise.all(Array.from({ length: 10 }, (_, i) => join('C' + i)));
  const nums = res.map((r) => +r.body.label.split('-')[1]).sort((a, b) => a - b);
  assert.deepEqual(nums, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('ticket position and ETA', async () => {
  const t = (await Token.findOne({ label: 'B-003' }));
  const r = await api.get(`/api/tokens/${t._id}`);
  assert.equal(r.body.status, 'waiting'); assert.equal(r.body.position, 3); assert.equal(r.body.estimatedWaitMinutes, 20);
  assert.equal((await api.get('/api/tokens/not-an-id')).status, 404);
});

test('call next: serves lowest number, completes previous, learns avg time', async () => {
  const n1 = await api.post(`/api/admin/services/${svc._id}/next`).set(auth(tok));
  assert.equal(n1.body.serving.label, 'B-001'); assert.equal(n1.body.serving.status, 'serving');
  await Token.updateOne({ label: 'B-001' }, { calledAt: new Date(Date.now() - 2 * 60000) }); // pretend took 2 min
  const n2 = await api.post(`/api/admin/services/${svc._id}/next`).set(auth(tok));
  assert.equal(n2.body.serving.label, 'B-002');
  assert.equal((await Token.findOne({ label: 'B-001' })).status, 'completed');
  const avg = (await Service.findById(svc._id)).avgServiceMinutes;
  assert.ok(avg < 10 && avg > 5, `avg should drift towards 2 min, got ${avg}`);
  const snap = (await api.get('/api/services')).body[0];
  assert.equal(snap.nowServing, 'B-002');
});

test('concurrent "call next" never serves the same ticket twice', async () => {
  await api.post(`/api/admin/services/${svc._id}/skip`).set(auth(tok));
  const res = await Promise.all([1, 2, 3, 4].map(() => api.post(`/api/admin/services/${svc._id}/next`).set(auth(tok))));
  assert.equal(await Token.countDocuments({ service: svc._id, status: 'serving' }), 1);
  assert.ok(res.every((r) => r.status === 200));
});

test('skip, complete, cancel flows', async () => {
  const q = await api.get(`/api/admin/services/${svc._id}/queue`).set(auth(tok));
  assert.ok(q.body.stats.total >= 12); assert.ok(q.body.stats.skipped >= 1);
  const w = q.body.waiting[0];
  assert.equal((await api.patch(`/api/tokens/${w._id}/cancel`)).status, 200);
  assert.equal((await api.patch(`/api/tokens/${w._id}/cancel`)).status, 400);
  assert.equal((await api.get(`/api/tokens/${w._id}`)).body.status, 'cancelled');
});

test('close queue blocks joins; reopen allows', async () => {
  assert.equal((await api.patch(`/api/admin/services/${svc._id}/toggle`).set(auth(tok))).body.isOpen, false);
  assert.equal((await join()).status, 400);
  assert.equal((await api.patch(`/api/admin/services/${svc._id}/toggle`).set(auth(tok))).body.isOpen, true);
  assert.equal((await join()).status, 201);
});

test('add service validates and rejects duplicates', async () => {
  assert.equal((await api.post('/api/admin/services').set(auth(tok)).send({ name: 'X' })).status, 400);
  assert.equal((await api.post('/api/admin/services').set(auth(tok)).send({ name: 'Enquiry', prefix: 'e' })).status, 201);
  assert.equal((await api.post('/api/admin/services').set(auth(tok)).send({ name: 'Enquiry', prefix: 'e' })).status, 409);
});

test('automation: stale tickets from previous days are auto-closed', async () => {
  await Token.updateOne({ label: 'B-012' }, { day: '2020-01-01', status: 'waiting' });
  assert.ok((await sweepStaleTickets()) >= 1);
  assert.equal((await Token.findOne({ label: 'B-012' })).status, 'skipped');
});
