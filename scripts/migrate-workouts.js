require('dotenv').config();
const mongoose = require('mongoose');
const TimeEntry = require('../models/TimeEntry');
const Workout = require('../models/Workout');

async function migrateWorkouts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all completed time entries with workout details
    const timeEntries = await TimeEntry.find({
      completed: true,
      workoutDetails: { $exists: true, $ne: null }
    }).sort({ date: -1 });

    console.log(`Found ${timeEntries.length} time entries to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const entry of timeEntries) {
      // Check if a workout already exists for this date
      const existingWorkout = await Workout.findOne({
        userId: entry.userId,
        date: entry.date
      });

      if (existingWorkout) {
        console.log(`Skipping entry for ${entry.date} - workout already exists`);
        skipped++;
        continue;
      }

      try {
        // Parse workout details with error handling
        let workoutDetails;
        try {
          workoutDetails = JSON.parse(entry.workoutDetails);
          console.log('Parsed workout details:', workoutDetails);
        } catch (parseError) {
          console.log(`Error parsing workout details for ${entry.date}, using defaults:`, parseError);
          workoutDetails = {
            workout_goal: 'Unknown',
            total_time_minutes: 0,
            muscle_groups_targeted: [],
            exercises: {}
          };
        }

        // Convert the exercises object into an array format
        let exercises = [];
        if (workoutDetails.exercises && typeof workoutDetails.exercises === 'object') {
          // Iterate through each muscle group
          for (const [muscleGroup, exerciseData] of Object.entries(workoutDetails.exercises)) {
            if (exerciseData.primary) {
              // Add primary exercise
              exercises.push({
                name: exerciseData.primary.name || `${muscleGroup} exercise`,
                sets: exerciseData.primary.sets || 3,
                reps: exerciseData.primary.reps || 10,
                weight: exerciseData.primary.weight || 0,
                notes: `Primary ${muscleGroup} exercise`
              });
            }
          }
        }

        // Create new workout
        const workout = new Workout({
          userId: entry.userId,
          date: entry.date,
          activity: workoutDetails.workout_goal || 'Unknown',
          duration: workoutDetails.total_time_minutes || entry.minutes || 0,
          calories: workoutDetails.calories || 0,
          exercises: exercises,
          completed: true,
          muscleGroups: workoutDetails.muscle_groups_targeted || []
        });

        await workout.save();
        console.log(`Migrated workout for ${entry.date} with ${exercises.length} exercises`);
        migrated++;
      } catch (error) {
        console.error(`Error migrating entry for ${entry.date}:`, error);
        skipped++;
      }
    }

    console.log('\nMigration Summary:');
    console.log(`Total entries processed: ${timeEntries.length}`);
    console.log(`Successfully migrated: ${migrated}`);
    console.log(`Skipped: ${skipped}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateWorkouts(); 