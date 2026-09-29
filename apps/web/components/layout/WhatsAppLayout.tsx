'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useGetProfileQuery } from '../../lib/redux/api/authApi';
import { registerSocketUser } from '../../lib/socket/socketClient';
import { IncomingCallModal } from '../../features/chat/components/IncomingCallModal';
import { CallModal } from '../../features/chat/components/CallModal';

interface WhatsAppLayoutProps {
  children: React.ReactNode;
  activeTab?: 'chats' | 'groups' | 'communities' | 'contacts' | 'settings';
  unreadChatCount?: number;
}

export function WhatsAppLayout({ children, activeTab: propsActiveTab, unreadChatCount = 0 }: WhatsAppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: profileData } = useGetProfileQuery();
  const user = profileData?.user;

  // Active Accepted Incoming Call State (Receiver)
  const [activeReceiverCall, setActiveReceiverCall] = useState<{
    callId: string;
    callerUserId: string;
    callerName: string;
    callerShopName: string;
    callerMobile: string;
    callType: 'AUDIO' | 'VIDEO';
  } | null>(null);

  // Register Socket User on Mount / User change
  useEffect(() => {
    if (user?.id) {
      registerSocketUser(user.id);
    }
  }, [user?.id]);

  // Determine active nav tab from pathname if not explicitly passed
  let currentTab = propsActiveTab;
  if (!currentTab) {
    if (pathname.startsWith('/groups')) currentTab = 'groups';
    else if (pathname.startsWith('/profile')) currentTab = 'settings';
    else if (pathname.startsWith('/chat')) currentTab = 'chats';
    else currentTab = 'chats';
  }

  const handleSignOut = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    router.push('/login');
  };

  const isApproved = user?.status === 'APPROVED' || Boolean(user?.isVerified);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden">
      
      {/* DESKTOP / TABLET LEFT SIDEBAR NAVIGATION RAIL (WhatsApp Business Style) */}
      <aside className="hidden md:flex flex-col justify-between items-center w-16 lg:w-20 bg-slate-900 border-r border-slate-800/80 py-4 z-30 flex-shrink-0">
        
        {/* Top App Logo / Brand Badge */}
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/"
            className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-emerald-600/25 hover:scale-105 transition transform"
            title="B2B Network Home"
          >
            B2B
          </Link>

          {/* User Profile Avatar with Verification Indicator */}
          <Link
            href="/profile"
            className="relative group mt-1"
            title={user ? `${user.fullName} (${user.status})` : 'Profile'}
          >
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 text-slate-200 flex items-center justify-center font-bold text-sm group-hover:border-emerald-500 transition">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : '👤'}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                isApproved ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </Link>

          <hr className="w-8 border-slate-800 my-1" />

          {/* Primary Navigation Rail Actions */}
          <nav className="flex flex-col gap-3 items-center w-full px-2">
            
            {/* 💬 Chats Tab */}
            <Link
              href="/chat"
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all ${
                currentTab === 'chats'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Direct Messages / Chats"
            >
              <span>💬</span>
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {unreadChatCount}
                </span>
              )}
            </Link>

            {/* 👥 Groups Tab */}
            <Link
              href="/groups"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all ${
                currentTab === 'groups'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Trade Groups & Broadcasts"
            >
              <span>👥</span>
            </Link>

            {/* 🏷️ Communities Tab */}
            <Link
              href="/chat?tab=communities"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all ${
                currentTab === 'communities'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Communities & Categories"
            >
              <span>🏷️</span>
            </Link>

            {/* 🏬 Store Catalog Tab */}
            <Link
              href="/store"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all ${
                pathname.startsWith('/store')
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title="My Business Store / Catalog"
            >
              <span>🏬</span>
            </Link>

            {/* 🟢 WhatsApp Status / Stories Tab */}
            <Link
              href="/status"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all ${
                pathname.startsWith('/status')
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title="WhatsApp Trade Status Updates"
            >
              <span>🟢</span>
            </Link>

            {/* 📥 Product Inquiries / Callback Line Tab */}
            <Link
              href="/inquiries"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all ${
                pathname.startsWith('/inquiries')
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Product Callback Inquiries"
            >
              <span>📥</span>
            </Link>

            {/* 🔍 Directory / Contacts Tab */}
            <Link
              href="/chat?tab=contacts"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all ${
                currentTab === 'contacts'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
              title="Verified Vendors & Search"
            >
              <span>🔍</span>
            </Link>
          </nav>
        </div>

        {/* Bottom Rail Controls (Settings & Admin Link) */}
        <div className="flex flex-col items-center gap-3">
          {user?.email === 'dnpatel2002@gmail.com' || user?.role === 'SUPER_ADMIN' ? (
            <Link
              href="/admin"
              className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-lg hover:bg-purple-600 hover:text-white transition"
              title="Super Admin Control Panel"
            >
              🛡️
            </Link>
          ) : null}

          <Link
            href="/profile"
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg transition ${
              currentTab === 'settings'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Settings & Profile"
          >
            ⚙️
          </Link>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR (WhatsApp Business Style Mobile Nav) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 border-t border-slate-800/90 backdrop-blur-md px-2 py-1.5 flex items-center justify-around">
        <Link
          href="/chat"
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
            currentTab === 'chats' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <span className="text-lg">💬</span>
          <span className="text-[10px] mt-0.5">Chats</span>
        </Link>

        <Link
          href="/groups"
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
            currentTab === 'groups' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <span className="text-lg">👥</span>
          <span className="text-[10px] mt-0.5">Groups</span>
        </Link>

        <Link
          href="/status"
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
            pathname.startsWith('/status') ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <span className="text-lg">🟢</span>
          <span className="text-[10px] mt-0.5">Status</span>
        </Link>

        <Link
          href="/inquiries"
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
            pathname.startsWith('/inquiries') ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <span className="text-lg">📥</span>
          <span className="text-[10px] mt-0.5">Inquiries</span>
        </Link>

        <Link
          href="/store"
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
            pathname.startsWith('/store') ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <span className="text-lg">🏬</span>
          <span className="text-[10px] mt-0.5">Store</span>
        </Link>

        <Link
          href="/profile"
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
            currentTab === 'settings' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <span className="text-lg">⚙️</span>
          <span className="text-[10px] mt-0.5">Settings</span>
        </Link>
      </nav>

      {/* MAIN APPLICATION CONTAINER */}
      <main className="flex-1 min-w-0 flex flex-col pb-14 md:pb-0 h-screen overflow-hidden">
        {children}
      </main>

      {/* Global Incoming Call Alert Modal */}
      <IncomingCallModal
        onAccept={(callData) => {
          setActiveReceiverCall(callData);
        }}
      />

      {/* Receiver Active WebRTC Call Screen */}
      {activeReceiverCall && (
        <CallModal
          isOpen={Boolean(activeReceiverCall)}
          callType={activeReceiverCall.callType}
          role="RECEIVER"
          callId={activeReceiverCall.callId}
          targetUserId={activeReceiverCall.callerUserId}
          participant={{
            userId: activeReceiverCall.callerUserId,
            fullName: activeReceiverCall.callerName,
            mobileNumber: activeReceiverCall.callerMobile,
            shopName: activeReceiverCall.callerShopName,
          } as any}
          onEndCall={() => {
            setActiveReceiverCall(null);
          }}
        />
      )}
    </div>
  );
}
