console.log("📂 Current working directory:", __dirname);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  console.log('🔍 Incoming request:');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Path:', req.path);
  console.log('Headers:', req.headers);
  next();
});

// Configure CORS to allow all methods and headers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Serve video files
app.use('/videos', express.static(path.join(__dirname, 'routes/videos')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dialedin', {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB connected');
  console.log('📊 MongoDB connection state:', mongoose.connection.readyState);
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  console.error('MongoDB connection state:', mongoose.connection.readyState);
});

// Add MongoDB connection error handler
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('❌ MongoDB disconnected');
});

// Import routes
const authRoutes = require('./routes/auth');
const timeRoutes = require('./routes/time');

// Register routes with explicit paths
app.use('/api/auth', authRoutes);
app.use('/api/time', timeRoutes);

// Handle preflight requests
app.options('*', cors());

// Example test route
app.get('/', (req, res) => {
  res.send('Gym API is live 💪');
});

app.get('/ping', (req, res) => {
  console.log('📡 /ping route hit');
  res.send('pong');
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  try {
    // Test MongoDB connection
    await mongoose.connection.db.admin().ping();
    res.json(health);
  } catch (err) {
    health.message = 'ERROR';
    health.error = err.message;
    res.status(500).json(health);
  }
});

// Handle 404 errors
app.use((req, res, next) => {
  console.log('❌ Route not found:', req.method, req.url);
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  if (err instanceof TypeError && err.message.includes('Missing parameter name')) {
    console.error('❌ Path-to-regexp error:', err.message);
    return res.status(404).json({ error: 'Route not found' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Server accessible at http://localhost:${PORT}`);
  
  // Get all network interfaces
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  // Log all available IP addresses
  Object.keys(nets).forEach((name) => {
    nets[name].forEach((net) => {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`🌐 Server accessible at http://${net.address}:${PORT}`);
      }
    });
  });
});
