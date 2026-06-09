import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useRailSaathi } from '../context/RailSaathiContext';
import { SCREENS, COLORS } from '../constants';
import { Home, Clock, FileEdit, ShieldPlus, Building2 } from 'lucide-react-native';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import OTPVerifyScreen from '../screens/auth/OTPVerifyScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import HomeScreen from '../screens/home/HomeScreen';
import ComplaintsHomeScreen from '../screens/complaints/ComplaintsHomeScreen';
import SafetyHomeScreen from '../screens/safety/SafetyHomeScreen';
import StationNavigator from './StationNavigator';
import TatkalHomeScreen from '../screens/tatkal/TatkalHomeScreen';
import PreFillFormScreen from '../screens/tatkal/PreFillFormScreen';
import SurrenderMarketScreen from '../screens/tatkal/SurrenderMarketScreen';

// Helper to generate static placeholder screens for pending member integrations
const createPlaceholderScreen = (name) => {
  const FallbackComponent = () => {
    const { currentUser, activeJourney } = useRailSaathi();
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderTitle}>{name} Screen</Text>
        <Text style={styles.placeholderSub}>Member integration pending</Text>
        {currentUser && (
          <Text style={styles.infoText}>Passenger: {currentUser.name || currentUser.phone}</Text>
        )}
        {activeJourney && (
          <Text style={styles.infoText}>Active Train: {activeJourney.train_name}</Text>
        )}
      </View>
    );
  };
  FallbackComponent.displayName = `Fallback${name.replace(/\s+/g, '')}`;
  return FallbackComponent;
};

// TatkalScreen placeholder removed

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.brandOrange,
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarStyle: {
          height: 60,
          borderTopWidth: 1,
          borderTopColor: COLORS.dividerGrey,
          backgroundColor: COLORS.pageWhite,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          height: 56,
          backgroundColor: COLORS.pageWhite,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.dividerGrey,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: COLORS.textPrimary,
        },
        headerTitleAlign: 'center',
      }}
    >
      <Tab.Screen
        name={SCREENS.HOME}
        component={HomeScreen}
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={SCREENS.TATKAL}
        component={TatkalHomeScreen}
        options={{
          title: 'Tatkal Assist',
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={SCREENS.COMPLAINTS}
        component={ComplaintsHomeScreen}
        options={{
          title: 'Complaints',
          tabBarIcon: ({ color, size }) => <FileEdit color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={SCREENS.SAFETY}
        component={SafetyHomeScreen}
        options={{
          title: 'Safety & SOS',
          tabBarIcon: ({ color, size }) => <ShieldPlus color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={SCREENS.STATION}
        component={StationNavigator}
        options={{
          title: 'Station Guide',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Building2 color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, currentUser, loading } = useRailSaathi();

  if (loading && !token) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading RailSaathi...</Text>
      </View>
    );
  }

  const isLoggedIn = !!token;
  const isProfileIncomplete = isLoggedIn && currentUser && !currentUser.name;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <>
            <Stack.Screen name={SCREENS.LOGIN} component={LoginScreen} />
            <Stack.Screen name={SCREENS.OTP_VERIFY} component={OTPVerifyScreen} />
          </>
        ) : isProfileIncomplete ? (
          <Stack.Screen name={SCREENS.PROFILE_SETUP} component={ProfileSetupScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen 
              name="PreFillForm" 
              component={PreFillFormScreen} 
              options={{ 
                headerShown: true, 
                title: 'Book Tatkal Assist',
                headerTintColor: COLORS.brandOrange,
                headerTitleStyle: { color: COLORS.brandNavy, fontWeight: 'bold' }
              }} 
            />
            <Stack.Screen 
              name="SurrenderMarket" 
              component={SurrenderMarketScreen} 
              options={{ 
                headerShown: true, 
                title: 'Surrender Market',
                headerTintColor: COLORS.brandOrange,
                headerTitleStyle: { color: COLORS.brandNavy, fontWeight: 'bold' }
              }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#E8621A',
    fontWeight: '600',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A3557',
    marginBottom: 8,
  },
  placeholderSub: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#E8621A',
    fontWeight: '600',
    marginTop: 4,
  },
});
