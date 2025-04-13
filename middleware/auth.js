const jwt = require('jsonwebtoken');

const JWT_SECRET = 'secretkey123'; // move to .env later

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ Auth error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware; 