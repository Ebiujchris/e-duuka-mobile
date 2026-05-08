import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import TabNavigator from './TabNavigator';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import AddProductScreen from '../screens/AddProductScreen';
import SellProductScreen from '../screens/SellProductScreen';

const Stack = createNativeStackNavigator();

function AppNavigatorContent() {
  const { isAuthenticated, loading } = useAuth();

  console.log('AppNavigator re-rendering - isAuthenticated:', isAuthenticated, 'loading:', loading);

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer key={isAuthenticated ? 'auth' : 'guest'}>
      <Stack.Navigator screenOptions={{ animationEnabled: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="Main"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddProduct"
              component={AddProductScreen}
              options={{ title: 'Add Product' }}
            />
            <Stack.Screen
              name="SellProduct"
              component={SellProductScreen}
              options={{ title: 'Record Sale' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return <AppNavigatorContent />;
}