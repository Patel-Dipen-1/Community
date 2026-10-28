import React from 'react';
import { LogBox } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { store } from './src/store/store';
import { RootNavigator } from './src/navigation/RootNavigator';

// Silence known Expo Go limitations and deprecation notices
LogBox.ignoreLogs([
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications: Android Push notifications',
  'SafeAreaView has been deprecated',
  '[expo-av]',
  '[SafeAudio]',
]);

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}
