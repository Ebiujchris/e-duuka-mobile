import React, { useState, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useNetwork } from '../contexts/NetworkContext';
import SyncService from '../services/SyncService';
import OfflineStorageService from '../services/OfflineStorageService';

export default function OfflineIndicator() {
  const { isOnline, isSyncing, syncError } = useNetwork();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');
  const [showSync, setShowSync] = useState(false);
  const slideAnim = new Animated.Value(0);

  useEffect(() => {
    // Update pending count periodically
    const updatePendingCount = async () => {
      const count = await SyncService.getPendingCount();
      setPendingCount(count);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Listen for sync events
    const unsubscribe = SyncService.addSyncListener(({ event, data }) => {
      switch (event) {
        case 'sync_started':
          setSyncStatus('Syncing...');
          setShowSync(true);
          break;
        case 'sync_completed':
          setSyncStatus(`Synced! ${data.syncedCount} operations`);
          setTimeout(() => setShowSync(false), 3000);
          break;
        case 'sync_error':
          setSyncStatus('Sync failed. Retrying...');
          break;
        default:
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Auto-sync when coming online
    if (isOnline && pendingCount > 0) {
      console.log('🟢 Back online, starting sync...');
      SyncService.startSync();
    }
  }, [isOnline, pendingCount]);

  if (isOnline && !showSync && !syncError) {
    return null; // Don't show anything when online and no sync needed
  }

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            🔴 Offline Mode • {pendingCount > 0 ? `${pendingCount} pending` : 'Ready'}
          </Text>
        </View>
      )}

      {/* Sync Status Snackbar */}
      <Snackbar
        visible={showSync}
        onDismiss={() => setShowSync(false)}
        duration={3000}
        style={styles.snackbar}
      >
        <Text style={styles.snackbarText}>
          {isSyncing ? '🔄 ' : '✅ '}
          {syncStatus}
        </Text>
      </Snackbar>

      {/* Sync Error */}
      {syncError && (
        <Snackbar
          visible={true}
          onDismiss={() => {}}
          style={[styles.snackbar, styles.errorSnackbar]}
        >
          <Text style={styles.snackbarText}>
            ❌ Sync error: {syncError}
          </Text>
        </Snackbar>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#991b1b',
  },
  offlineText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  snackbar: {
    backgroundColor: '#10b981',
    margin: 10,
    borderRadius: 8,
  },
  errorSnackbar: {
    backgroundColor: '#ef4444',
  },
  snackbarText: {
    color: '#fff',
    fontWeight: '500',
  },
});
