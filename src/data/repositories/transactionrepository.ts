// Transaction Repository - implements data persistence

import { Transaction } from '../../core/types';
import { STORAGE_KEYS } from '../../core/constants';
import { Storage } from '../storage/asyncstorage';

/**
 * Transaction Repository
 * Handles all transaction data operations
 */
export class TransactionRepository {
  /**
   * Get all transactions
   */
  async getAll(): Promise<Transaction[]> {
    const transactions = await Storage.get<Transaction[]>(STORAGE_KEYS.TRANSACTIONS);
    
    if (!transactions) {
      return [];
    }

    // Convert timestamp strings back to Date objects
    return transactions.map(txn => ({
      ...txn,
      timestamp: new Date(txn.timestamp),
    }));
  }

  /**
   * Save a new transaction
   */
  async save(transaction: Transaction): Promise<void> {
    const existing = await this.getAll();
    const updated = [...existing, transaction];
    await Storage.save(STORAGE_KEYS.TRANSACTIONS, updated);
  }

  /**
   * Replace all transactions at once (used for SMS sync merge).
   */
  async replaceAll(transactions: Transaction[]): Promise<void> {
    await Storage.save(STORAGE_KEYS.TRANSACTIONS, transactions);
  }

  /**
   * Delete a transaction by ID
   */
  async delete(id: string): Promise<void> {
    const existing = await this.getAll();
    const filtered = existing.filter(txn => txn.id !== id);
    await Storage.save(STORAGE_KEYS.TRANSACTIONS, filtered);
  }

  /**
   * Update a transaction
   */
  async update(id: string, updates: Partial<Transaction>): Promise<void> {
    const existing = await this.getAll();
    const updated = existing.map(txn => 
      txn.id === id ? { ...txn, ...updates } : txn
    );
    await Storage.save(STORAGE_KEYS.TRANSACTIONS, updated);
  }

  /**
   * Get transactions by date range
   */
  async getByDateRange(start: Date, end: Date): Promise<Transaction[]> {
    const all = await this.getAll();
    return all.filter(txn => {
      const txnDate = new Date(txn.timestamp);
      return txnDate >= start && txnDate <= end;
    });
  }

  /**
   * Clear all transactions (use with caution!)
   */
  async clear(): Promise<void> {
    await Storage.remove(STORAGE_KEYS.TRANSACTIONS);
  }
}