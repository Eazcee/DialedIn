const express = require('express');
const router = express.Router();
const TimeEntry = require('../models/TimeEntry');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');

// Test route to check if time routes are registered
router.get('/test', (req, res) => {
  console.log('🚀 GET /api/time/test hit');
  res.json({ message: 'Time routes are working' });
});

// Get workout history for the past week
router.get('/history', authMiddleware, async (req, res) => {
  console.log('📊 Fetching workout history');
  const userId = req.user.userId;

  try {
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const entries = await TimeEntry.find({
      userId,
      date: { $gte: sevenDaysAgo }
    }).sort({ date: -1 });
    
    console.log(`✅ Found ${entries.length} entries in the past week`);
    res.json(entries);
  } catch (err) {
    console.error('❌ Error fetching history:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get AI workout suggestion based on history
router.get('/suggestion', authMiddleware, async (req, res) => {
  console.log('🤖 Generating workout suggestion');
  const userId = req.user.userId;

  try {
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Get workout history for the past week
    const entries = await TimeEntry.find({
      userId,
      date: { $gte: sevenDaysAgo }
    }).sort({ date: -1 });
    
    // Get today's workout if any
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayEntry = await TimeEntry.findOne({
      userId,
      date: { $gte: today, $lt: tomorrow }
    });
    
    // Format the data for Gemini
    const historyText = entries.map(entry => {
      const date = new Date(entry.date);
      return `${date.toLocaleDateString()}: ${entry.minutes} minutes`;
    }).join('\n');
    
    const todayText = todayEntry 
      ? `Today: ${todayEntry.minutes} minutes` 
      : 'Today: No workout yet';
    
    // Create the prompt for Gemini
    const prompt = `Based on this workout history:
${historyText}
${todayText}

Suggest a personalized workout routine. Consider:
1. The user's consistency (how often they work out)
2. Their typical workout duration
3. Progressive overload (slightly increasing intensity)
4. Rest days and recovery

Provide a specific workout plan with exercises, sets, reps, and rest periods.`;

    // Call Gemini API
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract the suggestion from the response
    const suggestion = response.data.candidates[0].content.parts[0].text;
    
    console.log('✅ Generated workout suggestion');
    res.json({ suggestion });
  } catch (err) {
    console.error('❌ Error generating suggestion:', err);
    if (err.response?.status === 403) {
      res.status(500).json({ error: 'AI service configuration error. Please contact support.' });
    } else {
      res.status(500).json({ error: 'Failed to generate workout suggestion. Please try again.' });
    }
  }
});

// Protected route - requires authentication
router.post('/log', authMiddleware, async (req, res) => {
  console.log('🕒 Time log request received');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  console.log('User from token:', req.user);
  
  const { minutes } = req.body;
  const userId = req.user.userId;

  if (!minutes) {
    console.log('❌ No minutes provided');
    return res.status(400).json({ error: 'Minutes are required' });
  }

  try {
    console.log(`📝 Logging ${minutes} minutes for user ${userId}`);
    const entry = new TimeEntry({
      userId,
      date: new Date(),
      minutes
    });
    
    await entry.save();
    console.log('✅ Time entry saved successfully');
    res.status(201).json({ message: 'Workout time logged' });
  } catch (err) {
    console.error('❌ Error logging time:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's time entries
router.get('/entries', authMiddleware, async (req, res) => {
  console.log('📊 Fetching time entries');
  const userId = req.user.userId;

  try {
    const entries = await TimeEntry.find({ userId })
      .sort({ date: -1 }) // Most recent first
      .limit(10);
    console.log(`✅ Found ${entries.length} entries`);
    res.json(entries);
  } catch (err) {
    console.error('❌ Error fetching entries:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
