import { baseApi } from './baseApi';

export interface CategoryConfigResponse {
  success: boolean;
  userId: string;
  fullName: string;
  isApproved: boolean;
  allowedCommunities: string[];
  canSelectCategory: boolean;
  defaultCategory: string;
}

export interface InquiryItem {
  id: string;
  businessId: string;
  creatorUserId?: string;
  visitorName: string;
  mobileNumber: string;
  productCode?: string;
  targetCategory: string;
  message?: string;
  quantity?: number;
  status: 'ACTIVE' | 'BATCH_FULL' | 'COMPLETED' | 'CLOSED' | string;
  batchSize: number;
  currentBatch: number;
  assignedUserIds: string[];
  clickedUserIds: string[];
  totalClicks: number;
  createdAt: string;
  assignedUsers?: { id: string; fullName: string; mobileNumber: string }[];
  clickedUsers?: { id: string; fullName: string; mobileNumber: string }[];
  business?: {
    id: string;
    shopName: string;
    assignedRole?: string;
    user?: {
      id: string;
      fullName: string;
      email: string;
      mobileNumber: string;
    };
  };
}

export interface MyInquiriesResponse {
  success: boolean;
  totalLeads: number;
  isSuperAdmin: boolean;
  userCategories?: string[];
  leads: InquiryItem[];
}

export const leadsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyCategoryConfig: builder.query<CategoryConfigResponse, void>({
      query: () => '/leads/my-category-config',
    }),

    captureLead: builder.mutation<
      any,
      {
        businessId?: string;
        visitorName: string;
        mobileNumber: string;
        productCode?: string;
        productId?: string;
        targetCategory?: string;
        message?: string;
        quantity?: number;
      }
    >({
      query: (body) => ({
        url: '/leads/capture-lead',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Inquiries'],
    }),

    clickLead: builder.mutation<any, string>({
      query: (id) => ({
        url: `/leads/${id}/click`,
        method: 'POST',
      }),
      invalidatesTags: ['Inquiries'],
    }),

    getMyInquiries: builder.query<MyInquiriesResponse, void>({
      query: () => '/leads/my-inquiries',
      providesTags: ['Inquiries'],
    }),

    adminManageLead: builder.mutation<any, { id: string; payload: any }>({
      query: ({ id, payload }) => ({
        url: `/leads/${id}/admin-manage`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['Inquiries'],
    }),

    updateInquiryStatus: builder.mutation<any, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/leads/${id}/admin-manage`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Inquiries'],
    }),
  }),
});

export const {
  useGetMyCategoryConfigQuery,
  useCaptureLeadMutation,
  useClickLeadMutation,
  useGetMyInquiriesQuery,
  useAdminManageLeadMutation,
  useUpdateInquiryStatusMutation,
} = leadsApi;
