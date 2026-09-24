// ============================================
// Punto de Entrada Web
// ============================================

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { AuthProvider } from './context/AuthContext';
import { AppNavigator } from './navigation/AppNavigator';

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <BrowserRouter>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </BrowserRouter>
    </SafeAreaProvider>
  );
};

export default App;
