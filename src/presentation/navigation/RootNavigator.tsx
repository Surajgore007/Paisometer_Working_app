// src/presentation/navigation/RootNavigator.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, BarChart3, Plus, WalletCards, Settings } from 'lucide-react-native';

// Screens
import { TodayScreen } from '../screens/TodayScreen';
import { AddTransactionScreen } from '../screens/AddTransactionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { GoalScreen } from '../screens/GoalScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { WalletScreen } from '../screens/WalletScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Main Stack - Today
 */
const MainStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#FFFFFF' },
    }}
  >
    <Stack.Screen name="TodayScreen" component={TodayScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

/**
 * Goals Stack
 */
const GoalsStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#FFFFFF' },
    }}
  >
    <Stack.Screen name="GoalScreen" component={GoalScreen} />
  </Stack.Navigator>
);

// Placeholder for middle tab functionality
const AddPlaceholder = () => <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;

/**
 * Custom Tab Bar Button with "Hill" Curve Effect
 */
const CustomCenterButton = ({ children, onPress }: any) => (
  <View style={styles.centerContainer}>
    {/* The Curve/Hill Background */}
    <View style={styles.customCurve} />

    {/* The Floating Button */}
    <TouchableOpacity
      style={styles.floatingButton}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.buttonInner}>
        {children}
      </View>
    </TouchableOpacity>
  </View>
);

/**
 * Root Navigator
 */
export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigatorContent} />
        <Stack.Screen
          name="AddTransactionModal"
          component={AddTransactionScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

/**
 * Tab Navigator Content
 */
const TabNavigatorContent = () => {
  const insets = useSafeAreaInsets();
  // Dynamic Tab Bar Height based on Safe Area
  const tabBarHeight = Platform.OS === 'ios' ? 88 : 65 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight,
            paddingBottom: Platform.OS === 'ios' ? 25 : insets.bottom + 5
          }
        ],
      }}
    >
      {/* 1. LEFT TAB: TODAY */}
      <Tab.Screen
        name="TodayTab"
        component={MainStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <LayoutDashboard
                size={24}
                color={focused ? '#000000' : '#9CA3AF'}
                strokeWidth={focused ? 2.5 : 2}
              />
              <Text style={[styles.labelText, focused && styles.labelActive]}>
                TODAY
              </Text>
            </View>
          ),
        }}
      />

      {/* 2. LEFT-CENTER TAB: ANALYTICS */}
      <Tab.Screen
        name="AnalyticsTab"
        component={AnalyticsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <BarChart3
                size={24}
                color={focused ? '#000000' : '#9CA3AF'}
                strokeWidth={focused ? 2.5 : 2}
              />
              <Text style={[styles.labelText, focused && styles.labelActive]}>
                STATS
              </Text>
            </View>
          ),
        }}
      />

      {/* 3. CENTER TAB: ADD */}
      <Tab.Screen
        name="AddPlaceholder"
        component={AddPlaceholder}
        options={({ navigation }) => ({
          tabBarButton: (props) => (
            <CustomCenterButton
              {...props}
              onPress={() => navigation.navigate('AddTransactionModal')}
            >
              <Plus size={32} color="#FFFFFF" strokeWidth={2.5} />
            </CustomCenterButton>
          ),
        })}
      />

      {/* 4. RIGHT-CENTER TAB: WALLET */}
      <Tab.Screen
        name="WalletTab"
        component={WalletScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <WalletCards
                size={24}
                color={focused ? '#000000' : '#9CA3AF'}
                strokeWidth={focused ? 2.5 : 2}
              />
              <Text style={[styles.labelText, focused && styles.labelActive]}>
                WALLET
              </Text>
            </View>
          ),
          // Ensure label matches user expectation (Wallet, not "Waller")
        }}
      />

      {/* 5. RIGHT TAB: SETTINGS */}
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconContainer}>
              <Settings
                size={24}
                color={focused ? '#000000' : '#9CA3AF'}
                strokeWidth={focused ? 2.5 : 2}
              />
              <Text style={[styles.labelText, focused && styles.labelActive]}>
                MENU
              </Text>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Premium Soft Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 8,
  },

  // Icon Styling
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    top: Platform.OS === 'ios' ? 0 : 0, // Reset manual top adjust, rely on flex/padding
    height: '100%',
    paddingTop: 8,
  },
  labelText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  labelActive: {
    color: '#000000',
  },

  // Center Button Logic
  centerContainer: {
    width: 65,
    height: 75,
    top: -25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // The "Hill" Shape
  customCurve: {
    position: 'absolute',
    width: 80,
    height: 40,
    backgroundColor: '#FFFFFF',
    bottom: 10,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 0,
    zIndex: -1,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});