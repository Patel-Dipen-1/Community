import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { RootStackParamList } from '../types/navigation.types';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { authService } from '../services/auth/authService';
import { PushNotificationService } from '../services/notifications/pushNotificationService';
import { socketService } from '../services/socket/socketService';
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
import { CallScreen } from '../screens/CallScreen';
import { CallHistoryScreen } from '../screens/CallHistoryScreen';
import { InAppNotificationBanner } from '../components/common/InAppNotificationBanner';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

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

  const [bannerState, setBannerState] = useState<{
    visible: boolean;
    title: string;
    body: string;
    avatar?: string;
    conversationId: string;
    recipientId: string;
    recipientName: string;
  }>({
    visible: false,
    title: '',
    body: '',
    conversationId: '',
    recipientId: '',
    recipientName: '',
  });

  useEffect(() => {
    authService.initAuth(dispatch);
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && user?.isVerified) {
      PushNotificationService.registerForPushNotifications();

      // Listen for notification taps when user clicks on background push / system notification
      const notificationSubscription = PushNotificationService.addNotificationTapListener((response) => {
        const data = response.notification.request.content.data;
        if (data && (data.conversationId || data.recipientId) && navigationRef.isReady()) {
          navigationRef.navigate('ChatDetail', {
            conversationId: data.conversationId || '',
            recipientId: data.recipientId || data.senderId || '',
            recipientName: data.recipientName || data.senderName || 'Business Contact',
          });
        }
      });

      // Connect socket & listen for incoming calls and new messages globally
      socketService.connect();

      socketService.on('call:incoming', (callData: any) => {
        console.log('📞 GLOBAL INCOMING CALL RECEIVED:', callData);
        if (navigationRef.isReady()) {
          navigationRef.navigate('Call', {
            recipientId: callData.callerUserId,
            recipientName: callData.callerShopName || callData.callerName || 'Supplier',
            recipientAvatar: callData.callerAvatar,
            callType: callData.callType || 'AUDIO',
            isIncoming: true,
          });
        }
      });

      const handleGlobalMessageReceived = (msg: any) => {
        if (!msg) return;

        // Skip if message was sent by the current user
        if (msg.senderId === user.id) return;

        const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute() : null;
        const currentParams: any = currentRoute?.params || {};

        // If user is currently actively chatting with this person in ChatDetail, don't show popups
        if (
          currentRoute?.name === 'ChatDetail' &&
          (currentParams.conversationId === msg.conversationId || currentParams.recipientId === msg.senderId)
        ) {
          return;
        }

        const senderName = msg.sender?.fullName || msg.senderName || 'Business Contact';
        const snippet = msg.text || (msg.productCode ? `📦 Product [${msg.productCode}]` : '📷 Media Attachment');

        // 1. Present System Notification Popup with Sound
        PushNotificationService.displayLocalNotification(`💬 ${senderName}`, snippet, {
          conversationId: msg.conversationId,
          recipientId: msg.senderId,
          recipientName: senderName,
        });

        // 2. Show WhatsApp-style Floating In-App Banner Popup
        setBannerState({
          visible: true,
          title: senderName,
          body: snippet,
          avatar: msg.sender?.avatar,
          conversationId: msg.conversationId || '',
          recipientId: msg.senderId || '',
          recipientName: senderName,
        });
      };

      socketService.on('message:new', handleGlobalMessageReceived);
      socketService.on('receive_message', handleGlobalMessageReceived);

      return () => {
        socketService.off('call:incoming');
        socketService.off('message:new');
        socketService.off('receive_message');
        notificationSubscription.remove();
      };
    }
  }, [isAuthenticated, user?.isVerified, user?.id]);

  if (isLoading) {
    return <SplashScreen />;
  }

  const isBlocked = user?.status === 'BLOCKED' || (user?.status as string) === 'BLACK';
  const isApproved = user?.status === 'APPROVED' || user?.isVerified === true;
  const isBlockedOrPending = !user || isBlocked || !isApproved;

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      {/* Floating In-App Notification Banner */}
      <InAppNotificationBanner
        visible={bannerState.visible}
        title={bannerState.title}
        body={bannerState.body}
        avatar={bannerState.avatar}
        onPress={() => {
          if (navigationRef.isReady()) {
            navigationRef.navigate('ChatDetail', {
              conversationId: bannerState.conversationId,
              recipientId: bannerState.recipientId,
              recipientName: bannerState.recipientName,
            });
          }
        }}
        onDismiss={() => setBannerState((prev) => ({ ...prev, visible: false }))}
      />

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
            <Stack.Screen name="Call" component={CallScreen} />
            <Stack.Screen name="CallHistory" component={CallHistoryScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
