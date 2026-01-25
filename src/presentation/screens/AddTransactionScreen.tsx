// Add Transaction Screen - Premium Monochrome Financial Interface

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useStore } from '../state/store';
import { CategorySelector } from '../components/categoryselector';
import { Numpad } from '../components/numpad';
import { Category, TransactionType } from '../../core/types';

export const AddTransactionScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const { addTransaction, isLoading, error } = useStore();

  const [amount, setAmount] = useState('0');
  const [category, setCategory] = useState<Category>('food');
  const [type, setType] = useState<TransactionType>('expense');
  const [note, setNote] = useState('');

  const handleNumberPress = (num: string) => {
    if (amount === '0') {
      setAmount(num);
    } else if (amount.length < 9) { // Prevent overflow
      setAmount(amount + num);
    }
  };

  const handleBackspace = () => {
    if (amount.length === 1) {
      setAmount('0');
    } else {
      setAmount(amount.slice(0, -1));
    }
  };

  const handleDecimal = () => {
    if (!amount.includes('.')) {
      setAmount(amount + '.');
    }
  };

  const handleAddTransaction = async () => {
    const numAmount = parseFloat(amount);

    if (numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a value greater than 0');
      return;
    }

    try {
      await addTransaction(numAmount, category, type, note || undefined);
      // Optional: Add haptic feedback here if available
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', error || 'Failed to add transaction');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Row */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NEW ENTRY</Text>
        <View style={styles.placeholderIcon} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 1. Transaction Type Segmented Control */}
          <View style={styles.segmentContainer}>
            <View style={styles.segmentTrack}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  type === 'expense' && styles.segmentButtonActive,
                ]}
                onPress={() => setType('expense')}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.segmentText,
                    type === 'expense' && styles.segmentTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  type === 'income' && styles.segmentButtonActive,
                ]}
                onPress={() => setType('income')}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.segmentText,
                    type === 'income' && styles.segmentTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Amount Hero Display */}
          <View style={styles.amountHero}>
            <Text style={styles.currencySymbol}>₹</Text>
            <Text style={styles.amountText} numberOfLines={1} adjustsFontSizeToFit>
              {amount}
            </Text>
          </View>

          {/* 3. Category Selector */}
          <View style={styles.sectionSpacer}>
            <CategorySelector
              selectedCategory={category}
              onSelectCategory={setCategory}
            />
          </View>

          {/* 4. Note Input */}
          <View style={styles.noteContainer}>
            <Text style={styles.inputLabel}>NOTE</Text>
            <TextInput
              style={styles.minimalInput}
              placeholder="What is this for?"
              placeholderTextColor="#9CA3AF"
              value={note}
              onChangeText={setNote}
              maxLength={50}
              selectionColor="#000000"
            />
          </View>

          {/* 5. Numpad */}
          <View style={styles.numpadWrapper}>
            <Numpad
              onNumberPress={handleNumberPress}
              onBackspace={handleBackspace}
              onDecimal={handleDecimal}
            />
          </View>

          {/* Spacer for bottom button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Floating Bottom Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isLoading || parseFloat(amount) === 0) && styles.submitButtonDisabled,
            ]}
            onPress={handleAddTransaction}
            disabled={isLoading || parseFloat(amount) === 0}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                CONFIRM {type === 'income' ? 'INCOME' : 'EXPENSE'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  closeIcon: {
    fontSize: 20,
    color: '#000000',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1.5,
  },
  placeholderIcon: {
    width: 24,
  },
  scrollContent: {
    paddingTop: 20,
  },
  
  // Segmented Control
  segmentContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6', // Light gray track
    borderRadius: 100,
    padding: 4,
    width: '60%', // Compact width
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 100,
  },
  segmentButtonActive: {
    backgroundColor: '#000000', // Jet Black active
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Hero Amount
  amountHero: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingHorizontal: 24,
    height: 80, // Fixed height to prevent jump
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '300',
    color: '#9CA3AF',
    marginTop: 8,
    marginRight: 8,
  },
  amountText: {
    fontSize: 72,
    fontWeight: '200', // Ultra thin Apple style
    color: '#000000',
    letterSpacing: -2,
    textAlign: 'center',
  },

  sectionSpacer: {
    marginBottom: 16,
  },

  // Minimal Note Input
  noteContainer: {
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 8,
    letterSpacing: 1,
  },
  minimalInput: {
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },

  numpadWrapper: {
    marginTop: 10,
  },

  // Bottom Action Bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 0 : 24, // SafeArea handles iOS bottom
    paddingTop: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  submitButton: {
    backgroundColor: '#000000',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});