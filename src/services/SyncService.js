// Sync Service for E-Duuka Mobile App
// Handles syncing queued operations when the app comes back online

import ApiService from './ApiService';
import OfflineStorageService from './OfflineStorageService';
import NetworkService from './NetworkService';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = [];
  }

  /**
   * Start syncing operations when online
   */
  async startSync() {
    if (this.isSyncing || !NetworkService.getIsOnline()) {
      console.warn('Sync already in progress or offline');
      return;
    }

    this.isSyncing = true;
    this.notifySyncListeners('sync_started');

    try {
      console.log('🔄 Starting sync of offline operations');
      
      const queue = await OfflineStorageService.getSyncQueue();
      console.log(`Found ${queue.length} operations to sync`);

      if (queue.length === 0) {
        console.log('✅ Sync queue is empty');
        this.notifySyncListeners('sync_completed', { 
          syncedCount: 0, 
          failedCount: 0 
        });
        this.isSyncing = false;
        return;
      }

      let syncedCount = 0;
      let failedCount = 0;

      // Process each operation
      for (const item of queue) {
        try {
          await this.syncQueueItem(item);
          syncedCount++;
          await OfflineStorageService.removeSyncQueueItem(item.id);
          this.notifySyncListeners('item_synced', item);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          failedCount++;
          
          // Update item with error
          const updatedItem = {
            ...item,
            retries: (item.retries || 0) + 1,
            status: item.retries >= item.maxRetries ? 'failed' : 'pending',
            error: error.message,
          };
          
          await OfflineStorageService.updateSyncQueueItem(item.id, updatedItem);
          this.notifySyncListeners('item_sync_failed', { item: updatedItem, error });
        }
      }

      console.log(`✅ Sync completed: ${syncedCount} synced, ${failedCount} failed`);
      this.notifySyncListeners('sync_completed', { syncedCount, failedCount });
    } catch (error) {
      console.error('Critical error during sync:', error);
      this.notifySyncListeners('sync_error', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single queue item
   */
  async syncQueueItem(item) {
    console.log(`📤 Syncing ${item.type}:`, item);
    
    const { type, resourceType, endpoint, method, data, resourceId } = item;

    try {
      let response;

      // Route to appropriate API method
      if (resourceType === 'sales') {
        if (method === 'POST') {
          response = await ApiService.createSale(data);
        } else if (method === 'PATCH') {
          response = await ApiService.updateSale(resourceId, data);
        }
      } else if (resourceType === 'credits') {
        if (method === 'POST') {
          response = await ApiService.createCredit(data);
        } else if (method === 'PATCH') {
          response = await ApiService.updateCredit(resourceId, data);
        } else if (type === 'pay_credit') {
          response = await ApiService.payCredit(resourceId, data.amount);
        }
      } else if (resourceType === 'expenses') {
        if (method === 'POST') {
          response = await ApiService.createExpense(data);
        } else if (method === 'PATCH') {
          response = await ApiService.updateExpense(resourceId, data);
        }
      } else if (resourceType === 'products') {
        if (method === 'PATCH') {
          response = await ApiService.updateProduct(resourceId, data);
        }
      }

      if (!response) {
        throw new Error(`Unknown sync operation: ${type}`);
      }

      console.log(`✅ Successfully synced ${type}`, response);
      return response;
    } catch (error) {
      console.error(`Failed to sync ${type}:`, error);
      throw error;
    }
  }

  /**
   * Register listener for sync events
   */
  addSyncListener(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners of sync event
   */
  notifySyncListeners(event, data) {
    this.syncListeners.forEach(callback => {
      try {
        callback({ event, data });
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Get pending operations count
   */
  async getPendingCount() {
    const queue = await OfflineStorageService.getSyncQueue();
    return queue.length;
  }

  /**
   * Get sync status
   */
  getIsSyncing() {
    return this.isSyncing;
  }
}

const syncService = new SyncService();

export default syncService;
