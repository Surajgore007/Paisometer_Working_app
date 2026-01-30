// App-wide constants

// Import Category type
import { Category } from '../types';

export const CATEGORIES: { id: Category; label: string; emoji: string; icon: string }[] = [
  { id: 'food', label: 'Food', emoji: '🍔', icon: 'Utensils' },
  { id: 'transport', label: 'Transport', emoji: '🚗', icon: 'Car' },
  { id: 'bills', label: 'Bills', emoji: '💡', icon: 'Zap' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', icon: 'ShoppingBag' },
  { id: 'entertainment', label: 'Fun', emoji: '🎮', icon: 'Gamepad2' },
  { id: 'other', label: 'Other', emoji: '📦', icon: 'Package' },
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