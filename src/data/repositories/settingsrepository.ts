// Settings Repository - handles app settings and user preferences

import { AppSettings, Goal } from '../../core/types';
import { STORAGE_KEYS, DEFAULTS } from '../../core/constants';
import { Storage } from '../storage/asyncstorage';

/**
 * Settings Repository
 * Handles all settings and configuration
 */
export class SettingsRepository {
  /**
   * Get all settings
   */
  async getSettings(): Promise<AppSettings> {
    const settings = await Storage.get<AppSettings>(STORAGE_KEYS.SETTINGS);
    
    // Return defaults if no settings exist
    if (!settings) {
      return {
        monthlyIncome: DEFAULTS.MONTHLY_INCOME,
        savingsGoalAmount: DEFAULTS.SAVINGS_GOAL,
        currentGoal: null,
        initialBalance: 0,
        onboardingCompleted: false,
        notificationsEnabled: true,
      };
    }

    // Rehydrate Dates inside Goal (AsyncStorage JSON -> strings)
    if (settings?.currentGoal) {
      return {
        ...settings,
        currentGoal: {
          ...settings.currentGoal,
          deadline: new Date(settings.currentGoal.deadline),
          createdAt: new Date(settings.currentGoal.createdAt),
        },
      };
    }

    return settings;
  }

  /**
   * Update settings
   */
  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    await Storage.save(STORAGE_KEYS.SETTINGS, updated);
  }

  /**
   * Get monthly income
   */
  async getMonthlyIncome(): Promise<number> {
    const settings = await this.getSettings();
    return settings.monthlyIncome;
  }

  /**
   * Set monthly income
   */
  async setMonthlyIncome(amount: number): Promise<void> {
    await this.updateSettings({ monthlyIncome: amount });
  }

  /**
   * Get savings goal
   */
  async getSavingsGoal(): Promise<number> {
    const settings = await this.getSettings();
    return settings.savingsGoalAmount;
  }

  /**
   * Set savings goal
   */
  async setSavingsGoal(amount: number): Promise<void> {
    await this.updateSettings({ savingsGoalAmount: amount });
  }

  /**
   * Get current goal
   */
  async getCurrentGoal(): Promise<Goal | null> {
    const settings = await this.getSettings();
    return settings.currentGoal;
  }

  /**
   * Set current goal
   */
  async setCurrentGoal(goal: Goal): Promise<void> {
    await this.updateSettings({ currentGoal: goal });
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(): Promise<void> {
    await this.updateSettings({ onboardingCompleted: true });
  }

  /**
   * Check if onboarding is completed
   */
  async isOnboardingCompleted(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.onboardingCompleted;
  }

  /**
   * Clear all settings (use with caution!)
   */
  async clear(): Promise<void> {
    await Storage.remove(STORAGE_KEYS.SETTINGS);
  }
}