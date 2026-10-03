const Token = require('./models/Token');
const Service = require('./models/Service');

const today = () => new Date().toLocaleDateString('en-CA');

// Estimated wait (minutes) for a token with `ahead` people before it.
const eta = (ahead, avg, servingNow) => Math.max(0, Math.round((ahead + (servingNow ? 0.5 : 0)) * avg));

async function serviceSnapshot(service) {
  const day = today();
  const [waiting, serving] = await Promise.all([
    Token.countDocuments({ service: service._id, day, status: 'waiting' }),
    Token.findOne({ service: service._id, day, status: 'serving' }),
  ]);
  return {
    id: service._id, name: service.name, prefix: service.prefix, isOpen: service.isOpen,
    avgServiceMinutes: service.avgServiceMinutes, waiting,
    nowServing: serving ? serving.label : null,
    estimatedWaitForNewJoiner: eta(waiting, service.avgServiceMinutes, !!serving),
  };
}

// Moving-average update so ETAs get more accurate through the day.
async function learnServiceTime(serviceId, startedAt, endedAt) {
  const minutes = (endedAt - startedAt) / 60000;
  if (minutes < 0.1 || minutes > 60) return; // ignore accidental clicks / forgotten tokens
  const s = await Service.findById(serviceId);
  s.avgServiceMinutes = Math.round((0.7 * s.avgServiceMinutes + 0.3 * minutes) * 10) / 10;
  await s.save();
}

// Close tickets still waiting/serving from a previous day.
async function sweepStaleTickets() {
  const r = await Token.updateMany({ day: { $ne: today() }, status: { $in: ['waiting', 'serving'] } }, { status: 'skipped' });
  if (r.modifiedCount) console.log(`Auto-closed ${r.modifiedCount} stale tickets`);
  return r.modifiedCount || 0;
}

module.exports = { today, eta, serviceSnapshot, learnServiceTime, sweepStaleTickets };

// Automation: close out tickets left over from previous days.
async function sweepStaleTickets() {
  const r = await Token.updateMany({ day: { $ne: today() }, status: { $in: ['waiting', 'serving'] } }, { status: 'skipped' });
  return r.modifiedCount;
}
module.exports.sweepStaleTickets = sweepStaleTickets;
