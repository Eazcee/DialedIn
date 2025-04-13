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
  Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { API_URL } from '../config';

export default function AuthScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (!isLogin && password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const endpoint = isLogin ? 'login' : 'signup';
      const response = await axios.post(`${API_URL}/auth/${endpoint}`, {
        email,
        password
      });
      
      setMessage(response.data.message || (isLogin ? 'Login successful!' : 'Signup successful!'));
      
      if (isLogin) {
        // Store the token and navigate to main app
        // You'll need to implement token storage
        setTimeout(() => {
          navigation.replace('Main');
        }, 1500);
      } else {
        // After signup, switch to login mode
        setTimeout(() => {
          toggleAuthMode();
        }, 1500);
      }
    } catch (err) {
      setMessage(err.response?.data?.error || `${isLogin ? 'Login' : 'Signup'} failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="light" hidden={true} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.container}>
          <Text style={styles.header}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.subheader}>
            {isLogin ? 'Sign in to continue' : 'Sign up to get started'}
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput 
              placeholder="Enter your email" 
              placeholderTextColor="#888"
              style={styles.input} 
              value={email} 
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput 
              placeholder={isLogin ? "Enter your password" : "Create a password"} 
              placeholderTextColor="#888"
              secureTextEntry 
              style={styles.input} 
              value={password} 
              onChangeText={setPassword}
            />
          </View>
          
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput 
                placeholder="Confirm your password" 
                placeholderTextColor="#888"
                secureTextEntry 
                style={styles.input} 
                value={confirmPassword} 
                onChangeText={setConfirmPassword}
              />
            </View>
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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#121212',
  },
  keyboardView: {
    flex: 1,
  },
  container: { 
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#121212',
  },
  header: { 
    fontSize: 32, 
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subheader: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  input: { 
    backgroundColor: '#1E1E1E',
    borderWidth: 1, 
    borderColor: '#333',
    padding: 16, 
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
  },
  button: { 
    backgroundColor: '#FF4B4B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#FF4B4B80',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: { 
    marginTop: 16,
    textAlign: 'center',
    padding: 10,
    borderRadius: 8,
  },
  errorMessage: {
    color: '#FF4B4B',
    backgroundColor: '#FF4B4B20',
  },
  successMessage: {
    color: '#4CAF50',
    backgroundColor: '#4CAF5020',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#aaa',
    fontSize: 14,
  },
  linkTextBold: {
    color: '#FF4B4B',
    fontWeight: 'bold',
  }
}); 