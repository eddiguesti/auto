/**
 * AppNavigator
 * Main navigation configuration with elegant memoir styling
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/theme';
import { IconHome, IconExplore, IconBook, IconUser, IconFeather } from '../components/Icons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import VoicePromptScreen from '../screens/VoicePromptScreen';
import ReviewScreen from '../screens/ReviewScreen';
import CelebrationScreen from '../screens/CelebrationScreen';
import TextInputScreen from '../screens/TextInputScreen';
import LoginScreen from '../screens/LoginScreen';
import CollectionsScreen from '../screens/CollectionsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HistoryScreen from '../screens/HistoryScreen';
import QuickMemoScreen from '../screens/QuickMemoScreen';
import MemoReviewScreen from '../screens/MemoReviewScreen';
import MemosListScreen from '../screens/MemosListScreen';
import ChaptersDashboardScreen from '../screens/ChaptersDashboardScreen';
import ChapterScreen from '../screens/ChapterScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 28 : 14,
          height: Platform.OS === 'ios' ? 85 : 68,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 4,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconFocused]}>
              <IconHome size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="MemoirTab"
        component={ChaptersDashboardScreen}
        options={{
          tabBarLabel: 'Memoir',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconFocused]}>
              <IconFeather size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Memories',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconFocused]}>
              <IconBook size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconFocused]}>
              <IconUser size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={MainTabs} />
      <Stack.Screen
        name="VoicePrompt"
        component={VoicePromptScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="Review"
        component={ReviewScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Celebration"
        component={CelebrationScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="TextInput"
        component={TextInputScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="QuickMemo"
        component={QuickMemoScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="MemoReview"
        component={MemoReviewScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="MemosList"
        component={MemosListScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Chapter"
        component={ChapterScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconFocused: {
    backgroundColor: colors.primaryMuted,
  },
});
