import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/ApiService';

export default function DashboardScreen({ navigation }) {
  const { logout, user, isAuthenticated } = useAuth();
  const [todaysSales, setTodaysSales] = useState(0);
  const [todaysProfit, setTodaysProfit] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);

  const screenWidth = Dimensions.get('window').width;

  useFocusEffect(
    React.useCallback(() => {
      console.log('DashboardScreen focused - isAuthenticated:', isAuthenticated);
      if (!isAuthenticated) {
        console.log('Not authenticated - should navigate to login');
      } else {
        loadDashboardData();
      }
    }, [isAuthenticated])
  );

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch today's sales
      const sales = await ApiService.getTodaysSales();
      const totalSales = Array.isArray(sales) 
        ? sales.reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0)
        : 0;
      setTodaysSales(totalSales);

      // Calculate today's profit
      const totalProfit = Array.isArray(sales)
        ? sales.reduce((sum, sale) => {
            const buyingPrice = Number(sale.product?.buyingPrice) || 0;
            const unitPrice = Number(sale.unitPrice) || 0;
            const quantity = Number(sale.quantity) || 0;
            return sum + ((unitPrice - buyingPrice) * quantity);
          }, 0)
        : 0;
      setTodaysProfit(totalProfit);

      // Fetch low stock products
      const lowStock = await ApiService.getLowStockProducts();
      setLowStockItems(Array.isArray(lowStock) ? lowStock.length : 0);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Keep zeros on error
      setTodaysSales(0);
      setTodaysProfit(0);
      setLowStockItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatCurrency = (amount) => {
    // Ensure amount is a valid number
    const validAmount = Number(amount) || 0;
    // Format with thousand separators
    const formatted = validAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `UGX ${formatted}`;
  };

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleLogout = () => {
    console.log('Logout button clicked - calling logout directly');
    setIsLoggingOut(true);
    logout()
      .then(() => {
        console.log('Logout completed successfully');
        setIsLoggingOut(false);
      })
      .catch((error) => {
        console.error('Logout error:', error);
        setIsLoggingOut(false);
        Alert.alert('Error', 'Failed to logout. Please try again.');
      });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Enhanced Header with White Background */}
      <View style={styles.header}>
        <Animated.View style={[styles.headerContent, { opacity: fadeAnim }]}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getCurrentGreeting()}!</Text>
            <Text style={styles.shopName}>{user?.name || 'Your Duuka'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#2c3e50" />
            ) : (
              <Ionicons name="log-out-outline" size={32} color="#2c3e50" />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Enhanced Summary Cards with Animation */}
      <Animated.View 
        style={[
          styles.summaryContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#3498db', '#2980b9']}
          style={[styles.card, styles.mainCard]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up" size={28} color="#fff" />
            <Text style={styles.cardTitle}>Today's Sales</Text>
          </View>
          <Text style={styles.cardAmount}>{formatCurrency(todaysSales)}</Text>
          <View style={styles.cardFooter}>
            <Ionicons name="arrow-up" size={16} color="#fff" />
            <Text style={styles.cardSubtext}>+12% from yesterday</Text>
          </View>
        </LinearGradient>

        <View style={styles.smallCardsRow}>
          <LinearGradient
            colors={['#e74c3c', '#c0392b']}
            style={[styles.card, styles.smallCard]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="wallet-outline" size={24} color="#fff" />
            <Text style={styles.smallCardTitle}>Profit</Text>
            <Text style={styles.smallCardAmount}>{formatCurrency(todaysProfit)}</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#f39c12', '#e67e22']}
            style={[styles.card, styles.smallCard]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="warning-outline" size={24} color="#fff" />
            <Text style={[styles.smallCardTitle, { color: '#fff' }]}>Low Stock</Text>
            <Text style={[styles.smallCardAmount, { color: '#fff' }]}>{lowStockItems} Items</Text>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Enhanced Quick Actions */}
      <Animated.View 
        style={[
          styles.actionsContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={[styles.actionCard, styles.primaryAction]}
            onPress={() => navigation.navigate('SellProduct')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3498db', '#2980b9']}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add-circle" size={32} color="#fff" />
              <Text style={styles.actionTitle}>Record Sale</Text>
              <Text style={styles.actionSubtitle}>Quick sale entry</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.secondaryAction]}
            onPress={() => navigation.navigate('AddProduct')}
            activeOpacity={0.8}
          >
            <View style={styles.actionContent}>
              <Ionicons name="cube-outline" size={28} color="#3498db" />
              <Text style={[styles.actionTitle, { color: '#333' }]}>Add Product</Text>
              <Text style={[styles.actionSubtitle, { color: '#666' }]}>New inventory</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.secondaryAction]}
            onPress={() => navigation.navigate('Camera')}
            activeOpacity={0.8}
          >
            <View style={styles.actionContent}>
              <Ionicons name="camera-outline" size={28} color="#3498db" />
              <Text style={[styles.actionTitle, { color: '#333' }]}>Scan Product</Text>
              <Text style={[styles.actionSubtitle, { color: '#666' }]}>Use camera</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.secondaryAction]}
            onPress={() => navigation.navigate('Reports')}
            activeOpacity={0.8}
          >
            <View style={styles.actionContent}>
              <Ionicons name="bar-chart-outline" size={28} color="#3498db" />
              <Text style={[styles.actionTitle, { color: '#333' }]}>View Reports</Text>
              <Text style={[styles.actionSubtitle, { color: '#666' }]}>Analytics</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Recent Activity Section */}
      <Animated.View 
        style={[
          styles.recentActivity,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>Dashboard Summary</Text>
        {loading ? (
          <View style={styles.activityCard}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : (
          <View style={styles.activityCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Transactions Today</Text>
              <Text style={styles.summaryValue}>{todaysSales > 0 ? 'Active' : 'No sales yet'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Items Low on Stock</Text>
              <Text style={[styles.summaryValue, { color: lowStockItems > 0 ? '#F44336' : '#4CAF50' }]}>
                {lowStockItems} {lowStockItems === 1 ? 'item' : 'items'}
              </Text>
            </View>
            {lowStockItems > 0 && (
              <TouchableOpacity 
                style={styles.viewButton}
                onPress={() => navigation.navigate('Products')}
              >
                <Text style={styles.viewButtonText}>View Products</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
    opacity: 0.9,
  },
  shopName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 4,
  },
  profileButton: {
    padding: 8,
  },
  summaryContainer: {
    padding: 20,
    marginTop: -20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mainCard: {
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  cardAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginLeft: 4,
  },
  smallCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  smallCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
  },
  smallCardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  smallCardAmount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryAction: {
    width: '100%',
  },
  secondaryAction: {
    backgroundColor: '#fff',
  },
  actionGradient: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionContent: {
    padding: 20,
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  recentActivity: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#666',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  summaryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  viewButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#3498db',
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});