import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ApiService from '../services/ApiService';

export default function ReportsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [customDate, setCustomDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    sales: 0,
    profit: 0,
    transactions: 0,
  });

  // Format currency properly
  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '0';
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  useFocusEffect(
    React.useCallback(() => {
      loadReportData();
    }, [selectedPeriod, customDate])
  );

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod, customDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      const now = new Date();

      // If custom date is selected, use it
      if (customDate) {
        startDate = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate());
        endDate = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate() + 1);
      } else if (selectedPeriod === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (selectedPeriod === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = new Date(weekAgo.getFullYear(), weekAgo.getMonth(), weekAgo.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else {
        // Month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }

      console.log('Loading report data for period:', selectedPeriod || 'custom date');
      console.log('Custom date:', customDate);
      console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());

      const sales = await ApiService.getSalesByDateRange(
        startDate.toISOString(),
        endDate.toISOString()
      );

      console.log('Sales received:', sales);
      console.log('Number of sales:', sales?.length || 0);

      if (!sales || !Array.isArray(sales)) {
        console.error('Invalid sales data received:', sales);
        setReportData({ sales: 0, profit: 0, transactions: 0 });
        setLoading(false);
        return;
      }

      // Filter out voided sales
      const activeSales = sales.filter(sale => sale.status !== 'voided');
      const voidedSales = sales.filter(sale => sale.status === 'voided');

      console.log('Active sales:', activeSales.length);
      console.log('Voided sales:', voidedSales.length);

      const totalSales = activeSales.reduce((sum, sale) => {
        const amount = Number(sale.totalAmount) || 0;
        console.log('Sale:', sale.id, 'Amount:', amount, 'Date:', sale.createdAt);
        return sum + amount;
      }, 0);
      
      const totalProfit = activeSales.reduce((sum, sale) => {
        const buyingPrice = sale.variant?.buyingPrice || sale.product?.buyingPrice || 0;
        const profit = ((Number(sale.unitPrice) || 0) - (Number(buyingPrice) || 0)) * (Number(sale.quantity) || 0);
        console.log('Sale profit:', profit);
        return sum + profit;
      }, 0);

      console.log('Total sales:', totalSales);
      console.log('Total profit:', totalProfit);

      setReportData({
        sales: totalSales,
        profit: totalProfit,
        transactions: activeSales.length,
      });
    } catch (error) {
      console.error('Error loading report:', error);
      setReportData({ sales: 0, profit: 0, transactions: 0 });
    } finally {
      setLoading(false);
    }
  };

  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' }
  ];

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    setCustomDate(null); // Clear custom date when selecting a period
  };

  const changeCustomDate = (days) => {
    const newDate = customDate ? new Date(customDate) : new Date();
    newDate.setDate(newDate.getDate() + days);
    setCustomDate(newDate);
    setSelectedPeriod(''); // Clear period selection
  };

  const selectToday = () => {
    setCustomDate(null);
    setSelectedPeriod('today');
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const profitMargin = reportData.sales > 0 ? ((reportData.profit / reportData.sales) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {periods.map(period => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              selectedPeriod === period.key && !customDate && styles.activePeriod
            ]}
            onPress={() => handlePeriodChange(period.key)}
          >
            <Text style={[
              styles.periodText,
              selectedPeriod === period.key && !customDate && styles.activePeriodText
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Date Selector */}
      <View style={styles.dateSelector}>
        <Text style={styles.dateSelectorLabel}>Or select a specific date:</Text>
        <View style={styles.dateNavigation}>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => changeCustomDate(-1)}
          >
            <Ionicons name="chevron-back" size={24} color="#800000" />
          </TouchableOpacity>
          
          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>
              {customDate ? (
                isToday(customDate) ? 'Today' : customDate.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })
              ) : 'Select a date'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.dateButton, customDate && !isToday(customDate) && styles.dateButtonActive]}
            onPress={() => customDate && !isToday(customDate) ? selectToday() : changeCustomDate(1)}
          >
            {customDate && !isToday(customDate) ? (
              <Text style={styles.todayButtonText}>Today</Text>
            ) : (
              <Ionicons name="chevron-forward" size={24} color="#800000" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Metrics */}
      <View style={styles.metricsContainer}>
        <View style={[styles.metricCard, styles.salesCard]}>
          <Ionicons name="trending-up" size={30} color="#fff" />
          <Text style={styles.metricLabel}>Total Sales</Text>
          <Text style={styles.metricValue}>UGX {formatCurrency(reportData.sales)}</Text>
        </View>

        <View style={[styles.metricCard, styles.profitCard]}>
          <Ionicons name="cash" size={30} color="#fff" />
          <Text style={styles.metricLabel}>Net Profit</Text>
          <Text style={styles.metricValue}>UGX {formatCurrency(reportData.profit)}</Text>
        </View>
      </View>

      {/* Additional Metrics */}
      <View style={styles.additionalMetrics}>
        <View style={styles.metricRow}>
          <View style={styles.smallMetric}>
            <Ionicons name="receipt-outline" size={24} color="#800000" />
            <Text style={styles.smallMetricLabel}>Transactions</Text>
            <Text style={styles.smallMetricValue}>{reportData.transactions}</Text>
          </View>

          <View style={styles.smallMetric}>
            <Ionicons name="trending-up-outline" size={24} color="#4CAF50" />
            <Text style={styles.smallMetricLabel}>Profit Margin</Text>
            <Text style={styles.smallMetricValue}>{profitMargin}%</Text>
          </View>
        </View>
      </View>

      {/* Profit Breakdown */}
      <View style={styles.breakdownContainer}>
        <Text style={styles.sectionTitle}>Summary</Text>
        
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Total Revenue</Text>
            <Text style={styles.breakdownValue}>UGX {formatCurrency(reportData.sales)}</Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Net Profit</Text>
            <Text style={styles.breakdownValue}>
              UGX {formatCurrency(reportData.profit)}
            </Text>
          </View>
          
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Profit Margin</Text>
            <Text style={styles.totalValue}>{profitMargin}%</Text>
          </View>
        </View>
      </View>

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
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 15,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  dateSelector: {
    padding: 15,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateSelectorLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    fontWeight: '500',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  periodButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  activePeriod: {
    backgroundColor: '#800000',
  },
  periodText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  activePeriodText: {
    color: '#fff',
  },
  metricsContainer: {
    padding: 15,
    gap: 15,
  },
  metricCard: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  salesCard: {
    backgroundColor: '#800000',
  },
  expenseCard: {
    backgroundColor: '#F44336',
  },
  profitCard: {
    backgroundColor: '#4CAF50',
  },
  metricLabel: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  metricValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  additionalMetrics: {
    padding: 15,
    gap: 15,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 15,
  },
  smallMetric: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  smallMetricLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  smallMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  topProductCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topProductInfo: {
    marginLeft: 15,
  },
  topProductLabel: {
    fontSize: 14,
    color: '#666',
  },
  topProductName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  breakdownContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  breakdownLabel: {
    fontSize: 16,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  expense: {
    color: '#F44336',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 10,
    paddingTop: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  exportContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  exportButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
});