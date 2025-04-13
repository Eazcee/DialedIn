import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  Modal
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../config/colors';
import CircularSlider from '../components/CircularSlider';

// Define types for the workout plan
interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest_time_seconds: number;
  video_url: string;
  weight?: number;
}

interface MuscleGroup {
  primary: Exercise;
  alternatives: Exercise[];
}

interface WorkoutPlan {
  workout_goal: string;
  mode: string;
  total_time_minutes: number;
  target_calories?: number;
  bmi?: number;
  bmi_category?: string;
  muscle_groups_targeted?: string[];
  exercises?: Record<string, MuscleGroup>;
  cardio_options?: {
    non_gym_workout: Array<{
      name: string;
      met_value: number;
      calculated_time_minutes: number;
      intensity_level: string;
    }>;
    gym_workout: Array<{
      name: string;
      met_value: number;
      calculated_time_minutes: number;
      intensity_level: string;
    }>;
  };
  warmup_included?: boolean;
  cooldown_included?: boolean;
  total_calories: number;
}

export default function WorkoutSuggestionScreen() {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [calorieResults, setCalorieResults] = useState<any>(null);
  const [selectedCalories, setSelectedCalories] = useState(500);

  const fetchSuggestion = async () => {
    try {
      // Get the auth token from storage
      const token = await AsyncStorage.getItem('authToken');
      console.log('Token from storage:', token ? 'Token exists' : 'Token missing');
      
      if (!token) {
        console.error('No auth token found');
        Alert.alert('Error', 'Please log in again.');
        router.replace('/auth');
        return;
      }

      // Get the most recent time and calories from AsyncStorage
      const lastLoggedTime = await AsyncStorage.getItem('lastLoggedTime');
      const targetCalories = await AsyncStorage.getItem('targetCalories');
      console.log('Last logged time from AsyncStorage:', lastLoggedTime);
      console.log('Target calories from AsyncStorage:', targetCalories);
      
      // Parse the time as an integer with a fallback to 30
      const parsedTime = parseInt(lastLoggedTime || '30', 10);
      const parsedCalories = targetCalories ? parseInt(targetCalories, 10) : undefined;
      console.log('Parsed time value:', parsedTime);
      console.log('Parsed calories value:', parsedCalories);

      console.log('Making request to:', `${API_URL}/time/suggestion`);
      console.log('Request params:', { 
        time: parsedTime,
        calories: parsedCalories 
      });
      console.log('Request headers:', { Authorization: `Bearer ${token}` });

      const response = await axios.get(`${API_URL}/time/suggestion`, {
        params: {
          time: parsedTime,
          calories: parsedCalories
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Response:', response.data);
      setWorkoutPlan(response.data);
    } catch (error: any) {
      console.error('Error fetching workout suggestion:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Check if the error is due to authentication
      if (error.response?.status === 401) {
        console.error('Authentication error - token may be invalid or expired');
        Alert.alert('Error', 'Your session has expired. Please log in again.');
        router.replace('/auth');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('Connection refused - server may be down');
        Alert.alert('Error', 'Could not connect to the server. Please check your internet connection.');
      } else {
        Alert.alert(
          'Error',
          error.response?.data?.error || 'Failed to get workout suggestion. Please try again.',
          [
            { 
              text: 'Retry',
              onPress: () => fetchSuggestion()
            },
            { 
              text: 'Go Back',
              onPress: () => router.back(),
              style: 'cancel'
            }
          ]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const completeWorkout = async () => {
    if (!workoutPlan) return;
    
    setIsCompleting(true);
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        Alert.alert('Error', 'Please log in again.');
        router.replace('/auth');
        return;
      }

      const url = `${API_URL}/time/complete-workout`;
      console.log('Making request to:', url);
      console.log('Request body:', { workoutDetails: JSON.stringify(workoutPlan) });
      console.log('Request headers:', { Authorization: `Bearer ${token}` });
      
      const response = await axios.post(
        url,
        { workoutDetails: JSON.stringify(workoutPlan) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Response:', response.data);
      
      Alert.alert(
        'Success',
        'Workout completed and stored in your history!',
        [
          {
            text: 'Go Home',
            onPress: () => router.replace('/')
          }
        ]
      );
    } catch (error: any) {
      console.error('Error completing workout:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        Alert.alert('Error', 'Your session has expired. Please log in again.');
        router.replace('/auth');
      } else {
        Alert.alert(
          'Error',
          error.response?.data?.error || 'Failed to complete workout. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsCompleting(false);
    }
  };

  const calculateCalories = async (activity: string, duration: number) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please log in again.');
        router.replace('/auth');
        return;
      }

      const response = await axios.post(
        `${API_URL}/time/calculate-calories`,
        { activity, duration },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Round the values to one decimal point
      const roundedResults = {
        ...response.data,
        bmr: Number(response.data.bmr.toFixed(1)),
        caloriesPerMinute: Number(response.data.caloriesPerMinute.toFixed(1)),
        totalCalories: Number(response.data.totalCalories.toFixed(1))
      };

      setCalorieResults(roundedResults);
    } catch (error: any) {
      console.error('Error calculating calories:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to calculate calories. Please try again.'
      );
    }
  };

  const saveWorkoutToHistory = async (workoutData: {
    date: string;
    activity: string;
    duration: number;
    calories: number;
    exercises: Array<{
      name: string;
      sets: number;
      reps: number;
      weight?: number;
    }>;
  }) => {
    try {
      const existingHistory = await AsyncStorage.getItem('workoutHistory');
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      history.push(workoutData);
      await AsyncStorage.setItem('workoutHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving workout history:', error);
    }
  };

  const navigateToWorkoutFlow = async () => {
    if (!workoutPlan || !workoutPlan.exercises) return;

    const workoutData = {
      date: new Date().toISOString().split('T')[0],
      activity: workoutPlan.workout_goal,
      duration: workoutPlan.total_time_minutes,
      calories: workoutPlan.workout_goal === 'fat_loss' ? selectedCalories : 0,
      exercises: Object.entries(workoutPlan.exercises).map(([muscleGroup, exerciseGroup]) => ({
        name: exerciseGroup.primary.name,
        sets: exerciseGroup.primary.sets,
        reps: exerciseGroup.primary.reps,
        weight: exerciseGroup.primary.weight || 0,
        muscle_groups: [muscleGroup]
      }))
    };

    await saveWorkoutToHistory(workoutData);
    router.push('/workout-flow');
  };

  useEffect(() => {
    fetchSuggestion();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSuggestion();
  };

  const startWorkout = () => {
    if (!workoutPlan) return;
    
    if (workoutPlan.workout_goal === 'fat_loss') {
      router.push({
        pathname: '/stopwatch',
        params: {
          workoutPlan: encodeURIComponent(JSON.stringify(workoutPlan)),
          activity: selectedActivity
        }
      });
    } else {
      // For muscle gain workouts, navigate to the workout-flow screen
      router.push({
        pathname: '/workout-flow',
        params: {
          workoutPlan: encodeURIComponent(JSON.stringify(workoutPlan))
        }
      });
    }
  };

  const navigateToStopwatchScreen = () => {
    if (!workoutPlan) return;
    
    // Navigate to the stopwatch screen with the workout plan as a parameter
    router.push({
      pathname: '/stopwatch',
      params: { 
        workoutPlan: encodeURIComponent(JSON.stringify(workoutPlan)),
        activity: selectedActivity || ''
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Generating your personalized workout...</Text>
        </View>
      </View>
    );
  }

  if (!workoutPlan) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.noSuggestionContainer}>
          <Text style={styles.noSuggestionText}>
            No workout suggestion available. Please try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchSuggestion}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Workout Suggestion</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.workoutContainer}>
          <View style={styles.workoutHeader}>
            <Text style={styles.workoutTitle}>
              {workoutPlan.workout_goal === 'muscle_gain' ? 'Muscle Gain' : 'Fat Loss'} Workout
            </Text>
            <Text style={styles.workoutTime}>
              {workoutPlan.total_time_minutes} Minutes
            </Text>
          </View>

          {workoutPlan.mode === 'LOSINGWEIGHT' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Metrics</Text>
              <Text style={styles.metricText}>BMI: {workoutPlan.bmi?.toFixed(1)}</Text>
              <Text style={styles.metricText}>Category: {workoutPlan.bmi_category}</Text>
            </View>
          )}

          {workoutPlan.mode === 'LOSINGWEIGHT' && workoutPlan.cardio_options && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Non-Gym Workout Options</Text>
                {workoutPlan.cardio_options.non_gym_workout.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.cardioOption,
                      selectedActivity === option.name && styles.selectedCardioOption
                    ]}
                    onPress={() => {
                      setSelectedActivity(option.name);
                      calculateCalories(option.name, option.calculated_time_minutes);
                    }}
                  >
                    <Text style={[
                      styles.cardioOptionName,
                      selectedActivity === option.name && styles.selectedText
                    ]}>{option.name}</Text>
                    <Text style={[
                      styles.cardioOptionDetails,
                      selectedActivity === option.name && styles.selectedText
                    ]}>
                      MET: {option.met_value} | Time: {option.calculated_time_minutes} min
                    </Text>
                    <Text style={[
                      styles.calorieText,
                      selectedActivity === option.name && styles.selectedText
                    ]}>
                      Calories burnt: {Math.round((option.met_value * (workoutPlan.bmi || 22) * option.calculated_time_minutes) / 24)}
                    </Text>
                    <Text style={[
                      styles.intensityText,
                      selectedActivity === option.name && styles.selectedText
                    ]}>
                      Intensity: {option.intensity_level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Gym Workout Options</Text>
                {workoutPlan.cardio_options.gym_workout.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.cardioOption,
                      selectedActivity === option.name && styles.selectedCardioOption
                    ]}
                    onPress={() => {
                      setSelectedActivity(option.name);
                      calculateCalories(option.name, option.calculated_time_minutes);
                    }}
                  >
                    <Text style={[
                      styles.cardioOptionName,
                      selectedActivity === option.name && styles.selectedText
                    ]}>{option.name}</Text>
                    <Text style={[
                      styles.cardioOptionDetails,
                      selectedActivity === option.name && styles.selectedText
                    ]}>
                      MET: {option.met_value} | Time: {option.calculated_time_minutes} min
                    </Text>
                    <Text style={[
                      styles.calorieText,
                      selectedActivity === option.name && styles.selectedText
                    ]}>
                      Calories burnt: {Math.round((option.met_value * (workoutPlan.bmi || 22) * option.calculated_time_minutes) / 24)}
                    </Text>
                    <Text style={[
                      styles.intensityText,
                      selectedActivity === option.name && styles.selectedText
                    ]}>
                      Intensity: {option.intensity_level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {calorieResults && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Calorie Calculation Results</Text>
                  <Text style={styles.calorieText}>
                    Activity: {calorieResults.activity}
                  </Text>
                  <Text style={styles.calorieText}>
                    Duration: {calorieResults.duration} minutes
                  </Text>
                  <Text style={styles.calorieText}>
                    MET Value: {calorieResults.met}
                  </Text>
                  <Text style={styles.calorieText}>
                    BMR: {calorieResults.bmr} calories/day
                  </Text>
                  <Text style={styles.calorieText}>
                    Calories per Minute: {calorieResults.caloriesPerMinute}
                  </Text>
                
                </View>
              )}
            </>
          )}

          {workoutPlan.mode === 'GAININGMUSCLE' && (
            <>
              {workoutPlan.warmup_included && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Warm-up</Text>
                  <Text style={styles.sectionText}>
                    Start with 5 minutes of light cardio and dynamic stretching to prepare your muscles.
                  </Text>
                </View>
              )}

              <View style={styles.exercisesContainer}>
                <Text style={styles.exercisesTitle}>Exercises</Text>
                {workoutPlan?.muscle_groups_targeted?.map((muscleGroup) => {
                  const exercise = workoutPlan?.exercises?.[muscleGroup];
                  if (!exercise) return null;
                  
                  return (
                    <View key={muscleGroup} style={styles.exerciseGroup}>
                      <Text style={styles.muscleGroupTitle}>
                        {muscleGroup.charAt(0).toUpperCase() + muscleGroup.slice(1)}
                      </Text>
                      <View style={styles.primaryExercise}>
                        <Text style={styles.exerciseName}>{exercise.primary?.name}</Text>
                        <Text style={styles.exerciseDetails}>
                          {exercise.primary?.sets} sets × {exercise.primary?.reps} reps
                        </Text>
                        <Text style={styles.restTime}>
                          Rest: {exercise.primary?.rest_time_seconds} seconds
                        </Text>
                      </View>
                      <View style={styles.alternativesContainer}>
                        <Text style={styles.alternativesTitle}>Alternatives:</Text>
                        {exercise.alternatives?.map((alt, index) => (
                          <Text key={index} style={styles.alternativeText}>
                            • {alt.name} ({alt.sets} sets × {alt.reps} reps)
                          </Text>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>

              {workoutPlan.cooldown_included && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Cool-down</Text>
                  <Text style={styles.sectionText}>
                    Finish with 5 minutes of static stretching to help with recovery.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.startButtonContainer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={startWorkout}
        >
          <Text style={styles.startButtonText}>Start Workout</Text>
        </TouchableOpacity>
      </View>

      {workoutPlan.workout_goal === 'fat_loss' && (
        <View style={styles.optionContainer}>
          <Text style={[styles.optionText, styles.selectedOptionText]}>
            Target Calories: {selectedCalories} kcal
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  placeholder: {
    width: 40,
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
  scrollView: {
    flex: 1,
  },
  workoutContainer: {
    padding: 20,
  },
  workoutHeader: {
    marginBottom: 20,
  },
  workoutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  workoutTime: {
    fontSize: 18,
    color: colors.text.primary,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: colors.card,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 24,
  },
  exercisesContainer: {
    marginBottom: 20,
  },
  exercisesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
  },
  exerciseGroup: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: colors.card,
    borderRadius: 10,
  },
  muscleGroupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  primaryExercise: {
    marginBottom: 10,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 5,
  },
  exerciseDetails: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 5,
  },
  restTime: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  alternativesContainer: {
    marginTop: 10,
  },
  alternativesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 5,
  },
  alternativeText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 3,
  },
  noSuggestionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noSuggestionText: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
  },
  startButtonContainer: {
    padding: 20,
    backgroundColor: colors.background,
  },
  startButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  startButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
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
  metricText: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 5,
  },
  cardioOption: {
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedCardioOption: {
    backgroundColor: colors.primary,
  },
  cardioOptionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
  },
  cardioOptionDetails: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 5,
  },
  intensityText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  calorieText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  selectedText: {
    color: colors.white,
  },
  totalCalories: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 10,
  },
  optionContainer: {
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 10,
    marginBottom: 20,
  },
  optionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 