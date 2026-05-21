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
  
  // Bulk purchase fields
  const [isBulkPurchase, setIsBulkPurchase] = useState(false);
  const [bulkQuantity, setBulkQuantity] = useState('');
  const [freeItems, setFreeItems] = useState('');
  const [bulkTotalCost, setBulkTotalCost] = useState('');

  const calculateProfit = () => {
    const buying = parseFloat(buyingPrice) || 0;
    const selling = parseFloat(sellingPrice) || 0;
    return selling - buying;
  };

  const calculateBulkPaidItems = () => {
    const totalItems = parseFloat(bulkQuantity) || 0;
    const free = parseFloat(freeItems) || 0;
    return Math.max(0, totalItems - free);
  };

  const calculateBulkUnitCost = () => {
    const paidItems = calculateBulkPaidItems();
    const cost = parseFloat(bulkTotalCost) || 0;
    if (!isBulkPurchase || !bulkQuantity || !bulkTotalCost || paidItems <= 0) return 0;
    return cost / paidItems;
  };

  const calculateBulkRevenue = () => {
    const totalItems = parseFloat(bulkQuantity) || 0;
    const selling = parseFloat(sellingPrice) || 0;
    return totalItems * selling;
  };

  const calculateBulkTotalProfit = () => {
    if (!isBulkPurchase || !bulkQuantity || !bulkTotalCost) return 0;
    return calculateBulkRevenue() - (parseFloat(bulkTotalCost) || 0);
  };

  const calculateBulkProfitPerItem = () => {
    const totalItems = parseFloat(bulkQuantity) || 0;
    if (totalItems <= 0) return 0;
    return calculateBulkTotalProfit() / totalItems;
  };

  const calculateBulkProfitPerPaidItem = () => {
    const paidItems = calculateBulkPaidItems();
    if (paidItems <= 0) return 0;
    return calculateBulkTotalProfit() / paidItems;
  };

  const handleSave = async () => {
    console.log('Current user object:', user);
    
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter product name');
      return;
    }
    
    let finalBuyingPrice;
    let finalStock;
    
    if (isBulkPurchase) {
      // Bulk purchase validation
      if (!bulkQuantity || !bulkTotalCost || !sellingPrice) {
        Alert.alert('Error', 'Please enter total sack quantity, total cost, and selling price per item');
        return;
      }

      const totalItems = parseFloat(bulkQuantity) || 0;
      const free = parseFloat(freeItems) || 0;
      const paidItems = totalItems - free;

      if (paidItems <= 0) {
        Alert.alert('Error', 'Free items must be less than total sack quantity');
        return;
      }

      finalBuyingPrice = calculateBulkUnitCost();
      finalStock = totalItems;

      const totalProfit = calculateBulkTotalProfit();
      if (totalProfit <= 0) {
        Alert.alert('Warning', 'Selling price should give positive total profit after accounting for the free items');
        return;
      }
    } else {
      // Regular purchase validation
      if (!buyingPrice || !sellingPrice) {
        Alert.alert('Error', 'Please enter both buying and selling prices');
        return;
      }
      
      finalBuyingPrice = parseFloat(buyingPrice);
      finalStock = parseFloat(stock) || 0;
      
      const profit = calculateProfit();
      if (profit <= 0) {
        Alert.alert('Warning', 'Selling price should be higher than buying price for profit');
        return;
      }
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
        buyingPrice: finalBuyingPrice,
        sellingPrice: parseFloat(sellingPrice),
        stockQuantity: finalStock,
        userId: userId,
      };

      console.log('Saving product to backend:', productData);
      const response = await ApiService.createProduct(productData);
      console.log('Product created:', response);

      const profit = isBulkPurchase ? calculateBulkTotalProfit() : calculateProfit();
      const profitMessage = isBulkPurchase
        ? `Total profit: UGX ${profit.toLocaleString()}`
        : `Profit: UGX ${profit.toLocaleString()} per item`;
      
      // Show success message
      setSuccessMessage(`✅ Product "${name}" added successfully! ${profitMessage}`);
      
      // Clear form
      setName('');
      setBuyingPrice('');
      setSellingPrice('');
      setStock('');
      setBulkQuantity('');
      setFreeItems('');
      setBulkTotalCost('');

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

        {/* Bulk Purchase Toggle */}
        <TouchableOpacity 
          style={styles.bulkToggle}
          onPress={() => setIsBulkPurchase(!isBulkPurchase)}
        >
          <Ionicons 
            name={isBulkPurchase ? "checkbox" : "square-outline"} 
            size={24} 
            color="#800000" 
          />
          <Text style={styles.bulkToggleText}>
            Bulk Purchase (e.g., sack with free items)
          </Text>
        </TouchableOpacity>

        {isBulkPurchase ? (
          <>
            {/* Bulk Purchase Fields */}
            <View style={styles.bulkSection}>
              <Text style={styles.bulkSectionTitle}>Bulk Purchase Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Total Items in Bulk *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 30 (items in sack)"
                  value={bulkQuantity}
                  onChangeText={setBulkQuantity}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Free Items from Supplier</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 3 or 4 (free items)"
                  value={freeItems}
                  onChangeText={setFreeItems}
                  keyboardType="numeric"
                />
                <Text style={styles.helperText}>
                  Items given free by supplier (not included in cost)
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Total Cost Paid (UGX) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 30000 (total paid for bulk)"
                  value={bulkTotalCost}
                  onChangeText={setBulkTotalCost}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Selling Price per Item (UGX) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 500 (price per item)"
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                  keyboardType="numeric"
                />
              </View>

              {/* Bulk Calculation Preview */}
              {bulkQuantity && bulkTotalCost && sellingPrice && (
                <View style={styles.bulkCalculation}>
                  <Text style={styles.bulkCalcTitle}>💰 Profit Breakdown:</Text>
                  <Text style={styles.bulkCalcText}>
                    Total items in sack: {String(bulkQuantity)}
                  </Text>
                  <Text style={styles.bulkCalcText}>
                    Free items (bonus): {String(freeItems || 0)}
                  </Text>
                  <Text style={styles.bulkCalcText}>
                    Items you paid for: {String(calculateBulkPaidItems())}
                  </Text>
                  <Text style={styles.bulkCalcDivider}>───────────────</Text>
                  <Text style={styles.bulkCalcText}>
                    Total cost paid: UGX {parseFloat(bulkTotalCost).toLocaleString()}
                  </Text>
                  <Text style={styles.bulkCalcText}>
                    Cost per paid item: UGX {calculateBulkUnitCost().toLocaleString()}
                  </Text>
                  <Text style={styles.bulkCalcText}>
                    Selling price per item: UGX {parseFloat(sellingPrice).toLocaleString()}
                  </Text>
                  <Text style={styles.bulkCalcText}>
                    Profit per item (average): UGX {calculateBulkProfitPerItem().toFixed(2)}
                  </Text>
                  <Text style={styles.bulkCalcText}>
                    Profit per paid item: UGX {calculateBulkProfitPerPaidItem().toFixed(2)}
                  </Text>
                  <Text style={styles.bulkCalcDivider}>───────────────</Text>
                  <Text style={styles.bulkCalcText}>
                    Total revenue (all {String(bulkQuantity)} items): UGX {calculateBulkRevenue().toLocaleString()}
                  </Text>
                  <Text style={[styles.bulkCalcText, styles.bulkTotalProfit]}>
                    💵 TOTAL PROFIT: UGX {calculateBulkTotalProfit().toLocaleString()}
                  </Text>
                  <Text style={styles.bulkCalcNote}>
                    (This includes value from {String(freeItems || 0)} free items supplied with the bulk order)
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Regular Purchase Fields */}
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
              <Text style={styles.label}>Stock Quantity (Optional)</Text>
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
                  <Text style={[styles.profitAmount, calculateProfit() > 0 ? styles.positiveProfit : styles.negativeProfit]}>
                    UGX {calculateProfit().toLocaleString()}
                  </Text>
                </View>
                {stock && (
                  <View style={styles.profitRow}>
                    <Text style={styles.profitLabel}>Total potential profit:</Text>
                    <Text style={[styles.profitAmount, styles.totalProfit]}>
                      UGX {(calculateProfit() * parseInt(stock || 0)).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
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
  bulkToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#800000',
    marginBottom: 20,
  },
  bulkToggleText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#800000',
    fontWeight: '500',
  },
  bulkSection: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  bulkSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#800000',
    marginBottom: 15,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  bulkCalculation: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  bulkCalcTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bulkCalcText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  bulkCalcDivider: {
    fontSize: 12,
    color: '#ddd',
    marginVertical: 8,
  },
  bulkCalcNote: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  bulkProfit: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 8,
  },
  bulkTotalProfit: {
    color: '#800000',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 4,
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