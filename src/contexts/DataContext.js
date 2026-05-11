import React, { createContext, useState, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/ApiService';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [credits, setCredits] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [lastProductsFetch, setLastProductsFetch] = useState(null);
  const [lastSalesFetch, setLastSalesFetch] = useState(null);
  const [lastCreditsFetch, setLastCreditsFetch] = useState(null);

  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  // Check if cache is still valid
  const isCacheValid = (lastFetch) => {
    if (!lastFetch) return false;
    return Date.now() - lastFetch < CACHE_DURATION;
  };

  // Load products with caching
  const loadProducts = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid(lastProductsFetch) && products.length > 0) {
      console.log('Using cached products');
      return products;
    }

    try {
      setProductsLoading(true);
      const data = await ApiService.getProducts();
      setProducts(data);
      setLastProductsFetch(Date.now());
      
      // Cache to AsyncStorage
      await AsyncStorage.setItem('cached_products', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      
      return data;
    } catch (error) {
      console.error('Error loading products:', error);
      
      // Try to load from cache on error
      try {
        const cached = await AsyncStorage.getItem('cached_products');
        if (cached) {
          const { data } = JSON.parse(cached);
          setProducts(data);
          return data;
        }
      } catch (cacheError) {
        console.error('Cache error:', cacheError);
      }
      
      throw error;
    } finally {
      setProductsLoading(false);
    }
  }, [products, lastProductsFetch]);

  // Load sales with caching
  const loadSales = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid(lastSalesFetch) && sales.length > 0) {
      console.log('Using cached sales');
      return sales;
    }

    try {
      setSalesLoading(true);
      const data = await ApiService.getSales();
      setSales(data);
      setLastSalesFetch(Date.now());
      
      // Cache to AsyncStorage
      await AsyncStorage.setItem('cached_sales', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      
      return data;
    } catch (error) {
      console.error('Error loading sales:', error);
      
      // Try to load from cache on error
      try {
        const cached = await AsyncStorage.getItem('cached_sales');
        if (cached) {
          const { data } = JSON.parse(cached);
          setSales(data);
          return data;
        }
      } catch (cacheError) {
        console.error('Cache error:', cacheError);
      }
      
      throw error;
    } finally {
      setSalesLoading(false);
    }
  }, [sales, lastSalesFetch]);

  // Load credits with caching
  const loadCredits = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid(lastCreditsFetch) && credits.length > 0) {
      console.log('Using cached credits');
      return credits;
    }

    try {
      setCreditsLoading(true);
      const data = await ApiService.getCredits();
      setCredits(data);
      setLastCreditsFetch(Date.now());
      
      // Cache to AsyncStorage
      await AsyncStorage.setItem('cached_credits', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      
      return data;
    } catch (error) {
      console.error('Error loading credits:', error);
      
      // Try to load from cache on error
      try {
        const cached = await AsyncStorage.getItem('cached_credits');
        if (cached) {
          const { data } = JSON.parse(cached);
          setCredits(data);
          return data;
        }
      } catch (cacheError) {
        console.error('Cache error:', cacheError);
      }
      
      throw error;
    } finally {
      setCreditsLoading(false);
    }
  }, [credits, lastCreditsFetch]);

  // Invalidate cache when data changes
  const invalidateProducts = useCallback(() => {
    setLastProductsFetch(null);
  }, []);

  const invalidateSales = useCallback(() => {
    setLastSalesFetch(null);
  }, []);

  const invalidateCredits = useCallback(() => {
    setLastCreditsFetch(null);
  }, []);

  // Load initial cache on mount
  React.useEffect(() => {
    const loadInitialCache = async () => {
      try {
        const [cachedProducts, cachedSales, cachedCredits] = await Promise.all([
          AsyncStorage.getItem('cached_products'),
          AsyncStorage.getItem('cached_sales'),
          AsyncStorage.getItem('cached_credits')
        ]);

        if (cachedProducts) {
          const { data, timestamp } = JSON.parse(cachedProducts);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setProducts(data);
            setLastProductsFetch(timestamp);
          }
        }

        if (cachedSales) {
          const { data, timestamp } = JSON.parse(cachedSales);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setSales(data);
            setLastSalesFetch(timestamp);
          }
        }

        if (cachedCredits) {
          const { data, timestamp } = JSON.parse(cachedCredits);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setCredits(data);
            setLastCreditsFetch(timestamp);
          }
        }
      } catch (error) {
        console.error('Error loading initial cache:', error);
      }
    };

    loadInitialCache();
  }, []);

  const value = {
    products,
    sales,
    credits,
    productsLoading,
    salesLoading,
    creditsLoading,
    loadProducts,
    loadSales,
    loadCredits,
    invalidateProducts,
    invalidateSales,
    invalidateCredits,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
