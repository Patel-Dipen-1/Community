import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ENV_CONFIG } from '../../constants/config';
import { authStorage } from '../../services/storage/authStorage';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: ENV_CONFIG.API_BASE_URL,
    prepareHeaders: async (headers) => {
      const token = await authStorage.getToken();
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      headers.set('accept', 'application/json');
      return headers;
    },
  }),
  tagTypes: [
    'User',
    'Products',
    'Store',
    'Conversations',
    'Messages',
    'Groups',
    'Status',
    'Inquiries',
    'Subscriptions',
    'Communities',
    'Calls',
  ],
  endpoints: () => ({}),
});
