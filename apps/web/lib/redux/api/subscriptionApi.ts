import { baseApi } from './baseApi';

export interface SystemSettings {
  id: string;
  subscriptionSystemEnabled: boolean;
  freeTrialEnabled: boolean;
  trialExpiryWarningEnabled: boolean;
  paymentEnabled: boolean;
  renewalEnabled: boolean;
  subscriptionNotificationsEnabled: boolean;
  subscriptionPopupEnabled: boolean;
  razorpayEnabled: boolean;
  stripeEnabled: boolean;
  manualPaymentEnabled: boolean;
  manualPaymentWhatsapp: string;
  updatedAt?: string;
}

export interface PaymentCycleData {
  id: string;
  name: string;
  durationMonths: number;
  amount: number;
  currency: string;
  description?: string | null;
  isActive: boolean;
}

export interface UserSubscriptionData {
  id: string;
  userId: string;
  planName: string;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
}

export interface PaymentTransactionData {
  id: string;
  userId: string;
  invoiceNumber: string;
  cycleId?: string | null;
  planName: string;
  cycleName: string;
  amount: number;
  currency: string;
  paymentMethod: 'RAZORPAY' | 'STRIPE' | 'MANUAL';
  status: 'COMPLETED' | 'PENDING_VERIFICATION' | 'DUE' | 'REJECTED';
  screenshotUrl?: string | null;
  transactionRef?: string | null;
  rejectionReason?: string | null;
  paymentDate?: string | null;
  nextDueDate?: string | null;
  createdAt: string;
  cycle?: PaymentCycleData | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
    mobileNumber: string;
    status: string;
    business?: { shopName: string } | null;
  };
}

export interface MySubscriptionResponse {
  subscription: UserSubscriptionData;
  settings: SystemSettings;
  transactions: PaymentTransactionData[];
  activeCycles: PaymentCycleData[];
}

export interface PaymentDashboardResponse {
  metrics: {
    totalUsers: number;
    completedUsersCount: number;
    dueUsersCount: number;
    pendingVerificationCount: number;
    totalRevenue: number;
  };
  transactions: PaymentTransactionData[];
  cycles: PaymentCycleData[];
}

export const subscriptionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubscriptionSettings: builder.query<SystemSettings, void>({
      query: () => '/subscription/settings',
      providesTags: ['SubscriptionSettings'],
    }),
    updateSubscriptionSettings: builder.mutation<{ message: string; settings: SystemSettings }, Partial<SystemSettings>>({
      query: (body) => ({
        url: '/subscription/admin/settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['SubscriptionSettings', 'UserSubscription'],
    }),
    getPaymentCycles: builder.query<PaymentCycleData[], { active?: boolean } | void>({
      query: (params) => ({
        url: '/subscription/cycles',
        params: params || {},
      }),
      providesTags: ['SubscriptionSettings'],
    }),
    createPaymentCycle: builder.mutation<{ message: string; cycle: PaymentCycleData }, Partial<PaymentCycleData>>({
      query: (body) => ({
        url: '/subscription/admin/cycles',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SubscriptionSettings', 'UserSubscription'],
    }),
    updatePaymentCycle: builder.mutation<{ message: string; cycle: PaymentCycleData }, { id: string; data: Partial<PaymentCycleData> }>({
      query: ({ id, data }) => ({
        url: `/subscription/admin/cycles/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['SubscriptionSettings', 'UserSubscription'],
    }),
    deletePaymentCycle: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/subscription/admin/cycles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SubscriptionSettings', 'UserSubscription'],
    }),
    getMySubscription: builder.query<MySubscriptionResponse, void>({
      query: () => '/subscription/me',
      providesTags: ['UserSubscription', 'SubscriptionSettings'],
    }),
    submitManualPayment: builder.mutation<{ message: string; transaction: PaymentTransactionData }, { screenshotUrl: string; cycleId?: string; amount?: number; cycleName?: string; transactionRef?: string }>({
      query: (body) => ({
        url: '/subscription/manual-payment',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserSubscription'],
    }),
    processSubscriptionPayment: builder.mutation<{ message: string; subscription: UserSubscriptionData; transaction: PaymentTransactionData }, { planName?: string; paymentMethod?: 'RAZORPAY' | 'STRIPE' | 'MANUAL'; cycleId?: string }>({
      query: (body) => ({
        url: '/subscription/subscribe',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserSubscription'],
    }),
    getPaymentDashboard: builder.query<PaymentDashboardResponse, { status?: string; search?: string } | void>({
      query: (params) => ({
        url: '/subscription/admin/payments',
        params: params || {},
      }),
      providesTags: ['UserSubscription', 'SubscriptionSettings'],
    }),
    approvePayment: builder.mutation<{ message: string; transaction: PaymentTransactionData }, { transactionId: string; cycleId?: string }>({
      query: (body) => ({
        url: '/subscription/admin/approve-payment',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserSubscription', 'SubscriptionSettings'],
    }),
    rejectPayment: builder.mutation<{ message: string; transaction: PaymentTransactionData }, { transactionId: string; reason?: string }>({
      query: (body) => ({
        url: '/subscription/admin/reject-payment',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserSubscription', 'SubscriptionSettings'],
    }),
  }),
});

export const {
  useGetSubscriptionSettingsQuery,
  useUpdateSubscriptionSettingsMutation,
  useGetPaymentCyclesQuery,
  useCreatePaymentCycleMutation,
  useUpdatePaymentCycleMutation,
  useDeletePaymentCycleMutation,
  useGetMySubscriptionQuery,
  useSubmitManualPaymentMutation,
  useProcessSubscriptionPaymentMutation,
  useGetPaymentDashboardQuery,
  useApprovePaymentMutation,
  useRejectPaymentMutation,
} = subscriptionApi;
