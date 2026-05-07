import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/ApiService';

export default function SellProductScreen({ navigation }) {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantityType, setQuantityType] = useState('units'); // units, kilo, half, quarter
  const [customPrice, setCustomPrice] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getProducts();
      setProducts(data);
      console.log('Products loaded:', data);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedProductData = () => {
    return products.find(p => p.id === selectedProduct);
  };

  const calculateTotal = () => {
    const product = getSelectedProductData();
    if (!product) return 0;
    
    // If custom price is set, use it
    if (customPrice && parseFloat(customPrice) > 0) {
      return parseFloat(customPrice);
    }
    
    // Calculate based on quantity type (always 1 unit of that type)
    switch (quantityType) {
      case 'kilo':
        return product.sellingPrice;
      case 'half':
        return product.sellingPrice / 2;
      case 'quarter':
        return product.sellingPrice / 4;
      case 'units':
      default:
        return product.sellingPrice;
    }
  };

  const handleSell = async () => {
    if (!selectedProduct) {
      Alert.alert('Error', 'Please select a product');
      return;
    }

    const product = getSelectedProductData();
    
    // Check stock availability (always 1 unit for units type)
    if (quantityType === 'units' && product.stockQuantity < 1) {
      Alert.alert('Error', `Not enough stock. Available: ${product.stockQuantity} units`);
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
      
      // Calculate actual quantity for stock deduction (always 1 of the selected type)
      let actualQuantity = 1;
      if (quantityType === 'half') {
        actualQuantity = 0.5;
      } else if (quantityType === 'quarter') {
        actualQuantity = 0.25;
      }
      
      // Create sale data matching API expectations
      const saleData = {
        productId: selectedProduct,
        quantity: actualQuantity,
        unitPrice: customPrice ? parseFloat(customPrice) : (total / actualQuantity),
        paymentType: paymentType,
        userId: userId,
        customerName: paymentType === 'credit' ? customerName.trim() : undefined,
      };

      console.log('Recording sale:', saleData);
      const result = await ApiService.createSale(saleData);
      console.log('Sale created successfully:', result);
      
      // Build success message
      let quantityText = quantityType;
      if (quantityType === 'units') {
        quantityText = '1 unit';
      } else {
        quantityText = `1 ${quantityType}`;
      }
      
      const successMsg = `✅ Sale recorded! ${product.name} × ${quantityText} = UGX ${total.toLocaleString()}`;
      console.log('Setting success message:', successMsg);
      setSuccessMessage(successMsg);
      
      // Clear form
      setSelectedProduct('');
      setQuantityType('units');
      setCustomPrice('');
      setCustomerName('');
      
      // Reload products to update stock
      await loadProducts();
      
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

      {loading && !successMessage ? (
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

        {/* Quantity Type Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Quantity *</Text>
          <View style={styles.quantityTypeButtons}>
            <TouchableOpacity 
              style={[styles.quantityTypeButton, quantityType === 'units' && styles.activeQuantityType]}
              onPress={() => setQuantityType('units')}
            >
              <Text style={[styles.quantityTypeText, quantityType === 'units' && styles.activeQuantityTypeText]}>
                1 Unit
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quantityTypeButton, quantityType === 'kilo' && styles.activeQuantityType]}
              onPress={() => setQuantityType('kilo')}
            >
              <Text style={[styles.quantityTypeText, quantityType === 'kilo' && styles.activeQuantityTypeText]}>
                1 Kilo
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quantityTypeButton, quantityType === 'half' && styles.activeQuantityType]}
              onPress={() => setQuantityType('half')}
            >
              <Text style={[styles.quantityTypeText, quantityType === 'half' && styles.activeQuantityTypeText]}>
                Half
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quantityTypeButton, quantityType === 'quarter' && styles.activeQuantityType]}
              onPress={() => setQuantityType('quarter')}
            >
              <Text style={[styles.quantityTypeText, quantityType === 'quarter' && styles.activeQuantityTypeText]}>
                Quarter
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            {quantityType === 'units' && 'Full unit at regular price'}
            {quantityType === 'kilo' && 'One kilogram at regular price'}
            {quantityType === 'half' && 'Half portion at 50% of price'}
            {quantityType === 'quarter' && 'Quarter portion at 25% of price'}
          </Text>
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
  quantityTypeButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  quantityTypeButton: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  activeQuantityType: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  quantityTypeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  activeQuantityTypeText: {
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