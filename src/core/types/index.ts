// Core domain types - the foundation of everything

export type TransactionType = 'expense' | 'income';

export type Category = 
  | 'food'
  | 'transport'
  | 'bills'
  | 'shopping'
  | 'entertainment'
  | 'other';

export type Transaction = {
  id: string;
  amount: number;
  type: TransactionType;
  category: Category;
  timestamp: Date;
  note?: string;
  merchant?: string; // <--- Added this line
};

export type Goal = {
  id: string;
  title: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  createdAt: Date;
};

export type Budget = {
  monthlyIncome: number;
  monthlySavingsGoal: number;
  dailyBudget: number;
  spendablePerMonth: number;
};

export type AppSettings = {
  monthlyIncome: number;
  savingsGoalAmount: number;
  currentGoal: Goal | null;
  onboardingCompleted: boolean;
  initialBalance: number;
  notificationsEnabled: boolean;
};