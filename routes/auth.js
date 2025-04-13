const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey123'; // fallback for development
console.log('🧠 auth.js loaded');
router.get('/test', (req, res) => {
    console.log('🚀 GET /api/auth/test hit');
    res.json({ message: 'Test GET route working' });
  });
  
// Signup route
router.post('/signup', async (req, res) => {
    console.log('🔥 Signup hit');
    console.log('Request body:', req.body);
    const { email, password, fitnessGoal, weight, height, age, gender } = req.body;
    
    if (!email || !password || !fitnessGoal || !weight || !height || !age || !gender) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['muscle_gain', 'fat_loss'].includes(fitnessGoal)) {
        console.log('❌ Invalid fitness goal');
        return res.status(400).json({ error: 'Invalid fitness goal' });
    }

    if (!['male', 'female'].includes(gender)) {
        console.log('❌ Invalid gender');
        return res.status(400).json({ error: 'Invalid gender' });
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
        
        // Convert weight from pounds to kilograms
        const weightInKg = parseFloat(weight) * 0.453592;
        
        // Convert height from inches to centimeters
        const heightInCm = parseFloat(height) * 2.54;
        
        console.log('📝 Creating new user...');
        const user = new User({ 
            email, 
            password: hashedPassword,
            fitnessGoal,
            weight: weightInKg,
            height: heightInCm,
            age: parseInt(age),
            gender
        });
        
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
  const startTime = Date.now();
  console.log('🔥 Login hit');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  const { email, password } = req.body;
  
  if (!email || !password) {
    console.log('❌ Missing email or password');
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    console.log('🔍 Finding user...');
    const userFindStart = Date.now();
    const user = await User.findOne({ email });
    console.log(`⏱️ User find took ${Date.now() - userFindStart}ms`);
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    console.log('🔒 Comparing passwords...');
    const passwordCompareStart = Date.now();
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`⏱️ Password compare took ${Date.now() - passwordCompareStart}ms`);
    
    if (!isMatch) {
      console.log('❌ Password mismatch');
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    console.log('🔑 Generating token...');
    const tokenStart = Date.now();
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`⏱️ Token generation took ${Date.now() - tokenStart}ms`);
    
    console.log('✅ Login successful');
    console.log(`⏱️ Total login operation took ${Date.now() - startTime}ms`);
    res.json({ 
      token, 
      message: 'Login successful',
      fitnessGoal: user.fitnessGoal 
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    console.error('Error stack:', err.stack);
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
      console.error('MongoDB error code:', err.code);
      console.error('MongoDB error details:', err.errmsg);
    }
    console.error(`⏱️ Failed login attempt took ${Date.now() - startTime}ms`);
    res.status(500).json({ error: 'An error occurred during login. Please try again.' });
  }
});

// Update fitness goal route
router.put('/update-goal', authMiddleware, async (req, res) => {
  console.log('🎯 Update fitness goal hit');
  console.log('Request body:', req.body);
  console.log('User from token:', req.user);
  
  const { fitnessGoal } = req.body;
  const userId = req.user.userId;

  if (!fitnessGoal) {
    console.log('❌ No fitness goal provided');
    return res.status(400).json({ error: 'Fitness goal is required' });
  }

  if (!['muscle_gain', 'fat_loss'].includes(fitnessGoal)) {
    console.log('❌ Invalid fitness goal');
    return res.status(400).json({ error: 'Invalid fitness goal' });
  }

  try {
    console.log('🔄 Updating fitness goal for user:', userId);
    const user = await User.findByIdAndUpdate(
      userId,
      { fitnessGoal },
      { new: true }
    );

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ Fitness goal updated successfully');
    res.json({ 
      message: 'Fitness goal updated successfully', 
      fitnessGoal: user.fitnessGoal 
    });
  } catch (err) {
    console.error('❌ Update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user profile route
router.get('/profile', authMiddleware, async (req, res) => {
  console.log('👤 Get profile hit');
  console.log('User from token:', req.user);
  
  const userId = req.user.userId;

  try {
    console.log('🔍 Finding user...');
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    // Convert weight from kilograms to pounds
    const weightInLbs = user.weight ? user.weight * 2.20462 : undefined;
    
    // Convert height from centimeters to inches
    const heightInInches = user.height ? user.height * 0.393701 : undefined;

    console.log('✅ Profile retrieved successfully');
    res.json({ 
      email: user.email,
      fitnessGoal: user.fitnessGoal,
      weight: weightInLbs ? Number(weightInLbs.toFixed(1)) : undefined,
      height: heightInInches ? Number(heightInInches.toFixed(1)) : undefined,
      age: user.age,
      gender: user.gender
    });
  } catch (err) {
    console.error('❌ Profile retrieval error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user metrics route
router.put('/update-metrics', authMiddleware, async (req, res) => {
  console.log('📊 Update metrics hit');
  console.log('Request body:', req.body);
  
  const { weight, height, age } = req.body;
  const userId = req.user.userId;

  if (!weight || !height || !age) {
    console.log('❌ Missing required fields');
    return res.status(400).json({ error: 'Weight, height, and age are required' });
  }

  try {
    // Convert weight from pounds to kilograms
    const weightInKg = parseFloat(weight) * 0.453592;
    
    // Convert height from inches to centimeters
    const heightInCm = parseFloat(height) * 2.54;
    
    console.log('🔄 Updating metrics for user:', userId);
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        weight: weightInKg, 
        height: heightInCm, 
        age: parseInt(age) 
      },
      { new: true }
    );

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    // Convert back to pounds and inches for response
    const weightInLbs = user.weight * 2.20462;
    const heightInInches = user.height * 0.393701;

    console.log('✅ Metrics updated successfully');
    res.json({ 
      message: 'Metrics updated successfully',
      weight: Number(weightInLbs.toFixed(1)),
      height: Number(heightInInches.toFixed(1)),
      age: user.age
    });
  } catch (err) {
    console.error('❌ Update error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
