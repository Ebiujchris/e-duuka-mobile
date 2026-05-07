import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ApiService from '../services/ApiService';

export default function SalesScreen({ navigation }) {
  const [sales, setSales] = useState([]);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchSales();
    }, [])
  );

  const fetchSales = async () => {
    try {
      setLoading(true);
      const [salesData, creditsData] = await Promise.all([
        ApiService.getTodaysSales(),
        ApiService.getCredits()
      ]);
      setSales(Array.isArray(salesData) ? salesData : []);
      setCredits(Array.isArray(creditsData) ? creditsData : []);
      console.log('Sales loaded:', salesData);
      console.log('Credits loaded:', creditsData);
    } catch (error) {
      console.error('Error fetching sales:', error);
      setSales([]);
      setCredits([]);
    } finally {
      setLoading(false);
    }
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
    await fetchSales();
    setRefreshing(false);
  };

  const todaysSales = sales.reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0);
  const cashSales = sales.filter(sale => sale.paymentType === 'cash').reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0);
  // Use calculated outstanding credit instead of all credit sales
  const creditSales = outstandingCredit;

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
    
    return (
      <View style={styles.saleCard}>
        <View style={styles.saleHeader}>
          <Text style={styles.productName}>{item.product?.name || 'Unknown'}</Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.paymentBadge, item.paymentType === 'cash' ? styles.cashBadge : styles.creditBadge]}>
              <Text style={styles.paymentText}>{item.paymentType.toUpperCase()}</Text>
            </View>
            {isCleared && (
              <View style={styles.clearedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                <Text style={styles.clearedText}>CLEARED</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.saleDetails}>
          <Text style={styles.saleInfo}>Qty: {Number(item.quantity) || 0} × UGX {formatCurrency(item.unitPrice)}</Text>
          <Text style={styles.saleTotal}>Total: UGX {formatCurrency(item.totalAmount)}</Text>
          {item.customerName && (
            <Text style={styles.customerInfo}>Customer: {item.customerName}</Text>
          )}
          <Text style={styles.saleTime}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
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
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.totalCard]}>
          <Ionicons name="cash-outline" size={24} color="#fff" />
          <Text style={styles.summaryLabel}>Today's Sales</Text>
          <Text style={styles.summaryAmount}>UGX {formatCurrency(todaysSales)}</Text>
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
        <Text style={styles.sectionTitle}>Recent Sales ({sales.length})</Text>
        
        {sales.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>No sales today</Text>
            <TouchableOpacity 
              style={styles.recordButtonSmall}
              onPress={() => navigation.navigate('SellProduct')}
            >
              <Text style={styles.recordButtonSmallText}>Record Your First Sale</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {sales.map((item) => (
              <View key={item.id}>
                {renderSale({ item })}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
});