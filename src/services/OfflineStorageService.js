// Offline Storage Service for E-Duuka Mobile App
// Handles local AsyncStorage and sync queue for offline operations

import AsyncStorage from '@react-native-async-storage/async-storage';

class OfflineStorageService {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
    this.syncListeners = [];
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

  // Store expenses locally
  async storeExpense(expense) {
    try {
      const expenses = await this.getExpenses();
      expense.id = expense.id || `temp_${Date.now()}`;
      expense.synced = false;
      const index = expenses.findIndex(e => e.id === expense.id);
      if (index > -1) {
        expenses[index] = expense;
      } else {
        expenses.push(expense);
      }
      await AsyncStorage.setItem('expenses', JSON.stringify(expenses));
      return expense;
    } catch (error) {
      console.error('Error storing expense:', error);
      throw error;
    }
  }

  async getExpenses() {
    try {
      const expenses = await AsyncStorage.getItem('expenses');
      return expenses ? JSON.parse(expenses) : [];
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  }

  async getUnsyncedExpenses() {
    try {
      const expenses = await this.getExpenses();
      return expenses.filter(e => !e.synced);
    } catch (error) {
      console.error('Error getting unsynced expenses:', error);
      return [];
    }
  }

  async deleteExpense(id) {
    try {
      const expenses = await this.getExpenses();
      const filtered = expenses.filter(e => e.id !== id);
      await AsyncStorage.setItem('expenses', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting expense:', error);
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
  async addToSyncQueue(operation) {
    try {
      const queue = await this.getSyncQueueFromStorage();
      
      const queueItem = {
        id: `${operation.type}_${operation.resourceId || Date.now()}`,
        type: operation.type, // 'create_sale', 'update_product', 'pay_credit', etc.
        resourceId: operation.resourceId,
        resourceType: operation.resourceType, // 'sales', 'products', 'credits', 'expenses'
        data: operation.data,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        status: 'pending', // 'pending', 'syncing', 'failed'
        error: null,
      };

      queue.push(queueItem);
      await AsyncStorage.setItem('syncQueue', JSON.stringify(queue));
      
      console.log(`📋 Added to sync queue: ${operation.type}`, queueItem);
      this.notifySyncListeners('item_added', queueItem);
      
      return queueItem;
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  async getSyncQueueFromStorage() {
    try {
      const queue = await AsyncStorage.getItem('syncQueue');
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  async getSyncQueue() {
    return this.getSyncQueueFromStorage();
  }

  async removeSyncQueueItem(itemId) {
    try {
      const queue = await this.getSyncQueueFromStorage();
      const filtered = queue.filter(item => item.id !== itemId);
      await AsyncStorage.setItem('syncQueue', JSON.stringify(filtered));
      this.notifySyncListeners('item_removed', itemId);
    } catch (error) {
      console.error('Error removing sync queue item:', error);
      throw error;
    }
  }

  async updateSyncQueueItem(itemId, updates) {
    try {
      const queue = await this.getSyncQueueFromStorage();
      const index = queue.findIndex(item => item.id === itemId);
      
      if (index > -1) {
        queue[index] = { ...queue[index], ...updates };
        await AsyncStorage.setItem('syncQueue', JSON.stringify(queue));
        this.notifySyncListeners('item_updated', queue[index]);
        return queue[index];
      }
    } catch (error) {
      console.error('Error updating sync queue item:', error);
      throw error;
    }
  }

  async clearSyncQueue() {
    try {
      await AsyncStorage.removeItem('syncQueue');
      this.notifySyncListeners('queue_cleared');
    } catch (error) {
      console.error('Error clearing sync queue:', error);
      throw error;
    }
  }

  // Sync queue listeners
  addSyncListener(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== callback);
    };
  }

  notifySyncListeners(event, data) {
    this.syncListeners.forEach(callback => {
      try {
        callback({ event, data });
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }
}

const offlineStorageService = new OfflineStorageService();

export default offlineStorageService;
