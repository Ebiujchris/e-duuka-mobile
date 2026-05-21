// Network Service for E-Duuka Mobile App
// Detects network connectivity and manages online/offline state

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NetworkService {
  constructor() {
    this.isOnline = true;
    this.listeners = [];
    this.unsubscribe = null;
    this.lastCheckedTime = null;
  }

  /**
   * Initialize network monitoring
   */
  async initialize() {
    try {
      // Check initial state
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected && state.isInternetReachable !== false;
      
      console.log('Initial network state:', { 
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        isOnline: this.isOnline
      });

      // Subscribe to network changes
      this.unsubscribe = NetInfo.addEventListener(state => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected && state.isInternetReachable !== false;
        
        console.log('Network state changed:', { 
          wasOnline, 
          isOnline: this.isOnline,
          type: state.type 
        });

        // Only notify listeners if status actually changed
        if (wasOnline !== this.isOnline) {
          this.notifyListeners();
        }

        // Log the transition
        if (!wasOnline && this.isOnline) {
          console.log('🟢 App is back ONLINE - syncing queued operations');
          this.saveNetworkEvent('online');
        } else if (wasOnline && !this.isOnline) {
          console.log('🔴 App is now OFFLINE - operations will be queued');
          this.saveNetworkEvent('offline');
        }
      });
    } catch (error) {
      console.error('Failed to initialize network service:', error);
      // Default to online if check fails
      this.isOnline = true;
    }
  }

  /**
   * Register listener for network status changes
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners of network status change
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.isOnline);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  /**
   * Check if app is online
   */
  getIsOnline() {
    return this.isOnline;
  }

  /**
   * Force a network status check
   */
  async forceCheck() {
    try {
      const state = await NetInfo.fetch();
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable !== false;
      
      if (wasOnline !== this.isOnline) {
        this.notifyListeners();
      }
      
      return this.isOnline;
    } catch (error) {
      console.error('Failed to check network status:', error);
      return this.isOnline;
    }
  }

  /**
   * Log network events for debugging
   */
  async saveNetworkEvent(event) {
    try {
      const events = await AsyncStorage.getItem('networkEvents') || '[]';
      const parsed = JSON.parse(events);
      
      parsed.push({
        event,
        timestamp: new Date().toISOString(),
      });
      
      // Keep only last 100 events
      if (parsed.length > 100) {
        parsed.shift();
      }
      
      await AsyncStorage.setItem('networkEvents', JSON.stringify(parsed));
    } catch (error) {
      console.error('Failed to save network event:', error);
    }
  }

  /**
   * Cleanup on app close
   */
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

const networkService = new NetworkService();

export default networkService;
