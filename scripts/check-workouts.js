require('dotenv').config();
const mongoose = require('mongoose');
const Workout = require('../models/Workout');

async function checkWorkouts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all workouts
    const workouts = await Workout.find().sort({ date: -1 });

    console.log(`\nFound ${workouts.length} workouts:\n`);

    for (const workout of workouts) {
      console.log(`Date: ${workout.date}`);
      console.log(`Activity: ${workout.activity}`);
      console.log(`Duration: ${workout.duration} minutes`);
      if (workout.muscleGroups && workout.muscleGroups.length > 0) {
        console.log(`Muscle Groups: ${workout.muscleGroups.join(', ')}`);
      }
      console.log(`Exercises (${workout.exercises.length}):`);
      workout.exercises.forEach((exercise, index) => {
        console.log(`  ${index + 1}. ${exercise.name}`);
        console.log(`     Sets: ${exercise.sets}, Reps: ${exercise.reps}, Weight: ${exercise.weight}`);
        if (exercise.notes) console.log(`     Notes: ${exercise.notes}`);
      });
      console.log('\n---\n');
    }

  } catch (error) {
    console.error('Error checking workouts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkWorkouts(); 