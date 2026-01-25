// Transaction Entity - pure business logic

import { Transaction, TransactionType, Category } from '../../core/types';
import { generateId } from '../../core/utils';

/**
 * Factory function to create a new transaction
 */
export const createTransaction = (
  amount: number,
  category: Category,
  type: TransactionType = 'expense',
  note?: string
): Transaction => {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  return {
    id: generateId(),
    amount,
    type,
    category,
    timestamp: new Date(),
    note,
  };
};

/**
 * Validate transaction
 */
export const isValidTransaction = (txn: Transaction): boolean => {
  return (
    txn.amount > 0 &&
    txn.id.length > 0 &&
    ['expense', 'income'].includes(txn.type) &&
    txn.timestamp instanceof Date
  );
};