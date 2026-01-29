import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  StatusBar,
  Platform,
  Alert,
  RefreshControl,
  AppState, // <--- 1. Import AppState
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../state/store';
import { BudgetDisplay } from '../components/budgetdisplay';
import { Transaction } from '../../core/types';
import { formatCurrency } from '../../core/utils';
import { CATEGORIES } from '../../core/constants';
import { SmsParserService } from '../../core/services/smsParserService';

export const TodayScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    todayTransactions,
    dailyBudget,
    todaySpent,
    todayRemaining,
    daysRemaining, // NEW
    isOverBudget,
    isLoading,
    error,
    loadData,
    deleteTransaction,
  } = useStore();

  // Local state for the pull-to-refresh spinner
  const [refreshing, setRefreshing] = useState(false);

  // ------------------------------------------------------------------
  // 1. Initial Load & Permission
  // ------------------------------------------------------------------
  useEffect(() => {
    loadData(); // Load immediately on mount
    const checkPermission = async () => {
      const isGranted = await SmsParserService.isPermissionGranted();
      if (!isGranted) {
        Alert.alert(
          "Enable Auto-Tracking",
          "Paisometer needs to read your bank notifications to track spends automatically.",
          [
            { text: "Later", style: "cancel" },
            {
              text: "Enable Now",
              onPress: () => SmsParserService.requestPermission()
            }
          ]
        );
      }
    };
    checkPermission();
  }, []);

  // ------------------------------------------------------------------
  // 2. NEW: AUTO-REFRESH (Instant Update on App Switch)
  // ------------------------------------------------------------------
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log("App active - Syncing SMS...");
        loadData();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);
      }
    }, [loadData])
  );

  // Pull to Refresh Handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getCategory = (categoryId: string) => {
    return CATEGORIES.find(cat => cat.id === categoryId);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).toUpperCase();
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const category = getCategory(item.category);

    return (
      <TouchableOpacity
        style={styles.transactionRow}
        onPress={() => navigation.navigate('AddTransactionModal', {
          transaction: {
            ...item,
            timestamp: item.timestamp.toISOString()
          }
        })}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.emoji}>{category?.emoji || '▪️'}</Text>
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryName}>{category?.label || 'General'}</Text>
            {item.note ? <Text style={styles.dotSeparator}>•</Text> : null}
            {item.note ? (
              <Text style={styles.transactionNote} numberOfLines={1}>
                {item.note}
              </Text>
            ) : null}
          </View>
          <Text style={styles.transactionTime}>{formatTime(item.timestamp)}</Text>
        </View>

        <View style={styles.amountSection}>
          <Text
            style={[
              styles.transactionAmount,
              item.type === 'income' ? styles.incomeText : styles.expenseText,
            ]}
          >
            {item.type === 'income' ? '+' : ''}
            {formatCurrency(item.amount)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => deleteTransaction(item.id)}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Text style={styles.deleteIcon}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.topNav}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            }).toUpperCase()}
          </Text>
          <Text style={styles.pageTitle}>Dashboard</Text>
        </View>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.6}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <BudgetDisplay
        remaining={todayRemaining}
        total={dailyBudget}
        spent={todaySpent}
        remainingDays={daysRemaining}
        isOverBudget={isOverBudget}
      />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>DETAILS: {error}</Text>
        </View>
      )}

      {todayTransactions.length > 0 && (
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>TRANSACTIONS</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{todayTransactions.length}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No activity today.</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button to log your first expense.
      </Text>
    </View>
  );

  if (isLoading && !refreshing && todayTransactions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#000000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusBarSpacer} />
      <FlatList
        data={todayTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#000000']} // Black spinner for Android
            tintColor="#000000"  // Black spinner for iOS
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  statusBarSpacer: { height: Platform.OS === 'android' ? StatusBar.currentHeight : 0, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  listContent: { paddingBottom: 130, flexGrow: 1 },
  headerContent: { paddingBottom: 8 },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 20 : 32, marginBottom: 20 },
  dateContainer: { flex: 1 },
  dateText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 6 },
  pageTitle: { fontSize: 32, fontWeight: '800', color: '#000000', letterSpacing: -1, lineHeight: 38 },
  settingsBtn: { width: 40, height: 40, backgroundColor: '#F9FAFB', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  settingsIcon: { fontSize: 18, color: '#000000', opacity: 0.8 },
  errorBanner: { marginHorizontal: 24, marginBottom: 20, padding: 16, backgroundColor: '#000000', borderRadius: 12 },
  errorText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.5, textTransform: 'uppercase' },
  listHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginTop: 24, marginBottom: 16 },
  listTitle: { fontSize: 11, fontWeight: '700', color: '#000000', letterSpacing: 1.5 },
  countBadge: { marginLeft: 8, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  countText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  transactionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  iconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  emoji: { fontSize: 22 },
  transactionDetails: { flex: 1, justifyContent: 'center', marginRight: 8 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  categoryName: { fontSize: 16, fontWeight: '600', color: '#000000', letterSpacing: -0.3 },
  dotSeparator: { marginHorizontal: 6, color: '#D1D5DB', fontSize: 10 },
  transactionNote: { fontSize: 14, color: '#6B7280', maxWidth: '60%' },
  transactionTime: { fontSize: 11, fontWeight: '500', color: '#9CA3AF', letterSpacing: 0.2 },
  amountSection: { alignItems: 'flex-end', minWidth: 70 },
  transactionAmount: { fontSize: 17, letterSpacing: -0.5 },
  expenseText: { fontWeight: '600', color: '#000000' },
  incomeText: { fontWeight: '400', color: '#6B7280', fontStyle: 'italic' },
  deleteBtn: { padding: 8, marginLeft: 4, opacity: 0.3 },
  deleteIcon: { fontSize: 24, color: '#000000', fontWeight: '300' },
  emptyState: { alignItems: 'center', paddingTop: 80, opacity: 0.5 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#000000', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', maxWidth: 250 },
});