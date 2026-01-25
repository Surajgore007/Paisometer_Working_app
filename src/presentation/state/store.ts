import { create } from 'zustand';
import { Transaction, Category, TransactionType, AppSettings } from '../../core/types';
import { SmsParserService } from '../../core/services/smsParserService';
import { SettingsRepository } from '../../data/repositories/settingsrepository';
import { TransactionRepository } from '../../data/repositories/transactionrepository';
import { AddTransactionUseCase } from '../../domain/usecases/addtransaction';
import { getStartOfDay, getEndOfDay } from '../../core/utils';

const settingsRepo = new SettingsRepository();
const transactionRepo = new TransactionRepository();
const addTransactionUseCase = new AddTransactionUseCase(transactionRepo);

// Simple types for the Store
interface AppState {
  transactions: Transaction[];
  settings: AppSettings;
  
  // Computed stats
  todayTransactions: Transaction[];
  todaySpent: number;
  dailyBudget: number;
  todayRemaining: number;
  isOverBudget: boolean;
  currentBalance: number; 

  isLoading: boolean;
  error: string | null;
  
  loadData: () => Promise<void>;
  addTransaction: (amount: number, category: Category, type?: TransactionType, note?: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  setInitialBalance: (amount: number) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  transactions: [],
  settings: {
    monthlyIncome: 20000,
    savingsGoalAmount: 5000,
    currentGoal: null,
    onboardingCompleted: false,
    notificationsEnabled: false,
    initialBalance: 0,
  },
  todayTransactions: [],
  todaySpent: 0,
  dailyBudget: 0,
  todayRemaining: 0,
  isOverBudget: false,
  currentBalance: 0,
  isLoading: false,
  error: null,

  loadData: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // ------------------------------------------------------------
      // 1. SYNC FROM NATIVE (CRASH-PROOF VERSION)
      // ------------------------------------------------------------
      let newAutoTxns: Transaction[] = [];
      try {
        const pendingTxns = await SmsParserService.checkPendingTransactions();
        
        if (Array.isArray(pendingTxns) && pendingTxns.length > 0) {
            console.log(`[Store] Synced ${pendingTxns.length} SMS transactions`);
            
            newAutoTxns = pendingTxns.map((p: any) => ({
                // Deterministic-ish id prevents duplicates on repeated syncs
                id: `sms-${p.timestamp || ''}-${p.amount || ''}-${p.merchant || ''}`,
                amount: parseFloat(p.amount),
                category: 'food',
                type: (p.type === 'income' || p.type === 'expense') ? p.type : 'expense',
                timestamp: new Date(p.timestamp),
                note: p.note || `Auto: ${p.merchant}`,
                merchant: p.merchant 
            }));
        } else {
            console.log('[Store] No pending SMS transactions');
        }
      } catch (smsError) {
        console.warn('[Store] SMS Sync skipped:', smsError);
      }
      
      // ------------------------------------------------------------
      // 2. MERGE WITH LOCAL STORAGE
      // ------------------------------------------------------------
      const savedTxns = await transactionRepo.getAll();
      const merged = [...newAutoTxns, ...savedTxns];

      // De-dupe by id (important for deterministic SMS ids)
      const byId = new Map<string, Transaction>();
      for (const t of merged) byId.set(t.id, t);
      const allTransactions = Array.from(byId.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      await transactionRepo.replaceAll(allTransactions);

      // ------------------------------------------------------------
      // 3. STATS & SETTINGS
      // ------------------------------------------------------------
      const finalSettings = await settingsRepo.getSettings();

      // True "today" boundaries
      const start = getStartOfDay();
      const end = getEndOfDay();
      const todayTxns = allTransactions.filter(t => {
        const d = new Date(t.timestamp);
        return d >= start && d <= end;
      });

      const todayExpenses = todayTxns
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const todayIncome = todayTxns
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      // Net spent (expense - income) for the day
      const todaySpent = todayExpenses - todayIncome;

      const disposableIncome = Math.max(0, finalSettings.monthlyIncome - finalSettings.savingsGoalAmount);
      const dailyBudget = disposableIncome / 30;
      const todayRemaining = dailyBudget - todaySpent;

      const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const currentBalance = (finalSettings.initialBalance || 0) + totalIncome - totalExpense;

      set({
        transactions: allTransactions,
        settings: finalSettings,
        todayTransactions: todayTxns,
        todaySpent,
        dailyBudget,
        todayRemaining,
        isOverBudget: todayRemaining < 0,
        currentBalance,
        isLoading: false,
      });

    } catch (error) {
      console.error(error);
      set({ error: 'Failed to load data', isLoading: false });
    }
  },

  addTransaction: async (amount, category, type = 'expense', note) => {
    await addTransactionUseCase.execute(amount, category, type, note);
    await get().loadData();
  },

  deleteTransaction: async (id) => {
    await transactionRepo.delete(id);
    await get().loadData();
  },

  updateSettings: async (updates) => {
    await settingsRepo.updateSettings(updates);
    await get().loadData();
  },

  setInitialBalance: async (amount) => {
     await get().updateSettings({ initialBalance: amount });
  }
}));