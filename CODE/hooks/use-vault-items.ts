import { useState, useEffect, useCallback } from 'react';
import { VaultItem, vaultDB } from '@/lib/database';

export function useVaultItems() {
  const [allItems, setAllItems] = useState<VaultItem[]>([]);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VaultItem['category'] | 'all' | 'favorites'>('all');

  // Load all items with auto-sync
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try auto-sync first to get latest data from server
      console.log('🔄 LoadItems: Starting auto-sync...');
      const syncResult = await vaultDB.autoSyncVaultItems();
      
      if (syncResult.success) {
        console.log(`✅ LoadItems: Auto-sync successful - ${syncResult.action}, count: ${syncResult.count}`);
      } else {
        console.warn(`⚠️ LoadItems: Auto-sync failed: ${syncResult.error}`);
      }
      
      // Load items from local database (which now contains synced data)
      const loadedItems = await vaultDB.getAllItems();
      setAllItems(loadedItems);
      setItems(loadedItems);
      setError(null);
    } catch (err) {
      setError('Failed to load items');
      console.error('Error loading items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new item
  const addItem = useCallback(async (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Use addItemWithServerStorage to automatically upload files to server
      const id = await vaultDB.addItemWithServerStorage(item);
      
      // Refresh all items from server to ensure consistency
      await loadItems();
      
      return id;
    } catch (err) {
      setError('Failed to add item');
      console.error('Error adding item:', err);
      throw err;
    }
  }, [loadItems]);

  // Update item
  const updateItem = useCallback(async (id: number, updates: Partial<Omit<VaultItem, 'id' | 'createdAt'>>) => {
    try {
      // Use updateItemWithServerStorage to automatically upload new files to server
      await vaultDB.updateItemWithServerStorage(id, updates);
      
      // Refresh all items from server to ensure consistency
      await loadItems();
    } catch (err) {
      setError('Failed to update item');
      console.error('Error updating item:', err);
      throw err;
    }
  }, [loadItems]);

  // Delete item
  const deleteItem = useCallback(async (id: number) => {
    try {
      await vaultDB.deleteItem(id);
      
      // Refresh all items from server to ensure consistency
      await loadItems();
    } catch (err) {
      setError('Failed to delete item');
      console.error('Error deleting item:', err);
      throw err;
    }
  }, [loadItems]);

  // Search items
  const searchItems = useCallback(async (query: string) => {
    if (!query.trim()) {
      await loadItems();
      return;
    }
    
    try {
      setLoading(true);
      const results = await vaultDB.searchItems(query);
      setItems(results);
      setError(null);
    } catch (err) {
      setError('Failed to search items');
      console.error('Error searching items:', err);
    } finally {
      setLoading(false);
    }
  }, [loadItems]);

  // Filter by category
  const filterByCategory = useCallback(async (category: VaultItem['category'] | 'all') => {
    try {
      setLoading(true);
      if (category === 'all') {
        setItems(allItems);
      } else {
        const filteredItems = await vaultDB.getItemsByCategory(category);
        setItems(filteredItems);
      }
      setError(null);
    } catch (err) {
      setError('Failed to filter items');
      console.error('Error filtering items:', err);
    } finally {
      setLoading(false);
    }
  }, [allItems]);

  // Sort items
  const sortItems = useCallback((sortBy: 'name' | 'createdAt' | 'updatedAt' | 'category', direction: 'asc' | 'desc' = 'asc') => {
    setItems(prev => [...prev].sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'updatedAt':
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        case 'category':
          const categoryOrder = ['passwords', 'notes', 'links', 'files', 'cards'];
          const aIndex = categoryOrder.indexOf(a.category);
          const bIndex = categoryOrder.indexOf(b.category);

          if (aIndex === -1 && bIndex === -1) return 0; // Both not in defined order
          if (aIndex === -1) return direction === 'asc' ? 1 : -1; // a not in order, b is
          if (bIndex === -1) return direction === 'asc' ? -1 : 1; // b not in order, a is

          if (aIndex < bIndex) return direction === 'asc' ? -1 : 1;
          if (aIndex > bIndex) return direction === 'asc' ? 1 : -1;
          return 0;
        
        default:
          return 0;
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    }));
  }, []);

  // Reorder items
  const reorderItems = useCallback(async (newOrder: VaultItem[]) => {
    try {
      // Update alle orderIndex in IndexedDB
      await Promise.all(newOrder.map(item =>
        item.id !== undefined ? vaultDB.updateItem(item.id, { orderIndex: item.orderIndex }) : Promise.resolve()
      ));
      
      // Refresh all items from server to ensure consistency
      await loadItems();
    } catch (err) {
      setError('Failed to reorder items');
      console.error('Error reordering items:', err);
    }
  }, [loadItems]);

  // Initialize with sample data if empty
  const initializeSampleData = useCallback(async () => {
    const existingItems = await vaultDB.getAllItems();
    if (existingItems.length === 0) {
      const sampleItems = [
        {
          name: 'Gmail Account',
          category: 'passwords' as const,
          description: 'Main email account password'
        },
        {
          name: 'Shopping List',
          category: 'notes' as const,
          description: 'Items to buy this week'
        },
        {
          name: 'GitHub',
          category: 'links' as const,
          description: 'GitHub repository links'
        }
      ];

      for (const item of sampleItems) {
        await addItem(item);
      }
    }
  }, [addItem]);

  // Load items on mount
  useEffect(() => {
    loadItems().then(() => {
      initializeSampleData();
    });
  }, [loadItems, initializeSampleData]);
  
  // Background sync removed - only sync on user actions and F5 refresh

  // Filter and search items
  useEffect(() => {
    const filteredItems = allItems.filter(item => {
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      let matchesCategory = false;
      if (selectedCategory === 'all') {
        matchesCategory = true;
      } else if (selectedCategory === 'favorites') {
        matchesCategory = item.isFavorite === true;
      } else {
        matchesCategory = item.category === selectedCategory;
      }
      return matchesSearch && matchesCategory;
    });
    
    setItems(filteredItems);
  }, [allItems, searchQuery, selectedCategory]);

  return {
    allItems,
    items,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    addItem,
    updateItem,
    deleteItem,
    searchItems,
    filterByCategory,
    sortItems,
    loadItems,
    clearError: () => setError(null),
    reorderItems
  };
}