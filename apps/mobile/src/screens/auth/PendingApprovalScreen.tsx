import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { authService } from '../../services/auth/authService';
import { useLazyGetProfileQuery } from '../../services/api/authApi';

type Props = NativeStackScreenProps<any, 'PendingApproval'>;

export const PendingApprovalScreen: React.FC<Props> = () => {
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state) => state.auth);
  const [triggerGetProfile, { isLoading: isRefreshing }] = useLazyGetProfileQuery();

  const isBlocked = user?.status === 'BLOCKED' || (user?.status as string) === 'BLACK';

  const handleRefreshStatus = async () => {
    try {
      const res = await triggerGetProfile().unwrap();
      if (res?.user && token) {
        await authService.saveAuthSession(dispatch, token, res.user);
        if (res.user.status === 'APPROVED' || res.user.isVerified) {
          Alert.alert('Approved!', 'Your account status has been approved by Admin.');
        } else {
          Alert.alert('Status Check', `Current Status: ${res.user.status}`);
        }
      }
    } catch (err: any) {
      Alert.alert('Refresh Failed', err?.data?.error || err?.message || 'Failed to check status');
    }
  };

  const handleSignOut = () => {
    authService.logoutUser(dispatch);
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.icon}>{isBlocked ? '⛔' : '🔒'}</Text>
        <Text style={styles.title}>
          {isBlocked ? 'Account Blocked / Blacklisted' : 'Account Under Review'}
        </Text>

        <Text style={styles.description}>
          {isBlocked
            ? 'Your account has been restricted by Super Admin due to verification policy. Please contact support.'
            : `Hello ${user?.fullName || 'Vendor'}, your shop "${user?.business?.shopName || 'Profile'}" is undergoing Super Admin verification.`}
        </Text>

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Verification Status:</Text>
          <Text style={[styles.statusValue, isBlocked && styles.statusBlocked]}>
            {user?.status || 'PENDING'}
          </Text>
        </View>

        <Button
          title={isRefreshing ? "Checking Status..." : "Check Approval Status 🔄"}
          variant="primary"
          onPress={handleRefreshStatus}
          disabled={isRefreshing}
          style={styles.btn}
        />

        <View style={{ height: 12 }} />

        <Button title="Sign Out ➔" variant="secondary" onPress={handleSignOut} style={styles.btn} />
      </Card>
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
  card: {
    width: '100%',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusLabel: {
    color: '#64748b',
    fontSize: 12,
    marginRight: 8,
  },
  statusValue: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '800',
  },
  statusBlocked: {
    color: '#f43f5e',
  },
  btn: {
    width: '100%',
  },
});
