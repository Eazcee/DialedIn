require('dotenv').config();
const mongoose = require('mongoose');
const Workout = require('../models/Workout');

async function clearWorkouts() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Delete all workouts
    console.log('Deleting workouts...');
    const result = await Workout.deleteMany({});
    console.log(`Deleted ${result.deletedCount} workouts`);

  } catch (error) {
    console.error('Error clearing workouts:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the function
clearWorkouts().then(() => {
  console.log('Clear operation completed');
  process.exit(0);
}).catch(error => {
  console.error('Clear operation failed:', error);
  process.exit(1);
}); 