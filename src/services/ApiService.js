// API Service for E-Duuka Mobile App
// Handles all backend API calls

// Production API URL - Deployed on Render
const API_BASE_URL = 'https://e-duuka-api.onrender.com/api';

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

  async makeRequest(endpoint, method = 'GET', body = null) {
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

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          throw new Error('Unauthorized. Please login again.');
        }
        const error = await response.json();
        throw new Error(error.message || `API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error: ${endpoint}`, error);
      throw error;
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

  async getProductByBarcode(barcode) {
    return this.makeRequest(`/products/barcode/${barcode}`);
  }

  // Sales
  async getSales() {
    return this.makeRequest('/sales');
  }

  async getSale(id) {
    return this.makeRequest(`/sales/${id}`);
  }

  async createSale(saleData) {
    return this.makeRequest('/sales', 'POST', saleData);
  }

  async updateSale(id, saleData) {
    return this.makeRequest(`/sales/${id}`, 'PATCH', saleData);
  }

  async deleteSale(id) {
    return this.makeRequest(`/sales/${id}`, 'DELETE');
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
    return this.makeRequest('/credits', 'POST', creditData);
  }

  async updateCredit(id, creditData) {
    return this.makeRequest(`/credits/${id}`, 'PATCH', creditData);
  }

  async deleteCredit(id) {
    return this.makeRequest(`/credits/${id}`, 'DELETE');
  }

  async getPendingCredits() {
    return this.makeRequest('/credits/pending');
  }

  async getOverdueCredits() {
    return this.makeRequest('/credits/overdue');
  }

  async payCredit(id, amount) {
    return this.makeRequest(`/credits/${id}/pay`, 'POST', { amount });
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
    return this.makeRequest('/expenses', 'POST', expenseData);
  }

  async updateExpense(id, expenseData) {
    return this.makeRequest(`/expenses/${id}`, 'PATCH', expenseData);
  }

  async deleteExpense(id) {
    return this.makeRequest(`/expenses/${id}`, 'DELETE');
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
