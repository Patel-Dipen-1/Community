'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../lib/redux/store';
import { ToastProvider } from '../components/common/Toast';
import { SubscriptionPaywallGuard } from '../features/subscription/components/SubscriptionPaywallGuard';

/**
 * Next.js Client Provider Wrapper
 * Enables Redux state, RTK Query, Subscription Paywall Guard & Toast Notifications across all pages.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ToastProvider>
        <SubscriptionPaywallGuard>{children}</SubscriptionPaywallGuard>
      </ToastProvider>
    </Provider>
  );
}
