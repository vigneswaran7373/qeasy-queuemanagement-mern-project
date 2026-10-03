require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const { sweepStaleTickets } = require('./utils');

const sweep = () => sweepStaleTickets().then((n) => n && console.log(`Auto-closed ${n} stale tickets`)).catch(console.error);

mongoose.connect(process.env.MONGO_URI).then(() => {
  const port = process.env.PORT || 5001;
  app.listen(port, () => console.log(`Q-Easy API on http://localhost:${port}`));
  sweep();
  setInterval(sweep, 10 * 60 * 1000);
}).catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
