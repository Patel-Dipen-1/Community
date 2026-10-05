import { baseApi } from './baseApi';

export interface InquiryItem {
  id: string;
  senderId: string;
  receiverId: string;
  productId?: string;
  quantity: number;
  targetPrice?: number;
  message: string;
  status: 'PENDING' | 'QUOTED' | 'NEGOTIATING' | 'ACCEPTED' | 'REJECTED' | 'CLOSED';
  product?: {
    title: string;
    code: string;
    images: string[];
  };
  sender?: {
    shopName: string;
    city: string;
  };
  receiver?: {
    shopName: string;
    city: string;
  };
  createdAt: string;
}

export const inquiryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInquiries: builder.query<{ inquiries: InquiryItem[] }, { type?: 'sent' | 'received' }>({
      query: (params) => ({
        url: '/lead/inquiries',
        params,
      }),
      providesTags: ['Inquiries'],
    }),

    sendInquiry: builder.mutation<{ message: string; inquiry: InquiryItem }, Partial<InquiryItem>>({
      query: (data) => ({
        url: '/lead/inquiries',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Inquiries'],
    }),

    updateInquiryStatus: builder.mutation<
      { message: string; inquiry: InquiryItem },
      { id: string; status: InquiryItem['status'] }
    >({
      query: ({ id, status }) => ({
        url: `/lead/inquiries/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Inquiries'],
    }),
  }),
});

export const {
  useGetInquiriesQuery,
  useSendInquiryMutation,
  useUpdateInquiryStatusMutation,
} = inquiryApi;
