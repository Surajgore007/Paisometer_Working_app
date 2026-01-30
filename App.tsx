import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform, PermissionsAndroid, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useStore } from './src/presentation/state/store';
import { RootNavigator } from './src/presentation/navigation/RootNavigator';
import { SmsParserService } from './src/core/services/smsParserService';
import { SmartOnboardingModal } from './src/presentation/components/SmartOnboardingModal';

export default function App() {
  const { loadData, settings } = useStore();
  const appState = useRef(AppState.currentState);

  // Load initial data & Check Permissions
  useEffect(() => {
    loadData();
    SmsParserService.startForegroundService();

    const checkPermissions = async () => {
      // 1. Android 13+ Notification Permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission denied');
        }
      }

      // 2. Notification Listener Permission (For SMS Reading)
      const isListenerGranted = await SmsParserService.isPermissionGranted();
      if (!isListenerGranted) {
        Alert.alert(
          "Permission Required",
          "Paisometer needs 'Notification Access' to track your spending automatically. Please enable it for Paisometer.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => SmsParserService.requestPermission() }
          ]
        );
      }
    };

    checkPermissions();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground - syncing data...');
        loadData();
        // Re-check permissions on resume (in case user just enabled them)
        checkPermissions();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
      <RootNavigator />
      {!settings.onboardingCompleted && <SmartOnboardingModal />}
      <StatusBar style="auto" />
    </>
  );
}
