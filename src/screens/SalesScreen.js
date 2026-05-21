import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useData } from '../contexts/DataContext';
import ApiService from '../services/ApiService';

export default function SalesScreen({ navigation }) {
  const { sales: cachedSales, credits: cachedCredits, loadSales, loadCredits, salesLoading, creditsLoading, invalidateSales, invalidateCredits } = useData();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidNotes, setVoidNotes] = useState('');

  const sales = cachedSales || [];
  const credits = cachedCredits || [];

  useFocusEffect(
    React.useCallback(() => {
      fetchSales();
    }, [])
  );

  const fetchSales = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSales(),
        loadCredits()
      ]);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter sales by selected date
  const getFilteredSales = () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= startOfDay && saleDate <= endOfDay;
    });
  };

  const filteredSales = getFilteredSales();
  
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const calculateCreditSales = async () => {
    try {
      // Get pending credits to calculate actual outstanding amount
      const pendingCredits = credits.filter(c => c.status === 'pending' || c.status === 'partially_paid');
      return pendingCredits.reduce((sum, credit) => {
        const balance = (Number(credit.totalAmount) || 0) - (Number(credit.amountPaid) || 0);
        return sum + balance;
      }, 0);
    } catch (error) {
      console.error('Error calculating credit sales:', error);
      // Fallback to sales data
      return sales.filter(sale => sale.paymentType === 'credit').reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0);
    }
  };

  const [outstandingCredit, setOutstandingCredit] = React.useState(0);

  React.useEffect(() => {
    if (sales.length > 0 || credits.length > 0) {
      calculateCreditSales().then(setOutstandingCredit);
    }
  }, [sales, credits]);

  // Helper to check if a credit sale has been cleared
  const getCreditStatus = (sale) => {
    if (sale.paymentType !== 'credit') return null;
    
    // Find matching credit by customer name and amount
    const matchingCredit = credits.find(credit => 
      credit.customerName === sale.customerName &&
      Math.abs(Number(credit.totalAmount) - Number(sale.totalAmount)) < 0.01
    );
    
    if (!matchingCredit) return 'pending';
    return matchingCredit.status;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    invalidateSales();
    invalidateCredits();
    await Promise.all([
      loadSales(true),
      loadCredits(true)
    ]);
    setRefreshing(false);
  };

  // Filter out voided sales from totals
  const activeSales = filteredSales.filter(sale => sale.status !== 'voided');
  const voidedSales = filteredSales.filter(sale => sale.status === 'voided');
  
  const todaysSales = activeSales.reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0);
  const cashSales = activeSales.filter(sale => sale.paymentType === 'cash').reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0);
  const creditSales = outstandingCredit;
  const voidedTotal = voidedSales.reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0);
  
  // Calculate profit for the selected date
  const todaysProfit = activeSales.reduce((sum, sale) => {
    const quantity = Number(sale.quantity) || 0;
    const sellingPrice = Number(sale.unitPrice) || 0;
    const buyingPrice = Number(sale.product?.buyingPrice) || 0;
    const profit = (sellingPrice - buyingPrice) * quantity;
    return sum + profit;
  }, 0);
  
  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleVoidSale = (sale) => {
    if (sale.status === 'voided') {
      Alert.alert('Already Voided', 'This sale has already been voided.');
      return;
    }
    setSelectedSale(sale);
    setVoidReason('');
    setVoidNotes('');
    setVoidModalVisible(true);
  };

  const confirmVoid = async () => {
    if (!voidReason) {
      Alert.alert('Error', 'Please select a reason for voiding this sale');
      return;
    }

    try {
      setLoading(true);
      await ApiService.voidSale(selectedSale.id, voidReason, voidNotes);
      Alert.alert('Success', 'Sale has been voided and stock restored');
      setVoidModalVisible(false);
      invalidateSales();
      await loadSales(true);
    } catch (error) {
      console.error('Error voiding sale:', error);
      Alert.alert('Error', error.message || 'Failed to void sale');
    } finally {
      setLoading(false);
    }
  };

  const voidReasons = [
    { value: 'wrong_amount', label: 'Wrong Amount' },
    { value: 'wrong_product', label: 'Wrong Product' },
    { value: 'customer_return', label: 'Customer Return' },
    { value: 'duplicate_entry', label: 'Duplicate Entry' },
    { value: 'other', label: 'Other' },
  ];

  const formatCurrency = (amount) => {
    const validAmount = Number(amount) || 0;
    return validAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const renderSale = ({ item }) => {
    const creditStatus = getCreditStatus(item);
    const isCleared = creditStatus === 'fully_paid';
    const isVoided = item.status === 'voided';
    
    // Calculate profit for this sale
    const quantity = Number(item.quantity) || 0;
    const sellingPrice = Number(item.unitPrice) || 0;
    const buyingPrice = Number(item.product?.buyingPrice) || 0;
    const saleProfit = (sellingPrice - buyingPrice) * quantity;
    
    return (
      <View style={[styles.saleCard, isVoided && styles.voidedCard]}>
        <View style={styles.saleHeader}>
          <Text style={[styles.productName, isVoided && styles.voidedText]}>
            {item.product?.name || 'Unknown'}
          </Text>
          <View style={styles.badgeContainer}>
            {isVoided ? (
              <View style={styles.voidedBadge}>
                <Ionicons name="close-circle" size={14} color="#fff" />
                <Text style={styles.voidedBadgeText}>VOIDED</Text>
              </View>
            ) : (
              <>
                <View style={[styles.paymentBadge, item.paymentType === 'cash' ? styles.cashBadge : styles.creditBadge]}>
                  <Text style={styles.paymentText}>{item.paymentType.toUpperCase()}</Text>
                </View>
                {isCleared && (
                  <View style={styles.clearedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                    <Text style={styles.clearedText}>CLEARED</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
        
        <View style={styles.saleDetails}>
          <Text style={[styles.saleInfo, isVoided && styles.voidedText]}>
            Qty: {Number(item.quantity) || 0} × UGX {formatCurrency(item.unitPrice)}
          </Text>
          <Text style={[styles.saleTotal, isVoided && styles.voidedText]}>
            Total: UGX {formatCurrency(item.totalAmount)}
          </Text>
          {!isVoided && (
            <Text style={styles.saleProfit}>
              Profit: UGX {formatCurrency(saleProfit)}
            </Text>
          )}
          {item.customerName && (
            <Text style={[styles.customerInfo, isVoided && styles.voidedText]}>
              Customer: {item.customerName}
            </Text>
          )}
          {isVoided && item.voidReason && (
            <Text style={styles.voidReason}>
              Reason: {item.voidReason.replace(/_/g, ' ').toUpperCase()}
            </Text>
          )}
          <Text style={[styles.saleTime, isVoided && styles.voidedText]}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>

        {!isVoided && (
          <TouchableOpacity 
            style={styles.voidButton}
            onPress={() => handleVoidSale(item)}
          >
            <Ionicons name="close-circle-outline" size={18} color="#F44336" />
            <Text style={styles.voidButtonText}>Void Sale</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && sales.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading sales...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#3498db']}
        />
      }
    >
      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => changeDate(-1)}
        >
          <Ionicons name="chevron-back" size={24} color="#800000" />
        </TouchableOpacity>
        
        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>
            {isToday(selectedDate) ? 'Today' : selectedDate.toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.dateButton, !isToday(selectedDate) && styles.dateButtonActive]}
          onPress={() => isToday(selectedDate) ? changeDate(1) : setSelectedDate(new Date())}
        >
          {isToday(selectedDate) ? (
            <Ionicons name="chevron-forward" size={24} color="#800000" />
          ) : (
            <Text style={styles.todayButtonText}>Today</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.totalCard]}>
          <Ionicons name="cash-outline" size={24} color="#fff" />
          <Text style={styles.summaryLabel}>{isToday(selectedDate) ? "Today's Sales" : "Sales"}</Text>
          <Text style={styles.summaryAmount}>UGX {formatCurrency(todaysSales)}</Text>
        </View>

        <View style={[styles.summaryCard, styles.profitCard]}>
          <Ionicons name="trending-up-outline" size={24} color="#fff" />
          <Text style={styles.summaryLabel}>{isToday(selectedDate) ? "Today's Profit" : "Profit"}</Text>
          <Text style={styles.summaryAmount}>UGX {formatCurrency(todaysProfit)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.cashCard]}>
            <Text style={styles.summaryLabel}>Cash</Text>
            <Text style={styles.summaryAmount}>UGX {formatCurrency(cashSales)}</Text>
          </View>
          
          <View style={[styles.summaryCard, styles.creditCard]}>
            <Text style={styles.summaryLabel}>Outstanding Credit</Text>
            <Text style={styles.summaryAmount}>UGX {formatCurrency(creditSales)}</Text>
          </View>
        </View>
      </View>

      {/* Record Sale Button */}
      <TouchableOpacity 
        style={styles.recordButton}
        onPress={() => navigation.navigate('SellProduct')}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.recordButtonText}>Record New Sale</Text>
      </TouchableOpacity>

      {/* Sales List */}
      <View style={styles.salesListContainer}>
        <Text style={styles.sectionTitle}>Sales ({filteredSales.length})</Text>
        
        {filteredSales.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>No sales for this date</Text>
            {isToday(selectedDate) && (
              <TouchableOpacity 
                style={styles.recordButtonSmall}
                onPress={() => navigation.navigate('SellProduct')}
              >
                <Text style={styles.recordButtonSmallText}>Record Your First Sale</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View>
            {filteredSales.map((item) => (
              <View key={item.id}>
                {renderSale({ item })}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Void Sale Modal */}
      <Modal
        visible={voidModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setVoidModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Void Sale</Text>
              <TouchableOpacity onPress={() => setVoidModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedSale && (
              <View style={styles.salePreview}>
                <Text style={styles.salePreviewText}>
                  {selectedSale.product?.name} × {selectedSale.quantity}
                </Text>
                <Text style={styles.salePreviewAmount}>
                  UGX {formatCurrency(selectedSale.totalAmount)}
                </Text>
              </View>
            )}

            <Text style={styles.modalLabel}>Reason for voiding *</Text>
            <View style={styles.reasonButtons}>
              {voidReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonButton,
                    voidReason === reason.value && styles.reasonButtonActive
                  ]}
                  onPress={() => setVoidReason(reason.value)}
                >
                  <Text style={[
                    styles.reasonButtonText,
                    voidReason === reason.value && styles.reasonButtonTextActive
                  ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Additional Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Enter any additional details..."
              value={voidNotes}
              onChangeText={setVoidNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setVoidModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !voidReason && styles.confirmButtonDisabled]}
                onPress={confirmVoid}
                disabled={!voidReason || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Void Sale</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateButton: {
    padding: 10,
  },
  dateButtonActive: {
    backgroundColor: '#800000',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  todayButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryContainer: {
    padding: 15,
  },
  totalCard: {
    backgroundColor: '#800000',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  profitCard: {
    backgroundColor: '#2196F3',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cashCard: {
    backgroundColor: '#4CAF50',
    flex: 0.48,
  },
  creditCard: {
    backgroundColor: '#FF9800',
    flex: 0.48,
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  recordButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  salesListContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  salesList: {
    paddingBottom: 20,
  },
  saleCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cashBadge: {
    backgroundColor: '#4CAF50',
  },
  creditBadge: {
    backgroundColor: '#FF9800',
  },
  paymentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clearedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  clearedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  saleDetails: {
    gap: 5,
  },
  saleInfo: {
    fontSize: 14,
    color: '#666',
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#800000',
  },
  saleProfit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  customerInfo: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  saleTime: {
    fontSize: 12,
    color: '#999',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  recordButtonSmall: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#800000',
    borderRadius: 8,
  },
  recordButtonSmallText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  voidedCard: {
    opacity: 0.6,
    borderLeftColor: '#F44336',
    borderLeftWidth: 4,
  },
  voidedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  voidedBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  voidedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  voidReason: {
    fontSize: 12,
    color: '#F44336',
    fontStyle: 'italic',
    marginTop: 4,
  },
  voidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F44336',
    backgroundColor: '#FFF5F5',
  },
  voidButtonText: {
    color: '#F44336',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  salePreview: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  salePreviewText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  salePreviewAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#800000',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  reasonButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  reasonButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  reasonButtonActive: {
    backgroundColor: '#800000',
    borderColor: '#800000',
  },
  reasonButtonText: {
    fontSize: 13,
    color: '#333',
  },
  reasonButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F44336',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});