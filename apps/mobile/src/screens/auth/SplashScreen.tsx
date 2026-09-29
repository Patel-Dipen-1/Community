import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppDispatch } from '../../hooks/useRedux';
import { authService } from '../../services/auth/authService';

export const SplashScreen: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    authService.initAuth(dispatch);
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <Text style={styles.logoText}>🛡️ B2B Platform</Text>
      <Text style={styles.subtitle}>Multi-Community Trade Network</Text>
      <ActivityIndicator size="large" color="#6366f1" style={styles.spinner} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 32,
  },
  spinner: {
    marginTop: 16,
  },
});
