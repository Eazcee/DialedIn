const express = require('express');
const router = express.Router();
const TimeEntry = require('../models/TimeEntry');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');
const path = require('path');
const Workout = require('../models/Workout');

// Serve video files
router.get('/videos/:filename', (req, res) => {
  const videoPath = path.join(__dirname, 'videos', req.params.filename);
  res.sendFile(videoPath);
});

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
  const requestedTime = parseInt(req.query.time) || null;
  console.log('Requested time from query params:', requestedTime);

  try {
    // Get user data to access fitness goal
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }

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
    }).sort({ date: -1 }); // Get the most recent entry for today
    
    // Use the requested time if provided, otherwise use the time from today's entry
    const minutes = requestedTime || (todayEntry?.minutes || 30);
    console.log('Using minutes for workout:', minutes);
    console.log('Today\'s entry minutes:', todayEntry?.minutes);
    console.log('Requested time from query:', requestedTime);
    
    // Format the data for Gemini
    const historyText = entries?.map(entry => {
      const date = new Date(entry.date);
      return `${date.toLocaleDateString()}: ${entry.minutes} minutes`;
    }).join('\n') || 'No previous workout history';
    
    const todayText = todayEntry 
      ? `Today: ${todayEntry.minutes} minutes` 
      : 'Today: No workout yet';
    
    console.log('Today\'s entry:', todayEntry);
    console.log('Today\'s text:', todayText);
    
    // Create the prompt for Gemini
    const prompt = `You are an elite personal trainer and AI fitness assistant tasked with creating a daily workout plan. Your output must strictly follow the instructions and output format exactly as described, with no additional commentary or explanation.

INPUT:
You will be provided with the following JSON input:
- "goal": a string that is either "fat loss" or "muscle gain".
- "mode": a string that is either "LOSINGWEIGHT" or "GAININGMUSCLE".  
  **_***<u>NEW: If mode is LOSINGWEIGHT, additional variable "calories" (an integer) will be provided representing the target calories to burn.</u>***_**
- "available_time": an integer (the total minutes available for today's workout).
- **_***<u>NEW: For GAININGMUSCLE mode only:</u>***_**
  - "previous_workout_data": a JSON object with keys for each of the 9 muscle groups showing the number of sets performed in recent workouts. The keys are: "biceps", "triceps", "shoulders", "chest", "back", "quads", "hamstrings", "glutes", "calves".  
  - "last_workout_muscle_groups": a list of muscle groups worked in the previous workout. They must not be repeated in the current workout.
- **_***<u>NEW: For LOSINGWEIGHT mode only:</u>***_**
  - "age": an integer (years).
  - "sex": a string ("male" or "female").
  - "height": a number (in centimeters).
  - "weight": a number (in kilograms).
  - "calories": an integer (target calories to burn).

Example for GAININGMUSCLE:
{
  "goal": "muscle gain",
  "mode": "GAININGMUSCLE",
  "available_time": 45,
  "previous_workout_data": {
    "biceps": 3,
    "triceps": 4,
    "shoulders": 2,
    "chest": 5,
    "back": 4,
    "quads": 2,
    "hamstrings": 3,
    "glutes": 1,
    "calves": 2
  },
  "last_workout_muscle_groups": ["chest", "back"],
  "age": 28,
  "sex": "male",
  "height": 180,
  "weight": 75
}

Example for LOSINGWEIGHT:
{
  "goal": "fat loss",
  "mode": "LOSINGWEIGHT",
  "available_time": 40,
  "calories": 300,
  "age": 32,
  "sex": "female",
  "height": 165,
  "weight": 65
}

**_***<u>NEW: Available exercise options for LOSINGWEIGHT mode:</u>***_**
There are two lists:
- "non_gym_workout": ["Swimming", "Running", "Walking", "Jump rope", "Biking"]
- "gym_workout": ["Treadmill", "Stair Master", "Elliptical", "Indoor Bike", "Rowing Machine"]

**_***<u>NEW: Cardio MET values and parameters:</u>***_**
Use the following MET values:
- Swimming: MET = 8.0  
- Running (6 mph): MET = 9.8  
- Walking (3.5 mph): MET = 4.3  
- Jump rope: MET = 12.3  
- Biking (outdoor): MET = 8.0  
- Treadmill (5 mph): MET = 8.3  
- Stair Master: MET = 9.0  
- Elliptical: MET = 5.0  
- Indoor Bike: MET = 7.0  
- Rowing Machine: MET = 8.0  

For LOSINGWEIGHT mode, also use the following default estimates for average continuous duration and rest intervals (these can be adjusted internally):
- Swimming: 30–60 minutes continuous, 30–60 sec break every 10 minutes  
- Running: 20–45 minutes, 1–2 minutes break every 10–15 minutes  
- Walking: 30–90 minutes, minimal break or 30–45 sec if needed  
- Jump rope: 10–20 minutes, 30–60 sec every 2–3 minutes  
- Biking (outdoor): 30–60 minutes, 1–2 minutes every 15–20 minutes  
- Treadmill: 20–45 minutes, 1 minute break every 10–15 minutes  
- Stair Master: 15–30 minutes, 1 minute break every 5–10 minutes  
- Elliptical: 20–45 minutes, 30–60 sec every 15 minutes  
- Indoor Bike: 20–60 minutes, 30–60 sec every 10–15 minutes  
- Rowing Machine: 10–30 minutes, 30–60 sec every 5–10 minutes  

AVAILABLE EXERCISE OPTIONS (for GAININGMUSCLE mode):
For each muscle group, you must only use the following fixed lists:
{
  "biceps": ["Dumbbell Bicep Curls", "Hammer Curls", "Barbell Curls"],
  "triceps": ["Tricep Dips", "Overhead Tricep Extensions", "Cable Tricep Pushdowns"],
  "shoulders": ["Shoulder Press", "Lateral Raises", "Front Raises"],
  "chest": ["Incline Smith Machine Press", "Chest Press Machine", "Chest Flyes"],
  "back": ["Lat Rows", "Rear Delt Flys", "Wide Grip Lat Pulldowns"],
  "quads": ["Smith Machine Squats", "Leg Press", "Leg Extensions"],
  "hamstrings": ["Romanian Deadlifts", "Hamstring Curls", "Lying Hamstring Curls"],
  "glutes": ["Hip Thrusts", "Bulgarian Split Squats", "Cable Kickbacks"],
  "calves": ["Smith Machine Calf Raises", "Leg Press Calf Extension Machine", "Calf Extension Machine"]
}

VIDEO URLS:
For each exercise, use the following video URL format:
• For "Dumbbell Bicep Curls": "http://localhost:3000/api/time/videos/dumbell_bicep_curls.mp4"
• For "Hammer Curls": "http://localhost:3000/api/time/videos/hammer_curls.mp4"
• For "Barbell Curls": "http://localhost:3000/api/time/videos/barbell_curls.mp4"
• For "Tricep Dips": "http://localhost:3000/api/time/videos/tricep_dips.mp4"
• For "Overhead Tricep Extensions": "http://localhost:3000/api/time/videos/overhead_tricep_extensions.mp4"
• For "Cable Tricep Pushdowns": "http://localhost:3000/api/time/videos/cable_tricep_pushdowns.mp4"
• For "Shoulder Press": "http://localhost:3000/api/time/videos/shoulder_press.mp4"
• For "Lateral Raises": "http://localhost:3000/api/time/videos/lateral_raises.mp4"
• For "Front Raises": "http://localhost:3000/api/time/videos/front_raises.mp4"
• For "Incline Smith Machine Press": "http://localhost:3000/api/time/videos/incline_smith_machine_press.mp4"
• For "Chest Press Machine": "http://localhost:3000/api/time/videos/chest_press_machine.mp4"
• For "Chest Flyes": "http://localhost:3000/api/time/videos/chest_flyes.mp4"
• For "Lat Rows": "http://localhost:3000/api/time/videos/lat_rows.mp4"
• For "Rear Delt Flys": "http://localhost:3000/api/time/videos/rear_delt_flys.mp4"
• For "Wide Grip Lat Pulldowns": "http://localhost:3000/api/time/videos/wide_grip_lat_pull.mp4"
• For "Smith Machine Squats": "http://localhost:3000/api/time/videos/smith_machine_squats.mp4"
• For "Leg Press": "http://localhost:3000/api/time/videos/leg_press.mp4"
• For "Leg Extensions": "http://localhost:3000/api/time/videos/leg_extensions.mp4"
• For "Romanian Deadlifts": "http://localhost:3000/api/time/videos/romanian_deadlifts.mp4"
• For "Hamstring Curls": "http://localhost:3000/api/time/videos/hamstring_curls.mp4"
• For "Lying Hamstring Curls": "http://localhost:3000/api/time/videos/lying_hamstring_curls.mp4"
• For "Hip Thrusts": "http://localhost:3000/api/time/videos/hip_thrusts.mp4"
• For "Bulgarian Split Squats": "http://localhost:3000/api/time/videos/bulgarian_split_squats.mp4"
• For "Cable Kickbacks": "http://localhost:3000/api/time/videos/cable_kickbacks.mp4"
• For "Smith Machine Calf Raises": "http://localhost:3000/api/time/videos/smith_machine_calf_raises.mp4"
• For "Leg Press Calf Extension Machine": "http://localhost:3000/api/time/videos/leg_press_calf_extension_machine.mp4"
• For "Calf Extension Machine": "http://localhost:3000/api/time/videos/calf_extension_machine.mp4"
• For all other exercises: "video_placeholder"

TIME CALCULATION RULES (applies to GAININGMUSCLE mode):
1. Each main workout set consists of 2 minutes of exercise motion plus 3 minutes of rest (5 minutes total per set).
2. For every new muscle group worked, include a warm-up phase:
   - **_***<u>NEW: Warm-up sets:</u>***_** Perform 2 warm-up sets (each: 2 minutes exercise + 30 sec rest; total = 5 minutes).
   - **_***<u>NEW: Additional warm-up pause:</u>***_** After warm-ups, include a 2-minute pause before starting main sets.
   - Thus, each muscle group incurs an additional 7 minutes of warm-up time before main sets.
3. Use the above calculations to determine how many muscle groups can be included within "available_time".

ALGORITHM & RULES:
A. **_***<u>NEW: MODE-SPECIFIC APPROACH:</u>***_**
   - For GAININGMUSCLE mode:
     - Evaluate "previous_workout_data" to prioritize muscle groups that are undertrained (fewer sets) and avoid working those that were just done in the previous workout (using "last_workout_muscle_groups").
     - If all muscle groups are balanced, rotate based on a standard full-body split.
   - For LOSINGWEIGHT mode:
     - Calculate BMI = weight (kg) / (height (m))²
     - Based on BMI, adjust exercise intensity:
       • BMI < 18.5: Lower intensity, focus on building endurance
       • BMI 18.5-24.9: Moderate intensity, balanced approach
       • BMI 25-29.9: Higher intensity, focus on calorie burn
       • BMI ≥ 30: Very high intensity, focus on maximum calorie burn
     - Prioritize exercises with higher MET values for higher BMI
     - For very high BMI, recommend lower impact exercises (swimming, elliptical) to reduce joint stress

B. MATCH WORKOUT TO AVAILABLE TIME:
   - For GAININGMUSCLE mode:
     - If available_time is between 10–15 minutes, focus on 1 muscle group (or a bodyweight HIIT if applicable).
     - If available_time is 20–30 minutes, design a superset-based full-body or upper/lower routine.
     - If available_time is 40+ minutes, offer a full regular split that includes warm-up and cooldown.
     - For each selected muscle group, include the 7-minute warm-up plus one or more main sets (each main set = 5 minutes).
     - Ensure the total calculated time (warm-ups + main sets for each muscle group) does not exceed available_time.
   - For LOSINGWEIGHT mode:
     - Calculate how many calories can be burned in the available time based on the user's BMR and the target calories
     - Recommend exercises that can be completed within the available time while meeting the calorie target
     - Consider the user's BMI to adjust exercise intensity and duration

C. EXERCISE SELECTION:
   - For **GAININGMUSCLE mode**:
       - For each muscle group included, select 1 primary exercise (from the fixed list under GAININGMUSCLE) and designate the other 2 as alternatives (fallback options for a skip).
       - Tailor set/reps/rest parameters based on the goal:
           • For "muscle gain": 3–4 main sets per exercise, 8–12 reps per set, and 60–90 seconds rest between main sets.
       - All exercises must include a placeholder "video_url" (e.g., "video_placeholder").
   - For **LOSINGWEIGHT mode**:
       - Use the provided cardio exercises. Choose from two separate lists:
            • "non_gym_workout" and "gym_workout" (based on user preference or availability, if such a choice exists internally).
       - **_***<u>NEW: CALORIE CALCULATION:</u>***_**  
         - First, calculate the user's Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation:
             - For Men: BMR = 10 × weight (kg) + 6.25 × height (cm) − 5 × age + 5  
             - For Women: BMR = 10 × weight (kg) + 6.25 × height (cm) − 5 × age − 161  
         - For each exercise option, compute calories burned per minute using:  
             Calories per minute = (BMR / 1440) × MET  
         - Multiply by the duration of the exercise (including rest intervals) to estimate total calories burned.
         - **_***<u>NEW: If the total session time calculated for an exercise (including its average continuous duration and rest intervals) exceeds available_time or does not meet the target calories (within a margin of ±50 calories), ignore that exercise option.</u>***_**
         - For each valid exercise option (from both non_gym_workout and gym_workout lists), output the exercise name and the calculated time (in minutes) required to burn the target calories.
D. OTHER:
   - Include a boolean flag for warm-up and cooldown. Warm-up is defined per muscle group in GAININGMUSCLE mode; assume cooldown is included if available_time is 30 minutes or more.
   - **_***<u>NEW: For LOSINGWEIGHT mode, output separate sections for gym_workout and non_gym_workout options.</u>***_**

OUTPUT FORMAT:
Return the workout plan as a JSON object exactly in the following structure.

For **GAININGMUSCLE mode** (output structure remains as before):

{
  "workout_goal": <goal>,
  "mode": "GAININGMUSCLE",
  "total_time_minutes": <available_time>,
  "muscle_groups_targeted": [ list of muscle groups included ],
  "exercises": {
      "<muscle_group>": {
          "warmup": {
             "sets": 2,
             "details": "Each warmup set: 2 min exercise + 30 sec rest; then 2 min pause before main sets",
             "total_warmup_time_minutes": 7
          },
          "primary": {
              "name": <exercise name>,
              "sets": <number>,
              "reps": <number>,
              "rest_time_seconds": <number>,
              "video_url": "<video_placeholder>"
          },
          "alternatives": [
              {
                  "name": <exercise name>,
                  "sets": <number>,
                  "reps": <number>,
                  "rest_time_seconds": <number>,
                  "video_url": "<video_placeholder>"
              },
              {
                  "name": <exercise name>,
                  "sets": <number>,
                  "reps": <number>,
                  "rest_time_seconds": <number>,
                  "video_url": "<video_placeholder>"
              }
          ]
      },
      ... (repeat for each targeted muscle group)
  },
  "warmup_included": <true or false>,
  "cooldown_included": <true or false>
}

For **LOSINGWEIGHT mode**:

{
  "workout_goal": <goal>,
  "mode": "LOSINGWEIGHT",
  "total_time_minutes": <available_time>,
  "target_calories": <calories>,
  "bmi": <calculated BMI>,
  "bmi_category": <"Underweight", "Normal", "Overweight", or "Obese">,
  "cardio_options": {
      "non_gym_workout": [
          {
              "name": <exercise name from non_gym_workout>,
              "met_value": <MET value>,
              "calculated_time_minutes": <calculated time to burn target calories>,
              "intensity_level": <"Low", "Moderate", or "High">
          },
          ... (list all valid options from non_gym_workout that meet available_time)
      ],
      "gym_workout": [
          {
              "name": <exercise name from gym_workout>,
              "met_value": <MET value>,
              "calculated_time_minutes": <calculated time to burn target calories>,
              "intensity_level": <"Low", "Moderate", or "High">
          },
          ... (list all valid options from gym_workout that meet available_time)
      ]
  }
}

Instructions:
- Do not provide any explanation, reasoning, or additional commentary.
- Output exactly one JSON object in the specified format.
- Use the input parameters along with the above guidelines to produce a balanced, optimal daily workout plan.
- Wait for the user's JSON input before generating the plan.

Here is the input data for today's workout:

{
  "goal": "${user.fitnessGoal || 'muscle_gain'}",
  "mode": "${user.fitnessGoal === 'fat_loss' ? 'LOSINGWEIGHT' : 'GAININGMUSCLE'}",
  "available_time": ${minutes},
  "calories": ${user.fitnessGoal === 'fat_loss' ? '300' : 'null'},
  "previous_workout_data": ${user.fitnessGoal === 'fat_loss' ? 'null' : `{
    "biceps": ${entries.filter(e => e.workoutDetails && e.workoutDetails.includes('biceps')).length || 0},
    "triceps": ${entries.filter(e => e.workoutDetails && e.workoutDetails.includes('triceps')).length || 0},
    "shoulders": ${entries.filter(e => e.workoutDetails && e.workoutDetails.includes('shoulders')).length || 0},
    "chest": ${entries.filter(e => e.workoutDetails && e.workoutDetails.includes('chest')).length || 0},
    "back": ${entries.filter(e => e.workoutDetails && e.workoutDetails.includes('back')).length || 0},
    "quads": ${entries.filter(e => e.workoutDetails && e.workoutDetails.includes('quads')).length || 0},
    "hamstrings": ${entries.filter(e => e.workoutDetails && e.workoutDetails.includes('hamstrings')).length || 0},
    "glutes": ${entries.filter(e => e.workoutDetails && e.workoutDetails.includes('glutes')).length || 0},
    "calves": ${entries.filter(e => e.workoutDetails && e.workoutDetails.includes('calves')).length || 0}
  }`},
  "last_workout_muscle_groups": ${user.fitnessGoal === 'fat_loss' ? '[]' : JSON.stringify(entries.length > 0 ? entries[0].workoutDetails ? entries[0].workoutDetails.split(', ') : [] : [])},
  "age": ${user.age || 30},
  "sex": "${user.gender || 'male'}",
  "height": ${user.height || 170},
  "weight": ${user.weight || 70}
}`;

    // Call Gemini API
    console.log('🔑 GEMINI_API_KEY:', process.env.GEMINI_API_KEY);
    console.log('🔑 All env variables:', process.env);
    
    // Temporarily hardcode the API key for testing
    const geminiApiKey = 'AIzaSyAPEXaE8LSndZxOTvZbj5Q3OlYDoajiwU0';
    
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000, // Increase timeout to 60 seconds
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      
      // Log the raw response for debugging
      console.log('🔍 Raw Gemini response:', JSON.stringify(response.data, null, 2));
      
      // Extract the suggestion from the response
      if (!response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('❌ Invalid response structure from Gemini API');
        console.error('Response:', response.data);
        return res.status(500).json({ error: 'Invalid response from AI service' });
      }

      const suggestion = response.data.candidates[0].content.parts[0].text;
      console.log('📝 Raw suggestion text:', suggestion);
      
      // Parse the JSON response
      try {
        // Try to clean the response if it has any leading/trailing whitespace or markdown
        const cleanedSuggestion = suggestion.trim().replace(/```json\n?|\n?```/g, '');
        console.log('🧹 Cleaned suggestion:', cleanedSuggestion);
        
        const workoutPlan = JSON.parse(cleanedSuggestion);
        console.log('✅ Successfully parsed workout plan');

        // Filter out exercises that exceed the available time for LOSINGWEIGHT mode
        if (workoutPlan.mode === 'LOSINGWEIGHT' && workoutPlan.cardio_options) {
          const availableTime = workoutPlan.total_time_minutes;
          
          // Filter non-gym workouts and round calculated_time_minutes to one decimal place
          if (workoutPlan.cardio_options.non_gym_workout) {
            workoutPlan.cardio_options.non_gym_workout = workoutPlan.cardio_options.non_gym_workout
              .filter(exercise => exercise.calculated_time_minutes <= availableTime)
              .map(exercise => ({
                ...exercise,
                calculated_time_minutes: Number(exercise.calculated_time_minutes.toFixed(1))
              }));
          }
          
          // Filter gym workouts and round calculated_time_minutes to one decimal place
          if (workoutPlan.cardio_options.gym_workout) {
            workoutPlan.cardio_options.gym_workout = workoutPlan.cardio_options.gym_workout
              .filter(exercise => exercise.calculated_time_minutes <= availableTime)
              .map(exercise => ({
                ...exercise,
                calculated_time_minutes: Number(exercise.calculated_time_minutes.toFixed(1))
              }));
          }
        }

        res.json(workoutPlan);
      } catch (err) {
        console.error('❌ Error parsing workout suggestion:', err);
        console.error('Failed to parse text:', suggestion);
        res.status(500).json({ 
          error: 'Failed to parse workout suggestion. Please try again.',
          details: err.message
        });
      }
    } catch (err) {
      console.error('❌ Error generating suggestion:', err);
      if (err.code === 'ECONNABORTED') {
        res.status(504).json({ error: 'Request to AI service timed out. Please try again.' });
      } else if (err.response?.status === 403) {
        res.status(500).json({ error: 'AI service configuration error. Please contact support.' });
      } else {
        console.error('Full error:', err);
        res.status(500).json({ 
          error: 'Failed to generate workout suggestion. Please try again.',
          details: err.message
        });
      }
    }
  } catch (err) {
    console.error('❌ Error generating suggestion:', err);
    if (err.response?.status === 403) {
      res.status(500).json({ error: 'AI service configuration error. Please contact support.' });
    } else {
      console.error('Full error:', err);
      res.status(500).json({ 
        error: 'Failed to generate workout suggestion. Please try again.',
        details: err.message
      });
    }
  }
});

// Add a new route to calculate calories burned for a specific activity
router.post('/calculate-calories', authMiddleware, async (req, res) => {
  console.log('🧮 Calculating calories burned');
  const userId = req.user.userId;
  const { activity, duration } = req.body;
  
  if (!activity || !duration) {
    return res.status(400).json({ error: 'Activity and duration are required' });
  }
  
  try {
    // Get user data to access metrics
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    // MET values for different activities
    const metValues = {
      // Non-gym workouts
      "Swimming": 8.0,
      "Running": 9.8,
      "Walking": 4.3,
      "Jump rope": 12.3,
      "Biking": 8.0,
      // Gym workouts
      "Treadmill": 8.3,
      "Stair Master": 9.0,
      "Elliptical": 5.0,
      "Indoor Bike": 7.0,
      "Rowing Machine": 8.0
    };
    
    // Get MET value for the activity
    const met = metValues[activity];
    if (!met) {
      return res.status(400).json({ error: 'Invalid activity. Please select from the available options.' });
    }
    
    // Calculate BMR using Mifflin-St Jeor equation
    let bmr;
    if (user.gender === 'male') {
      bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age + 5;
    } else {
      bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age - 161;
    }
    
    // Calculate calories burned per minute
    const caloriesPerMinute = (bmr / 1440) * met;
    
    // Calculate total calories burned
    const totalCalories = Math.round(caloriesPerMinute * duration);
    
    // Return the calculation results
    res.json({
      activity,
      duration,
      met,
      bmr: Number(bmr.toFixed(1)),
      caloriesPerMinute: Number(caloriesPerMinute.toFixed(1)),
      totalCalories: Number(totalCalories.toFixed(1))
    });
    
  } catch (err) {
    console.error('❌ Error calculating calories:', err);
    res.status(500).json({ 
      error: 'Failed to calculate calories burned. Please try again.',
      details: err.message
    });
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
    
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's entry
    let entry = await TimeEntry.findOne({
      userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (entry) {
      // Update existing entry
      entry.minutes = minutes;
      await entry.save();
      console.log('✅ Updated existing time entry');
    } else {
      // Create new entry
      entry = new TimeEntry({
        userId,
        date: new Date(),
        minutes
      });
    await entry.save();
      console.log('✅ Created new time entry');
    }
    
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

// Store completed workout in history
router.post('/complete-workout', authMiddleware, async (req, res) => {
  console.log('💪 Storing completed workout');
  console.log('Request body:', req.body);
  console.log('User from token:', req.user);
  
  const userId = req.user.userId;
  const { date, activity, duration, calories, exercises } = req.body;

  if (!date || !activity || !duration || !calories || !exercises) {
    console.error('❌ Missing required workout data');
    return res.status(400).json({ error: 'All workout details are required' });
  }

  try {
    // Create a new workout entry
    const workout = new Workout({
      userId,
      date,
      activity,
      duration,
      calories,
      exercises,
      completed: true
    });
    
    await workout.save();
    console.log('✅ Created new workout entry');

    // Also update the TimeEntry for backward compatibility
    const workoutDate = new Date(date);
    workoutDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(workoutDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let timeEntry = await TimeEntry.findOne({
      userId,
      date: { $gte: workoutDate, $lt: nextDay }
    });

    if (timeEntry) {
      // Update existing entry
      timeEntry.minutes = duration;
      timeEntry.workoutDetails = JSON.stringify({
        activity,
        exercises: exercises.map(ex => ex.name).join(', ')
      });
      timeEntry.completed = true;
      await timeEntry.save();
      console.log('✅ Updated existing time entry');
    } else {
      // Create new entry
      timeEntry = new TimeEntry({
        userId,
        date: workoutDate,
        minutes: duration,
        workoutDetails: JSON.stringify({
          activity,
          exercises: exercises.map(ex => ex.name).join(', ')
        }),
        completed: true
      });
      await timeEntry.save();
      console.log('✅ Created new time entry');
    }

    res.json({ message: 'Workout completed and stored in history', workout });
  } catch (err) {
    console.error('❌ Error storing workout:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get workout history
router.get('/workout-history', authMiddleware, async (req, res) => {
  console.log('📊 Fetching workout history');
  const userId = req.user.userId;

  try {
    // Get all workouts for the user
    const workouts = await Workout.find({ userId })
      .sort({ date: -1 }); // Sort by date descending (newest first)
    
    console.log(`✅ Found ${workouts.length} workouts`);
    res.json({ workouts });
  } catch (err) {
    console.error('❌ Error fetching workout history:', err);
    res.status(500).json({ error: err.message });
  }
});

// Migrate TimeEntry data to Workout model
router.post('/migrate-workout-data', authMiddleware, async (req, res) => {
  console.log('🔄 Migrating TimeEntry data to Workout model');
  const userId = req.user.userId;

  try {
    // Get all completed TimeEntries for the user
    const timeEntries = await TimeEntry.find({
      userId,
      completed: true,
      workoutDetails: { $exists: true, $ne: null }
    }).sort({ date: -1 });

    console.log(`Found ${timeEntries.length} completed time entries to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const entry of timeEntries) {
      try {
        // Check if a workout already exists for this date
        const dateStr = entry.date.toISOString().split('T')[0]; // YYYY-MM-DD format
        const existingWorkout = await Workout.findOne({
          userId,
          date: dateStr
        });

        if (existingWorkout) {
          console.log(`Skipping entry for ${dateStr} - workout already exists`);
          skippedCount++;
          continue;
        }

        // Parse workout details
        let workoutDetails;
        try {
          workoutDetails = JSON.parse(entry.workoutDetails);
        } catch (e) {
          // If parsing fails, create a basic workout details object
          workoutDetails = {
            activity: 'unknown',
            exercises: []
          };
        }

        // Create a new workout
        const workout = new Workout({
          userId,
          date: dateStr,
          activity: workoutDetails.activity || 'unknown',
          duration: entry.minutes,
          calories: 0, // Default value since we don't have this in TimeEntry
          exercises: [], // Default empty array since we don't have detailed exercise data
          completed: true
        });

        await workout.save();
        migratedCount++;
        console.log(`Migrated entry for ${dateStr}`);
      } catch (err) {
        console.error(`Error migrating entry for ${entry.date}:`, err);
        skippedCount++;
      }
    }

    res.json({
      message: 'Migration completed',
      totalEntries: timeEntries.length,
      migratedCount,
      skippedCount
    });
  } catch (err) {
    console.error('❌ Error during migration:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
