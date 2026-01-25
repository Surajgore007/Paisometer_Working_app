// App-wide constants

// Import Category type
import { Category } from '../types';

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'food', label: 'Food', emoji: '🍔' },
  { id: 'transport', label: 'Transport', emoji: '🚗' },
  { id: 'bills', label: 'Bills', emoji: '💡' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'entertainment', label: 'Fun', emoji: '🎮' },
  { id: 'other', label: 'Other', emoji: '📦' },
];

export const STORAGE_KEYS = {
  TRANSACTIONS: '@paisometer_transactions',
  SETTINGS: '@paisometer_settings',
  GOAL: '@paisometer_goal',
} as const;

export const DEFAULTS = {
  MONTHLY_INCOME: 20000,
  SAVINGS_GOAL: 5000,
  RETENTION_DAYS: 90,
} as const;