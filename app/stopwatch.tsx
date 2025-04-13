import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../config/colors';
import axios from 'axios';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StopwatchScreen() {
  const params = useLocalSearchParams();
  const workoutPlan = JSON.parse(decodeURIComponent(params.workoutPlan as string));
  const activity = params.activity as string;
  
  // Find the activity details from the workout plan
  const activityDetails = workoutPlan.cardio_options?.non_gym_workout?.find(
    (option: any) => option.name === activity
  ) || workoutPlan.cardio_options?.gym_workout?.find(
    (option: any) => option.name === activity
  );

  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  const startStopwatch = () => {
    if (!isRunning) {
      const id = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
      setIntervalId(id);
      setIsRunning(true);
    }
  };

  const stopStopwatch = () => {
    if (isRunning && intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
      setIsRunning(false);
    }
  };

  const showCompletionScreen = () => {
    setShowCompletionModal(true);
  };

  const completeWorkout = async () => {
    setIsCompleting(true);
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        Alert.alert('Error', 'Please log in again.');
        router.replace('/auth');
        return;
      }

      // Calculate minutes from seconds
      const minutes = Math.floor(time / 60);
      
      // Calculate calories burned
      const caloriesBurned = Math.round((activityDetails.met_value * (workoutPlan.bmi || 22) * minutes) / 24);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      
      // Create the completed workout data
      const completedWorkoutData = {
        date: formattedDate,
        activity: activity,
        duration: minutes,
        calories: caloriesBurned,
        exercises: [{
          name: activity,
          sets: 1,
          reps: minutes,
          muscle_groups: ['cardio']
        }]
      };

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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
        <Text style={styles.title}>{activity}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {activityDetails && (
          <View style={styles.activityDetailsContainer}>
            <Text style={styles.activityDetailsTitle}>Activity Details</Text>
            <View style={styles.activityDetailsRow}>
              <Text style={styles.activityDetailsLabel}>MET Value:</Text>
              <Text style={styles.activityDetailsValue}>{activityDetails.met_value}</Text>
            </View>
            <View style={styles.activityDetailsRow}>
              <Text style={styles.activityDetailsLabel}>Intensity:</Text>
              <Text style={styles.activityDetailsValue}>{activityDetails.intensity_level}</Text>
            </View>
            {workoutPlan.bmi && (
              <View style={styles.activityDetailsRow}>
                <Text style={styles.activityDetailsLabel}>Your BMI:</Text>
                <Text style={styles.activityDetailsValue}>{workoutPlan.bmi.toFixed(1)}</Text>
              </View>
            )}
          </View>
        )}
        
        <Text style={styles.timerText}>{formatTime(time)}</Text>
        
        <View style={styles.buttonContainer}>
          {!isRunning ? (
            <TouchableOpacity
              style={[styles.button, styles.startButton]}
              onPress={startStopwatch}
            >
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={stopStopwatch}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          )}
          
          {!isRunning && time > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.completeButton]}
              onPress={showCompletionScreen}
              disabled={isCompleting}
            >
              <Text style={styles.buttonText}>
                {isCompleting ? 'Saving...' : 'Complete Workout'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Completion Modal */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Workout Complete!</Text>
            
            <Text style={styles.modalSubtitle}>
              Great job! You've completed your {activity} workout.
            </Text>
            
            <Text style={styles.modalDetails}>
              Duration: {Math.floor(time / 60)} minutes
            </Text>
            
            <Text style={styles.modalDetails}>
              Calories Burned: {Math.round((activityDetails.met_value * (workoutPlan.bmi || 22) * Math.floor(time / 60)) / 24)} kcal
            </Text>
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCompletionModal(false)}
              >
                <Text style={styles.modalButtonText}>Back to Timer</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={completeWorkout}
                disabled={isCompleting}
              >
                <Text style={styles.modalButtonText}>
                  {isCompleting ? 'Saving...' : 'Save Workout'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  activityDetailsContainer: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  activityDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  activityDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  activityDetailsLabel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  activityDetailsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 40,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: colors.success,
  },
  stopButton: {
    backgroundColor: colors.error,
  },
  completeButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 15,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDetails: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 20,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.gray,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 