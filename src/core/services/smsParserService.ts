import { NativeModules, Platform, Alert } from 'react-native';

const { SMSParser } = NativeModules;

export interface PendingTransaction {
  type: 'expense' | 'income';
  amount: number;
  merchant: string;
  timestamp: number;
  note?: string;
}

export const SmsParserService = {
  /**
   * Asks the user to grant Notification Access.
   */
  requestPermission: () => {
    if (Platform.OS === 'android') {
      SMSParser.requestPermission();
    } else {
      Alert.alert('Not Supported', 'SMS Parsing is only available on Android.');
    }
  },

  /**
   * Checks if the Native Notification Listener is active.
   */
  isPermissionGranted: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      return await SMSParser.isPermissionGranted();
    } catch (error) {
      console.error('Failed to check permission status:', error);
      return false;
    }
  },

  /**
   * Starts the foreground service for continuous SMS parsing.
   * This is typically used on Android to keep the service alive in the background.
   */
  startForegroundService: () => {
    if (Platform.OS === 'android') {
      SMSParser.startForegroundService();
    } else {
      Alert.alert('Not Supported', 'Foreground service is only available on Android.');
    }
  },

  /**
   * Checks the native queue for any transactions.
   * FIX: Added JSON parsing to handle the raw string from NativeModules.
   */
  checkPendingTransactions: async (): Promise<PendingTransaction[]> => {
    if (Platform.OS !== 'android') return [];

    try {
      if (!SMSParser) {
        console.warn('[SmsParserService] Native module SMSParser not found');
        return [];
      }
      const result = await SMSParser.checkPendingTransactions();
      
      // Safety check: Native returns string, we must parse it to an array
      const transactions = typeof result === 'string' ? JSON.parse(result) : result;
      
      if (!Array.isArray(transactions)) return [];

      const normalized = transactions.map((t: any) => ({
        type: t.type || 'expense',
        amount: parseFloat(t.amount),
        merchant: t.merchant || 'Unknown',
        timestamp: t.timestamp || Date.now(),
        note: t.note || 'Auto-detected'
      }));

      if (normalized.length > 0) {
        console.log(`[SmsParserService] Pulled ${normalized.length} pending transaction(s) from native queue`);
      }

      return normalized;
    } catch (error) {
      console.error('Failed to fetch pending transactions:', error);
      return [];
    }
  }
};