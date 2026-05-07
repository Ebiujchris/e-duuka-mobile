import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/ApiService';

export default function AddProductScreen({ navigation }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const calculateProfit = () => {
    const buying = parseFloat(buyingPrice) || 0;
    const selling = parseFloat(sellingPrice) || 0;
    return selling - buying;
  };

  const handleSave = async () => {
    console.log('Current user object:', user);
    
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter product name');
      return;
    }
    if (!buyingPrice || !sellingPrice) {
      Alert.alert('Error', 'Please enter both buying and selling prices');
      return;
    }
    if (!stock) {
      Alert.alert('Error', 'Please enter stock quantity');
      return;
    }

    const profit = calculateProfit();
    if (profit <= 0) {
      Alert.alert('Warning', 'Selling price should be higher than buying price for profit');
      return;
    }

    setLoading(true);
    try {
      // Get userId from user object (could be id or userId depending on source)
      const userId = user?.id || user?.userId;
      
      if (!userId) {
        Alert.alert('Error', 'User session expired. Please login again.');
        return;
      }

      const productData = {
        name: name.trim(),
        buyingPrice: parseFloat(buyingPrice),
        sellingPrice: parseFloat(sellingPrice),
        stockQuantity: parseInt(stock),
        userId: userId,
      };

      console.log('Saving product to backend:', productData);
      const response = await ApiService.createProduct(productData);
      console.log('Product created:', response);

      // Show success message
      setSuccessMessage(`✅ Product "${name}" added successfully! Profit: UGX ${profit.toLocaleString()} per item`);
      
      // Clear form
      setName('');
      setBuyingPrice('');
      setSellingPrice('');
      setStock('');

      // Hide success message after 4 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', error.message || 'Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const profit = calculateProfit();

  return (
    <ScrollView style={styles.container}>
      {successMessage ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}
      
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Sugar, Soap, Rice"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Buying Price (UGX) *</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={buyingPrice}
            onChangeText={setBuyingPrice}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Selling Price (UGX) *</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={sellingPrice}
            onChangeText={setSellingPrice}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Stock Quantity *</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={stock}
            onChangeText={setStock}
            keyboardType="numeric"
          />
        </View>

        {/* Profit Preview */}
        {buyingPrice && sellingPrice && (
          <View style={styles.profitPreview}>
            <View style={styles.profitRow}>
              <Text style={styles.profitLabel}>Profit per item:</Text>
              <Text style={[styles.profitAmount, profit > 0 ? styles.positiveProfit : styles.negativeProfit]}>
                UGX {profit.toLocaleString()}
              </Text>
            </View>
            {stock && (
              <View style={styles.profitRow}>
                <Text style={styles.profitLabel}>Total potential profit:</Text>
                <Text style={[styles.profitAmount, styles.totalProfit]}>
                  UGX {(profit * parseInt(stock || 0)).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Save Product</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cameraButton} 
          onPress={() => navigation.navigate('Camera')}
        >
          <Ionicons name="camera-outline" size={24} color="#2196F3" />
          <Text style={styles.cameraButtonText}>Scan Product with Camera</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  profitPreview: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  profitLabel: {
    fontSize: 14,
    color: '#666',
  },
  profitAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveProfit: {
    color: '#4CAF50',
  },
  negativeProfit: {
    color: '#F44336',
  },
  totalProfit: {
    color: '#800000',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#888',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#800000',
  },
  cameraButtonText: {
    color: '#800000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  successBanner: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    margin: 10,
    marginTop: 0,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  successText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
});