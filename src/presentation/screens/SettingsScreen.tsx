// Settings Screen - Premium Monochrome Control Center

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { useStore } from '../state/store';
import { formatCurrency } from '../../core/utils';
import { calculateBudgetMetrics } from '../../core/utils/budgetLogic';
import { DEFAULTS } from '../../core/constants';
import { AppSettings } from '../../core/types';

export const SettingsScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const { settings, updateSettings, isLoading, transactions } = useStore();

  const [monthlyIncome, setMonthlyIncome] = useState(
    settings.monthlyIncome.toString()
  );
  const [savingsGoal, setSavingsGoal] = useState(
    settings.savingsGoalAmount.toString()
  );
  const [fixedObligations, setFixedObligations] = useState(
    (settings.fixedObligations || 0).toString()
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    settings.notificationsEnabled
  );


  // REAL-TIME PREVIEW CALCULATION
  const previewSettings: AppSettings = {
    ...settings,
    monthlyIncome: parseFloat(monthlyIncome) || 0,
    fixedObligations: parseFloat(fixedObligations) || 0,
    savingsGoalAmount: parseFloat(savingsGoal) || 0,
  };

  const { dailyBudget, disposableIncome } = calculateBudgetMetrics(previewSettings, transactions);

  const handleSave = async () => {
    const income = parseFloat(monthlyIncome);
    const goal = parseFloat(savingsGoal);
    const fixed = parseFloat(fixedObligations);

    if (income <= 0) {
      Alert.alert('Invalid Input', 'Monthly income must be greater than 0');
      return;
    }

    if (goal < 0 || goal > income) {
      Alert.alert(
        'Invalid Input',
        'Savings goal must be between 0 and monthly income'
      );
      return;
    }

    try {
      await updateSettings({
        monthlyIncome: income,
        fixedObligations: fixed,
        savingsGoalAmount: goal,
        notificationsEnabled,
      });

      Alert.alert('Configuration Saved', 'Your budget has been recalibrated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Factory Reset',
      'This will restore default budget values. Are you sure?',
      [
        { text: 'Cancel', onPress: () => { }, style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setMonthlyIncome(DEFAULTS.MONTHLY_INCOME.toString());
            setSavingsGoal(DEFAULTS.SAVINGS_GOAL.toString());
            await updateSettings({
              monthlyIncome: DEFAULTS.MONTHLY_INCOME,
              savingsGoalAmount: DEFAULTS.SAVINGS_GOAL,
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CONFIGURATION</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Smart Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.wizardCard}
            onPress={async () => {
              await updateSettings({ onboardingCompleted: false });
            }}
          >
            <Text style={styles.wizardTitle}>✨ Run Smart Setup</Text>
            <Text style={styles.wizardSubtitle}>Let the wizard calculate your budget for you.</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Financials */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>MANUAL OVERRIDE</Text>

          {/* Monthly Income Input */}
          <View style={styles.inputRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.rowLabel}>{settings.budgetMode === 'lumpsum' ? 'Total Safe Cash' : 'Monthly Income'}</Text>
              <Text style={styles.rowSubtext}>{settings.budgetMode === 'lumpsum' ? 'Corpus available' : 'Total earnings'}</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.numberInput}
                placeholder="0"
                placeholderTextColor="#D1D5DB"
                value={monthlyIncome}
                onChangeText={setMonthlyIncome}
                keyboardType="decimal-pad"
                editable={!isLoading}
                selectTextOnFocus
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Fixed Obligations Input */}
          <View style={styles.inputRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.rowLabel}>Fixed Obligations</Text>
              <Text style={styles.rowSubtext}>Rent, EMI, Bills</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.numberInput}
                placeholder="0"
                placeholderTextColor="#D1D5DB"
                value={fixedObligations}
                onChangeText={setFixedObligations}
                keyboardType="decimal-pad"
                editable={!isLoading}
                selectTextOnFocus
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Savings Goal Input */}
          <View style={styles.inputRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.rowLabel}>{settings.budgetMode === 'lumpsum' ? 'Safety Buffer' : 'Savings Goal'}</Text>
              <Text style={styles.rowSubtext}>{settings.budgetMode === 'lumpsum' ? 'Do not touch' : 'Target reserve'}</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.numberInput}
                placeholder="0"
                placeholderTextColor="#D1D5DB"
                value={savingsGoal}
                onChangeText={setSavingsGoal}
                keyboardType="decimal-pad"
                editable={!isLoading}
                selectTextOnFocus
              />
            </View>
          </View>
        </View>

        {/* Calculated Summary - "Receipt Style" */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>NET SPENDABLE</Text>
              <Text style={styles.summaryValue}>{formatCurrency(disposableIncome)}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRowHighlight}>
              <Text style={styles.summaryLabelHighlight}>DAILY BUDGET</Text>
              <Text style={styles.summaryValueHighlight}>{formatCurrency(dailyBudget)}</Text>
            </View>
          </View>
          <Text style={styles.summaryCaption}>
            Calculated based on {settings.budgetMode === 'lumpsum' ? 'remaining days' : '30-day standard cycle'}.
          </Text>
        </View>

        {/* Section: Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SYSTEM</Text>

          <View style={styles.inputRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.rowLabel}>Notifications</Text>
              <Text style={styles.rowSubtext}>Daily budget alerts</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              disabled={isLoading}
              trackColor={{ false: '#E5E7EB', true: '#000000' }}
              thumbColor={'#FFFFFF'}
              ios_backgroundColor="#E5E7EB"
            />
          </View>
        </View>

        {/* Section: Actions */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>SAVE CONFIGURATION</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resetButton, isLoading && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={isLoading}
          >
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>PAISOMETER v1.0.0</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 40,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: '#000000',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 2,
  },
  placeholder: {
    width: 40,
  },

  // Sections
  section: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 4,
  },
  labelContainer: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  rowSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
    justifyContent: 'flex-end',
  },
  currencyPrefix: {
    fontSize: 14,
    color: '#9CA3AF',
    marginRight: 4,
    fontWeight: '500',
  },
  numberInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'right',
    minWidth: 60,
    padding: 0,
  },

  // Summary Card (The Receipt)
  summaryContainer: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  summaryCard: {
    backgroundColor: '#F3F4F6', // Light grey receipt bg
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#D1D5DB', // Dashed line simulation via color/opacity
    marginBottom: 12,
    opacity: 0.5,
  },
  summaryRowHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabelHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
  },
  summaryValueHighlight: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  summaryCaption: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Actions
  actionSection: {
    paddingHorizontal: 24,
    marginTop: 40,
    gap: 16,
  },
  saveButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  resetButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#EF4444', // Keep red for danger, but keep it sharp
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E5E7EB',
    letterSpacing: 2,
  },
  wizardCard: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  wizardTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  wizardSubtitle: {
    color: '#9CA3AF', // Gray-400
    fontSize: 12,
  },
});