import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Text, Card } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopLocation, setShopLocation] = useState('');
  const [shopInitialCapital, setShopInitialCapital] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (!phone || !name || !password || !shopName || !shopLocation) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // Normalize phone: 07... or 0... → +256...
    const normalizedPhone = phone.startsWith('0')
      ? '+256' + phone.slice(1)
      : phone;

    setLoading(true);
    try {
      await register(
        normalizedPhone,
        name,
        password,
        shopName,
        shopLocation,
        shopInitialCapital ? parseFloat(shopInitialCapital) : 0
      );
      Alert.alert('Success', 'Account created successfully!');
    } catch (error) {
      const errorMessage = error.message || 'Could not create account';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
        Alert.alert(
          'Connection Error',
          'Server is waking up (this takes 30-60 seconds on first request). Please wait a moment and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Registration Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register your shop with E-DUUKA</Text>

          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <TextInput
            label="Your Name *"
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Phone Number *"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="0700000000"
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Password *"
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

          <TextInput
            label="Confirm Password *"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            style={styles.input}
            mode="outlined"
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
          />

          <Text style={styles.sectionTitle}>Shop Information</Text>

          <TextInput
            label="Shop Name *"
            value={shopName}
            onChangeText={setShopName}
            placeholder="My Shop"
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Shop Location *"
            value={shopLocation}
            onChangeText={setShopLocation}
            placeholder="Kampala, Uganda"
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Initial Capital (Optional)"
            value={shopInitialCapital}
            onChangeText={setShopInitialCapital}
            keyboardType="numeric"
            placeholder="0"
            style={styles.input}
            mode="outlined"
            left={<TextInput.Affix text="UGX " />}
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
          >
            Already have an account? Sign In
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 20,
    marginTop: 40,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
    color: '#34495e',
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
