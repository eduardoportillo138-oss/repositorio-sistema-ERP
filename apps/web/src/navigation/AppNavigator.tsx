// ============================================
// Navegación Principal
// ============================================

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ProductsScreen } from '../screens/ProductsScreen';
import { SalesScreen } from '../screens/SalesScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { UsersScreen } from '../screens/UsersScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textLight,
          headerStyle: { backgroundColor: colors.surface, elevation: 0 },
          headerTintColor: colors.text,
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Productos" component={ProductsScreen} />
        <Tab.Screen name="Ventas" component={SalesScreen} />
        <Tab.Screen name="Inventario" component={InventoryScreen} />
        <Tab.Screen name="Usuarios" component={UsersScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
