// Use Case: Calculate what user can spend today

import { Transaction } from '../../core/types';
import { calculateDailyBudget } from '../entities/budget';
import { getTodayTransactions, calculateTotal } from '../../core/utils';

export interface IBudgetRepository {
  getMonthlyIncome(): Promise<number>;
  getSavingsGoal(): Promise<number>;
}

/**
 * Calculate Daily Budget Use Case
 */
export class CalculateDailyBudgetUseCase {
  constructor(
    private budgetRepo: IBudgetRepository,
    private transactionRepo: { getAll(): Promise<Transaction[]> }
  ) {}

  async execute(): Promise<{
    dailyBudget: number;
    todaySpent: number;
    todayRemaining: number;
    isOverBudget: boolean;
  }> {
    // 1. Get budget parameters
    const monthlyIncome = await this.budgetRepo.getMonthlyIncome();
    const savingsGoal = await this.budgetRepo.getSavingsGoal();

    // 2. Calculate daily budget
    const budget = calculateDailyBudget(monthlyIncome, savingsGoal);

    // 3. Get today's transactions
    const allTransactions = await this.transactionRepo.getAll();
    const todayTransactions = getTodayTransactions(allTransactions);

    // 4. Calculate today's spending
    const todaySpent = calculateTotal(todayTransactions);

    // 5. Calculate remaining
    const todayRemaining = budget.dailyBudget - todaySpent;

    return {
      dailyBudget: budget.dailyBudget,
      todaySpent,
      todayRemaining,
      isOverBudget: todayRemaining < 0,
    };
  }
}