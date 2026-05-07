import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/ApiService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    console.log('isAuthenticated state changed to:', isAuthenticated);
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const storedUserData = await AsyncStorage.getItem('userData');
      
      if (token) {
        // First, set user from stored data if available
        if (storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            setUser(userData);
            console.log('Loaded user from storage:', userData);
          } catch (e) {
            console.error('Failed to parse stored user data:', e);
          }
        }
        
        try {
          // Verify token with server
          const userData = await ApiService.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          // Only clear token on 401 (unauthorized), not on network errors
          if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('userData');
            ApiService.clearToken();
          } else {
            // Keep user logged in even if verification fails (network issues, etc.)
            setIsAuthenticated(true);
            console.warn('Token verification failed, but keeping user authenticated:', error.message);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone, password) => {
    const response = await ApiService.login(phone, password);
    if (response.token) {
      await AsyncStorage.setItem('authToken', response.token);
      // Store user data in AsyncStorage as well
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));
      setUser(response.user);
      setIsAuthenticated(true);
      console.log('Login successful, user data:', response.user);
      return response;
    }
  };

  const logout = async () => {
    console.log('Logout called - starting logout process');
    try {
      console.log('Removing auth token from storage');
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      console.log('Clearing API token');
      ApiService.clearToken();
      console.log('Setting user to null');
      setUser(null);
      console.log('Setting isAuthenticated to false');
      setIsAuthenticated(false);
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear state even if storage removal fails
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
  };

  console.log('AuthContext value updated:', { isAuthenticated, user: user?.name, loading });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};