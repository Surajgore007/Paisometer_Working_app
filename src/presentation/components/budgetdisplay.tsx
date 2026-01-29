// Budget Display - Premium Black & White Glassmorphism

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { formatCurrency } from '../../core/utils';

interface BudgetDisplayProps {
  remaining: number;
  total: number;
  spent: number;
  remainingDays: number; // NEW
  isOverBudget: boolean;
}

export const BudgetDisplay: React.FC<BudgetDisplayProps> = ({
  remaining,
  total,
  spent,
  remainingDays,
  isOverBudget,
}) => {
  // Calculate percentage for the progress bar
  const spentPercentage =
    total > 0 ? Math.min((Math.abs(spent) / total) * 100, 100) : 0;

  // Status logic for color accents (kept minimal for B&W theme)
  const isWarning = !isOverBudget && remaining < total * 0.2;

  return (
    <View style={styles.container}>
      {/* Glassmorphism Card Strategy:
        1. High transparency white background
        2. Thin, crisp border
        3. Deep, soft shadow (ambient) + Sharp shadow (directional)
      */}
      <View style={styles.glassCard}>

        {/* Top Section: Status Label */}
        <View style={styles.headerRow}>
          <Text style={styles.label}>DAILY BUDGET</Text>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isOverBudget ? '#000' : isWarning ? '#666' : '#E5E5E5' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: isOverBudget || isWarning ? '#FFF' : '#000' }
            ]}>
              {isOverBudget ? 'EXCEEDED' : 'ACTIVE'}
            </Text>
          </View>
        </View>

        {/* Middle Section: Main Amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <Text style={styles.amount}>
            {Math.abs(remaining).toLocaleString('en-IN', {
              maximumFractionDigits: 0,
              minimumFractionDigits: 0,
            })}
          </Text>
        </View>
        <Text style={styles.subtext}>
          {isOverBudget ? 'over budget' : 'remaining today'}
        </Text>

        {/* Bottom Section: Progress & Stats */}
        <View style={styles.footer}>

          {/* Custom Minimalist Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${spentPercentage}%` }
                ]}
              />
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>SPENT</Text>
              <Text style={styles.statValue}>{formatCurrency(spent)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>TOTAL</Text>
              <Text style={styles.statValue}>{formatCurrency(total)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>DAYS LEFT</Text>
              <Text style={styles.statValue}>{remainingDays}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 16,
    // Ensure the shadow isn't cut off
    overflow: 'visible',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)', // Ultra subtle border
    padding: 24,
    // Premium Shadow Setup for Depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 16,
    },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align currency symbol to top of number
    justifyContent: 'center',
    marginBottom: 4,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '400',
    color: '#AAAAAA',
    marginTop: 8, // Optical alignment
    marginRight: 6,
  },
  amount: {
    fontSize: 64,
    fontWeight: '300', // Apple style thin/light weight
    color: '#000000',
    letterSpacing: -2.5,
    lineHeight: 70,
  },
  subtext: {
    textAlign: 'center',
    fontSize: 15,
    color: '#666666',
    fontWeight: '400',
    marginBottom: 36,
    letterSpacing: 0.2,
  },
  footer: {
    gap: 24,
  },
  progressContainer: {
    gap: 8,
  },
  progressBarBg: {
    height: 4, // Thinner bar for elegance
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 100,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000000', // Pure black fill
    borderRadius: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999999',
    letterSpacing: 1,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
    letterSpacing: -0.5,
  },
});