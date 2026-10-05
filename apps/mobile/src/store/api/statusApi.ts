import { baseApi } from './baseApi';

export interface StatusItem {
  id: string;
  userId: string;
  businessId: string;
  caption?: string;
  mediaUrl?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'TEXT';
  bgColor?: string;
  categories: string[];
  user?: {
    id: string;
    fullName: string;
    avatar?: string;
  };
  business?: {
    shopName: string;
    city: string;
    verificationTag: boolean;
  };
  viewsCount?: number;
  likesCount?: number;
  createdAt: string;
}

export const statusApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStatuses: builder.query<{ statuses: StatusItem[] }, { category?: string }>({
      query: (params) => ({
        url: '/status',
        params,
      }),
      providesTags: ['Status'],
    }),

    createStatus: builder.mutation<{ message: string; status: StatusItem }, Partial<StatusItem>>({
      query: (data) => ({
        url: '/status',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Status'],
    }),

    viewStatus: builder.mutation<{ message: string }, string>({
      query: (statusId) => ({
        url: `/status/${statusId}/view`,
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useGetStatusesQuery,
  useCreateStatusMutation,
  useViewStatusMutation,
} = statusApi;
