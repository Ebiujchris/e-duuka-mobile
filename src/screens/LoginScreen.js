import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, Card } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter both phone and password');
      return;
    }

    // Normalize: 07... or 0... → +256...
    const normalizedPhone = phone.startsWith('0')
      ? '+256' + phone.slice(1)
      : phone;

    setLoading(true);
    
    try {
      await login(normalizedPhone, password);
    } catch (error) {
      const errorMessage = error.message || 'Invalid credentials';
      
      // Check if it's a connection/network error (server sleeping)
      if (errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('Network') || 
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('500') ||
          errorMessage.includes('Internal server error')) {
        
        // Auto-retry after 5 seconds
        if (retryCount < 10) {
          setTimeout(() => {
            setRetryCount(retryCount + 1);
            handleLogin();
          }, 5000);
        } else {
          setLoading(false);
          setRetryCount(0);
          Alert.alert(
            'Connection Timeout',
            'Unable to connect to server. Please try again in a moment.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Real error (wrong credentials, etc.)
        setLoading(false);
        setRetryCount(0);
        Alert.alert('Login Failed', errorMessage);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>E-DUUKA Login</Text>
          <Text style={styles.subtitle}>Sign in to your shop account</Text>

          <TextInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="0700000000"
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            mode="outlined"
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.linkButton}
          >
            Forgot Password?
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Register')}
            style={styles.linkButton}
          >
            Don't have an account? Create one
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#7f8c8d',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 8,
  },
});