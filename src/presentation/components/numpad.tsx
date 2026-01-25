// Numpad Component - Premium Soft-Touch Design

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface NumpadProps {
  onNumberPress: (num: string) => void;
  onBackspace: () => void;
  onDecimal: () => void;
}

export const Numpad: React.FC<NumpadProps> = ({
  onNumberPress,
  onBackspace,
  onDecimal,
}) => {
  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', '⌫'],
  ];

  const handlePress = (value: string) => {
    if (value === '⌫') {
      onBackspace();
    } else if (value === '.') {
      onDecimal();
    } else {
      onNumberPress(value);
    }
  };

  return (
    <View style={styles.container}>
      {buttons.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((button) => {
            const isAction = button === '⌫';
            const isDecimal = button === '.';
            
            return (
              <TouchableOpacity
                key={button}
                style={[
                  styles.button,
                  isAction && styles.actionButton
                ]}
                onPress={() => handlePress(button)}
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={[
                  styles.buttonInner,
                  isAction && styles.actionButtonInner
                ]}>
                  <Text
                    style={[
                      styles.numberText,
                      isAction && styles.actionText,
                      isDecimal && styles.decimalText
                    ]}
                  >
                    {button}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    width: '30%',
    aspectRatio: 1.5, // Rectangular "Squircle" shape like the reference
    borderRadius: 16,
    // Soft shadow for depth (Neumorphic-lite)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonInner: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)', // Very subtle border definition
  },
  actionButton: {
    shadowOpacity: 0.02,
    elevation: 1,
  },
  actionButtonInner: {
    backgroundColor: '#F9FAFB', // Slightly distinct background for backspace
    borderColor: 'rgba(0,0,0,0.04)',
  },
  numberText: {
    fontSize: 26,
    fontWeight: '500', // Crisp, medium weight
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  actionText: {
    fontSize: 22,
    color: '#4B5563',
    fontWeight: '400',
  },
  decimalText: {
    fontWeight: '800',
    fontSize: 28,
    marginTop: -4,
  },
});