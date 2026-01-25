// Use Case: Add Transaction
// This orchestrates the business logic

import { Transaction, Category, TransactionType } from '../../core/types';
import { createTransaction, isValidTransaction } from '../entities/transaction';

export interface ITransactionRepository {
  save(transaction: Transaction): Promise<void>;
  getAll(): Promise<Transaction[]>;
}

/**
 * Add Transaction Use Case
 */
export class AddTransactionUseCase {
  constructor(private repository: ITransactionRepository) {}

  async execute(
    amount: number,
    category: Category,
    type: TransactionType = 'expense',
    note?: string
  ): Promise<Transaction> {
    // 1. Create transaction (domain logic)
    const transaction = createTransaction(amount, category, type, note);

    // 2. Validate
    if (!isValidTransaction(transaction)) {
      throw new Error('Invalid transaction');
    }

    // 3. Save via repository
    await this.repository.save(transaction);

    // 4. Return created transaction
    return transaction;
  }
}