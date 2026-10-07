import { baseApi } from './baseApi';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  clientMessageId?: string;
  replyToId?: string;
  text?: string;
  productCode?: string;
  mediaUrl?: string;
  isForwarded: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  status?: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ';
  reactions?: Array<{ userId: string; emoji: string }>;
  replyToMessage?: ChatMessage;
  sender?: {
    id: string;
    fullName: string;
    avatar?: string;
  };
  createdAt: string;
}

export interface ConversationItem {
  id?: string;
  conversationId?: string;
  user1Id?: string;
  user2Id?: string;
  participant?: {
    userId: string;
    fullName: string;
    mobileNumber?: string;
    shopName?: string;
    assignedRole?: string;
    avatar?: string;
    city?: string;
    business?: {
      shopName: string;
      city: string;
      verificationTag: boolean;
    };
  };
  otherUser?: {
    id: string;
    fullName: string;
    avatar?: string;
    business?: {
      shopName: string;
      city: string;
      verificationTag: boolean;
    };
  };
  lastMessage?: ChatMessage;
  unreadCount?: number;
  updatedAt: string;
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query<{ conversations: ConversationItem[] }, void>({
      query: () => '/chat/conversations',
      providesTags: ['Conversations'],
    }),

    getMessages: builder.query<
      { messages: ChatMessage[]; hasMore: boolean },
      { conversationId: string; page?: number; limit?: number }
    >({
      query: ({ conversationId, page = 1, limit = 50 }) => ({
        url: `/chat/conversations/${conversationId}/messages`,
        params: { page, limit },
      }),
      providesTags: (result, error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
      ],
    }),

    sendMessage: builder.mutation<
      { message: ChatMessage },
      { conversationId?: string; recipientId?: string; text?: string; productCode?: string; mediaUrl?: string; replyToId?: string; clientMessageId?: string }
    >({
      async queryFn(arg, api, extraOptions, baseQuery) {
        let convId = arg.conversationId;

        // If conversationId is missing, initialize conversation first via POST /chat/conversations
        if (!convId) {
          if (!arg.recipientId) {
            return { error: { status: 400, data: { error: 'conversationId or recipientId is required' } } };
          }
          const convRes = await baseQuery({
            url: '/chat/conversations',
            method: 'POST',
            body: { recipientUserId: arg.recipientId },
          });
          if (convRes.error) return { error: convRes.error };
          const convData = convRes.data as any;
          convId = convData.conversationId || convData.id;
        }

        // Post to /chat/conversations/:id/messages (compatible with both hosted & local API)
        const sendRes = await baseQuery({
          url: `/chat/conversations/${convId}/messages`,
          method: 'POST',
          body: {
            text: arg.text,
            productCode: arg.productCode,
            mediaUrl: arg.mediaUrl,
            replyToId: arg.replyToId,
            clientMessageId: arg.clientMessageId,
          },
        });

        if (sendRes.error) {
          // Fallback to POST /chat/messages if needed
          const fallbackRes = await baseQuery({
            url: '/chat/messages',
            method: 'POST',
            body: { ...arg, conversationId: convId },
          });
          if (fallbackRes.error) return { error: fallbackRes.error };
          const fbData = fallbackRes.data as any;
          return { data: { message: fbData.message || fbData } };
        }

        const sendData = sendRes.data as any;
        return { data: { message: sendData.message || sendData } };
      },
      invalidatesTags: ['Conversations', 'Messages'],
    }),

    forwardMessage: builder.mutation<
      { success: boolean; forwardCount: number; isForwardedManyTimes: boolean; messages: ChatMessage[] },
      { messageId: string; messageType?: 'DIRECT' | 'GROUP'; targetConversationIds?: string[]; targetGroupIds?: string[] }
    >({
      query: (body) => ({
        url: '/chat/messages/forward',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversations', 'Messages'],
    }),

    toggleReaction: builder.mutation<
      { message: ChatMessage },
      { messageId: string; emoji: string }
    >({
      query: ({ messageId, emoji }) => ({
        url: `/chat/messages/${messageId}/react`,
        method: 'POST',
        body: { emoji },
      }),
      invalidatesTags: ['Messages'],
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

    starMessage: builder.mutation<{ message: string }, string>({
      query: (messageId) => ({
        url: `/chat/messages/${messageId}/star`,
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useForwardMessageMutation,
  useToggleReactionMutation,
  useStarMessageMutation,
  useMarkConversationAsReadMutation,
} = chatApi;
