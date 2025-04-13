import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, Switch, Alert, TextInput, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { colors } from '../config/colors';
import axios from 'axios';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function ProfileButton() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('muscle_gain');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { width } = Dimensions.get('window');
  const router = useRouter();

  useEffect(() => {
    if (isModalVisible) {
      fetchUserProfile();
    }
  }, [isModalVisible]);

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEmail(response.data.email);
      setFitnessGoal(response.data.fitnessGoal);
      setWeight(response.data.weight ? response.data.weight.toString() : '');
      setHeight(response.data.height ? response.data.height.toString() : '');
      setAge(response.data.age ? response.data.age.toString() : '');
      setGender(response.data.gender || 'male');
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateMetrics = async () => {
    if (!weight || !height || !age) {
      setMessage('Please fill in all fields');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setMessage('Authentication error');
        return;
      }

      const response = await axios.put(
        `${API_URL}/auth/update-metrics`,
        {
          weight: parseFloat(weight),
          height: parseFloat(height),
          age: parseInt(age),
          gender
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessage('Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.response) {
        setMessage(error.response.data.error || 'Failed to update profile');
      } else {
        setMessage('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateFitnessGoal = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const response = await axios.put(
        `${API_URL}/auth/update-goal`,
        { fitnessGoal },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success', 'Fitness goal updated successfully');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to update fitness goal'
      );
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      router.replace('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.profileButtonText}>👤</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Profile</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {message ? (
                <Text style={[
                  styles.message,
                  message.includes('success') ? styles.successMessage : styles.errorMessage
                ]}>
                  {message}
                </Text>
              ) : null}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fitness Goal</Text>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      fitnessGoal === 'muscle_gain' && styles.toggleOptionSelected
                    ]}
                    onPress={() => setFitnessGoal('muscle_gain')}
                  >
                    <Text style={[
                      styles.toggleText,
                      fitnessGoal === 'muscle_gain' && styles.toggleTextSelected
                    ]}>Muscle Gain</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      fitnessGoal === 'fat_loss' && styles.toggleOptionSelected
                    ]}
                    onPress={() => setFitnessGoal('fat_loss')}
                  >
                    <Text style={[
                      styles.toggleText,
                      fitnessGoal === 'fat_loss' && styles.toggleTextSelected
                    ]}>Fat Loss</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={updateFitnessGoal}
                >
                  <Text style={styles.saveButtonText}>Save Goal</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Metrics</Text>
                {isEditing ? (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Weight (lbs)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your weight in pounds"
                        value={weight}
                        onChangeText={setWeight}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Height (inches)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your height in inches"
                        value={height}
                        onChangeText={setHeight}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Age</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your age"
                        value={age}
                        onChangeText={setAge}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Gender</Text>
                      <View style={styles.genderToggle}>
                        <TouchableOpacity
                          style={[
                            styles.genderOption,
                            gender === 'male' && styles.genderOptionSelected
                          ]}
                          onPress={() => setGender('male')}
                        >
                          <Text style={[
                            styles.genderText,
                            gender === 'male' && styles.genderTextSelected
                          ]}>Male</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.genderOption,
                            gender === 'female' && styles.genderOptionSelected
                          ]}
                          onPress={() => setGender('female')}
                        >
                          <Text style={[
                            styles.genderText,
                            gender === 'female' && styles.genderTextSelected
                          ]}>Female</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={() => {
                          setIsEditing(false);
                          fetchUserProfile(); // Reset to original values
                        }}
                      >
                        <Text style={styles.buttonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.button, styles.saveButton]}
                        onPress={updateMetrics}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.buttonText}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.infoContainer}>
                      <Text style={styles.infoLabel}>Email:</Text>
                      <Text style={styles.infoValue}>{email}</Text>
                    </View>
                    <View style={styles.infoContainer}>
                      <Text style={styles.infoLabel}>Weight:</Text>
                      <Text style={styles.infoValue}>{weight} lbs</Text>
                    </View>
                    <View style={styles.infoContainer}>
                      <Text style={styles.infoLabel}>Height:</Text>
                      <Text style={styles.infoValue}>{height} inches</Text>
                    </View>
                    <View style={styles.infoContainer}>
                      <Text style={styles.infoLabel}>Age:</Text>
                      <Text style={styles.infoValue}>{age} years</Text>
                    </View>
                    <View style={styles.infoContainer}>
                      <Text style={styles.infoLabel}>Gender:</Text>
                      <Text style={styles.infoValue}>{gender === 'male' ? 'Male' : 'Female'}</Text>
                    </View>
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        style={[styles.button, styles.editButton]}
                        onPress={() => setIsEditing(true)}
                      >
                        <Text style={styles.buttonText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Text style={styles.logoutButtonText}>Log Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  profileButtonText: {
    fontSize: 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
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
  closeButtonText: {
    fontSize: 24,
    color: colors.text.secondary,
  },
  modalBody: {
    maxHeight: '80%',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  toggleOption: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  toggleOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    color: colors.text.secondary,
  },
  toggleTextSelected: {
    color: colors.white,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  inputContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: colors.error,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  message: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    backgroundColor: colors.error,
    color: colors.white,
  },
  successMessage: {
    backgroundColor: colors.success,
    color: colors.white,
  },
  genderToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  genderOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  genderOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  genderTextSelected: {
    color: colors.white,
    fontWeight: 'bold',
  },
}); 