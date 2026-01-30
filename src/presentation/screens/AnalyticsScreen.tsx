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
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useStore } from '../state/store';
import { CATEGORIES } from '../../core/constants';
import { formatCurrency } from '../../core/utils';
import { Transaction } from '../../core/types';
import { CategoryIcon } from '../components/CategoryIcon';
import { X, Trash2 } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Date Filters
type TimeRange = 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME';

export const AnalyticsScreen = () => {
  const { transactions, deleteTransaction } = useStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('THIS_MONTH');
  const [viewType, setViewType] = useState<'expense' | 'income'>('expense');

  // Drill-down State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubLabel, setSelectedSubLabel] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // 1. DATA PROCESSING ENGINE
  // ------------------------------------------------------------------
  // Filtered Transactions (By Time)
  const filteredTxns = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter((t) => {
      if (t.type !== viewType) return false;
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
  }, [transactions, timeRange, viewType]);

  // Level 1: Category Breakdown
  const categoryData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    let totalSpent = 0;

    filteredTxns.forEach((t) => {
      // For Income, we group by Merchant (Source) because 'category' concept is mainly for expenses.
      // For Expenses, we use the standard category ID.
      const key = viewType === 'income' ? (t.merchant || 'Unknown Source') : t.category;

      categoryMap[key] = (categoryMap[key] || 0) + t.amount;
      totalSpent += t.amount;
    });

    const breakdown = Object.keys(categoryMap)
      .map((key) => {
        const amount = categoryMap[key];

        let label = key;
        let icon = 'Banknote'; // Default Icon

        if (viewType === 'expense') {
          const categoryConfig = CATEGORIES.find((c) => c.id === key);
          label = categoryConfig?.label || 'Other';
          icon = categoryConfig?.icon || 'Tag';
        } else {
          // Income Icon Logic
          icon = 'Banknote';
          if (key.toLowerCase().includes('salary')) icon = 'Briefcase';
          if (key.toLowerCase().includes('interest')) icon = 'Landmark';
          if (key.toLowerCase().includes('refund')) icon = 'Undo2';
          if (key.toLowerCase().includes('upi')) icon = 'Smartphone';
        }

        return {
          id: key,
          label,
          icon,
          amount,
          percentage: totalSpent === 0 ? 0 : (amount / totalSpent) * 100,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return { total: totalSpent, breakdown };
  }, [filteredTxns, viewType]);

  // Level 2: Sub-Category Breakdown (Grouping by Note/Merchant)
  const subCategoryData = useMemo(() => {
    if (!selectedCategory) return null;

    const txnsInCategory = filteredTxns.filter(t => {
      if (viewType === 'income') {
        const key = t.merchant || 'Unknown Source';
        return key === selectedCategory;
      }
      return t.category === selectedCategory;
    });
    const groupMap: Record<string, { amount: number; txns: Transaction[] }> = {};
    let categoryTotal = 0;

    txnsInCategory.forEach(t => {
      // Logic: Use Note if available and not generic 'Auto-Entry', else Merchant
      let key = t.merchant || 'General';

      // If merchant is strictly 'Unknown', show 'General'
      if (key === 'Unknown') key = 'General';

      if (t.note && t.note !== 'Auto-Entry' && t.note !== 'Auto-detected') {
        key = t.note;
      }

      // Title case cleanup
      key = key.charAt(0).toUpperCase() + key.slice(1);

      // Final Safety: If key is still too long (potential raw text leak), truncate it
      if (key.length > 25) key = key.substring(0, 25) + '...';

      if (!groupMap[key]) {
        groupMap[key] = { amount: 0, txns: [] };
      }
      groupMap[key].amount += t.amount;
      groupMap[key].txns.push(t);
      categoryTotal += t.amount;
    });

    const breakdown = Object.keys(groupMap).map(key => ({
      label: key,
      amount: groupMap[key].amount,
      percentage: categoryTotal === 0 ? 0 : (groupMap[key].amount / categoryTotal) * 100,
      transactions: groupMap[key].txns
    })).sort((a, b) => b.amount - a.amount);

    const categoryConfig = CATEGORIES.find(c => c.id === selectedCategory);

    return {
      categoryName: categoryConfig?.label || 'Unknown',
      icon: categoryConfig?.icon || 'Tag',
      breakdown
    };
  }, [filteredTxns, selectedCategory]);


  // Derived Active Sub-Item (Fixes stale state on delete)
  const activeSubItem = useMemo(() => {
    if (!selectedSubLabel || !subCategoryData) return null;
    return subCategoryData.breakdown.find(item => item.label === selectedSubLabel) || null;
  }, [subCategoryData, selectedSubLabel]);

  // Actions
  const handleDelete = (txn: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(txn.id);
            // If this was the last item, close the modal
            if (activeSubItem && activeSubItem.transactions.length <= 1) {
              setSelectedSubLabel(null);
            }
          }
        },
      ]
    );
  };

  // ------------------------------------------------------------------
  // UI COMPONENTS
  // ------------------------------------------------------------------

  const renderCategoryRow = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.categoryRow}
      onPress={() => setSelectedCategory(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.rowHeader}>
        <View style={styles.iconBox}>
          {/* Use CategoryIcon with dynamic name */}
          <CategoryIcon iconName={item.icon} size={20} color="#000000" />
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.catName}>{item.label}</Text>
          <Text style={styles.catPercent}>{item.percentage.toFixed(1)}%</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.catAmount}>{formatCurrency(item.amount)}</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${item.percentage}%` }]} />
      </View>
    </TouchableOpacity>
  );

  // LEVEL 2 MODEL: SUB-CATEGORY BREAKDOWN
  const renderSubCategoryModal = () => (
    <Modal
      visible={!!selectedCategory && !selectedSubLabel}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setSelectedCategory(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <CategoryIcon iconName={subCategoryData?.icon} size={24} />
              <Text style={styles.sheetTitle}>
                {subCategoryData?.categoryName}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sheetSubtitle}>Breakdown by Merchant/Note</Text>

          <FlatList
            data={subCategoryData?.breakdown || []}
            keyExtractor={(item) => item.label}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.subRow}
                onPress={() => setSelectedSubLabel(item.label)}
              >
                <View style={styles.subRowLeft}>
                  <Text style={styles.subLabel}>{item.label}</Text>
                  {/* Mini bar */}
                  <View style={styles.miniBarBg}>
                    <View style={[styles.miniBarFill, { width: `${item.percentage}%` }]} />
                  </View>
                </View>
                <View style={styles.subRowRight}>
                  <Text style={styles.subAmount}>{formatCurrency(item.amount)}</Text>
                  <Text style={styles.subPercent}>{item.percentage.toFixed(0)}%</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  // LEVEL 3 MODAL: FLOATING CARD DETAILS
  const renderTransactionDetailModal = () => (
    <Modal
      visible={!!activeSubItem}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setSelectedSubLabel(null)}
    >
      <View style={styles.floatingOverlay}>
        <View style={styles.floatingCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>{activeSubItem?.label}</Text>
              <Text style={styles.cardTotal}>{formatCurrency(activeSubItem?.amount || 0)}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedSubLabel(null)} style={styles.cardCloseBtn}>
              <X size={20} color="#4B5563" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={styles.cardDivider} />

          <ScrollView style={styles.cardScroll}>
            {activeSubItem?.transactions.map((t, index) => (
              <View key={t.id + index} style={styles.txnRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnDate}>
                    {new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <Text style={styles.txnTime}>
                    {new Date(t.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {t.note && t.note !== 'Auto-Entry' && (
                    <Text style={styles.txnNote}>{t.note}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.txnAmount}>{formatCurrency(t.amount)}</Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(t)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={20} color="#EF4444" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );


  return (
    <View style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <Text style={styles.title}>ANALYTICS</Text>

        {/* TYPE TOGGLE (Income / Expense) */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewType === 'expense' && styles.toggleBtnActive]}
            onPress={() => setViewType('expense')}
          >
            <Text style={[styles.toggleText, viewType === 'expense' && styles.toggleTextActive]}>Expenses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewType === 'income' && styles.toggleBtnActive]}
            onPress={() => setViewType('income')}
          >
            <Text style={[styles.toggleText, viewType === 'income' && styles.toggleTextActive]}>Income</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          {(['THIS_MONTH', 'LAST_MONTH', 'ALL_TIME'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              style={[styles.filterBtn, timeRange === range && styles.filterBtnActive]}
            >
              <Text style={[styles.filterText, timeRange === range && styles.filterTextActive]}>
                {range.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Hero: Total Spent/Earned */}
      <View style={styles.heroSection}>
        <Text style={styles.heroLabel}>{viewType === 'income' ? 'Total Earned' : 'Total Spent'}</Text>
        <Text
          style={[styles.heroAmount, viewType === 'income' && { color: '#22C55E' }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {viewType === 'income' ? '+' : ''}{formatCurrency(categoryData.total)}
        </Text>
      </View>

      {/* Level 1: Category List */}
      <FlatList
        key={`${viewType}-${timeRange}`} // FORCE REFRESH on filter change
        data={categoryData.breakdown}
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

      {/* Modals */}
      {renderSubCategoryModal()}
      {renderTransactionDetailModal()}
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
    marginBottom: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  toggleTextActive: {
    color: '#000',
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
  chevron: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: -2,
    textAlign: 'right'
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
    backgroundColor: '#000000',
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

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '60%',
    padding: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 20,
    fontWeight: '500',
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  subRowLeft: {
    flex: 1,
    paddingRight: 16,
  },
  subLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  miniBarBg: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    width: '60%',
  },
  miniBarFill: {
    height: '100%',
    backgroundColor: '#4B5563',
    borderRadius: 2,
  },
  subRowRight: {
    alignItems: 'flex-end',
  },
  subAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  subPercent: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // FLOATING CARD STYLES
  floatingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  floatingCard: {
    backgroundColor: '#FFF',
    width: '100%',
    maxHeight: '70%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  cardTotal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
  },
  cardCloseBtn: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCloseText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: 'bold',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  cardScroll: {
    flexGrow: 0,
  },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  txnDate: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  txnTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  txnNote: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontStyle: 'italic',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  deleteText: {
    fontSize: 16,
  },
});
