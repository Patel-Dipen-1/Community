import { baseApi } from './baseApi';

export interface SubscriptionInfo {
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  planName: string;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
}

export interface PaymentTransactionItem {
  id: string;
  invoiceNumber: string;
  cycleName: string;
  amount: number;
  currency: string;
  paymentMethod: 'RAZORPAY' | 'STRIPE' | 'MANUAL';
  status: 'COMPLETED' | 'PENDING_VERIFICATION' | 'DUE' | 'REJECTED';
  screenshotUrl?: string;
  transactionRef?: string;
  rejectionReason?: string;
  createdAt: string;
}

export const subscriptionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubscription: builder.query<{ subscription: SubscriptionInfo; transactions: PaymentTransactionItem[] }, void>({
      query: () => '/subscription/status',
      providesTags: ['Subscriptions'],
    }),

    submitPaymentProof: builder.mutation<
      { message: string; transaction: PaymentTransactionItem },
      { screenshotUrl: string; transactionRef?: string; cycleId?: string }
    >({
      query: (data) => ({
        url: '/subscription/submit-payment',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Subscriptions'],
    }),
  }),
});

export const {
  useGetSubscriptionQuery,
  useSubmitPaymentProofMutation,
} = subscriptionApi;
