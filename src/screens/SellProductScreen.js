import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import ApiService from '../services/ApiService';

export default function SellProductScreen({ navigation }) {
  const { user } = useAuth();
  const { products, loadProducts, productsLoading, invalidateProducts } = useData();
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [customPrice, setCustomPrice] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const getSelectedProductData = () => {
    return products.find(p => p.id === selectedProduct);
  };

  const calculateTotal = () => {
    const product = getSelectedProductData();
    if (!product) return 0;
    
    const qty = parseFloat(quantity) || 0;
    
    // If custom price is set, use it
    if (customPrice && parseFloat(customPrice) > 0) {
      return parseFloat(customPrice);
    }
    
    // Calculate based on quantity
    return product.sellingPrice * qty;
  };

  const handleSell = async () => {
    if (!selectedProduct) {
      Alert.alert('Error', 'Please select a product');
      return;
    }

    const product = getSelectedProductData();
    const qty = parseFloat(quantity);
    
    if (!qty || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }
    
    // Check stock availability
    if (product.stockQuantity < qty) {
      Alert.alert('Error', `Not enough stock. Available: ${product.stockQuantity} kg`);
      return;
    }

    if (paymentType === 'credit' && !customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name for credit sales');
      return;
    }

    const total = calculateTotal();
    
    if (total <= 0) {
      Alert.alert('Error', 'Total amount must be greater than zero');
      return;
    }
    
    try {
      setLoading(true);
      
      // Get userId from user object
      const userId = user?.id || user?.userId;
      
      if (!userId) {
        Alert.alert('Error', 'User session expired. Please login again.');
        return;
      }
      
      // Create sale data matching API expectations
      const unitPriceValue = customPrice ? parseFloat(customPrice) / qty : product.sellingPrice;
      
      const saleData = {
        productId: selectedProduct,
        quantity: qty,
        unitPrice: parseFloat(unitPriceValue),
        paymentType: paymentType,
        userId: userId,
        customerName: paymentType === 'credit' ? customerName.trim() : undefined,
      };

      console.log('Recording sale:', saleData);
      const result = await ApiService.createSale(saleData);
      console.log('Sale created successfully:', result);
      
      const successMsg = `✅ Sale recorded! ${product.name} × ${qty} kg = UGX ${total.toLocaleString()}`;
      console.log('Setting success message:', successMsg);
      setSuccessMessage(successMsg);
      
      // Clear form
      setSelectedProduct('');
      setQuantity('1');
      setCustomPrice('');
      setCustomerName('');
      
      // Invalidate cache to force refresh
      invalidateProducts();
      await loadProducts(true);
      
      // Hide success message after 4 seconds
      setTimeout(() => {
        console.log('Clearing success message');
        setSuccessMessage('');
      }, 4000);
      
    } catch (error) {
      console.error('Error recording sale:', error);
      Alert.alert('Error', error.message || 'Failed to record sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const product = getSelectedProductData();
  const total = calculateTotal();

  return (
    <ScrollView style={styles.container}>
      {successMessage ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      {productsLoading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <View style={styles.form}>
        {/* Product Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Product *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedProduct}
              onValueChange={setSelectedProduct}
              style={styles.picker}
            >
              <Picker.Item label="Choose a product..." value="" />
              {products.map(product => (
                <Picker.Item 
                  key={product.id} 
                  label={`${product.name} - UGX ${product.sellingPrice.toLocaleString()} (Stock: ${product.stockQuantity})`} 
                  value={product.id} 
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Product Info */}
        {product && (
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productPrice}>UGX {product.sellingPrice.toLocaleString()} per unit</Text>
            <Text style={styles.productStock}>Available: {product.stockQuantity} units</Text>
          </View>
        )}

        {/* Quantity Input with Quick Buttons */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quantity (kg) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter quantity in kilograms"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />
          <Text style={styles.helperText}>Quick select:</Text>
          <View style={styles.quantityButtons}>
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => setQuantity('0.25')}
            >
              <Text style={styles.quickButtonText}>¼ kg</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => setQuantity('0.5')}
            >
              <Text style={styles.quickButtonText}>½ kg</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => setQuantity('1')}
            >
              <Text style={styles.quickButtonText}>1 kg</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => setQuantity('2')}
            >
              <Text style={styles.quickButtonText}>2 kg</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => setQuantity('3')}
            >
              <Text style={styles.quickButtonText}>3 kg</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickButton}
              onPress={() => setQuantity('5')}
            >
              <Text style={styles.quickButtonText}>5 kg</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Price (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Custom Price (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Leave empty to use calculated price"
            value={customPrice}
            onChangeText={setCustomPrice}
            keyboardType="numeric"
          />
          <Text style={styles.helperText}>
            Override the calculated price with a custom amount
          </Text>
        </View>

        {/* Payment Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Type *</Text>
          <View style={styles.paymentButtons}>
            <TouchableOpacity 
              style={[styles.paymentButton, paymentType === 'cash' && styles.activePayment]}
              onPress={() => setPaymentType('cash')}
            >
              <Ionicons name="cash-outline" size={20} color={paymentType === 'cash' ? '#fff' : '#4CAF50'} />
              <Text style={[styles.paymentText, paymentType === 'cash' && styles.activePaymentText]}>
                Cash
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.paymentButton, paymentType === 'credit' && styles.activePayment]}
              onPress={() => setPaymentType('credit')}
            >
              <Ionicons name="card-outline" size={20} color={paymentType === 'credit' ? '#fff' : '#FF9800'} />
              <Text style={[styles.paymentText, paymentType === 'credit' && styles.activePaymentText]}>
                Credit
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Customer Name (for credit) */}
        {paymentType === 'credit' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter customer name"
              value={customerName}
              onChangeText={setCustomerName}
              autoCapitalize="words"
            />
          </View>
        )}

        {/* Total Preview */}
        {product && (
          <View style={styles.totalPreview}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>UGX {total.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Sell Button */}
        <TouchableOpacity 
          style={[styles.sellButton, loading && styles.sellButtonDisabled]} 
          onPress={handleSell}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
              <Text style={styles.sellButtonText}>Record Sale</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      )}
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
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  picker: {
    height: 50,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  productInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  productPrice: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 5,
  },
  productStock: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  paymentButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  activePayment: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  paymentText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  activePaymentText: {
    color: '#fff',
  },
  quantityButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  quickButton: {
    flex: 1,
    minWidth: '15%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#2196F3',
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  totalPreview: {
    backgroundColor: '#2196F3',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  sellButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
  },
  sellButtonDisabled: {
    backgroundColor: '#888',
  },
  sellButtonText: {
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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