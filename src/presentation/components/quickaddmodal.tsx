// Quick Add Modal - main interface for adding transactions

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Category } from '../../core/types';
import { formatCurrency } from '../../core/utils';
import { Numpad } from './numpad';
import { CategorySelector } from './categoryselector';

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (amount: number, category: Category) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const [amount, setAmount] = useState('0');
  const [category, setCategory] = useState<Category>('food');

  const handleNumberPress = (num: string) => {
    if (amount === '0') {
      setAmount(num);
    } else {
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

  const handleAdd = () => {
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      onAdd(numAmount, category);
      setAmount('0');
      setCategory('food');
      onClose();
    }
  };

  const handleCancel = () => {
    setAmount('0');
    setCategory('food');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Add Expense</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Amount Display */}
          <View style={styles.amountContainer}>
            <Text style={styles.currency}>₹</Text>
            <Text style={styles.amount}>{amount}</Text>
          </View>

          {/* Category Selector */}
          <CategorySelector
            selectedCategory={category}
            onSelectCategory={setCategory}
          />

          {/* Numpad */}
          <Numpad
            onNumberPress={handleNumberPress}
            onBackspace={handleBackspace}
            onDecimal={handleDecimal}
          />

          {/* Add Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              parseFloat(amount) === 0 && styles.addButtonDisabled,
            ]}
            onPress={handleAdd}
            disabled={parseFloat(amount) === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>Add Transaction</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
  },
  placeholder: {
    width: 60,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  currency: {
    fontSize: 32,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 8,
  },
  amount: {
    fontSize: 56,
    fontWeight: '700',
    color: '#111111',
  },
  addButton: {
    backgroundColor: '#3F4B6E',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});