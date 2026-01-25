// Budget Entity - business logic for budget calculations

import { Budget } from '../../core/types';

/**
 * Calculate daily budget from monthly income and savings goal
 */
export const calculateDailyBudget = (
  monthlyIncome: number,
  savingsGoal: number
): Budget => {
  if (monthlyIncome <= 0) {
    throw new Error('Monthly income must be greater than 0');
  }

  if (savingsGoal < 0 || savingsGoal > monthlyIncome) {
    throw new Error('Invalid savings goal');
  }

  const spendablePerMonth = monthlyIncome - savingsGoal;
  const dailyBudget = spendablePerMonth / 30; // Simplified: 30 days per month

  return {
    monthlyIncome,
    monthlySavingsGoal: savingsGoal,
    spendablePerMonth,
    dailyBudget: Math.round(dailyBudget * 100) / 100, // Round to 2 decimals
  };
};

/**
 * Check if amount is within daily budget
 */
export const isWithinBudget = (
  amount: number,
  alreadySpent: number,
  dailyBudget: number
): { withinBudget: boolean; remaining: number; overage: number } => {
  const remaining = dailyBudget - alreadySpent - amount;
  
  return {
    withinBudget: remaining >= 0,
    remaining: Math.max(0, remaining),
    overage: Math.abs(Math.min(0, remaining)),
  };
};