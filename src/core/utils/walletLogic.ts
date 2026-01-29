import { AppSettings, Transaction } from '../types';

/**
 * Calculates the Total Wallet Balance based on mode.
 * 
 * Logic:
 * - Lumpsum Mode: Balance = Corpus (monthlyIncome) + Income(Txns) - Expenses(Txns).
 *   (We treat the 'monthlyIncome' field as the initial Corpus stash).
 * 
 * - Monthly Mode: Balance = InitialBalance + Income(Txns) - Expenses(Txns).
 *   (Standard logic where monthlyIncome is just a rate, not a stash).
 */
export const calculateWalletBalance = (
    settings: AppSettings,
    transactions: Transaction[]
): number => {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    let startAmount = settings.initialBalance || 0;

    if (settings.budgetMode === 'lumpsum') {
        // In Lumpsum mode, 'monthlyIncome' stores the 'Total Cash' entered in Wizard.
        // We treat this as the base capital.
        startAmount = settings.monthlyIncome;

        // Note: If the user manually edited 'Initial Balance' in settings, 
        // we might prioritizing that? valid confusion point.
        // For now, to solve user's specific issue: "I put 12k in wizard, I want to see 12k".
        // We will override initialBalance with corpus if its lumpsum.
    }

    return startAmount + totalIncome - totalExpense;
};
