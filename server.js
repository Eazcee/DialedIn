console.log("📂 Current working directory:", __dirname);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(cors({ origin: '*' }));
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// 👇 ADD THIS LINE — import the auth routes
const authRoutes = require('./routes/auth');
// 👇 ADD THIS LINE — import the time routes
const timeRoutes = require('./routes/time');

// 👇 ADD THIS LINE — use them under /api/auth
app.use('/api/auth', authRoutes);
// 👇 ADD THIS LINE — use them under /api/time
app.use('/api/time', timeRoutes);

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // or specific IP for stricter security
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200); // allow preflight to pass
    }
    next();
  });

// Example test route (optional)
app.get('/', (req, res) => {
  res.send('Gym API is live 💪');
});
app.get('/ping', (req, res) => {
    console.log('📡 /ping route hit');
    res.send('pong');
  });
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
