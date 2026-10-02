import { baseApi } from './baseApi';
import { ChatParticipant } from './chatApi';

export interface BroadcastListRecipient {
  userId: string;
  fullName: string;
  mobileNumber: string;
  shopName: string;
  assignedRole: string;
  isVerified: boolean;
}

export interface BroadcastMessageItem {
  id: string;
  broadcastListId: string;
  senderId: string;
  text?: string;
  productCode?: string;
  mediaUrl?: string;
  mediaType?: string;
  totalRecipients: number;
  pendingCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  status: 'SENDING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  createdAt: string;
}

export interface BroadcastListItem {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  recipientCount: number;
  recipients: BroadcastListRecipient[];
  lastMessage?: BroadcastMessageItem | null;
  createdAt: string;
  updatedAt: string;
}

export const broadcastApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserBroadcastLists: builder.query<{ success: boolean; broadcastLists: BroadcastListItem[] }, void>({
      query: () => '/broadcast/broadcasts',
      providesTags: ['BroadcastList'],
    }),

    getBroadcastDetails: builder.query<{ success: boolean; broadcastList: BroadcastListItem & { messages: BroadcastMessageItem[] } }, string>({
      query: (id) => `/broadcast/broadcasts/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'BroadcastList', id }],
    }),

    createBroadcastList: builder.mutation<
      { success: boolean; broadcastList?: BroadcastListItem; error?: string },
      { title: string; description?: string; recipientIds: string[] }
    >({
      query: (body) => ({
        url: '/broadcast/broadcasts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BroadcastList'],
    }),

    updateBroadcastList: builder.mutation<
      { success: boolean; broadcastList?: BroadcastListItem; error?: string },
      { id: string; title?: string; description?: string; recipientIds?: string[] }
    >({
      query: ({ id, ...body }) => ({
        url: `/broadcast/broadcasts/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => ['BroadcastList', { type: 'BroadcastList', id }],
    }),

    addBroadcastRecipients: builder.mutation<
      { success: boolean; broadcastList?: BroadcastListItem; error?: string },
      { id: string; recipientIds: string[] }
    >({
      query: ({ id, recipientIds }) => ({
        url: `/broadcast/broadcasts/${id}/recipients`,
        method: 'POST',
        body: { recipientIds },
      }),
      invalidatesTags: (_res, _err, { id }) => ['BroadcastList', { type: 'BroadcastList', id }],
    }),

    removeBroadcastRecipients: builder.mutation<
      { success: boolean; broadcastList?: BroadcastListItem; error?: string },
      { id: string; recipientIds: string[] }
    >({
      query: ({ id, recipientIds }) => ({
        url: `/broadcast/broadcasts/${id}/recipients`,
        method: 'DELETE',
        body: { recipientIds },
      }),
      invalidatesTags: (_res, _err, { id }) => ['BroadcastList', { type: 'BroadcastList', id }],
    }),

    duplicateBroadcastList: builder.mutation<
      { success: boolean; broadcastList?: BroadcastListItem; error?: string },
      string
    >({
      query: (id) => ({
        url: `/broadcast/broadcasts/${id}/duplicate`,
        method: 'POST',
      }),
      invalidatesTags: ['BroadcastList'],
    }),

    deleteBroadcastList: builder.mutation<
      { success: boolean; message?: string; error?: string },
      string
    >({
      query: (id) => ({
        url: `/broadcast/broadcasts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BroadcastList'],
    }),

    sendBroadcastMessage: builder.mutation<
      {
        success: boolean;
        broadcastMessageId?: string;
        totalRecipients?: number;
        status?: string;
        message?: string;
        error?: string;
      },
      {
        id: string;
        text?: string;
        productCode?: string;
        mediaUrl?: string;
        mediaType?: string;
        attachments?: { url: string; mediaType?: string }[];
        clientMessageId?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/broadcast/broadcasts/${id}/send`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => ['BroadcastList', { type: 'BroadcastList', id }, 'Conversations', 'Messages'],
    }),
  }),
});

export const {
  useGetUserBroadcastListsQuery,
  useGetBroadcastDetailsQuery,
  useCreateBroadcastListMutation,
  useUpdateBroadcastListMutation,
  useAddBroadcastRecipientsMutation,
  useRemoveBroadcastRecipientsMutation,
  useDuplicateBroadcastListMutation,
  useDeleteBroadcastListMutation,
  useSendBroadcastMessageMutation,
} = broadcastApi;
