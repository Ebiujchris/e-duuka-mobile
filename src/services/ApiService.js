// API Service for E-Duuka Mobile App
// Handles all backend API calls with offline fallback support

import networkService from './NetworkService';
import offlineStorageService from './OfflineStorageService';

// Production API URL - Deployed on Render
const API_BASE_URL = 'https://e-duuka-api.onrender.com/api';

// Local development API URL (only works on computer)
// const API_BASE_URL = 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.token = null;
  }

  async getAuthToken() {
    if (this.token) return this.token;

    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      this.token = await AsyncStorage.getItem('authToken');
      return this.token;
    } catch (error) {
      return null;
    }
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async makeRequest(endpoint, method = 'GET', body = null, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = await this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    // Check if online
    const isOnline = networkService.getIsOnline();
    
    try {
      // If offline and not a GET request, queue the operation instead
      if (!isOnline && method !== 'GET') {
        console.log(`📱 Offline detected for ${method} request, queuing: ${endpoint}`);
        
        // Queue this operation for later sync
        const operation = {
          type: `${method.toLowerCase()}_${endpoint.split('/')[1] || 'unknown'}`,
          resourceType: endpoint.split('/')[1],
          resourceId: options.resourceId,
          method,
          endpoint,
          data: body,
        };
        
        await offlineStorageService.addToSyncQueue(operation);
        
        // Return a pending response
        return {
          success: true,
          offline: true,
          message: 'Operation saved. Will sync when online.',
          data: body, // Return the submitted data
          timestamp: Date.now(),
        };
      }

      // If offline and GET request, try to get cached data
      if (!isOnline && method === 'GET') {
        console.log(`📱 Offline detected for GET request, loading from cache: ${endpoint}`);
        const cached = await this.getCachedData(endpoint);
        if (cached) {
          return cached;
        }
        // No cache available
        throw new Error('No internet connection and no cached data available');
      }

      // Make the actual request (online)
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          throw new Error('Unauthorized. Please login again.');
        }
        const error = await response.json();
        throw new Error(error.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache GET responses
      if (method === 'GET') {
        await this.cacheData(endpoint, data);
      }

      return data;
    } catch (error) {
      console.error(`API Error: ${endpoint}`, error.message);
      
      // If online request failed but we have cache, return cached data
      if (isOnline && method === 'GET') {
        const cached = await this.getCachedData(endpoint);
        if (cached) {
          console.log(`Returning cached data for failed request: ${endpoint}`);
          return cached;
        }
      }
      
      throw error;
    }
  }

  /**
   * Cache API response
   */
  async cacheData(endpoint, data) {
    try {
      const cacheKey = `cache_${endpoint}`;
      await require('@react-native-async-storage/async-storage').default.setItem(
        cacheKey,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  /**
   * Get cached API response
   */
  async getCachedData(endpoint) {
    try {
      const cacheKey = `cache_${endpoint}`;
      const cached = await require('@react-native-async-storage/async-storage').default.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        const maxAge = 30 * 60 * 1000; // 30 minutes
        
        if (age < maxAge) {
          console.log(`Cache valid (${Math.round(age / 1000)}s old): ${endpoint}`);
          return data;
        }
      }
      return null;
    } catch (error) {
      console.warn('Failed to get cached data:', error);
      return null;
    }
  }

  // Authentication
  async register(phone, name, password, shopName, shopLocation, shopInitialCapital) {
    return this.makeRequest('/auth/register', 'POST', {
      phone,
      name,
      password,
      shopName,
      shopLocation,
      shopInitialCapital,
    });
  }

  async login(phone, password) {
    const response = await this.makeRequest('/auth/login', 'POST', {
      phone,
      password,
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async forgotPassword(phone) {
    return this.makeRequest('/auth/forgot-password', 'POST', { phone });
  }

  async resetPassword(phone, code, newPassword) {
    return this.makeRequest('/auth/reset-password', 'POST', {
      phone,
      code,
      newPassword,
    });
  }

  async getCurrentUser() {
    return this.makeRequest('/auth/me');
  }

  // Products
  async getProducts() {
    return this.makeRequest('/products');
  }

  async getProduct(id) {
    return this.makeRequest(`/products/${id}`);
  }

  async createProduct(productData) {
    return this.makeRequest('/products', 'POST', productData);
  }

  async updateProduct(id, productData) {
    return this.makeRequest(`/products/${id}`, 'PATCH', productData);
  }

  async deleteProduct(id) {
    return this.makeRequest(`/products/${id}`, 'DELETE');
  }

  async getLowStockProducts() {
    return this.makeRequest('/products/low-stock');
  }

  async updateProductStock(id, quantity) {
    return this.makeRequest(`/products/${id}/stock`, 'PATCH', { quantity });
  }

  // Sales
  async getSales() {
    const data = await this.makeRequest('/sales');
    // Cache to offline storage
    await offlineStorageService.getExpenses; // Initialize if needed
    return data;
  }

  async getSale(id) {
    return this.makeRequest(`/sales/${id}`);
  }

  async createSale(saleData) {
    try {
      const response = await this.makeRequest('/sales', 'POST', saleData, {
        resourceId: `sale_${Date.now()}`,
      });
      
      // Store locally for offline reference
      if (networkService.getIsOnline()) {
        await offlineStorageService.storeSale({
          ...saleData,
          id: response.id,
          synced: true,
        });
      }
      
      return response;
    } catch (error) {
      // If offline, store locally and queue
      if (!networkService.getIsOnline()) {
        const localSale = await offlineStorageService.storeSale({
          ...saleData,
          id: `temp_${Date.now()}`,
          offline: true,
          createdAt: new Date().toISOString(),
        });
        console.log('Sale stored offline:', localSale);
        return localSale;
      }
      throw error;
    }
  }

  async updateSale(id, saleData) {
    try {
      const response = await this.makeRequest(`/sales/${id}`, 'PATCH', saleData, {
        resourceId: id,
      });
      
      if (networkService.getIsOnline()) {
        await offlineStorageService.storeSale({ ...saleData, id, synced: true });
      }
      
      return response;
    } catch (error) {
      if (!networkService.getIsOnline()) {
        await offlineStorageService.storeSale({
          ...saleData,
          id,
          offline: true,
          updatedAt: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  async deleteSale(id) {
    return this.makeRequest(`/sales/${id}`, 'DELETE', null, { resourceId: id });
  }

  async voidSale(id, reason, notes) {
    return this.makeRequest(`/sales/${id}/void`, 'POST', { reason, notes }, {
      resourceId: id,
    });
  }

  async getTodaysSales() {
    return this.makeRequest('/sales/today');
  }

  async getSalesStats(startDate, endDate) {
    return this.makeRequest(`/sales/stats?startDate=${startDate}&endDate=${endDate}`);
  }

  async getSalesByDateRange(startDate, endDate) {
    return this.makeRequest(`/sales/range?startDate=${startDate}&endDate=${endDate}`);
  }

  // Credits
  async getCredits() {
    return this.makeRequest('/credits');
  }

  async getCredit(id) {
    return this.makeRequest(`/credits/${id}`);
  }

  async createCredit(creditData) {
    try {
      const response = await this.makeRequest('/credits', 'POST', creditData, {
        resourceId: `credit_${Date.now()}`,
      });
      
      if (networkService.getIsOnline()) {
        await offlineStorageService.storeCredit({
          ...creditData,
          id: response.id,
          synced: true,
        });
      }
      
      return response;
    } catch (error) {
      if (!networkService.getIsOnline()) {
        const localCredit = await offlineStorageService.storeCredit({
          ...creditData,
          id: `temp_${Date.now()}`,
          offline: true,
          createdAt: new Date().toISOString(),
        });
        return localCredit;
      }
      throw error;
    }
  }

  async updateCredit(id, creditData) {
    try {
      const response = await this.makeRequest(`/credits/${id}`, 'PATCH', creditData, {
        resourceId: id,
      });
      
      if (networkService.getIsOnline()) {
        await offlineStorageService.storeCredit({ ...creditData, id, synced: true });
      }
      
      return response;
    } catch (error) {
      if (!networkService.getIsOnline()) {
        await offlineStorageService.storeCredit({
          ...creditData,
          id,
          offline: true,
          updatedAt: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  async deleteCredit(id) {
    return this.makeRequest(`/credits/${id}`, 'DELETE', null, { resourceId: id });
  }

  async getPendingCredits() {
    return this.makeRequest('/credits/pending');
  }

  async getOverdueCredits() {
    return this.makeRequest('/credits/overdue');
  }

  async payCredit(id, amount) {
    try {
      const response = await this.makeRequest(`/credits/${id}/pay`, 'POST', { amount }, {
        resourceId: id,
      });
      return response;
    } catch (error) {
      if (!networkService.getIsOnline()) {
        await offlineStorageService.addToSyncQueue({
          type: 'pay_credit',
          resourceType: 'credits',
          resourceId: id,
          data: { amount },
        });
      }
      throw error;
    }
  }

  async getCreditStats() {
    return this.makeRequest('/credits/stats');
  }

  // Staff
  async getStaff() {
    return this.makeRequest('/staff');
  }

  async getStaffMember(id) {
    return this.makeRequest(`/staff/${id}`);
  }

  async createStaffMember(staffData) {
    return this.makeRequest('/staff', 'POST', staffData);
  }

  async updateStaffMember(id, staffData) {
    return this.makeRequest(`/staff/${id}`, 'PATCH', staffData);
  }

  async deleteStaffMember(id) {
    return this.makeRequest(`/staff/${id}`, 'DELETE');
  }

  // Expenses
  async getExpenses() {
    return this.makeRequest('/expenses');
  }

  async getExpense(id) {
    return this.makeRequest(`/expenses/${id}`);
  }

  async createExpense(expenseData) {
    try {
      const response = await this.makeRequest('/expenses', 'POST', expenseData, {
        resourceId: `expense_${Date.now()}`,
      });
      
      if (networkService.getIsOnline()) {
        await offlineStorageService.storeExpense({
          ...expenseData,
          id: response.id,
          synced: true,
        });
      }
      
      return response;
    } catch (error) {
      if (!networkService.getIsOnline()) {
        const localExpense = await offlineStorageService.storeExpense({
          ...expenseData,
          id: `temp_${Date.now()}`,
          offline: true,
          createdAt: new Date().toISOString(),
        });
        return localExpense;
      }
      throw error;
    }
  }

  async updateExpense(id, expenseData) {
    try {
      const response = await this.makeRequest(`/expenses/${id}`, 'PATCH', expenseData, {
        resourceId: id,
      });
      
      if (networkService.getIsOnline()) {
        await offlineStorageService.storeExpense({
          ...expenseData,
          id,
          synced: true,
        });
      }
      
      return response;
    } catch (error) {
      if (!networkService.getIsOnline()) {
        await offlineStorageService.storeExpense({
          ...expenseData,
          id,
          offline: true,
          updatedAt: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  async deleteExpense(id) {
    return this.makeRequest(`/expenses/${id}`, 'DELETE', null, { resourceId: id });
  }

  async getExpensesByDateRange(startDate, endDate) {
    return this.makeRequest(
      `/expenses/by-date-range?startDate=${startDate}&endDate=${endDate}`
    );
  }

  async getTotalExpenses() {
    return this.makeRequest('/expenses/summary/total');
  }

  async getExpensesByCategory() {
    return this.makeRequest('/expenses/summary/by-category');
  }

  // Dashboard
  async getDashboardData() {
    return this.makeRequest('/dashboard');
  }

  async getAnalytics(period = 'month') {
    return this.makeRequest(`/dashboard/analytics?period=${period}`);
  }
}

// Create and export a singleton instance
const apiService = new ApiService();

export default apiService;
