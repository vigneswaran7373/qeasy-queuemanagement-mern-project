const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  const h = req.headers.authorization || '';
  try {
    req.staff = jwt.verify(h.startsWith('Bearer ') ? h.slice(7) : '', process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ message: 'Staff login required' }); }
};
