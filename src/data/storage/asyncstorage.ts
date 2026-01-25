// AsyncStorage wrapper - handles all persistent storage

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generic storage interface
 */
export class Storage {
  /**
   * Save data to storage
   */
  static async save<T>(key: string, data: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(data);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error saving to storage [${key}]:`, error);
      throw new Error('Failed to save data');
    }
  }

  /**
   * Get data from storage
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error reading from storage [${key}]:`, error);
      return null;
    }
  }

  /**
   * Remove data from storage
   */
  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from storage [${key}]:`, error);
      throw new Error('Failed to remove data');
    }
  }

  /**
   * Clear all storage (use with caution!)
   */
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw new Error('Failed to clear storage');
    }
  }
}