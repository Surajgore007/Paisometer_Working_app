import { create } from 'zustand';
import { Transaction, Category, TransactionType, AppSettings } from '../../core/types';
import { SmsParserService } from '../../core/services/smsParserService';
import { SettingsRepository } from '../../data/repositories/settingsrepository';
import { TransactionRepository } from '../../data/repositories/transactionrepository';
import { AddTransactionUseCase } from '../../domain/usecases/addtransaction';
import { EditTransactionUseCase } from '../../domain/usecases/edittransaction';
import { getStartOfDay, getEndOfDay } from '../../core/utils';
import { calculateBudgetMetrics } from '../../core/utils/budgetLogic';
import { calculateWalletBalance } from '../../core/utils/walletLogic';

const settingsRepo = new SettingsRepository();
const transactionRepo = new TransactionRepository();
const addTransactionUseCase = new AddTransactionUseCase(transactionRepo);
const editTransactionUseCase = new EditTransactionUseCase(transactionRepo);

// Helper for basic categorization
const getCategory = (merchant: string, note: string): Category => {
  const lower = (merchant + ' ' + note).toLowerCase();

  if (lower.match(/swiggy|zomato|domino|kfc|pizza|burger|mcdonald|cafe|coffee|tea|restaurant|biryani|kitchen|bar/)) return 'food';
  if (lower.match(/uber|ola|rapido|petrol|fuel|shell|hp|indian oil|metro|irctc|rail|auto/)) return 'transport';
  if (lower.match(/amazon|flipkart|myntra|ajio|dmart|blinkit|zepto|store|mart|shop/)) return 'shopping';
  if (lower.match(/netflix|spotify|hotstar|prime|youtube|cinema|movie|pvr|inox/)) return 'entertainment';
  if (lower.match(/jio|airtel|vi|bescom|electricity|water|gas|bill|recharge/)) return 'bills';

  return 'other';
};

// Simple types for the Store
interface AppState {
  transactions: Transaction[];
  settings: AppSettings;

  // Computed stats
  todayTransactions: Transaction[];
  todaySpent: number;
  dailyBudget: number;
  todayRemaining: number;
  daysRemaining: number; // NEW
  isOverBudget: boolean;
  currentBalance: number;

  isLoading: boolean;
  error: string | null;

  loadData: () => Promise<void>;
  addTransaction: (amount: number, category: Category, type?: TransactionType, note?: string) => Promise<void>;
  editTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  setInitialBalance: (amount: number) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  transactions: [],
  settings: {
    budgetMode: 'monthly',
    monthlyIncome: 20000,
    fixedObligations: 0,
    savingsGoalAmount: 5000,
    endOfBudgetCycle: null,
    currentGoal: null,
    onboardingCompleted: false,
    notificationsEnabled: false,
    initialBalance: 0,
  },
  todayTransactions: [],
  todaySpent: 0,
  dailyBudget: 0,
  todayRemaining: 0,
  daysRemaining: 30, // Default Safety
  isOverBudget: false,
  currentBalance: 0,
  isLoading: false,
  error: null,

  loadData: async () => {
    if (get().isLoading) return;
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

          newAutoTxns = pendingTxns.map((p: any) => {
            // Priority: 1. Native Smart Category (if clicked) 2. Regex fallback 3. 'other'
            const smartCategory = (p.category && p.category !== 'uncategorized' && p.category !== 'food')
              ? p.category
              : getCategory(p.merchant, p.note);

            // Fix: If user clicked "Food", native sends "food". If default was "uncategorized", we are good.
            // But my TS update turned it into 'food' in Step 482? Let's check SmsParserService.

            return {
              id: p.id || `sms-${p.timestamp || ''}-${p.amount || ''}-${p.merchant || ''}`,
              amount: parseFloat(p.amount),
              // FIX: If native is 'uncategorized' (user didn't touch notification), 
              // default strictly to 'other' as requested, skipping the regex guess.
              category: (p.category && p.category !== 'uncategorized') ? p.category : 'other',
              type: (p.type === 'income' || p.type === 'expense') ? p.type : 'expense',
              timestamp: new Date(p.timestamp),
              note: p.note || `Auto-Entry`,
              merchant: p.merchant
            };
          });
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

      // Spent is purely EXPENSES. 
      // Income increases the 'dailyBudget' via the pool, so we don't subtract it here.
      const todaySpent = todayExpenses;

      // USE CENTRALIZED LOGIC
      const { dailyBudget, daysRemaining } = calculateBudgetMetrics(finalSettings, allTransactions);

      const todayRemaining = dailyBudget - todaySpent;

      const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      // USE CENTRALIZED WALLET LOGIC
      const currentBalance = calculateWalletBalance(finalSettings, allTransactions);

      set({
        transactions: allTransactions,
        settings: finalSettings,
        todayTransactions: todayTxns,
        todaySpent,
        dailyBudget,
        daysRemaining: daysRemaining || 30,
        todayRemaining,
        isOverBudget: todayRemaining < 0,
        currentBalance,
        isLoading: false,
      });

      // SYNC TO NATIVE FOR ALERTS
      SmsParserService.setBudgetContext(dailyBudget, todaySpent);


    } catch (error) {
      console.error(error);
      set({ error: 'Failed to load data', isLoading: false });
    }
  },

  addTransaction: async (amount, category, type = 'expense', note) => {
    await addTransactionUseCase.execute(amount, category, type, note);
    await get().loadData();
  },

  editTransaction: async (id, updates) => {
    await editTransactionUseCase.execute(id, updates);
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