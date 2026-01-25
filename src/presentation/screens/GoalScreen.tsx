// Goal Screen - Premium Monochrome Savings Dashboard

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useStore } from '../state/store';
import { formatCurrency } from '../../core/utils';

export const GoalScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { settings } = useStore();

  const progressPercentage = settings.currentGoal 
    ? Math.min((settings.currentGoal.currentAmount / settings.currentGoal.targetAmount) * 100, 100)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {/* If navigated from tabs, this might be hidden or different, 
                but keeping it consistent with other screens */}
            {/* <Text style={styles.backIcon}>←</Text> */} 
          </TouchableOpacity>
          <Text style={styles.headerTitle}>TARGETS</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Main Content */}
        <View style={styles.mainSection}>
          <Text style={styles.pageHeroTitle}>Savings Goal</Text>
          <Text style={styles.pageHeroSubtitle}>
            Monthly accumulation target
          </Text>

          {settings.currentGoal ? (
            <View style={styles.goalCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <Text style={styles.goalLabel}>{settings.currentGoal.title.toUpperCase()}</Text>
                <Text style={styles.percentageText}>{Math.round(progressPercentage)}%</Text>
              </View>

              {/* Amount Display */}
              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <Text style={styles.currentAmount}>
                  {settings.currentGoal.currentAmount.toLocaleString()}
                </Text>
              </View>
              
              <Text style={styles.targetContext}>
                of {formatCurrency(settings.currentGoal.targetAmount)} target
              </Text>

              {/* Minimal Progress Bar */}
              <View style={styles.progressTrack}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${progressPercentage}%` }
                  ]} 
                />
              </View>
            </View>
          ) : (
            // Empty State
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>🎯</Text>
              </View>
              <Text style={styles.emptyTitle}>No Active Goal</Text>
              <Text style={styles.emptyText}>
                Set a savings target in Settings to track your progress here.
              </Text>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={styles.actionButtonText}>CONFIGURE GOAL</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Insight Section (formerly Pro Tip) */}
        <View style={styles.insightSection}>
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={styles.insightIcon}>💡</Text>
              <Text style={styles.insightTitle}>INSIGHT</Text>
            </View>
            <Text style={styles.insightText}>
              Your daily budget is automatically calculated based on your income minus this savings goal. Increasing your goal will tighten your daily spending limit.
            </Text>
          </View>
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
  },
  backButton: {
    width: 40,
  },
  backIcon: {
    fontSize: 24,
    color: '#000000',
    fontWeight: '300',
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
  
  mainSection: {
    paddingHorizontal: 24,
    marginTop: 12,
  },
  pageHeroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -1,
    marginBottom: 4,
  },
  pageHeroSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 32,
  },

  // Premium Goal Card
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '300',
    color: '#9CA3AF',
    marginTop: 8,
    marginRight: 6,
  },
  currentAmount: {
    fontSize: 64,
    fontWeight: '200', // Apple-style thin
    color: '#000000',
    letterSpacing: -2,
    lineHeight: 70,
  },
  targetContext: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 32,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000000', // Pure black fill
    borderRadius: 2,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    borderRadius: 24,
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 28,
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#000000',
    borderRadius: 100,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // Insight Section
  insightSection: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  insightCard: {
    padding: 20,
    backgroundColor: '#FAFAFA', // Very light grey
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#000000', // Black accent line
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
  },
  insightText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
});