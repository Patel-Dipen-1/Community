import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';
import { storeApi } from './api/storeApi';

/**
 * Global Redux Store Configuration
 */
export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    [storeApi.reducerPath]: storeApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware, storeApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
