import { Transaction } from '../../core/types';
import { TransactionRepository } from '../../data/repositories/transactionrepository';

export class EditTransactionUseCase {
    constructor(private transactionRepository: TransactionRepository) { }

    async execute(id: string, updates: Partial<Transaction>): Promise<void> {
        // Validate updates if necessary (e.g. ensure amount is valid)
        if (updates.amount !== undefined && (isNaN(updates.amount) || updates.amount <= 0)) {
            throw new Error('Invalid amount');
        }

        await this.transactionRepository.update(id, updates);
    }
}
