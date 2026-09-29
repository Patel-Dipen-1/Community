import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation.types';
import { useAppSelector } from '../hooks/useRedux';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { PendingApprovalScreen } from '../screens/auth/PendingApprovalScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAppSelector(
    (state) => state.auth
  );

  if (isLoading) {
    return <SplashScreen />;
  }

  const isApproved = user?.status === 'APPROVED' || user?.isVerified === true;
  const isBlockedOrPending =
    user && (user.status !== 'APPROVED' || user.isVerified === false);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : isBlockedOrPending ? (
          <Stack.Screen
            name="Auth"
            component={PendingApprovalScreen as any}
          />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
