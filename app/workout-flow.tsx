import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeMethods
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../config/colors';
import MuscleGroupExercise from '../components/MuscleGroupExercise';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define types for the workout plan
interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest_time_seconds: number;
  video_url: string;
}

interface MuscleGroup {
  primary: Exercise;
  alternatives: Exercise[];
}

interface WorkoutPlan {
  workout_goal: string;
  total_time_minutes: number;
  muscle_groups_targeted: string[];
  exercises: Record<string, MuscleGroup>;
  warmup_included: boolean;
  cooldown_included: boolean;
}

export default function WorkoutFlowScreen() {
  const params = useLocalSearchParams();
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMuscleGroupIndex, setCurrentMuscleGroupIndex] = useState(0);
  const [completedMuscleGroups, setCompletedMuscleGroups] = useState<string[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { height } = Dimensions.get('window');
  const muscleGroupHeight = height * 0.6; // Approximate height of each muscle group container

  useEffect(() => {
    if (params.workoutPlan) {
      try {
        const decodedPlan = JSON.parse(decodeURIComponent(params.workoutPlan as string));
        
        // Set rest time to 3 seconds for all exercises for the demo
        if (decodedPlan.exercises) {
          Object.keys(decodedPlan.exercises).forEach(muscleGroup => {
            // Update primary exercise
            if (decodedPlan.exercises[muscleGroup].primary) {
              decodedPlan.exercises[muscleGroup].primary.rest_time_seconds = 3;
            }
            
            // Update alternative exercises
            if (decodedPlan.exercises[muscleGroup].alternatives) {
              decodedPlan.exercises[muscleGroup].alternatives.forEach((exercise: Exercise) => {
                exercise.rest_time_seconds = 3;
              });
            }
          });
        }
        
        setWorkoutPlan(decodedPlan);
      } catch (error) {
        console.error('Error parsing workout plan:', error);
        Alert.alert('Error', 'Failed to load workout plan. Please try again.');
        router.back();
      }
    }
    setLoading(false);
  }, [params.workoutPlan]);

  const handleMuscleGroupComplete = (muscleGroup: string) => {
    setCompletedMuscleGroups(prev => [...prev, muscleGroup]);
    
    // Move to the next muscle group if available
    if (currentMuscleGroupIndex < (workoutPlan?.muscle_groups_targeted.length || 0) - 1) {
      const nextIndex = currentMuscleGroupIndex + 1;
      setCurrentMuscleGroupIndex(nextIndex);
      
      // Scroll to the next muscle group
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: nextIndex * muscleGroupHeight,
            animated: true
          });
        }
      }, 100);
    } else {
      // All muscle groups completed
      completeWorkout();
    }
  };

  const completeWorkout = async () => {
    setIsCompleting(true);
    try {
      // Get the auth token from storage
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        Alert.alert('Error', 'Please log in again.');
        router.replace('/auth');
        return;
      }

      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      
      // Create the completed workout data
      const completedWorkoutData = {
        date: formattedDate,
        activity: workoutPlan.workout_goal,
        duration: workoutPlan.total_time_minutes,
        calories: workoutPlan.workout_goal === 'fat_loss' ? 300 : 0,
        exercises: Object.entries(workoutPlan.exercises || {}).map(([muscleGroup, exerciseGroup]) => ({
          name: exerciseGroup.primary.name,
          sets: exerciseGroup.primary.sets,
          reps: exerciseGroup.primary.reps,
          weight: exerciseGroup.primary.weight || 0,
          muscle_groups: [muscleGroup]
        }))
      };

      // Send the completed workout data to the backend
      const url = `${API_URL}/time/complete-workout`;
      console.log('Making request to:', url);
      console.log('Request body:', completedWorkoutData);
      
      const response = await axios.post(
        url,
        completedWorkoutData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Response:', response.data);
      
      Alert.alert(
        'Workout Completed!',
        'Great job! You\'ve completed your workout.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/')
          }
        ]
      );
    } catch (error) {
      console.error('Error completing workout:', error);
      Alert.alert('Error', 'Failed to complete workout. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your workout...</Text>
        </View>
      </View>
    );
  }

  if (!workoutPlan) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.noWorkoutContainer}>
          <Text style={styles.noWorkoutText}>
            No workout plan available. Please try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentMuscleGroup = workoutPlan.muscle_groups_targeted[currentMuscleGroupIndex];
  const muscleGroupExercises = workoutPlan.exercises[currentMuscleGroup];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Workout Flow</Text>
        <Text style={styles.subtitle}>{workoutPlan.workout_goal}</Text>
        <Text style={styles.progress}>
          {currentMuscleGroupIndex + 1} of {workoutPlan.muscle_groups_targeted.length}
        </Text>
      </View>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        {workoutPlan.muscle_groups_targeted.map((group, index) => (
          <View 
            key={index} 
            style={[
              styles.muscleGroupContainer,
              index === currentMuscleGroupIndex ? styles.activeMuscleGroup : styles.inactiveMuscleGroup
            ]}
          >
            <MuscleGroupExercise
              muscleGroup={group}
              exercises={workoutPlan.exercises[group]}
              onComplete={() => handleMuscleGroupComplete(group)}
            />
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => handleMuscleGroupComplete(currentMuscleGroup)}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.completeButton}
          onPress={completeWorkout}
        >
          <Text style={styles.completeButtonText}>Complete Workout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
  },
  noWorkoutContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noWorkoutText: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    width: '50%',
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  progress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  muscleGroupContainer: {
    marginBottom: 20,
  },
  activeMuscleGroup: {
    opacity: 1,
  },
  inactiveMuscleGroup: {
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  skipButton: {
    backgroundColor: colors.gray,
    padding: 15,
    borderRadius: 10,
    width: '45%',
    alignItems: 'center',
  },
  skipButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    width: '45%',
    alignItems: 'center',
  },
  completeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 