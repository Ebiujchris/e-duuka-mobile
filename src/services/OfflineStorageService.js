// Offline Storage Service for E-Duuka Mobile App
// Handles local SQLite storage and sync with backend

import AsyncStorage from '@react-native-async-storage/async-storage';

class OfflineStorageService {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
  }

  // Store operations locally
  async storeProduct(product) {
    try {
      const products = await this.getProducts();
      const index = products.findIndex(p => p.id === product.id);
      if (index > -1) {
        products[index] = product;
      } else {
        products.push(product);
      }
      await AsyncStorage.setItem('products', JSON.stringify(products));
      return product;
    } catch (error) {
      console.error('Error storing product:', error);
      throw error;
    }
  }

  async getProducts() {
    try {
      const products = await AsyncStorage.getItem('products');
      return products ? JSON.parse(products) : [];
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  }

  async deleteProduct(id) {
    try {
      const products = await this.getProducts();
      const filtered = products.filter(p => p.id !== id);
      await AsyncStorage.setItem('products', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Store sales locally
  async storeSale(sale) {
    try {
      const sales = await this.getSales();
      sale.id = sale.id || `temp_${Date.now()}`;
      sale.synced = false;
      const index = sales.findIndex(s => s.id === sale.id);
      if (index > -1) {
        sales[index] = sale;
      } else {
        sales.push(sale);
      }
      await AsyncStorage.setItem('sales', JSON.stringify(sales));
      return sale;
    } catch (error) {
      console.error('Error storing sale:', error);
      throw error;
    }
  }

  async getSales() {
    try {
      const sales = await AsyncStorage.getItem('sales');
      return sales ? JSON.parse(sales) : [];
    } catch (error) {
      console.error('Error getting sales:', error);
      return [];
    }
  }

  async getUnsyncedSales() {
    try {
      const sales = await this.getSales();
      return sales.filter(s => !s.synced);
    } catch (error) {
      console.error('Error getting unsynced sales:', error);
      return [];
    }
  }

  async deleteSale(id) {
    try {
      const sales = await this.getSales();
      const filtered = sales.filter(s => s.id !== id);
      await AsyncStorage.setItem('sales', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  }

  // Store credits locally
  async storeCredit(credit) {
    try {
      const credits = await this.getCredits();
      credit.id = credit.id || `temp_${Date.now()}`;
      const index = credits.findIndex(c => c.id === credit.id);
      if (index > -1) {
        credits[index] = credit;
      } else {
        credits.push(credit);
      }
      await AsyncStorage.setItem('credits', JSON.stringify(credits));
      return credit;
    } catch (error) {
      console.error('Error storing credit:', error);
      throw error;
    }
  }

  async getCredits() {
    try {
      const credits = await AsyncStorage.getItem('credits');
      return credits ? JSON.parse(credits) : [];
    } catch (error) {
      console.error('Error getting credits:', error);
      return [];
    }
  }

  async deleteCredit(id) {
    try {
      const credits = await this.getCredits();
      const filtered = credits.filter(c => c.id !== id);
      await AsyncStorage.setItem('credits', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting credit:', error);
      throw error;
    }
  }

  // Store auth token
  async storeToken(token) {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error storing token:', error);
      throw error;
    }
  }

  async getToken() {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async removeToken() {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error removing token:', error);
      throw error;
    }
  }

  // Store user info
  async storeUser(user) {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user:', error);
      throw error;
    }
  }

  async getUser() {
    try {
      const user = await AsyncStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async removeUser() {
    try {
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  }

  // Clear all local data (logout)
  async clearAllData() {
    try {
      await AsyncStorage.multiRemove(['products', 'sales', 'credits', 'authToken', 'user']);
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  // Queue operations for sync
  addToSyncQueue(operation) {
    this.syncQueue.push({
      ...operation,
      timestamp: Date.now(),
    });
  }

  async getSyncQueue() {
    return this.syncQueue;
  }

  async clearSyncQueue() {
    this.syncQueue = [];
  }
}

const offlineStorageService = new OfflineStorageService();

export default offlineStorageService;
