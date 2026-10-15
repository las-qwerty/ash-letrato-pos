import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './screens/LoginScreen';
import { PosScreen } from './screens/PosScreen';
import { useStore } from './store';

export default function App() {
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);

  return (
    <SafeAreaProvider>
      <StatusBar style={currentUser ? 'dark' : 'light'} />
      {currentUser ? (
        <PosScreen onSignOut={logout} />
      ) : (
        <LoginScreen />
      )}
    </SafeAreaProvider>
  );
}
