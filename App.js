import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from './src/contexts/AuthContext';
import { DataProvider } from './src/contexts/DataContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import AppNavigator from './src/navigation/AppNavigator';
import OfflineIndicator from './src/components/OfflineIndicator';

const APP_VERSION = '1.0.2'; // Increment this when you need to clear cache

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check app version and clear cache if needed
      const storedVersion = await AsyncStorage.getItem('app_version');
      
      if (storedVersion !== APP_VERSION) {
        console.log(`Version changed from ${storedVersion} to ${APP_VERSION}, clearing cache...`);
        
        // Clear all cached data but keep auth token
        const authToken = await AsyncStorage.getItem('authToken');
        const userData = await AsyncStorage.getItem('userData');
        
        await AsyncStorage.clear();
        
        // Restore auth data
        if (authToken) await AsyncStorage.setItem('authToken', authToken);
        if (userData) await AsyncStorage.setItem('userData', userData);
        
        // Set new version
        await AsyncStorage.setItem('app_version', APP_VERSION);
        console.log('Cache cleared successfully');
      }

      // Validate stored data
      await validateStoredData();
      
      setIsReady(true);
    } catch (err) {
      console.error('App initialization error:', err);
      setError(err.message);
      
      // Try to recover by clearing everything
      try {
        await AsyncStorage.clear();
        await AsyncStorage.setItem('app_version', APP_VERSION);
        setIsReady(true);
      } catch (clearError) {
        console.error('Failed to clear storage:', clearError);
        setIsReady(true); // Continue anyway
      }
    }
  };

  const validateStoredData = async () => {
    const keysToValidate = ['userData', 'cached_products', 'cached_sales', 'cached_credits'];
    
    for (const key of keysToValidate) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          JSON.parse(data); // Test if it's valid JSON
        }
      } catch (parseError) {
        console.warn(`Corrupted data found for ${key}, removing...`);
        await AsyncStorage.removeItem(key);
      }
    }
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#800000" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#800000', marginBottom: 10 }}>
          Initialization Error
        </Text>
        <Text style={{ color: '#666', textAlign: 'center' }}>
          {error}
        </Text>
        <Text style={{ marginTop: 20, color: '#999', textAlign: 'center' }}>
          Please restart the app
        </Text>
      </View>
    );
  }

  return (
    <NetworkProvider>
      <AuthProvider>
        <DataProvider>
          <OfflineIndicator />
          <AppNavigator />
          <StatusBar style="auto" />
        </DataProvider>
      </AuthProvider>
    </NetworkProvider>
  );
}
