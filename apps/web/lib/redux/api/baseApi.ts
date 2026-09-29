import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_CONFIG } from '../../api/config';

/**
 * Base RTK Query API Service
 * Centralizes authentication header injection & caching tag declarations.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_CONFIG.BASE_URL,
    prepareHeaders: (headers) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['VerificationQueue', 'Sessions', 'Users', 'Deletions', 'UserProfile', 'Conversations', 'Messages', 'Products', 'Groups', 'Inquiries', 'Status', 'SubscriptionSettings', 'UserSubscription'],
  endpoints: () => ({}),
});
