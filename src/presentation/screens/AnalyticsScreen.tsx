// src/presentation/screens/AnalyticsScreen.tsx

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useStore } from '../state/store';
import { CATEGORIES } from '../../core/constants';
import { formatCurrency } from '../../core/utils';
import { Transaction } from '../../core/types';

const { width } = Dimensions.get('window');

// Date Filters
type TimeRange = 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME';

export const AnalyticsScreen = () => {
  const { transactions } = useStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('THIS_MONTH');

  // ------------------------------------------------------------------
  // 1. DATA PROCESSING ENGINE
  // ------------------------------------------------------------------
  const analyticsData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter Transactions by Time Range
    const filteredTxns = transactions.filter((t) => {
      if (t.type !== 'expense') return false; // Only track expenses for now
      const d = new Date(t.timestamp);

      if (timeRange === 'THIS_MONTH') {
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
      if (timeRange === 'LAST_MONTH') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const yearOfLastMonth = currentMonth === 0 ? currentYear - 1 : currentYear;
        return d.getMonth() === lastMonth && d.getFullYear() === yearOfLastMonth;
      }
      return true; // ALL_TIME
    });

    // Group by Category
    const categoryMap: Record<string, number> = {};
    let totalSpent = 0;

    filteredTxns.forEach((t) => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
      totalSpent += t.amount;
    });

    // Transform to Array & Sort (Highest Spend First)
    const breakdown = Object.keys(categoryMap)
      .map((catId) => {
        const amount = categoryMap[catId];
        const categoryConfig = CATEGORIES.find((c) => c.id === catId);
        return {
          id: catId,
          label: categoryConfig?.label || 'Other',
          emoji: categoryConfig?.emoji || '🏷️',
          amount,
          percentage: totalSpent === 0 ? 0 : (amount / totalSpent) * 100,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return { totalSpent, breakdown };
  }, [transactions, timeRange]);

  // ------------------------------------------------------------------
  // 2. COMPONENT: Custom Bar Chart Row
  // ------------------------------------------------------------------
  const renderCategoryRow = ({ item }: { item: any }) => (
    <View style={styles.categoryRow}>
      {/* Icon & Name */}
      <View style={styles.rowHeader}>
        <View style={styles.iconBox}>
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.catName}>{item.label}</Text>
          <Text style={styles.catPercent}>{item.percentage.toFixed(1)}%</Text>
        </View>
        <Text style={styles.catAmount}>{formatCurrency(item.amount)}</Text>
      </View>

      {/* Custom Progress Bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${item.percentage}%` }]} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <Text style={styles.title}>ANALYTICS</Text>
        
        {/* Time Filter Tabs */}
        <View style={styles.filterContainer}>
          {(['THIS_MONTH', 'LAST_MONTH', 'ALL_TIME'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              style={[
                styles.filterBtn,
                timeRange === range && styles.filterBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  timeRange === range && styles.filterTextActive,
                ]}
              >
                {range.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Hero: Total Spent */}
      <View style={styles.heroSection}>
        <Text style={styles.heroLabel}>Total Spent</Text>
        <Text style={styles.heroAmount}>{formatCurrency(analyticsData.totalSpent)}</Text>
      </View>

      {/* Breakdown List */}
      <FlatList
        data={analyticsData.breakdown}
        renderItem={renderCategoryRow}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No data for this period.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 40,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  filterBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#000000',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  heroLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  // Row Styles
  categoryRow: {
    marginBottom: 24,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 18,
  },
  nameContainer: {
    flex: 1,
  },
  catName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  catPercent: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  catAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  // Progress Bar
  progressBarBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000000', // Premium Black Fill
    borderRadius: 3,
  },
  emptyState: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});