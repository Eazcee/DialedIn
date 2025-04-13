const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = 'secretkey123'; // move to .env later
console.log('🧠 auth.js loaded');
router.get('/test', (req, res) => {
    console.log('🚀 GET /api/auth/test hit');
    res.json({ message: 'Test GET route working' });
  });
  
// Signup route
router.post('/signup', async (req, res) => {
    console.log('🔥 Signup hit');
    console.log('Request body:', req.body);
    const { email, password } = req.body;
    
    if (!email || !password) {
        console.log('❌ Missing email or password');
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    try {
        console.log('🔍 Checking for existing user...');
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('❌ User already exists');
            return res.status(400).json({ error: 'User already exists' });
        }

        console.log('🔒 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log('📝 Creating new user...');
        const user = new User({ email, password: hashedPassword });
        
        console.log('💾 Saving user to database...');
        await user.save();
        
        console.log('✅ User created successfully');
        res.json({ message: 'User created successfully' });
    } catch (err) {
        console.error('❌ Signup error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Login route
router.post('/login', async (req, res) => {
  console.log('🔥 Login hit');
  console.log('Request body:', req.body);
  const { email, password } = req.body;
  
  if (!email || !password) {
    console.log('❌ Missing email or password');
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    console.log('🔍 Finding user...');
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    console.log('🔒 Comparing passwords...');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Password mismatch');
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    console.log('🔑 Generating token...');
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    console.log('✅ Login successful');
    res.json({ token, message: 'Login successful' });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
