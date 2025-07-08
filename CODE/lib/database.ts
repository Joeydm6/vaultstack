import Dexie, { Table } from 'dexie';
import { VaultCrypto } from './crypto';
import { getFileServerAPI, clearFileServerAPI, FileServerAPI } from './file-api';

export interface FileData {
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
  // New fields for central storage
  serverId?: string; // ID on file server
  storageType?: 'local' | 'server' | 'hybrid'; // Where file is stored
  serverUrl?: string; // URL to file server
  lastSynced?: Date; // Last sync timestamp
}

export interface VaultItem {
  id?: number;
  name: string;
  category: 'passwords' | 'notes' | 'links' | 'files';
  description?: string;
  filepath?: string;
  fileData?: FileData[];
  // Password fields
  platform?: string;
  username?: string;
  password?: string;
  url?: string;
  // Link fields
  linkUrl?: string; // Behouden voor backward compatibility
  links?: string; // Nieuw veld voor meerdere links in één string
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean; // Nieuw veld voor favorieten, optioneel
  orderIndex?: number; // Nieuw veld voor drag & drop volgorde
  // Central storage fields
  useServerStorage?: boolean; // Whether to use server storage for files
  serverFileIds?: string[]; // Array of file IDs on server
  syncStatus?: 'synced' | 'pending' | 'error' | 'local-only'; // Sync status
}

export class VaultDatabase extends Dexie {
  vaultItems!: Table<VaultItem>;

  constructor() {
    super('VaultStackDB');
    this.version(7).stores({
      vaultItems: '++id, name, category, createdAt, isFavorite, orderIndex, links'
    });
  }
}

export const db = new VaultDatabase();

// Database helper functions
export const vaultDB = {
  // Current master password for encryption/decryption
  _masterPassword: '' as string,
  
  // Set master password for encryption operations
  setMasterPassword(password: string): void {
    this._masterPassword = password;
  },
  
  // Clear master password from memory
  clearMasterPassword(): void {
    this._masterPassword = '';
  },
  // Get all items (with decryption)
  async getAllItems(): Promise<VaultItem[]> {
    // Clean up duplicates first to prevent React key errors
    const cleanupResult = await this.removeDuplicateItems();
    if (cleanupResult.removed > 0) {
      console.log(`🧹 GetAllItems: Cleaned up ${cleanupResult.removed} duplicate items`);
    }
    
    const items = await db.vaultItems.orderBy('createdAt').reverse().toArray();
    if (!this._masterPassword) {
      return items;
    }
    return items.map(item => {
      try {
        return VaultCrypto.decryptVaultItem(item, this._masterPassword);
      } catch (error) {
        console.warn('Kon item niet decrypten:', item.id, error);
        return item;
      }
    });
  },

  // Get items by category (with decryption)
  async getItemsByCategory(category: VaultItem['category']): Promise<VaultItem[]> {
    const items = await db.vaultItems.where('category').equals(category).toArray();
    if (!this._masterPassword) {
      return items;
    }
    return items.map(item => {
      try {
        return VaultCrypto.decryptVaultItem(item, this._masterPassword);
      } catch (error) {
        console.warn('Kon item niet decrypten:', item.id, error);
        return item;
      }
    });
  },

  // Search items by name or description (with decryption)
  async searchItems(query: string): Promise<VaultItem[]> {
    const lowerQuery = query.toLowerCase();
    const allItems = await this.getAllItems(); // This will decrypt items
    return allItems.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) ||
      (item.description && item.description.toLowerCase().includes(lowerQuery))
    );
  },

  // Remove duplicate items (utility function)
  async removeDuplicateItems(): Promise<{ removed: number; remaining: number }> {
    const allItems = await db.vaultItems.toArray();
    const seen = new Set<string>();
    const duplicates: number[] = [];
    
    // Find duplicates based on name + category + createdAt combination
    for (const item of allItems) {
      const key = `${item.name}-${item.category}-${item.createdAt?.getTime()}`;
      if (seen.has(key)) {
        duplicates.push(item.id!);
      } else {
        seen.add(key);
      }
    }
    
    // Remove duplicates
    if (duplicates.length > 0) {
      await db.vaultItems.bulkDelete(duplicates);
      console.log(`🧹 Removed ${duplicates.length} duplicate items`);
    }
    
    const remaining = await db.vaultItems.count();
    return { removed: duplicates.length, remaining };
  },

  // Add new item (with encryption and auto-sync)
  async addItem(item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt' | 'isFavorite'> & { isFavorite?: boolean | string }): Promise<number> {
    const now = new Date();
    const { isFavorite, ...rest } = item;
    const isFavoriteBoolean: boolean = typeof isFavorite === 'string' ? isFavorite === 'true' : !!isFavorite;
    
    // Encrypt sensitive data if master password is available
    let itemToStore = { ...rest };
    if (this._masterPassword) {
      itemToStore = VaultCrypto.encryptVaultItem(itemToStore, this._masterPassword);
    }
    
    // @ts-expect-error: isFavorite wordt altijd als boolean gecast, Dexie type is veilig
    const itemId = await db.vaultItems.add({
      ...itemToStore,
      isFavorite: isFavoriteBoolean, // altijd boolean
      createdAt: now,
      updatedAt: now
    });
    
    // Auto-sync to server after adding item (graceful failure)
    this.syncVaultItemsToServer().catch(error => {
      console.warn('⚠️ AddItem: Auto-sync failed, continuing with local storage:', error);
    });
    
    return itemId;
  },

  // Update item (with encryption and auto-sync)
  async updateItem(id: number, updates: Partial<Omit<VaultItem, 'id' | 'createdAt'>>): Promise<void> {
    // Encrypt sensitive data if master password is available
    let updatesToStore = { ...updates };
    if (this._masterPassword) {
      updatesToStore = VaultCrypto.encryptVaultItem(updatesToStore, this._masterPassword);
    }
    
    await db.vaultItems.update(id, {
      ...updatesToStore,
      updatedAt: new Date()
    });
    
    // Auto-sync to server after updating item (graceful failure)
    this.syncVaultItemsToServer().catch(error => {
      console.warn('⚠️ UpdateItem: Auto-sync failed, continuing with local storage:', error);
    });
  },

  // Delete item (with auto-sync)
  async deleteItem(id: number): Promise<void> {
    // Get item before deleting to get server info
    const item = await this.getItemById(id);
    
    // Delete from local database first
    await db.vaultItems.delete(id);
    
    // Try to delete from server as well
    if (this._masterPassword && item) {
      try {
        const fileServerAPI = getFileServerAPI(this._masterPassword);
        const isAvailable = await fileServerAPI.isAvailable();
        
        if (isAvailable) {
          // Delete the vault item from server
          await fileServerAPI.deleteVaultItem(String(item.id));
          console.log(`✅ DeleteItem: Successfully deleted item ${id} from server`);
        } else {
          console.warn('⚠️ DeleteItem: Server not available, item only deleted locally');
        }
      } catch (error) {
        console.warn('⚠️ DeleteItem: Failed to delete from server:', error);
      }
    }
    
    // Sync remaining items to server to ensure consistency (graceful failure)
    this.syncVaultItemsToServer().catch(error => {
      console.warn('⚠️ DeleteItem: Auto-sync failed, continuing with local storage:', error);
    });
  },

  // Get item by id (with decryption)
  async getItemById(id: number): Promise<VaultItem | undefined> {
    const item = await db.vaultItems.get(id);
    if (!item || !this._masterPassword) {
      return item;
    }
    try {
      return VaultCrypto.decryptVaultItem(item, this._masterPassword);
    } catch (error) {
      console.warn('Kon item niet decrypten:', id, error);
      return item;
    }
  },

  // Central File Storage Functions
  
  // Upload file to server and update item
  async uploadFileToServer(itemId: number, fileIndex: number): Promise<void> {
    if (!this._masterPassword) {
      throw new Error('Master password required for file operations');
    }

    const item = await this.getItemById(itemId);
    if (!item || !item.fileData || !item.fileData[fileIndex]) {
      throw new Error('File not found');
    }

    const fileData = item.fileData[fileIndex];
    const fileServerAPI = getFileServerAPI(this._masterPassword);

    try {
      // Check if server is available
      const isAvailable = await fileServerAPI.isAvailable();
      if (!isAvailable) {
        throw new Error('File server not available');
      }

      // Convert ArrayBuffer to File for upload
      const blob = new Blob([fileData.data], { type: fileData.type });
      const file = new File([blob], fileData.name, { type: fileData.type });

      // Upload to server
      const uploadResponse = await fileServerAPI.uploadFile(
        file,
        item.description,
        item.category
      );

      // Update file data with server info
      const updatedFileData = {
        ...fileData,
        serverId: uploadResponse.fileId,
        storageType: 'hybrid' as const,
        serverUrl: fileServerAPI['config'].baseUrl,
        lastSynced: new Date()
      };

      // Update item
      const updatedItem = { ...item };
      updatedItem.fileData![fileIndex] = updatedFileData;
      updatedItem.useServerStorage = true;
      updatedItem.serverFileIds = updatedItem.serverFileIds || [];
      if (!updatedItem.serverFileIds.includes(uploadResponse.fileId)) {
        updatedItem.serverFileIds.push(uploadResponse.fileId);
      }
      updatedItem.syncStatus = 'synced';

      await this.updateItem(itemId, updatedItem);
      console.log(`File uploaded to server: ${fileData.name} (${uploadResponse.fileId})`);

    } catch (error) {
      console.error('Failed to upload file to server:', error);
      // Update sync status to error
      await this.updateItem(itemId, { syncStatus: 'error' });
      throw error;
    }
  },

  // Download file from server
  async downloadFileFromServer(serverId: string, fileName: string): Promise<FileData> {
    if (!this._masterPassword) {
      throw new Error('Master password required for file operations');
    }

    const fileServerAPI = getFileServerAPI(this._masterPassword);

    try {
      console.log('📥 Downloading file from server:', serverId, fileName);
      const blob = await fileServerAPI.downloadFile(serverId);
      console.log('📥 Blob received, size:', blob.size, 'type:', blob.type);
      
      const arrayBuffer = await blob.arrayBuffer();
      console.log('📥 ArrayBuffer created, byteLength:', arrayBuffer.byteLength);
      
      const metadata = await fileServerAPI.getFileMetadata(serverId);
      console.log('📥 Metadata received:', metadata);

      const fileData = {
        name: metadata.name,
        type: metadata.type,
        size: metadata.size,
        data: arrayBuffer,
        serverId: serverId,
        storageType: 'server' as const,
        serverUrl: fileServerAPI['config'].baseUrl,
        lastSynced: new Date()
      };
      
      console.log('📥 FileData created:', {
        name: fileData.name,
        type: fileData.type,
        size: fileData.size,
        dataSize: fileData.data.byteLength,
        serverId: fileData.serverId
      });
      
      return fileData;

    } catch (error) {
      console.error('Failed to download file from server:', error);
      throw error;
    }
  },

  // Sync all files to server
  async syncAllFilesToServer(): Promise<{ success: number; failed: number }> {
    const items = await this.getAllItems();
    let success = 0;
    let failed = 0;

    for (const item of items) {
      if (item.category === 'files' && item.fileData) {
        for (let i = 0; i < item.fileData.length; i++) {
          const fileData = item.fileData[i];
          if (!fileData.serverId) {
            try {
              await this.uploadFileToServer(item.id!, i);
              success++;
            } catch (error) {
              console.error(`Failed to sync file ${fileData.name}:`, error);
              failed++;
            }
          }
        }
      }
    }

    return { success, failed };
  },

  // Get files from server
  async getServerFiles(): Promise<any[]> {
    if (!this._masterPassword) {
      throw new Error('Master password required for file operations');
    }

    const fileServerAPI = getFileServerAPI(this._masterPassword);

    try {
      const response = await fileServerAPI.listFiles();
      return response.files;
    } catch (error) {
      console.error('Failed to get server files:', error);
      throw error;
    }
  },

  // Check server availability
  async isServerAvailable(): Promise<boolean> {
    if (!this._masterPassword) {
      return false;
    }

    try {
      const fileServerAPI = getFileServerAPI(this._masterPassword);
      return await fileServerAPI.isAvailable();
    } catch {
      return false;
    }
  },

  // Add item with server storage option
  async addItemWithServerStorage(
    item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt' | 'isFavorite'> & { isFavorite?: boolean | string },
    uploadToServer: boolean = true
  ): Promise<number> {
    // Add item locally first
    const itemId = await this.addItem(item);

    // Always try to upload files to server if they exist
    if (uploadToServer && item.fileData && item.fileData.length > 0) {
      try {
        for (let i = 0; i < item.fileData.length; i++) {
          await this.uploadFileToServer(itemId, i);
        }
      } catch (error) {
        console.error('Failed to upload files to server:', error);
        // Item is still created locally, just mark sync as failed
        await this.updateItem(itemId, { syncStatus: 'error' });
      }
    }

    return itemId;
  },

  async updateItemWithServerStorage(
    id: number, 
    updates: Partial<Omit<VaultItem, 'id' | 'createdAt'>>,
    uploadToServer: boolean = true
  ): Promise<void> {
    // Update item locally first
    await this.updateItem(id, updates);

    // If files are being updated, upload them to server
    if (uploadToServer && updates.fileData && updates.fileData.length > 0) {
      try {
        for (let i = 0; i < updates.fileData.length; i++) {
          const fileData = updates.fileData[i];
          // Only upload if file doesn't have serverId (new file)
          if (!fileData.serverId) {
            await this.uploadFileToServer(id, i);
          }
        }
      } catch (error) {
        console.error('Failed to upload updated files to server:', error);
        // Mark sync as failed
        await this.updateItem(id, { syncStatus: 'error' });
      }
    }
  },

  // Clear server API on logout
  clearServerAPI(): void {
    clearFileServerAPI();
  },

  // Vault Items Synchronization Functions

  // Sync all vault items to server
  async syncVaultItemsToServer(): Promise<{ success: boolean; error?: string }> {
    if (!this._masterPassword) {
      console.log('🔐 SyncToServer: No master password available');
      return { success: false, error: 'Master password required' };
    }

    console.log('📤 SyncToServer: Starting sync to server...');

    try {
      const fileServerAPI = getFileServerAPI(this._masterPassword);
      console.log('🌐 SyncToServer: Checking server availability...');
      const isAvailable = await fileServerAPI.isAvailable();
      
      if (!isAvailable) {
        console.log('❌ SyncToServer: Server not available');
        return { success: false, error: 'Server not available' };
      }

      console.log('📋 SyncToServer: Getting local items...');
      // Get all items (already decrypted)
      const items = await this.getAllItems();
      
      // Convert numeric IDs to string IDs for server compatibility
      const itemsForServer = items.map(item => ({
        ...item,
        id: String(item.id) // Convert numeric ID to string
      }));
      
      console.log(`📤 SyncToServer: Saving ${itemsForServer.length} items to server...`);
      // Save to server
      await fileServerAPI.saveVaultItems(itemsForServer);
      
      console.log(`✅ SyncToServer: Successfully synced ${itemsForServer.length} items`);
      return { success: true };
      
    } catch (error) {
      console.error('💥 SyncToServer: Failed with error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Load vault items from server
  async loadVaultItemsFromServer(): Promise<{ success: boolean; items?: VaultItem[]; error?: string }> {
    if (!this._masterPassword) {
      return { success: false, error: 'Master password required' };
    }

    try {
      const fileServerAPI = getFileServerAPI(this._masterPassword);
      const isAvailable = await fileServerAPI.isAvailable();
      
      if (!isAvailable) {
        return { success: false, error: 'Server not available' };
      }

      // Get items from server
      const response = await fileServerAPI.getVaultItems();
      
      console.log(`Vault items loaded from server: ${response.items.length} items`);
      return { success: true, items: response.items };
      
    } catch (error) {
      console.error('Failed to load vault items from server:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Sync vault items from server to local database
  async syncVaultItemsFromServer(): Promise<{ success: boolean; synced: number; error?: string }> {
    const loadResult = await this.loadVaultItemsFromServer();
    
    if (!loadResult.success || !loadResult.items) {
      return { success: false, synced: 0, error: loadResult.error };
    }

    try {
      console.log('🗃️ SyncFromServer: Clearing local database...');
      // Clear existing items and wait for completion
      await db.vaultItems.clear();
      
      // Wait a bit to ensure clearing is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log(`🗃️ SyncFromServer: Adding ${loadResult.items.length} items from server...`);
      // Add items from server in a transaction to ensure atomicity
      let synced = 0;
      await db.transaction('rw', db.vaultItems, async () => {
        for (const item of loadResult.items) {
          // Items from server are already in the correct format for local storage
          // No need to encrypt again as they come from server already processed
          // Remove the id field to let Dexie auto-generate new local IDs
          const { id, ...itemWithoutId } = item;
          await db.vaultItems.add({
            ...itemWithoutId,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
          });
          synced++;
        }
      });
      
      console.log(`🗃️ SyncFromServer: Successfully synced ${synced} items`);
      
      // Clean up any potential duplicates after sync
      const cleanupResult = await this.removeDuplicateItems();
      if (cleanupResult.removed > 0) {
        console.log(`🧹 SyncFromServer: Cleaned up ${cleanupResult.removed} duplicate items`);
      }
      
      return { success: true, synced };
    } catch (error) {
      console.error('🗃️ SyncFromServer: Error syncing items:', error);
      return { success: false, synced: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Auto-sync vault items (always load from server to ensure consistency)
  async autoSyncVaultItems(): Promise<{ success: boolean; action: 'loaded' | 'synced' | 'none'; count?: number; error?: string }> {
    if (!this._masterPassword) {
      console.log('🔐 AutoSync: No master password available');
      return { success: false, action: 'none', error: 'Master password required' };
    }

    console.log('🔄 AutoSync: Starting auto-sync process...');

    try {
      const fileServerAPI = getFileServerAPI(this._masterPassword);
      console.log('🌐 AutoSync: Checking server availability...');
      const isAvailable = await fileServerAPI.isAvailable();
      
      if (!isAvailable) {
        console.log('❌ AutoSync: Server not available, using local data');
        return { success: true, action: 'none', error: 'Server not available, using local data' };
      }

      console.log('✅ AutoSync: Server available, loading from server...');
      // Always load from server to ensure consistency across all browsers
      // Server is the single source of truth
      const syncResult = await this.syncVaultItemsFromServer();
      console.log(`🎯 AutoSync: Completed - ${syncResult.success ? 'SUCCESS' : 'FAILED'}, synced ${syncResult.synced} items`);
      return {
        success: syncResult.success,
        action: 'loaded',
        count: syncResult.synced,
        error: syncResult.error
      };
      
    } catch (error) {
      console.error('💥 AutoSync: Failed with error:', error);
      return { success: false, action: 'none', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};