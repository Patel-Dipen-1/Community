'use client';

import React from 'react';
import { useGetMySubscriptionQuery } from '../../../lib/redux/api/subscriptionApi';
import Link from 'next/link';

export function SubscriptionBanner() {
  const { data, isLoading } = useGetMySubscriptionQuery();

  if (isLoading || !data) return null;

  const { settings, subscription } = data;

  // RULE 1: If Subscription System is OFF -> Return NULL immediately (No Banner)
  if (!settings.subscriptionSystemEnabled) {
    return null;
  }

  // RULE 2: If Trial Expiry Warning is OFF -> Return NULL
  if (!settings.trialExpiryWarningEnabled) {
    return null;
  }

  const expiryTimestamp = subscription.status === 'TRIAL' ? subscription.trialEndsAt : subscription.currentPeriodEnd;
  if (!expiryTimestamp) return null;

  const expiryDate = new Date(expiryTimestamp);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const hoursLeft = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

  // Show banner if expiry is within 24 hours (1 day before) or if trial is active
  const isOneDayWarning = diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
  const isTrial = subscription.status === 'TRIAL' && diffMs > 0;

  if (!isOneDayWarning && !isTrial) {
    return null;
  }

  const timeStr = expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = expiryDate.toLocaleDateString();

  return (
    <div className={`px-4 py-2.5 shadow-lg flex items-center justify-between flex-wrap gap-2 text-xs font-semibold ${
      isOneDayWarning
        ? 'bg-gradient-to-r from-rose-600 via-amber-600 to-indigo-600 text-white animate-pulse'
        : 'bg-gradient-to-r from-amber-600 via-indigo-600 to-purple-600 text-white'
    }`}>
      <div className="flex items-center gap-2">
        <span className="text-base">{isOneDayWarning ? '🚨' : '⏳'}</span>
        <span>
          {isOneDayWarning ? (
            <>
              <strong className="font-bold text-rose-200">Pre-Expiry Alert:</strong> Your B2B Enterprise Subscription expires in <strong>{hoursLeft} hour(s)</strong> (on {dateStr} at {timeStr}). All sessions will be automatically logged out on expiry.
            </>
          ) : (
            <>
              <strong className="font-bold text-amber-200">Free Trial Active:</strong> Expiring on {dateStr} at {timeStr}.
            </>
          )}
        </span>
      </div>

      {settings.paymentEnabled && (
        <Link
          href="/subscription"
          className="px-3.5 py-1.5 bg-white text-slate-900 rounded-lg text-[11px] font-extrabold hover:bg-slate-100 transition shadow"
        >
          {isOneDayWarning ? '⚡ Renew Now Before 1 Day →' : 'Upgrade Plan →'}
        </Link>
      )}
    </div>
  );
}
