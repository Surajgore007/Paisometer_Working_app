// Pure utility functions

// FIX: Changed '../types' to './types' because they are in the same folder
import { Transaction } from '../types';

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get start of today (00:00:00)
 */
export const getStartOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of today (23:59:59)
 */
export const getEndOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Check if date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Format currency (₹1,234.56)
 */
export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Filter transactions for today
 * NOTE: Your Store.ts now uses a custom 7-day filter, so this function 
 * is just a helper for other parts of the app.
 */
export const getTodayTransactions = (transactions: Transaction[]): Transaction[] => {
  const start = getStartOfDay();
  const end = getEndOfDay();
  
  return transactions.filter(txn => {
    const txnDate = new Date(txn.timestamp);
    return txnDate >= start && txnDate <= end;
  });
};

/**
 * Calculate total amount from transactions
 */
export const calculateTotal = (transactions: Transaction[]): number => {
  return transactions.reduce((sum, txn) => {
    return txn.type === 'expense' ? sum + txn.amount : sum - txn.amount;
  }, 0);
};