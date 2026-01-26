// Transaction List - displays today's transactions

import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Transaction } from '../../core/types';
import { formatCurrency } from '../../core/utils';
import { CATEGORIES } from '../../core/constants';

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction?: (id: string) => void;
  onPressTransaction?: (transaction: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onDeleteTransaction,
  onPressTransaction,
}) => {
  const getCategory = (categoryId: string) => {
    return CATEGORIES.find(cat => cat.id === categoryId);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const category = getCategory(item.category);

    return (
      <TouchableOpacity
        style={styles.transactionItem}
        activeOpacity={0.7}
        onPress={() => onPressTransaction && onPressTransaction(item)}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.emoji}>{category?.emoji || '📦'}</Text>
        </View>

        <View style={styles.details}>
          <Text style={styles.category}>{category?.label || 'Other'}</Text>
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
          {item.merchant ? (
            <Text style={styles.merchant}>{item.merchant}</Text>
          ) : null}
          {item.note && <Text style={styles.note}>{item.note}</Text>}
        </View>

        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.amount,
              item.type === 'income' ? styles.income : styles.expense,
            ]}
          >
            {item.type === 'income' ? '+' : '-'}
            {formatCurrency(item.amount)}
          </Text>
        </View>

        {onDeleteTransaction && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDeleteTransaction(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteText}>✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>💸</Text>
        <Text style={styles.emptyText}>No transactions today</Text>
        <Text style={styles.emptySubtext}>Tap + to add your first expense</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Today's Transactions</Text>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 16,
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 24,
  },
  details: {
    flex: 1,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: '#6B7280',
  },
  merchant: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginTop: 2,
  },
  note: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  amountContainer: {
    marginRight: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
  },
  expense: {
    color: '#EF4444',
  },
  income: {
    color: '#10B981',
  },
  deleteButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 20,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});