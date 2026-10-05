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
  status: 'SENT' | 'DELIVERED' | 'READ';
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
  id: string;
  user1Id: string;
  user2Id: string;
  otherUser: {
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
      query: (data) => ({
        url: '/chat/messages',
        method: 'POST',
        body: data,
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
  useToggleReactionMutation,
  useStarMessageMutation,
} = chatApi;
