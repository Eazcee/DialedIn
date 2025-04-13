const mongoose = require('mongoose');

// Define the exercise schema
const ExerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: { type: Number, required: true },
  reps: { type: Number, required: true },
  weight: { type: Number },
  muscle_groups: { type: [String] },
  video_url: { type: String }
});

// Define the workout schema
const WorkoutSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD format
  activity: { type: String, required: true }, // 'muscle_gain' or 'fat_loss'
  duration: { type: Number, required: true }, // in minutes
  calories: { type: Number, required: true },
  exercises: [ExerciseSchema],
  completed: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Workout', WorkoutSchema); 