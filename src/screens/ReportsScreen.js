import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ApiService from '../services/ApiService';

export default function ReportsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
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
    }, [selectedPeriod])
  );

  const loadReportData = async () => {
    try {
      setLoading(true);
      let startDate, endDate;
      const now = new Date();

      if (selectedPeriod === 'today') {
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

      const sales = await ApiService.getSalesByDateRange(
        startDate.toISOString(),
        endDate.toISOString()
      );

      const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const totalProfit = sales.reduce((sum, sale) => {
        const buyingPrice = sale.variant?.buyingPrice || sale.product?.buyingPrice || 0;
        return sum + ((sale.unitPrice - buyingPrice) * sale.quantity);
      }, 0);

      setReportData({
        sales: totalSales,
        profit: totalProfit,
        transactions: sales.length,
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
              selectedPeriod === period.key && styles.activePeriod
            ]}
            onPress={() => setSelectedPeriod(period.key)}
          >
            <Text style={[
              styles.periodText,
              selectedPeriod === period.key && styles.activePeriodText
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
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
  periodSelector: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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