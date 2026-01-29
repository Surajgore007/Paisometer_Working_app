import { AppSettings, Transaction } from '../types';

export interface BudgetResult {
    disposableIncome: number;
    daysRemaining: number;
    spentSoFar: number;
    dailyBudget: number;
}

/**
 * The Central Brain for Budget Calculations.
 * Used by Store (Live Data) and Settings (Previews).
 */
export const calculateBudgetMetrics = (
    settings: AppSettings,
    transactions: Transaction[], // Needed to calculate spentSoFar
    now: Date = new Date()
): BudgetResult => {
    const {
        monthlyIncome,
        fixedObligations,
        savingsGoalAmount,
        budgetMode,
        endOfBudgetCycle
    } = settings;

    // 1. Base Disposable (Corpus - Fixed - Savings)
    const disposableIncome = Math.max(0, monthlyIncome - (fixedObligations || 0) - savingsGoalAmount);

    // 2. Days Remaining & Spent So Far
    let daysRemaining = 30;
    let spentSoFar = 0;

    if (budgetMode === 'lumpsum' && endOfBudgetCycle) {
        // --- LUMP SUM MODE ---
        const endDate = new Date(endOfBudgetCycle);
        const diffTime = endDate.getTime() - now.getTime();
        daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        // Spend: All expenses (Survival mode tracks total burn against corpus)
        spentSoFar = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

    } else {
        // --- MONTHLY MODE ---
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const diffTime = lastDayOfMonth.getTime() - now.getTime();
        daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        // Spend: Expenses in current month only
        spentSoFar = transactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                const d = new Date(t.timestamp);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((sum, t) => sum + t.amount, 0);
    }

    // 3. The Formula: (Net Pool / Days Left)

    // Calculate total income received during the period (to add to the pool)
    let receivedIncome = 0;
    if (budgetMode === 'lumpsum' && endOfBudgetCycle) {
        receivedIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
    } else {
        receivedIncome = transactions
            .filter(t => {
                if (t.type !== 'income') return false;
                const d = new Date(t.timestamp);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((sum, t) => sum + t.amount, 0);
    }

    // New Pool Calculation:
    // (Corpus/Salary) + (Extra Income Received) - (Fixed Bills) - (Savings Goal) - (Amount Spent)
    const totalAvailablePool = monthlyIncome + receivedIncome - (fixedObligations || 0) - savingsGoalAmount;

    const remainingRealDisposable = Math.max(0, totalAvailablePool - spentSoFar);
    const dailyBudget = remainingRealDisposable / daysRemaining;

    return {
        disposableIncome,
        daysRemaining,
        spentSoFar,
        dailyBudget
    };
};
