import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { RootStackParamList } from '../types/navigation.types';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { authService } from '../services/auth/authService';
import { PushNotificationService } from '../services/notifications/pushNotificationService';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { PendingApprovalScreen } from '../screens/auth/PendingApprovalScreen';
import { ChatDetailScreen } from '../screens/ChatDetailScreen';
import { GroupDetailScreen } from '../screens/GroupDetailScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { CreateStatusScreen } from '../screens/CreateStatusScreen';
import { BroadcastListScreen } from '../screens/BroadcastListScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const prefix = Linking.createURL('/');

const linking: any = {
  prefixes: [prefix, 'b2bplatform://', 'https://b2bplatform.com'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: 'home',
          Chats: 'chats',
          Categories: 'categories',
          Store: 'store',
          Profile: 'profile',
        },
      },
      ProductDetail: 'product/:productId',
      ChatDetail: 'chat/:conversationId',
      Subscription: 'subscription',
    },
  },
};

export const RootNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    authService.initAuth(dispatch);
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && user?.isVerified) {
      PushNotificationService.registerForPushNotifications();
    }
  }, [isAuthenticated, user?.isVerified]);

  if (isLoading) {
    return <SplashScreen />;
  }

  const isBlocked = user?.status === 'BLOCKED' || (user?.status as string) === 'BLACK';
  const isApproved = user?.status === 'APPROVED' || user?.isVerified === true;
  const isBlockedOrPending = !user || isBlocked || !isApproved;

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : isBlockedOrPending ? (
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen as any} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="CreateStatus" component={CreateStatusScreen} />
            <Stack.Screen name="BroadcastList" component={BroadcastListScreen} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
