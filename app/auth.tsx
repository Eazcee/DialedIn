import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Switch,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const colors = {
  primary: '#007AFF',
  white: '#FFFFFF',
  background: '#F2F2F7',
  gray: '#E5E5EA',
  lightGray: '#D1D1D6',
  darkGray: '#8E8E93',
  card: '#FFFFFF',
  error: '#FF3B30',
  success: '#34C759',
  surface: '#FFFFFF',
  border: '#D1D1D6',
  text: {
    primary: '#000000',
    secondary: '#8E8E93',
  },
  textSecondary: '#8E8E93',
};

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('muscle_gain');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));

  const toggleAuthMode = () => {
    Animated.timing(slideAnim, {
      toValue: isLogin ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsLogin(!isLogin);
    setMessage('');
  };

  const handleAuth = async () => {
    if (!email || !password) {
      setMessage('Please fill in all fields');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (!isLogin && password.length < 4) {
      setMessage('Password must be at least 4 characters long');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const endpoint = isLogin ? 'login' : 'signup';
      console.log(`Making ${endpoint} request to:`, `${API_URL}/auth/${endpoint}`);
      const requestBody = {
        email,
        password,
        ...((!isLogin) && { fitnessGoal, weight: parseFloat(weight), height: parseFloat(height), age: parseInt(age), gender })
      };
      console.log('Request body:', requestBody);
      
      const config = {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      
      console.log('Making request with config:', config);
      const response = await axios.post(`${API_URL}/auth/${endpoint}`, requestBody, config);
      
      console.log('Response:', response.data);
      setMessage(response.data.message || (isLogin ? 'Login successful!' : 'Signup successful!'));
      
      if (isLogin) {
        await AsyncStorage.setItem('authToken', response.data.token);
        await AsyncStorage.setItem('fitnessGoal', response.data.fitnessGoal);
        const storedToken = await AsyncStorage.getItem('authToken');
        console.log('Verified stored token:', storedToken ? 'Token exists' : 'Token missing');
        console.log('Navigating to home screen');
        router.replace('/');
      } else {
        setTimeout(() => {
          toggleAuthMode();
        }, 1000);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers,
        config: err.config
      });
      
      if (err.code === 'ECONNABORTED') {
        setMessage('Request timed out. Please try again.');
      } else if (err.response?.status === 401) {
        setMessage('Invalid credentials. Please try again.');
      } else if (err.response?.status === 400) {
        setMessage(err.response.data.error || 'Invalid input. Please check your information.');
      } else if (err.code === 'ECONNREFUSED') {
        setMessage('Could not connect to the server. Please check your internet connection.');
      } else if (err.code === 'ERR_NETWORK') {
        setMessage('Network error. Please check your internet connection.');
      } else {
        setMessage(err.response?.data?.error || `${isLogin ? 'Login' : 'Signup'} failed. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          bounces={false}
        >
          <View style={styles.container}>
            <View style={styles.contentContainer}>
              <Text style={styles.header}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
              <Text style={styles.subheader}>
                {isLogin ? 'Sign in to continue' : 'Sign up to get started'}
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
              
              {!isLogin && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />
                  </View>

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

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Fitness Goal</Text>
                    <View style={styles.radioGroup}>
                      <TouchableOpacity
                        style={[
                          styles.radioButton,
                          fitnessGoal === 'muscle_gain' && styles.radioButtonSelected
                        ]}
                        onPress={() => setFitnessGoal('muscle_gain')}
                      >
                        <Text style={[
                          styles.radioButtonText,
                          fitnessGoal === 'muscle_gain' && styles.radioButtonTextSelected
                        ]}>Muscle Gain</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.radioButton,
                          fitnessGoal === 'fat_loss' && styles.radioButtonSelected
                        ]}
                        onPress={() => setFitnessGoal('fat_loss')}
                      >
                        <Text style={[
                          styles.radioButtonText,
                          fitnessGoal === 'fat_loss' && styles.radioButtonTextSelected
                        ]}>Fat Loss</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
              
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{isLogin ? 'Log In' : 'Sign Up'}</Text>
                )}
              </TouchableOpacity>
              
              {message ? (
                <Text style={[
                  styles.message,
                  message.includes('success') ? styles.successMessage : styles.errorMessage
                ]}>
                  {message}
                </Text>
              ) : null}
              
              <TouchableOpacity
                style={styles.linkButton}
                onPress={toggleAuthMode}
              >
                <Text style={styles.linkText}>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <Text style={styles.linkTextBold}>
                    {isLogin ? 'Sign Up' : 'Log In'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'ios' ? 80 : 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  contentContainer: {
    width: Math.min(width * 0.9, 400),
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  header: { 
    fontSize: 32, 
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subheader: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorMessage: {
    backgroundColor: colors.error,
  },
  successMessage: {
    backgroundColor: colors.success,
  },
  messageText: {
    color: colors.white,
    fontSize: 16,
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: colors.text.secondary,
    fontSize: 16,
  },
  linkTextBold: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  radioButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radioButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  radioButtonTextSelected: {
    color: colors.white,
    fontWeight: 'bold',
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