import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Pressable
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';

interface WorkoutData {
  date: string;
  activity: string;
  duration: number;
  calories: number;
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
    weight?: number;
    notes?: string;
  }>;
  muscleGroups?: string[];
  completed: boolean;
}

interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
  };
}

interface CalendarDay {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
}

// Define API URL
const API_URL = 'https://gym-app-backend.onrender.com';

export default function WorkoutHistoryScreen() {
  const [selectedDate, setSelectedDate] = useState('');
  const [workoutData, setWorkoutData] = useState<WorkoutData[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [loading, setLoading] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userStats, setUserStats] = useState({
    totalWorkouts: 0,
    totalMinutes: 0,
    totalCalories: 0,
    streakDays: 0
  });

  useEffect(() => {
    loadWorkoutHistory();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setLoading(true);
      // Simulate loading for better UX
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [selectedDate]);

  const formatDateForComparison = (dateString: string) => {
    try {
      // Ensure the date string is valid
      if (!dateString || typeof dateString !== 'string') {
        console.log('Invalid date string:', dateString);
        return '';
      }
      
      // Parse the date and handle potential errors
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.log('Invalid date object:', dateString);
        return '';
      }
      
      // Format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date for comparison:', error);
      return '';
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    try {
      // Ensure the date string is valid
      if (!dateString || typeof dateString !== 'string') {
        console.log('Invalid date string for display:', dateString);
        return 'Invalid Date';
      }
      
      // Parse the date and handle potential errors
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.log('Invalid date object for display:', dateString);
        return 'Invalid Date';
      }
      
      // Format as a readable date string
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date for display:', error);
      return 'Invalid Date';
    }
  };

  const getWorkoutsForDate = (date: string) => {
    if (!workoutData || !Array.isArray(workoutData)) {
      return [];
    }
    
    // Format the selected date for comparison
    const formattedSelectedDate = formatDateForComparison(date);
    if (!formattedSelectedDate) {
      console.log('Could not format selected date:', date);
      return [];
    }
    
    // Filter workouts by comparing formatted dates
    return workoutData.filter(workout => {
      if (!workout || !workout.date) return false;
      
      const workoutDate = formatDateForComparison(workout.date);
      if (!workoutDate) {
        console.log('Could not format workout date:', workout.date);
        return false;
      }
      
      return workoutDate === formattedSelectedDate;
    });
  };

  const loadWorkoutHistory = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token found');
        setLoading(false);
        return;
      }

      console.log('Fetching workout history from backend...');
      const response = await fetch(`${API_URL}/time/workout-history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('Received workout history data:', data);
      
      if (!data || !data.workouts) {
        throw new Error('Invalid response format: missing workouts array');
      }

      if (!Array.isArray(data.workouts)) {
        throw new Error('Invalid response format: workouts is not an array');
      }

      // Validate and clean workout data
      const validWorkouts = data.workouts.filter(workout => {
        if (!workout || !workout.date) return false;
        
        // Check if date is valid
        const date = new Date(workout.date);
        if (isNaN(date.getTime())) {
          console.log('Invalid workout date found:', workout.date);
          return false;
        }
        
        return true;
      });
      
      // Update state with valid data
      setWorkoutData(validWorkouts);
      
      // Update marked dates
      const marked: MarkedDates = {};
      validWorkouts.forEach((workout: WorkoutData) => {
        if (workout && workout.date) {
          const formattedDate = formatDateForComparison(workout.date);
          if (formattedDate) {
            marked[formattedDate] = { marked: true, dotColor: colors.primary };
          }
        }
      });
      setMarkedDates(marked);
      
      // Update stats
      calculateUserStats(validWorkouts);
    } catch (error: unknown) {
      console.error('Error loading workout history:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Error',
        `Failed to load workout history: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const calculateUserStats = (history: WorkoutData[]) => {
    if (!Array.isArray(history)) {
      setUserStats({
        totalWorkouts: 0,
        totalMinutes: 0,
        totalCalories: 0,
        streakDays: 0
      });
      return;
    }

    const stats = {
      totalWorkouts: history.length,
      totalMinutes: 0,
      totalCalories: 0,
      streakDays: 0
    };

    history.forEach(workout => {
      if (workout) {
        stats.totalMinutes += workout.duration || 0;
        stats.totalCalories += workout.calories || 0;
      }
    });

    // Calculate streak based on consecutive dates
    if (history.length > 0) {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const todayFormatted = today.toISOString().split('T')[0];
      
      // Get all workout dates and sort them in descending order
      const workoutDates = history
        .filter(w => w && w.date)
        .map(w => formatDateForComparison(w.date))
        .sort((a, b) => b.localeCompare(a));
      
      // Check if there's a workout today or yesterday
      const hasRecentWorkout = workoutDates.includes(todayFormatted) || 
                              workoutDates.includes(new Date(today.setDate(today.getDate() - 1)).toISOString().split('T')[0]);
      
      if (hasRecentWorkout) {
        let streak = 1;
        let currentDate = new Date(workoutDates[0]);
        
        // Iterate through dates to find consecutive days
        for (let i = 1; i < workoutDates.length; i++) {
          const prevDate = new Date(workoutDates[i]);
          const dayDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (dayDiff === 1) {
            streak++;
            currentDate = prevDate;
          } else {
            break;
          }
        }
        
        stats.streakDays = streak;
      } else {
        // If no recent workout, streak is broken
        stats.streakDays = 0;
      }
    }

    setUserStats(stats);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getActivityIcon = (activity: string) => {
    switch (activity.toLowerCase()) {
      case 'muscle_gain':
        return 'barbell-outline';
      case 'fat_loss':
        return 'flame-outline';
      default:
        return 'fitness-outline';
    }
  };

  const getActivityColor = (activity: string) => {
    switch (activity.toLowerCase()) {
      case 'muscle_gain':
        return '#4a90e2';
      case 'fat_loss':
        return '#e25c5c';
      default:
        return '#50cebb';
    }
  };

  const handleWorkoutPress = (workout: WorkoutData) => {
    setSelectedWorkout(workout);
    setModalVisible(true);
  };

  const ActivityDetailsModal = () => {
    if (!selectedWorkout) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Workout Details</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {formatDateForDisplay(selectedWorkout.date)}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Activity Type</Text>
                <Text style={styles.detailValue}>{selectedWorkout.activity}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{formatTime(selectedWorkout.duration)}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Calories Burned</Text>
                <Text style={styles.detailValue}>{selectedWorkout.calories} cal</Text>
              </View>

              {selectedWorkout.muscleGroups && selectedWorkout.muscleGroups.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Muscle Groups</Text>
                  <View style={styles.muscleGroups}>
                    {selectedWorkout.muscleGroups.map((muscle, idx) => (
                      <View key={idx} style={styles.muscleGroup}>
                        <Text style={styles.muscleGroupText}>{muscle}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Exercises</Text>
                {selectedWorkout.exercises && selectedWorkout.exercises.length > 0 ? (
                  selectedWorkout.exercises.map((exercise, index) => (
                    <View key={index} style={styles.exerciseDetail}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <View style={styles.exerciseStats}>
                        <Text style={styles.exerciseStat}>
                          {exercise.sets} sets × {exercise.reps} reps
                          {exercise.weight ? ` × ${exercise.weight}kg` : ''}
                        </Text>
                        {exercise.notes && (
                          <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noExercisesText}>No exercise details available</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout History</Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{userStats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Total Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{userStats.totalMinutes}</Text>
            <Text style={styles.statLabel}>Total Minutes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{userStats.totalCalories}</Text>
            <Text style={styles.statLabel}>Total Calories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{userStats.streakDays}</Text>
            <Text style={styles.statLabel}>Streak Days</Text>
          </View>
        </View>
      </View>

      <Calendar
        style={styles.calendar}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.card,
          textSectionTitleColor: colors.text.primary,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: colors.white,
          todayTextColor: colors.primary,
          dayTextColor: colors.text.primary,
          textDisabledColor: colors.textSecondary,
          dotColor: colors.primary,
          monthTextColor: colors.text.primary,
          arrowColor: colors.primary,
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '500',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 14,
        }}
        markedDates={{
          ...markedDates,
          [selectedDate]: {
            ...markedDates[selectedDate],
            selected: true,
          },
        }}
        onDayPress={(day: CalendarDay) => setSelectedDate(day.dateString)}
      />

      {selectedDate ? (
        <View style={styles.selectedDateContainer}>
          <Text style={styles.selectedDateText}>
            {formatDateForDisplay(selectedDate)}
          </Text>
          
          {getWorkoutsForDate(selectedDate).length > 0 && (
            <View style={styles.dateSummaryContainer}>
              {getWorkoutsForDate(selectedDate).map((workout, index) => (
                <View key={index} style={styles.dateSummaryCard}>
                  <View style={[styles.summaryIconContainer, { backgroundColor: getActivityColor(workout.activity) }]}>
                    <Ionicons name={getActivityIcon(workout.activity)} size={20} color="#fff" />
                  </View>
                  <View style={styles.summaryTextContainer}>
                    <Text style={styles.summaryActivityText}>
                      {workout.activity === 'muscle_gain' ? 'Muscle Gain' : 
                       workout.activity === 'fat_loss' ? 'Fat Loss' : workout.activity}
                    </Text>
                    <Text style={styles.summaryTimeText}>{formatTime(workout.duration)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading workout data...</Text>
        </View>
      ) : (
        <View style={styles.workoutList}>
          {selectedDate && getWorkoutsForDate(selectedDate).length > 0 ? (
            getWorkoutsForDate(selectedDate).map((workout, index) => (
              <TouchableOpacity
                key={index}
                style={styles.workoutCard}
                onPress={() => handleWorkoutPress(workout)}
              >
                <View style={styles.workoutHeader}>
                  <View style={styles.activityContainer}>
                    <View style={[styles.activityIconContainer, { backgroundColor: getActivityColor(workout.activity) }]}>
                      <Ionicons name={getActivityIcon(workout.activity)} size={24} color="#fff" />
                    </View>
                    <Text style={styles.activityText}>
                      {workout.activity === 'muscle_gain' ? 'Muscle Gain' : 
                       workout.activity === 'fat_loss' ? 'Fat Loss' : workout.activity}
                    </Text>
                  </View>
                  <Text style={styles.workoutTime}>{formatTime(workout.duration)}</Text>
                </View>
                
                <View style={styles.workoutDetails}>
                  <View style={styles.workoutDetail}>
                    <Text style={styles.detailLabel}>Calories:</Text>
                    <Text style={styles.detailValue}>{workout.calories} cal</Text>
                  </View>
                  
                  {workout.muscleGroups && workout.muscleGroups.length > 0 && (
                    <View style={styles.muscleGroupsContainer}>
                      <Text style={styles.muscleGroupsTitle}>Muscle Groups</Text>
                      <View style={styles.muscleGroupsTags}>
                        {workout.muscleGroups.map((muscle, idx) => (
                          <View key={idx} style={styles.muscleGroupTag}>
                            <Text style={styles.muscleGroupText}>{muscle}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  
                  <View style={styles.exercisesContainer}>
                    <Text style={styles.exercisesTitle}>Exercises</Text>
                    {workout.exercises && Array.isArray(workout.exercises) && workout.exercises.length > 0 ? (
                      workout.exercises.map((exercise, idx) => (
                        <View key={idx} style={styles.exerciseItem}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                          <Text style={styles.exerciseDetails}>
                            {exercise.sets} sets × {exercise.reps} reps
                            {exercise.weight ? ` × ${exercise.weight}kg` : ''}
                          </Text>
                          {exercise.notes && (
                            <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
                          )}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noExercisesText}>No exercise details available</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : selectedDate ? (
            <View style={styles.noWorkoutContainer}>
              <Ionicons name="calendar-outline" size={60} color={colors.textSecondary} />
              <Text style={styles.noWorkoutText}>No workouts recorded for this day</Text>
              <Text style={styles.noWorkoutSubtext}>Select another date or start a new workout</Text>
            </View>
          ) : (
            <View style={styles.selectDateContainer}>
              <Ionicons name="calendar-outline" size={60} color={colors.textSecondary} />
              <Text style={styles.selectDateText}>Select a date to view your workouts</Text>
            </View>
          )}
        </View>
      )}

      <ActivityDetailsModal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonIcon: {
    color: colors.text.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statsContainer: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  calendar: {
    borderRadius: 10,
    marginBottom: 20,
    marginHorizontal: 16,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDateContainer: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDateText: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 8,
  },
  dateSummaryContainer: {
    marginBottom: 16,
  },
  dateSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: colors.primary,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryActivityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  summaryTimeText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  loadingText: {
    color: colors.text.primary,
    marginTop: 12,
  },
  workoutList: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  workoutCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: colors.primary,
  },
  activityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  workoutTime: {
    fontSize: 14,
    color: colors.primary,
  },
  workoutDetails: {
    marginTop: 8,
  },
  workoutDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 18,
    color: colors.text.primary,
    fontWeight: '500',
  },
  noWorkoutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  noWorkoutText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  noWorkoutSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  selectDateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  selectDateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  noExercisesText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  closeButton: {
    padding: 5,
  },
  modalScroll: {
    maxHeight: '90%',
  },
  detailSection: {
    marginBottom: 20,
  },
  exerciseDetail: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseStats: {
    marginTop: 5,
  },
  exerciseStat: {
    fontSize: 16,
    color: colors.primary,
  },
  muscleGroups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  muscleGroup: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleGroupText: {
    fontSize: 12,
    color: colors.primary,
  },
  exercisesContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  exercisesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  exerciseItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseName: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  exerciseNotes: {
    fontSize: 12,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  muscleGroupsContainer: {
    marginBottom: 16,
  },
  muscleGroupsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  muscleGroupsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  muscleGroupTag: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
}); 