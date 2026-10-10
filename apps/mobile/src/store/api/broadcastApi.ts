import { baseApi } from './baseApi';

export interface BroadcastListItem {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  recipientsCount?: number;
  recipients?: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      fullName: string;
      mobileNumber: string;
      business?: { shopName: string; city: string };
    };
  }>;
  lastSentAt?: string;
  createdAt: string;
}

export const broadcastApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBroadcastLists: builder.query<{ success: boolean; broadcastLists: BroadcastListItem[] }, void>({
      query: () => '/broadcasts',
      providesTags: ['Broadcasts'],
    }),

    getBroadcastDetails: builder.query<{ success: boolean; broadcastList: BroadcastListItem }, string>({
      query: (id) => `/broadcasts/${id}`,
      providesTags: (result, error, id) => [{ type: 'Broadcasts', id }],
    }),

    createBroadcastList: builder.mutation<
      { success: boolean; broadcastList: BroadcastListItem },
      { title: string; description?: string; recipientIds: string[] }
    >({
      query: (body) => ({
        url: '/broadcasts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Broadcasts'],
    }),

    sendBroadcastMessage: builder.mutation<
      { success: boolean; dispatchedCount: number; message: string },
      { id: string; text?: string; productCode?: string; mediaUrl?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/broadcasts/${id}/send`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Broadcasts', 'Conversations'],
    }),

    deleteBroadcastList: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/broadcasts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Broadcasts'],
    }),
  }),
});

export const {
  useGetBroadcastListsQuery,
  useGetBroadcastDetailsQuery,
  useCreateBroadcastListMutation,
  useSendBroadcastMessageMutation,
  useDeleteBroadcastListMutation,
} = broadcastApi;
