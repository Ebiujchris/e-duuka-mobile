import React, { createContext, useContext, useState, useEffect } from 'react';
import networkService from '../services/NetworkService';

const NetworkContext = createContext();

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    // Initialize network service on first mount
    const initNetwork = async () => {
      await networkService.initialize();
      setIsOnline(networkService.getIsOnline());
    };

    initNetwork();

    // Listen for network status changes
    const unsubscribe = networkService.addListener((online) => {
      console.log('Network status changed:', online ? 'ONLINE' : 'OFFLINE');
      setIsOnline(online);
      
      // Clear sync error when going back online
      if (online && syncError) {
        setSyncError(null);
      }
    });

    return () => {
      unsubscribe();
      networkService.cleanup();
    };
  }, [syncError]);

  const value = {
    isOnline,
    isSyncing,
    setIsSyncing,
    syncError,
    setSyncError,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};
