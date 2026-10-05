import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useLoginMutation } from '../../services/api/authApi';
import { authService } from '../../services/auth/authService';
import { useAppDispatch } from '../../hooks/useRedux';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your Mobile/Email and Password.');
      return;
    }

    try {
      const response = await login({ username: username.trim(), password: password.trim() }).unwrap();
      await authService.saveAuthSession(dispatch, response.token, response.user);
      if (response.sessionWarning) {
        Alert.alert('Session Limit Notice', response.sessionWarning);
      }
    } catch (err: any) {
      console.error('Mobile login error:', err);
      const errorMsg =
        err?.data?.error ||
        err?.data?.message ||
        (typeof err?.error === 'string' ? err.error : null) ||
        err?.message ||
        'Unable to connect to server or invalid credentials. Please check connection and try again.';
      Alert.alert('Login Error', errorMsg);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back 👋</Text>
        <Text style={styles.subtitle}>Sign in to your B2B Business Account</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Mobile Number or Email"
          placeholder="e.g. 9876543210 or owner@example.com"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Input
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button
          title="Sign In ➔"
          onPress={handleLogin}
          loading={isLoading}
          style={styles.submitBtn}
        />

        <Button
          title="Create New Business Account"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
          style={styles.registerBtn}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#020617',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
  },
  form: {
    width: '100%',
  },
  submitBtn: {
    marginTop: 8,
  },
  registerBtn: {
    marginTop: 12,
  },
});
