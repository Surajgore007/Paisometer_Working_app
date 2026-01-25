import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useStore } from './src/presentation/state/store';
import { RootNavigator } from './src/presentation/navigation/RootNavigator';

export default function App() {
  const { loadData } = useStore();

  // Load initial data when app starts
  useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <RootNavigator />
      <StatusBar style="auto" />
    </>
  );
}
