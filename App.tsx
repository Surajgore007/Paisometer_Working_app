import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useStore } from './src/presentation/state/store';
import { RootNavigator } from './src/presentation/navigation/RootNavigator';
import { SmsParserService } from './src/core/services/smsParserService';

export default function App() {
  const { loadData } = useStore();
  const appState = useRef(AppState.currentState);

  // Load initial data when app starts & on resume
  useEffect(() => {
    loadData();
    SmsParserService.startForegroundService();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground - syncing data...');
        loadData();
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
      <StatusBar style="auto" />
    </>
  );
}
