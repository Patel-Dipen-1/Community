import { baseApi } from './baseApi';

export interface ChatParticipant {
  userId: string;
  fullName: string;
  mobileNumber: string;
  shopName: string;
  assignedRole: string;
  status: string;
  isVerified: boolean;
  allowedCommunities?: string[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  clientMessageId?: string;
  replyToId?: string;
  text?: string;
  productCode?: string;
  mediaUrl?: string;
  isForwarded?: boolean;
  forwardCount?: number;
  isForwardedManyTimes?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  status?: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
  replyToMessage?: {
    id: string;
    text?: string;
    senderId?: string;
    senderName?: string;
    productCode?: string;
    mediaUrl?: string;
  };
}

export interface ConversationItem {
  conversationId: string;
  participant: ChatParticipant;
  lastMessage: ChatMessage | null;
  updatedAt: string;
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchApprovedUsers: builder.query<{ success: boolean; users: ChatParticipant[] }, string>({
      query: (search) => `/chat/users/search?query=${encodeURIComponent(search)}`,
      providesTags: ['Users'],
    }),

    getConversations: builder.query<{ success: boolean; conversations: ConversationItem[] }, void>({
      query: () => '/chat/conversations',
      providesTags: ['Conversations'],
    }),

    getConversationMessages: builder.query<
      { success: boolean; conversationId: string; participant: ChatParticipant; messages: ChatMessage[] },
      string
    >({
      query: (conversationId) => `/chat/conversations/${conversationId}/messages`,
      providesTags: ['Messages'],
    }),

    markConversationAsRead: builder.mutation<
      { success: boolean; updatedCount?: number },
      string
    >({
      query: (conversationId) => ({
        url: `/chat/conversations/${conversationId}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['Conversations'],
    }),

    startConversation: builder.mutation<
      { success: boolean; conversationId: string; participant: ChatParticipant; error?: string },
      { recipientUserId?: string; recipientMobileNumber?: string }
    >({
      query: (body) => ({
        url: '/chat/conversations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversations'],
    }),

    sendMessage: builder.mutation<
      { success: boolean; message?: ChatMessage; error?: string },
      { conversationId: string; text?: string; productCode?: string; mediaUrl?: string; replyToId?: string }
    >({
      query: ({ conversationId, ...body }) => ({
        url: `/chat/conversations/${conversationId}/messages`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Messages', 'Conversations'],
    }),

    forwardMessage: builder.mutation<
      { success: boolean; forwardCount: number; isForwardedManyTimes: boolean; messages: ChatMessage[]; error?: string },
      { messageId: string; messageType?: 'DIRECT' | 'GROUP'; targetConversationIds?: string[]; targetGroupIds?: string[] }
    >({
      query: (body) => ({
        url: '/chat/messages/forward',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Messages', 'Conversations'],
    }),

    editMessage: builder.mutation<
      { success: boolean; message?: ChatMessage; error?: string },
      { messageId: string; text: string }
    >({
      query: ({ messageId, text }) => ({
        url: `/chat/messages/${messageId}`,
        method: 'PUT',
        body: { text },
      }),
      invalidatesTags: ['Messages', 'Conversations'],
    }),

    deleteMessage: builder.mutation<
      { success: boolean; message?: ChatMessage; error?: string },
      string
    >({
      query: (messageId) => ({
        url: `/chat/messages/${messageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Messages', 'Conversations'],
    }),
  }),
});

export const {
  useSearchApprovedUsersQuery,
  useGetConversationsQuery,
  useGetConversationMessagesQuery,
  useMarkConversationAsReadMutation,
  useStartConversationMutation,
  useSendMessageMutation,
  useForwardMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
} = chatApi;
