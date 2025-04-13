import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../config/colors';
import ProfileButton from '../components/ProfileButton';

export default function HomePage() {
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      router.replace('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleStartWorkout = () => {
    router.push('/time-selection');
  };

  const handleViewHistory = () => {
    router.push('/workout-history');
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="light" hidden={true} />
      <View style={styles.container}>
        <Text style={styles.header}>Welcome to DialedIn!</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={handleStartWorkout}
        >
          <Text style={styles.buttonText}>Start Workout</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.historyButton]}
          onPress={handleViewHistory}
        >
          <Text style={[styles.buttonText, styles.historyButtonText]}>View Workout History</Text>
        </TouchableOpacity>
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
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    width: '80%',
    alignItems: 'center',
    marginBottom: 20,
  },
  historyButton: {
    backgroundColor: colors.card,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  historyButtonText: {
    color: colors.text.primary,
  },
});
