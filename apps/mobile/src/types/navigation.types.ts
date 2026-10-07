import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  PendingApproval: { message?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Chats: undefined;
  Categories: undefined;
  Store: { businessId?: string } | undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  PendingApproval: { message?: string } | undefined;
  ChatDetail: { conversationId: string; recipientName: string; recipientAvatar?: string; recipientId: string };
  GroupDetail: { groupId: string; groupTitle: string };
  ProductDetail: { productId: string };
  CreateStatus: undefined;
  BroadcastList: undefined;
  Subscription: undefined;
  Settings: undefined;
  Call: {
    recipientId: string;
    recipientName: string;
    recipientAvatar?: string;
    callType?: 'AUDIO' | 'VIDEO';
    isIncoming?: boolean;
  };
  CallHistory: undefined;
};

