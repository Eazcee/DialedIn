import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert, TouchableOpacity, Dimensions, ActivityIndicator, Animated } from 'react-native';
import { router, Stack } from 'expo-router';
import CircularSlider from '../components/CircularSlider';
import { colors } from '../styles/colors';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileButton from '../components/ProfileButton';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.8;

export default function TimeSelectionScreen() {
  const [selectedTime, setSelectedTime] = useState(30);
  const [selectedCalories, setSelectedCalories] = useState(300);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workoutGoal, setWorkoutGoal] = useState<string | null>(null);
  const [showCaloriesSlider, setShowCaloriesSlider] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const fetchWorkoutGoal = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) return;

        const response = await axios.get(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setWorkoutGoal(response.data.fitnessGoal);
      } catch (error) {
        console.error('Error fetching workout goal:', error);
      }
    };

    fetchWorkoutGoal();
  }, []);

  const handleTimeChange = (value: number) => {
    // Ensure value is between 10 and 120 minutes
    const clampedValue = Math.min(Math.max(10, value), 120);
    setSelectedTime(clampedValue);
  };

  const handleContinue = () => {
    if (workoutGoal === 'fat_loss') {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowCaloriesSlider(true);
      });
    } else {
      handleTimeSelection();
    }
  };

  const handleBack = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowCaloriesSlider(false);
    });
  };

  const handleTimeSelection = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        Alert.alert('Error', 'Please log in again.');
        router.replace('/auth');
        return;
      }

      console.log('Logging time to backend:', selectedTime);
      
      // Store both time and calories in AsyncStorage for the workout suggestion screen
      await AsyncStorage.setItem('lastLoggedTime', selectedTime.toString());
      if (workoutGoal === 'fat_loss') {
        await AsyncStorage.setItem('targetCalories', selectedCalories.toString());
      }
      
      const response = await axios.post(
        `${API_URL}/time/log`, 
        { 
          minutes: selectedTime,
          target_calories: workoutGoal === 'fat_loss' ? selectedCalories : undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Automatically navigate to workout suggestion screen
      router.replace('/workout-suggestion');
      
    } catch (error: any) {
      if (error.response?.status === 401) {
        Alert.alert('Error', 'Your session has expired. Please log in again.');
        router.replace('/auth');
      } else if (error.code === 'ECONNREFUSED') {
        Alert.alert('Error', 'Could not connect to the server. Please check your internet connection.');
      } else {
        Alert.alert(
          'Error',
          'Failed to log workout time. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeScreenTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width],
  });

  const caloriesScreenTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });

  return (
    <View style={styles.safe}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text.primary,
          headerShadowVisible: false,
          headerTitle: '',
          headerBackVisible: !showCaloriesSlider,
        }}
      />
      <StatusBar style="light" hidden={true} />
      <View style={styles.container}>
        <Animated.View style={[styles.screenContainer, { transform: [{ translateX: timeScreenTranslateX }] }]}>
          <Text style={styles.header}>How long will you be at the gym?</Text>
          <Text style={styles.timeDisplay}>{selectedTime} minutes</Text>
          
          <View style={styles.circleContainer}>
            <CircularSlider
              value={selectedTime}
              maxValue={120}
              onValueChange={handleTimeChange}
              stepSize={5}
            />
          </View>

          <View style={styles.timeButtonsContainer}>
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => setSelectedTime(30)}
            >
              <Text style={styles.timeButtonText}>30 min</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => setSelectedTime(60)}
            >
              <Text style={styles.timeButtonText}>60 min</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => setSelectedTime(90)}
            >
              <Text style={styles.timeButtonText}>90 min</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => setSelectedTime(120)}
            >
              <Text style={styles.timeButtonText}>120 min</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Saving...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {workoutGoal === 'fat_loss' && (
          <Animated.View style={[styles.screenContainer, { transform: [{ translateX: caloriesScreenTranslateX }] }]}>
            <Text style={styles.header}>Set your target calories</Text>
            <Text style={styles.timeDisplay}>{selectedCalories} cal</Text>
            
            <View style={styles.circleContainer}>
              <CircularSlider
                value={selectedCalories}
                maxValue={1000}
                onValueChange={setSelectedCalories}
                stepSize={50}
                label="CALORIES"
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, styles.backButton]}
              onPress={handleBack}
            >
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleTimeSelection}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? 'Saving...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
      <ProfileButton />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenContainer: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 30,
    textAlign: 'center',
  },
  timeDisplay: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 20,
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  timeButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 32,
  },
  timeButton: {
    backgroundColor: colors.gray,
    padding: 12,
    borderRadius: 8,
    margin: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  timeButtonText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    width: '80%',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: colors.gray,
  },
  buttonDisabled: {
    backgroundColor: '#888',
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
}); 