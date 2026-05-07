import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ApiService from '../services/ApiService';

export default function CreditsScreen({ navigation }) {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      fetchCredits();
    }, [])
  );

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getCredits();
      setCredits(Array.isArray(data) ? data : []);
      console.log('Credits loaded:', data);
    } catch (error) {
      console.error('Error fetching credits:', error);
      setCredits([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCredits();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    const validAmount = Number(amount) || 0;
    return validAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const getBalance = (credit) => {
    const total = Number(credit.totalAmount) || 0;
    const paid = Number(credit.amountPaid) || 0;
    return total - paid;
  };

  const handlePayment = (credit) => {
    setSelectedCredit(credit);
    const balance = getBalance(credit);
    setPaymentAmount(balance.toString());
    setPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    const amount = Number(paymentAmount);
    const balance = getBalance(selectedCredit);

    if (amount > balance) {
      Alert.alert('Error', `Payment amount cannot exceed balance of UGX ${formatCurrency(balance)}`);
      return;
    }

    try {
      setLoading(true);
      await ApiService.payCredit(selectedCredit.id, amount);
      Alert.alert('Success', 'Payment recorded successfully!');
      setPaymentModal(false);
      setSelectedCredit(null);
      setPaymentAmount('');
      await fetchCredits();
    } catch (error) {
      console.error('Error recording payment:', error);
      Alert.alert('Error', error.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const pendingCredits = credits.filter(c => c.status === 'pending' || c.status === 'partially_paid');
  const paidCredits = credits.filter(c => c.status === 'fully_paid');
  const totalPending = pendingCredits.reduce((sum, credit) => sum + getBalance(credit), 0);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'partially_paid': return '#2196F3';
      case 'fully_paid': return '#4CAF50';
      default: return '#999';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'PENDING';
      case 'partially_paid': return 'PARTIAL';
      case 'fully_paid': return 'PAID';
      default: return status.toUpperCase();
    }
  };

  if (loading && credits.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading credits...</Text>
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
      {/* Summary Card */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="wallet-outline" size={32} color="#fff" />
          <Text style={styles.summaryLabel}>Total Pending Credits</Text>
          <Text style={styles.summaryAmount}>UGX {formatCurrency(totalPending)}</Text>
          <Text style={styles.summarySubtext}>{pendingCredits.length} customers</Text>
        </View>
      </View>

      {/* Credits List */}
      <View style={styles.creditsContainer}>
        <Text style={styles.sectionTitle}>Pending Credits ({pendingCredits.length})</Text>
        
        {pendingCredits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>No pending credits</Text>
          </View>
        ) : (
          <View>
            {pendingCredits.map((credit) => {
              const balance = getBalance(credit);
              
              return (
                <View key={credit.id} style={styles.creditCard}>
                  <View style={styles.creditHeader}>
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>{credit.customerName}</Text>
                      {credit.customerPhone && (
                        <Text style={styles.customerPhone}>{credit.customerPhone}</Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(credit.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(credit.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.creditDetails}>
                    <View style={styles.amountRow}>
                      <Text style={styles.label}>Total Amount:</Text>
                      <Text style={styles.amount}>UGX {formatCurrency(credit.totalAmount)}</Text>
                    </View>
                    
                    {credit.amountPaid > 0 && (
                      <View style={styles.amountRow}>
                        <Text style={styles.label}>Amount Paid:</Text>
                        <Text style={[styles.amount, styles.paidAmount]}>UGX {formatCurrency(credit.amountPaid)}</Text>
                      </View>
                    )}
                    
                    <View style={styles.amountRow}>
                      <Text style={[styles.label, styles.balanceLabel]}>Balance:</Text>
                      <Text style={[styles.amount, styles.balanceAmount]}>UGX {formatCurrency(balance)}</Text>
                    </View>

                    {credit.description && (
                      <Text style={styles.description}>{credit.description}</Text>
                    )}

                    <Text style={styles.dateText}>
                      Created: {new Date(credit.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.payButton}
                    onPress={() => handlePayment(credit)}
                  >
                    <Ionicons name="cash-outline" size={20} color="#fff" />
                    <Text style={styles.payButtonText}>Record Payment</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Paid Credits Section */}
      {paidCredits.length > 0 && (
        <View style={styles.creditsContainer}>
          <Text style={styles.sectionTitle}>Cleared Credits ({paidCredits.length})</Text>
          
          <View>
            {paidCredits.map((credit) => (
              <View key={credit.id} style={[styles.creditCard, styles.paidCard]}>
                <View style={styles.creditHeader}>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{credit.customerName}</Text>
                    {credit.customerPhone && (
                      <Text style={styles.customerPhone}>{credit.customerPhone}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(credit.status) }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.statusText}>PAID</Text>
                  </View>
                </View>

                <View style={styles.creditDetails}>
                  <View style={styles.amountRow}>
                    <Text style={styles.label}>Amount:</Text>
                    <Text style={[styles.amount, styles.paidAmount]}>UGX {formatCurrency(credit.totalAmount)}</Text>
                  </View>

                  {credit.description && (
                    <Text style={styles.description}>{credit.description}</Text>
                  )}

                  <Text style={styles.dateText}>
                    Cleared: {new Date(credit.updatedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Payment Modal */}
      <Modal
        visible={paymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedCredit && (
              <View style={styles.modalBody}>
                <Text style={styles.modalCustomerName}>{selectedCredit.customerName}</Text>
                
                <View style={styles.modalAmountInfo}>
                  <View style={styles.modalAmountRow}>
                    <Text style={styles.modalLabel}>Total:</Text>
                    <Text style={styles.modalValue}>UGX {formatCurrency(selectedCredit.totalAmount)}</Text>
                  </View>
                  <View style={styles.modalAmountRow}>
                    <Text style={styles.modalLabel}>Paid:</Text>
                    <Text style={styles.modalValue}>UGX {formatCurrency(selectedCredit.amountPaid)}</Text>
                  </View>
                  <View style={styles.modalAmountRow}>
                    <Text style={[styles.modalLabel, styles.modalBalanceLabel]}>Balance:</Text>
                    <Text style={[styles.modalValue, styles.modalBalanceValue]}>
                      UGX {formatCurrency(getBalance(selectedCredit))}
                    </Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Payment Amount *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="numeric"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setPaymentModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={submitPayment}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Record Payment</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  summaryContainer: {
    padding: 15,
  },
  summaryCard: {
    backgroundColor: '#FF9800',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  summarySubtext: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  creditsContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
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
  creditCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paidCard: {
    opacity: 0.7,
  },
  creditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  creditDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  amount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  paidAmount: {
    color: '#4CAF50',
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  balanceAmount: {
    fontSize: 16,
    color: '#FF9800',
  },
  description: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  payButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalCustomerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  modalAmountInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
  },
  modalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBalanceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBalanceValue: {
    fontSize: 16,
    color: '#FF9800',
  },
  inputLabel: {
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
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
