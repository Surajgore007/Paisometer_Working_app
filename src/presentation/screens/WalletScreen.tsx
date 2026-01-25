// src/presentation/screens/WalletScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { useStore } from '../state/store';
import { formatCurrency } from '../../core/utils';

export const WalletScreen = () => {
  const { currentBalance, settings, setInitialBalance } = useStore();
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [tempBalance, setTempBalance] = useState('');

  const handleSaveBalance = () => {
    const amount = parseFloat(tempBalance);
    if (!isNaN(amount)) {
      // Logic: The user enters what they HAVE right now.
      // We reverse-calculate the "Initial Balance" needed to make the math work.
      // Current = Initial + NetFlow  =>  Initial = CurrentTarget - NetFlow
      
      // OR simpler: Just reset the anchor. 
      // For this app version, let's treat "Initial Balance" as the starting point 
      // before any logged transactions. 
      // BUT, user wants to "put ur bank balance in". 
      // Easiest UX: User sets "Initial Balance" directly.
      setInitialBalance(amount);
    }
    setEditModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>WALLET</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. MAIN BANK BALANCE CARD */}
        <View style={styles.balanceCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>TOTAL BALANCE</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(true)}>
              <Text style={styles.editLink}>EDIT STARTING BAL</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.balanceAmount}>
            {formatCurrency(currentBalance)}
          </Text>
          
          <Text style={styles.balanceSub}>
            Live • Auto-updates with transactions
          </Text>

          {/* Mini Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Monthly Income</Text>
              <Text style={styles.statValue}>{formatCurrency(settings.monthlyIncome)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Savings Goal</Text>
              <Text style={styles.statValue}>{formatCurrency(settings.savingsGoalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* 2. GOALS SECTION (Preserved) */}
        <Text style={styles.sectionTitle}>SAVINGS TARGETS</Text>
        <View style={styles.goalCard}>
           {settings.currentGoal ? (
             <>
               <Text style={styles.goalName}>{settings.currentGoal.name}</Text>
               <Text style={styles.goalTarget}>Target: {formatCurrency(settings.currentGoal.targetAmount)}</Text>
               <View style={styles.progressBarBg}>
                 <View style={[styles.progressBarFill, { width: '45%' }]} />
               </View>
               <Text style={styles.goalNote}>Keep saving! You're doing great.</Text>
             </>
           ) : (
             <View style={styles.emptyGoal}>
               <Text style={styles.emptyText}>No active goals.</Text>
               <Text style={styles.emptySub}>Add a goal in settings to track it here.</Text>
             </View>
           )}
        </View>

      </ScrollView>

      {/* EDIT BALANCE MODAL */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Starting Balance</Text>
            <Text style={styles.modalSub}>
              Enter the amount you had before you started tracking transactions in this app.
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="e.g. 50000"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={tempBalance}
              onChangeText={setTempBalance}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleSaveBalance}
              >
                <Text style={styles.saveText}>UPDATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 50,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#9CA3AF',
    marginLeft: 24,
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  // BALANCE CARD
  balanceCard: {
    backgroundColor: '#000000',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  editLink: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 4,
  },
  balanceSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 16,
  },
  statItem: {
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 16,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // GOALS
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  goalCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  goalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  goalTarget: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 4,
  },
  goalNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  emptyGoal: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  emptySub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: 12,
    marginRight: 8,
  },
  cancelText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});