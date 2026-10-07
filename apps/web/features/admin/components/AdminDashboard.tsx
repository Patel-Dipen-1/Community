'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '../../../components/layout/AdminLayout';
import { UserCrudModule } from '../users/UserCrudModule';
import {
  useGetVerificationQueueQuery,
  useGetLiveSessionsQuery,
  useGetAdminUsersQuery,
  useGetDeletionRequestsQuery,
  useApproveVerificationMutation,
  useRejectVerificationMutation,
  useTerminateSessionMutation,
  useTerminateAllSessionsMutation,
  useDeleteAccountMutation,
  useCreateUserMutation,
  useUpdateUserMutation,
} from '../../../lib/redux/api/adminApi';
import {
  useGetGroupsQuery,
  useUpdateGroupCapacityMutation,
  useGetGlobalGroupCapacityQuery,
  useUpdateGlobalGroupCapacityMutation,
} from '../../../lib/redux/api/groupsApi';
import { AdminSubscriptionPanel } from '../../subscription/components/AdminSubscriptionPanel';
import { AdminPaymentPanel } from '../../subscription/components/AdminPaymentPanel';
import { AdminCategoryRequestsPanel } from './AdminCategoryRequestsPanel';
import { useGetCategoryRequestsQuery } from '../../../lib/redux/api/productsApi';
import { CategoryManagementModule } from '../categories/CategoryManagementModule';
import { AdminSystemSettingsPanel } from './AdminSystemSettingsPanel';
import { AdminDashboardOverview } from './AdminDashboardOverview';
import { AdminFeatureFlagsPanel } from './AdminFeatureFlagsPanel';
import { AdminRolesPermissionsPanel } from './AdminRolesPermissionsPanel';
import { AdminPlatformLimitsPanel } from './AdminPlatformLimitsPanel';
import { AdminAuditLogsPanel } from './AdminAuditLogsPanel';
import { AdminApiRouteFlagsPanel } from './AdminApiRouteFlagsPanel';
import { AdminBroadcastPanel } from './AdminBroadcastPanel';

const AVAILABLE_COMMUNITIES = [
  { id: 'clothing', label: 'Clothing', icon: '👕' },
  { id: 'jewellery', label: 'Jewellery', icon: '💎' },
  { id: 'electronics', label: 'Electronics', icon: '📱' },
  { id: 'footwear', label: 'Footwear', icon: '👟' },
  { id: 'textiles', label: 'Textiles', icon: '🧵' },
  { id: 'cosmetics', label: 'Cosmetics', icon: '💄' },
  { id: 'hardware', label: 'Hardware', icon: '🔧' },
];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<
    | 'OVERVIEW'
    | 'BROADCAST'
    | 'FEATURE_FLAGS'
    | 'API_ROUTES'
    | 'ROLES_PERMISSIONS'
    | 'LIMITS'
    | 'AUDIT_LOGS'
    | 'VERIFICATION'
    | 'SESSIONS'
    | 'USERS'
    | 'DELETIONS'
    | 'GROUPS'
    | 'SUBSCRIPTION'
    | 'PAYMENTS'
    | 'CATEGORY_REQUESTS'
    | 'CATEGORIES'
    | 'SYSTEM_SETTINGS'
  >('OVERVIEW');


  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Responsive Mobile Hamburger Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // User CRUD & Filter State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [viewingUser, setViewingUser] = useState<any | null>(null);

  // Super Admin Media Inspection Lightbox Modal State
  const [inspectingMedia, setInspectingMedia] = useState<{
    item: any;
    mediaList: any[];
    activeMediaIndex: number;
  } | null>(null);

  // Form State for Creating New User / Super Admin
  const [createUserForm, setCreateUserForm] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    role: 'WHOLESALER',
    status: 'APPROVED',
    isVerified: true,
    shopName: '',
    gstNumber: '',
    allowedCommunities: ['clothing'],
  });

  const toggleCreateCommunity = (slug: string) => {
    const current = createUserForm.allowedCommunities || [];
    if (current.includes(slug)) {
      if (current.length === 1) return;
      setCreateUserForm({
        ...createUserForm,
        allowedCommunities: current.filter((c) => c !== slug),
      });
    } else {
      setCreateUserForm({
        ...createUserForm,
        allowedCommunities: [...current, slug],
      });
    }
  };

  const toggleEditCommunity = (slug: string) => {
    if (!editingUser) return;
    const current = editingUser.allowedCommunities || [];
    if (current.includes(slug)) {
      if (current.length === 1) return;
      setEditingUser({
        ...editingUser,
        allowedCommunities: current.filter((c: string) => c !== slug),
      });
    } else {
      setEditingUser({
        ...editingUser,
        allowedCommunities: [...current, slug],
      });
    }
  };

  // Index pointer for inspecting unverified shops ONE BY ONE
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRole, setSelectedRole] = useState<'WHOLESALER' | 'MANUFACTURER' | 'DISTRIBUTOR' | 'RETAILER'>('WHOLESALER');

  // Strict Authentication Guard State
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Check Super Admin Credentials from localStorage
  useEffect(() => {
    try {
      const storedUserRaw = localStorage.getItem('auth_user');
      const token = localStorage.getItem('auth_token');

      if (storedUserRaw && token) {
        const storedUser = JSON.parse(storedUserRaw);
        setCurrentUserEmail(storedUser.email || null);
        if (storedUser.email === 'dnpatel2002@gmail.com' || storedUser.role === 'SUPER_ADMIN') {
          setIsSuperAdmin(true);
          return;
        }
      }
      setIsSuperAdmin(false);
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);

  // RTK Query Hooks (Auto-fetching, Auto-caching & Tag Invalidation)
  const { data: queueData, isLoading: isQueueLoading, refetch: refetchQueue } = useGetVerificationQueueQuery(undefined, { skip: !isSuperAdmin });
  const { data: sessionsData, isLoading: isSessionsLoading, refetch: refetchSessions } = useGetLiveSessionsQuery(undefined, { skip: !isSuperAdmin });
  const { data: usersData, isLoading: isUsersLoading, refetch: refetchUsers } = useGetAdminUsersQuery(undefined, { skip: !isSuperAdmin });
  const { data: deletionsData, isLoading: isDeletionsLoading, refetch: refetchDeletions } = useGetDeletionRequestsQuery(undefined, { skip: !isSuperAdmin });
  const { data: groupsData, refetch: refetchGroups } = useGetGroupsQuery(undefined, { skip: !isSuperAdmin });
  const { data: globalCapData, refetch: refetchGlobalCap } = useGetGlobalGroupCapacityQuery(undefined, { skip: !isSuperAdmin });
  const { data: categoryRequestsData } = useGetCategoryRequestsQuery({ status: 'PENDING' }, { skip: !isSuperAdmin });
  const pendingRequestsCount = categoryRequestsData?.length || 0;
  const [updateGroupCapacity] = useUpdateGroupCapacityMutation();
  const [updateGlobalCapacity, { isLoading: isSavingGlobalCap }] = useUpdateGlobalGroupCapacityMutation();

  const [globalCapacityLimit, setGlobalCapacityLimit] = useState(40);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [customCapInput, setCustomCapInput] = useState<number>(40);

  useEffect(() => {
    if (globalCapData?.maxCapacity) {
      setGlobalCapacityLimit(globalCapData.maxCapacity);
    }
  }, [globalCapData]);

  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [sessionPlatformFilter, setSessionPlatformFilter] = useState('ALL');

  const [approveVerification] = useApproveVerificationMutation();
  const [rejectVerification] = useRejectVerificationMutation();
  const [terminateSession] = useTerminateSessionMutation();
  const [terminateAllSessions, { isLoading: isTerminatingAll }] = useTerminateAllSessionsMutation();
  const [deleteAccount] = useDeleteAccountMutation();
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();

  const queue = queueData?.queue || [];
  const sessions = sessionsData?.sessions || [];
  const users = usersData?.users || [];
  const deletions = deletionsData?.requests || [];
  const loading = isSuperAdmin === null || isQueueLoading || isSessionsLoading || isUsersLoading || isDeletionsLoading;

  const handleRefreshAll = () => {
    refetchQueue();
    refetchSessions();
    refetchUsers();
    refetchDeletions();
  };

  const handleApprove = async (userId: string, shopName: string) => {
    try {
      await approveVerification({ userId, assignedRole: selectedRole, assignedCategory: 'Clothing' }).unwrap();
      setActionMsg(`✅ Approved "${shopName}" as ${selectedRole}! "Verified Business" tag granted.`);
      if (currentIndex >= queue.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      setTimeout(() => setActionMsg(null), 4000);
    } catch {
      setActionMsg('❌ Failed to approve registration');
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const handleReject = async (userId: string, shopName: string) => {
    try {
      await rejectVerification({ userId }).unwrap();
      setActionMsg(`❌ Rejected registration for "${shopName}".`);
      if (currentIndex >= queue.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      setTimeout(() => setActionMsg(null), 4000);
    } catch {
      setActionMsg('❌ Failed to reject registration');
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const handleTerminateSession = async (sessionId: string, shopName: string) => {
    try {
      const data = await terminateSession({ sessionId }).unwrap();
      if (data.error) {
        setActionMsg(`⚠️ ${data.error}`);
      } else {
        setActionMsg(`🚫 Terminated active device session for "${shopName}". Device logged out immediately.`);
        refetchSessions();
      }
      setTimeout(() => setActionMsg(null), 4000);
    } catch {
      setActionMsg('❌ Failed to terminate active session');
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const handleTerminateAllSessions = async () => {
    if (!confirm('Are you sure you want to terminate ALL active user sessions? Super Admin sessions will remain protected.')) {
      return;
    }
    try {
      const data = await terminateAllSessions().unwrap();
      if (data.error) {
        setActionMsg(`⚠️ ${data.error}`);
      } else {
        setActionMsg(`🚫 Terminated ${data.count || 0} active user sessions. Devices logged out immediately.`);
        refetchSessions();
      }
      setTimeout(() => setActionMsg(null), 4000);
    } catch {
      setActionMsg('❌ Failed to terminate active user sessions');
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const handleDeleteAccount = async (userId: string, shopName: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete account for "${shopName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const data = await deleteAccount(userId).unwrap();
      if (data.error) {
        setActionMsg(`⚠️ ${data.error}`);
      } else {
        setActionMsg(`🗑️ Account "${shopName}" permanently deleted from database.`);
      }
      setTimeout(() => setActionMsg(null), 4000);
    } catch {
      setActionMsg('❌ Failed to delete account');
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  // User CRUD Handlers
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await createUser(createUserForm).unwrap();
      if (data.error) {
        setActionMsg(`⚠️ ${data.error}`);
      } else {
        setActionMsg(`🎉 User "${createUserForm.fullName}" created successfully!`);
        setIsCreateUserModalOpen(false);
        setCreateUserForm({
          fullName: '',
          email: '',
          mobileNumber: '',
          password: '',
          role: 'WHOLESALER',
          status: 'APPROVED',
          isVerified: true,
          shopName: '',
          gstNumber: '',
          allowedCommunities: ['clothing'],
        });
      }
      setTimeout(() => setActionMsg(null), 4000);
    } catch {
      setActionMsg('❌ Error creating user');
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const data = await updateUser(editingUser).unwrap();
      if (data.error) {
        setActionMsg(`⚠️ ${data.error}`);
      } else {
        setActionMsg(`✅ User "${editingUser.fullName}" updated successfully!`);
        setEditingUser(null);
      }
      setTimeout(() => setActionMsg(null), 4000);
    } catch {
      setActionMsg('❌ Error updating user');
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setIsSuperAdmin(false);
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.fullName || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.mobileNumber || '').includes(userSearchQuery) ||
      (u.shopName || '').toLowerCase().includes(userSearchQuery.toLowerCase());

    const matchesRole = userRoleFilter === 'ALL' || u.assignedRole === userRoleFilter;

    return matchesSearch && matchesRole;
  });

  // Filtered Sessions List
  const filteredSessions = sessions.filter((s: any) => {
    const query = sessionSearchQuery.toLowerCase();
    const matchesSearch =
      (s.shopName || '').toLowerCase().includes(query) ||
      (s.ownerName || '').toLowerCase().includes(query) ||
      (s.email || '').toLowerCase().includes(query) ||
      (s.ipAddress || '').includes(query);

    const matchesPlatform = sessionPlatformFilter === 'ALL' || s.platform === sessionPlatformFilter;

    return matchesSearch && matchesPlatform;
  });

  // 🔒 STRICT SUPER ADMIN ACCESS DENIED SCREEN
  if (isSuperAdmin === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="glass-card max-w-md w-full p-8 rounded-3xl border-rose-500/40 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto mb-4 border border-rose-500/30">
            🔒
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2">Super Admin Privileges Required</h1>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            This control panel contains confidential user registrations, GST details, and shop inspection media. Only logged-in accounts with the <strong className="text-rose-400">SUPER_ADMIN</strong> role (<code className="text-indigo-400 font-mono">xyz@gmail.com</code>) are permitted access.
          </p>

          {currentUserEmail && (
            <div className="mb-6 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
              Currently signed in as: <span className="text-white font-bold">{currentUserEmail}</span> (Non-Admin)
            </div>
          )}

          <Link
            href="/login"
            className="inline-block w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-xl shadow-indigo-600/30 transition"
          >
            Sign In as Super Admin ➔
          </Link>
        </div>
      </div>
    );
  }

  const currentItem = queue[currentIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Admin Header & Responsive Mobile Navigation */}
      <header className="mb-8 pb-4 border-b border-slate-800">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
                🛡️ Super Admin Control Panel
              </h1>
              <span className="hidden sm:inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                SUPER_ADMIN
              </span>
            </div>
            <p className="text-[11px] md:text-xs text-slate-400 mt-1">
              Signed in as: <strong className="text-indigo-400">dnpatel2002@gmail.com</strong>
            </p>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800 flex-wrap">
              <button
                onClick={() => setActiveTab('OVERVIEW')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'OVERVIEW' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                📊 Dashboard
              </button>

              <button
                onClick={() => setActiveTab('BROADCAST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'BROADCAST' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-400 hover:text-white'
                }`}
              >
                📢 Broadcast Control
              </button>

              <button
                onClick={() => setActiveTab('FEATURE_FLAGS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'FEATURE_FLAGS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                🚩 Feature Flags
              </button>

              <button
                onClick={() => setActiveTab('API_ROUTES')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'API_ROUTES' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                🌐 API Routes & Limits
              </button>

              <button
                onClick={() => setActiveTab('ROLES_PERMISSIONS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'ROLES_PERMISSIONS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                🛡️ Roles & Perms
              </button>

              <button
                onClick={() => setActiveTab('LIMITS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'LIMITS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Limits
              </button>

              <button
                onClick={() => setActiveTab('AUDIT_LOGS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'AUDIT_LOGS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                📜 Audit Logs
              </button>

              <button
                onClick={() => setActiveTab('VERIFICATION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'VERIFICATION' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                📋 Queue ({queue.length})
              </button>

              <button
                onClick={() => setActiveTab('SESSIONS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'SESSIONS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                📡 Sessions ({sessions.length})
              </button>

              <button
                onClick={() => setActiveTab('USERS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'USERS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                👥 Users ({users.length})
              </button>

              <button
                onClick={() => setActiveTab('GROUPS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'GROUPS' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-300 hover:text-white'
                }`}
              >
                🛡️ Groups
              </button>

              <button
                onClick={() => setActiveTab('SUBSCRIPTION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'SUBSCRIPTION' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-300 hover:text-white'
                }`}
              >
                💳 Plans
              </button>

              <button
                onClick={() => setActiveTab('PAYMENTS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'PAYMENTS' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-300 hover:text-white'
                }`}
              >
                💰 Payments
              </button>

              <button
                onClick={() => setActiveTab('CATEGORIES')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'CATEGORIES' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-300 hover:text-white'
                }`}
              >
                ✨ Categories
              </button>

              <button
                onClick={() => setActiveTab('CATEGORY_REQUESTS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'CATEGORY_REQUESTS' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-400 hover:text-white'
                }`}
              >
                <span>🏷️ Category Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('SYSTEM_SETTINGS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'SYSTEM_SETTINGS' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-300 hover:text-white'
                }`}
              >
                ⚙️ Settings
              </button>

              <button
                onClick={() => setActiveTab('DELETIONS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'DELETIONS' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚠️ Deletions ({deletions.length})
              </button>
            </div>

            <button
              onClick={handleSignOut}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              Sign Out
            </button>
          </div>

          {/* Responsive Hamburger Burger Menu Toggle Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? (
                <span className="text-xl font-bold">✕</span>
              ) : (
                <span className="text-xl font-bold">☰</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Hamburger Dropdown Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 p-4 rounded-2xl bg-slate-900/95 border border-slate-800 space-y-2 shadow-2xl backdrop-blur-md">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Super Admin Menu
            </div>
            <button
              onClick={() => {
                setActiveTab('VERIFICATION');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex justify-between items-center ${activeTab === 'VERIFICATION' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <span>📋 Inspect Registrations</span>
              <span className="bg-slate-950/40 px-2 py-0.5 rounded-full text-[10px] font-bold">{queue.length}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('SESSIONS');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex justify-between items-center ${activeTab === 'SESSIONS' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <span>📡 Live Active Sessions</span>
              <span className="bg-slate-950/40 px-2 py-0.5 rounded-full text-[10px] font-bold">{sessions.length}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('USERS');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex justify-between items-center ${activeTab === 'USERS' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <span>👥 User Management & CRUD</span>
              <span className="bg-slate-950/40 px-2 py-0.5 rounded-full text-[10px] font-bold">{users.length}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('PAYMENTS');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex justify-between items-center ${activeTab === 'PAYMENTS' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <span>📊 Payment Engine & Invoices</span>
              <span className="bg-slate-950/40 px-2 py-0.5 rounded-full text-[10px] font-bold">MONEY</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('GROUPS');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex justify-between items-center ${activeTab === 'GROUPS' ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <span>🛡️ Group Rules & Capacity</span>
              <span className="bg-slate-950/40 px-2 py-0.5 rounded-full text-[10px] font-bold">{groupsData?.length || 0}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('SUBSCRIPTION');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex justify-between items-center ${activeTab === 'SUBSCRIPTION' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <span>💳 Subscription Rules</span>
              <span className="bg-slate-950/40 px-2 py-0.5 rounded-full text-[10px] font-bold">CONFIG</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('CATEGORIES');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex justify-between items-center ${activeTab === 'CATEGORIES' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <span>✨ Trade Categories (CRUD)</span>
              <span className="bg-slate-950/40 px-2 py-0.5 rounded-full text-[10px] font-bold">DYNAMIC</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('CATEGORY_REQUESTS');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex justify-between items-center ${activeTab === 'CATEGORY_REQUESTS' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:bg-slate-800'
                }`}
            >
              <span>🏷️ Custom Category Requests</span>
              <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black">{pendingRequestsCount}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('DELETIONS');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold flex justify-between items-center ${activeTab === 'DELETIONS' ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <span>⚠️ Deletion Requests</span>
              <span className="bg-slate-950/40 px-2 py-0.5 rounded-full text-[10px] font-bold">{deletions.length}</span>
            </button>

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-rose-400 transition"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {actionMsg && (
        <div className="mb-6 p-4 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-between shadow-lg">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Tab Views */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading Super Admin Data...</div>
      ) : (
        <>
          {/* TAB 0: Real-time Dashboard Overview & Telemetry */}
          {activeTab === 'OVERVIEW' && <AdminDashboardOverview onSelectTab={(tab) => setActiveTab(tab as any)} />}

          {/* TAB 0.05: Super Admin Broadcast Control Panel */}
          {activeTab === 'BROADCAST' && <AdminBroadcastPanel />}

          {/* TAB 0.1: Dynamic Feature Flags */}
          {activeTab === 'FEATURE_FLAGS' && <AdminFeatureFlagsPanel />}

          {/* TAB 0.15: API Route Flags & Rate Limits */}
          {activeTab === 'API_ROUTES' && <AdminApiRouteFlagsPanel />}

          {/* TAB 0.2: Dynamic Roles & Permissions Engine */}
          {activeTab === 'ROLES_PERMISSIONS' && <AdminRolesPermissionsPanel />}

          {/* TAB 0.3: Dynamic Limits & Resource Quotas */}
          {activeTab === 'LIMITS' && <AdminPlatformLimitsPanel />}

          {/* TAB 0.4: Audit Trail Logs */}
          {activeTab === 'AUDIT_LOGS' && <AdminAuditLogsPanel />}

          {/* TAB 10: Super Admin Dynamic System Settings & Feature Flags */}
          {activeTab === 'SYSTEM_SETTINGS' && <AdminSystemSettingsPanel />}

          {/* TAB 9: Dynamic Category & Community Management (CRUD) */}
          {activeTab === 'CATEGORIES' && <CategoryManagementModule />}


          {/* TAB 8: Custom Category & Specification Attribute Approvals */}
          {activeTab === 'CATEGORY_REQUESTS' && <AdminCategoryRequestsPanel />}

          {/* TAB 7: Super Admin Payment Engine & Invoices */}
          {activeTab === 'PAYMENTS' && <AdminPaymentPanel />}

          {/* TAB 6: Subscription System Engine Control Panel */}
          {activeTab === 'SUBSCRIPTION' && <AdminSubscriptionPanel />}


          {/* TAB 5: Group Member Rules & Super Admin Control Panel */}
          {activeTab === 'GROUPS' && (
            <div className="space-y-6">
              {/* Group Rules Configuration Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="glass-card p-5 rounded-2xl border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2 text-purple-400 font-bold text-sm">
                    <span>👥</span> Default Group Capacity Limit
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed mb-4">
                    Super Admin default limit per trade group. 41st person attempt is strictly blocked.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={2}
                      max={500}
                      value={globalCapacityLimit}
                      onChange={(e) => setGlobalCapacityLimit(Number(e.target.value))}
                      className="w-24 bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold text-center"
                    />
                    <button
                      disabled={isSavingGlobalCap}
                      onClick={async () => {
                        try {
                          const res = await updateGlobalCapacity({ maxCapacity: Number(globalCapacityLimit) }).unwrap();
                          setActionMsg(`✅ Super Admin set default group capacity to ${res.maxCapacity} members limit.`);
                          refetchGlobalCap();
                          refetchGroups();
                          setTimeout(() => setActionMsg(null), 4000);
                        } catch (err: any) {
                          setActionMsg(`❌ ${err?.data?.error || err?.message || 'Failed to save capacity rule'}`);
                          setTimeout(() => setActionMsg(null), 4000);
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-md disabled:opacity-50"
                    >
                      {isSavingGlobalCap ? 'Saving...' : 'Save Rule'}
                    </button>
                  </div>
                </div>

                <div className="glass-card p-5 rounded-2xl border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-sm">
                    <span>🛡️</span> Approved User Group Creation
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed mb-3">
                    Only Super Admin verified vendor accounts (<code className="text-emerald-300">status === APPROVED</code>) can create groups.
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                    ✓ RULE ACTIVE & ENFORCED
                  </div>
                </div>

                <div className="glass-card p-5 rounded-2xl border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold text-sm">
                    <span>🔒</span> Identity & Phone Masking Rule
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed mb-3">
                    Only Group Admin sees sender real names & mobile numbers. Regular members see anonymous protection.
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                    🔒 PRIVACY RULE ACTIVE
                  </div>
                </div>
              </div>

              {/* All Platform Groups Table */}
              <div className="glass-card p-6 rounded-2xl border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>💬</span> All Platform Trade Groups ({groupsData?.length || 0})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Super Admin can override max capacity for any individual group.
                    </p>
                  </div>
                  <Link
                    href="/groups"
                    className="px-3.5 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold transition shadow-md"
                  >
                    Open Groups Chat View ➔
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-3 px-4 font-semibold">Group Title</th>
                        <th className="py-3 px-4 font-semibold">Type</th>
                        <th className="py-3 px-4 font-semibold">Capacity Status</th>
                        <th className="py-3 px-4 font-semibold">Admin / Owner</th>
                        <th className="py-3 px-4 font-semibold">Posting Rule</th>
                        <th className="py-3 px-4 text-right font-semibold">Super Admin Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {groupsData?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            No trade groups created yet.
                          </td>
                        </tr>
                      ) : (
                        groupsData?.map((grp: any) => (
                          <tr key={grp.id} className="hover:bg-slate-900/60 transition">
                            <td className="py-3.5 px-4 font-bold text-white">
                              {grp.title}
                              <div className="text-[10px] text-slate-400 font-normal">
                                {grp.description || 'No description'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {grp.type}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${grp.isFull
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  }`}
                              >
                                👥 {grp.currentMembersCount} / {grp.maxCapacity} Members
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                              {grp.createdById}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">
                              {grp.onlyAdminCanPost ? '📢 Admin Broadcast' : '💬 Members Can Reply'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {editingGroupId === grp.id ? (
                                <div className="inline-flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-purple-500">
                                  <input
                                    type="number"
                                    min={2}
                                    max={500}
                                    value={customCapInput}
                                    onChange={(e) => setCustomCapInput(Number(e.target.value))}
                                    className="w-16 bg-slate-950 text-white text-xs px-2 py-1 rounded border border-slate-700 font-bold text-center"
                                  />
                                  <button
                                    onClick={async () => {
                                      try {
                                        await updateGroupCapacity({
                                          groupId: grp.id,
                                          maxCapacity: customCapInput,
                                        }).unwrap();
                                        setEditingGroupId(null);
                                        refetchGroups();
                                        setActionMsg(`✅ Set max capacity for "${grp.title}" to ${customCapInput} members.`);
                                        setTimeout(() => setActionMsg(null), 4000);
                                      } catch (err: any) {
                                        alert(err?.data?.error || 'Failed to update capacity');
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg font-bold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingGroupId(null)}
                                    className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingGroupId(grp.id);
                                    setCustomCapInput(grp.maxCapacity);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition"
                                >
                                  ⚙️ Edit Capacity
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {/* TAB 1: Registration Inspection Engine */}
          {activeTab === 'VERIFICATION' && (
            <div>
              {queue.length === 0 ? (
                <div className="glass-card p-12 text-center text-slate-400 rounded-3xl">
                  <div className="text-4xl mb-3">🎉</div>
                  <h3 className="text-lg font-bold text-white mb-1">Queue Clean!</h3>
                  <p className="text-xs">No pending unverified shop registrations in the database.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-slate-800 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Inspection Progress:</span>
                      <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold">
                        User {currentIndex + 1} of {queue.length}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex(currentIndex - 1)}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-700 font-semibold"
                      >
                        ◀ Prev
                      </button>
                      <button
                        disabled={currentIndex >= queue.length - 1}
                        onClick={() => setCurrentIndex(currentIndex + 1)}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-700 font-semibold"
                      >
                        Next ▶
                      </button>
                    </div>
                  </div>

                  {currentItem && (
                    <div className="glass-card p-6 md:p-8 rounded-3xl border-indigo-500/40 space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
                        <div>
                          <span className="text-[11px] font-bold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                            UNVERIFIED APPLICANT • PENDING REVIEW
                          </span>
                          <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-3">{currentItem.shopName}</h2>
                          <p className="text-xs text-slate-400 mt-1">
                            Owner: <strong className="text-white">{currentItem.ownerName}</strong> • Registered: {new Date(currentItem.registeredAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                          <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700">
                            <span className="text-xs text-slate-400 font-medium">Role:</span>
                            <select
                              value={selectedRole}
                              onChange={(e: any) => setSelectedRole(e.target.value)}
                              className="bg-slate-800 text-white text-xs font-bold rounded-lg px-2 py-1 focus:outline-none border border-slate-600"
                            >
                              <option value="WHOLESALER">WHOLESALER</option>
                              <option value="MANUFACTURER">MANUFACTURER</option>
                              <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                              <option value="RETAILER">RETAILER</option>
                            </select>
                          </div>

                          <button
                            onClick={() => handleApprove(currentItem.userId, currentItem.shopName)}
                            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition"
                          >
                            ✓ Approve & Grant Tag
                          </button>
                          <button
                            onClick={() => handleReject(currentItem.userId, currentItem.shopName)}
                            className="px-4 py-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs hover:bg-rose-500/30 transition"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 text-xs">
                        <div>
                          <span className="text-slate-500 block mb-1 font-medium">Contact Credentials</span>
                          <p className="text-slate-200 font-semibold">📞 {currentItem.mobileNumber}</p>
                          <p className="text-slate-200 font-semibold mt-1">✉️ {currentItem.email}</p>
                        </div>

                        <div>
                          <span className="text-slate-500 block mb-1 font-medium">GST Registration</span>
                          <p className="text-indigo-400 font-bold text-sm">
                            {currentItem.gstNumber !== 'N/A' ? currentItem.gstNumber : '⚠️ No GST Provided'}
                          </p>
                        </div>

                        <div>
                          <span className="text-slate-500 block mb-1 font-medium">Shop Location</span>
                          <p className="text-slate-200 leading-relaxed font-medium">📍 {currentItem.address}</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-800 pt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                            📸 User Inspection Photos & Videos ({currentItem.shopPhotosAndVideos?.length || 0}):
                          </h4>
                          <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                            Click any file to inspect high-res & approve/reject
                          </span>
                        </div>

                        {currentItem.shopPhotosAndVideos && currentItem.shopPhotosAndVideos.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {currentItem.shopPhotosAndVideos.map((m: any, idx: number) => {
                              const isVid = m.mediaType === 'VIDEO' || m.url?.match(/\.(mp4|webm|mov|avi)$/i) !== null;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setInspectingMedia({ item: currentItem, mediaList: currentItem.shopPhotosAndVideos, activeMediaIndex: idx })}
                                  className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 transition"
                                >
                                  {isVid ? (
                                    <video src={m.url} className="w-full h-36 object-cover pointer-events-none" />
                                  ) : (
                                    <img src={m.url} alt={`Inspection file ${idx + 1}`} className="w-full h-36 object-cover" />
                                  )}
                                  <div className="absolute top-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-bold text-slate-300">
                                    {isVid ? '🎥 Video' : '📷 Photo'} #{idx + 1}
                                  </div>
                                  <div className="absolute inset-0 bg-indigo-950/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                                    🔍 Inspect High-Res
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs text-center">
                            No custom photos uploaded. Super Admin will verify via physical GST address.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Live Active Sessions Monitor */}
          {activeTab === 'SESSIONS' && (
            <div className="space-y-6">
              {/* Telemetry Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-2xl border-indigo-500/30">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Active User Sessions
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-white">{sessions.length}</span>
                    <span className="text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                      PostgreSQL DB
                    </span>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-2xl border-purple-500/30">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Web Browser Sessions
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-purple-300">
                      {sessions.filter((s: any) => s.platform === 'WEB').length}
                    </span>
                    <span className="text-[10px] text-purple-400 font-bold">💻 Desktop & Web</span>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-2xl border-emerald-500/30">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Mobile App Sessions
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-emerald-300">
                      {sessions.filter((s: any) => s.platform !== 'WEB').length}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">📱 Android / iOS</span>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-2xl border-amber-500/30">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Super Admin Guard
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-amber-300">🛡️ Protected</span>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      EXCLUDED
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Table Card */}
              <div className="glass-card p-6 rounded-2xl border-indigo-500/30 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">📡 Live Active Device Sessions</h3>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold px-2.5 py-0.5 rounded-full">
                        SUPER ADMIN EXCLUDED
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Real-time active sessions in PostgreSQL DB. Super Admin sessions are automatically removed & protected.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleRefreshAll}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                    >
                      🔄 Refresh
                    </button>

                    <button
                      disabled={isTerminatingAll || sessions.length === 0}
                      onClick={handleTerminateAllSessions}
                      className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {isTerminatingAll ? 'Terminating...' : '⚠️ Terminate All User Sessions'}
                    </button>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={sessionSearchQuery}
                      onChange={(e) => setSessionSearchQuery(e.target.value)}
                      placeholder="🔍 Search active sessions by shop name, user, email, or IP address..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Platform:</span>
                    <select
                      value={sessionPlatformFilter}
                      onChange={(e) => setSessionPlatformFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs text-white font-bold rounded-xl px-3 py-2.5 focus:outline-none"
                    >
                      <option value="ALL">ALL PLATFORMS</option>
                      <option value="WEB">💻 Web Only</option>
                      <option value="ANDROID">📱 Android</option>
                      <option value="IOS">📱 iOS</option>
                    </select>
                  </div>
                </div>

                {/* Sessions Table */}
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/50">
                        <th className="py-3.5 px-4">Business / Shop</th>
                        <th className="py-3.5 px-4">User & Contact</th>
                        <th className="py-3.5 px-4">Community</th>
                        <th className="py-3.5 px-4">Platform & IP</th>
                        <th className="py-3.5 px-4">Last Active</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredSessions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500">
                            <div className="text-3xl mb-2">📡</div>
                            <p className="font-semibold text-slate-400 text-sm mb-1">No active user sessions found.</p>
                            <p className="text-[11px] text-slate-500">
                              {sessions.length === 0
                                ? 'No regular non-admin users currently have active device sessions.'
                                : 'No sessions match your search/filter criteria.'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredSessions.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-900/60 transition">
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-white block text-sm">{s.shopName}</span>
                              <span className="text-[10px] text-indigo-400 font-mono">ID: {s.id.slice(0, 8)}...</span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="text-slate-200 font-bold block">{s.ownerName}</span>
                              <span className="text-slate-400 font-mono text-[11px] block">{s.email}</span>
                              {s.mobileNumber && (
                                <span className="text-[10px] text-slate-500 block">📞 {s.mobileNumber}</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold capitalize inline-block">
                                {s.community}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-200 font-mono text-[11px] font-bold">
                                  {s.platform === 'WEB' ? '💻 WEB' : `📱 ${s.platform}`}
                                </span>
                              </div>
                              <span className="font-mono text-slate-400 text-[11px] block">🌐 {s.ipAddress}</span>
                            </td>

                            <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                              {s.lastActive ? new Date(s.lastActive).toLocaleString() : 'Just now'}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full text-[11px] border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                ACTIVE
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleTerminateSession(s.id, s.shopName || s.ownerName)}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition shadow"
                              >
                                🚫 Terminate Session
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Configuration-Driven User Management CRUD Engine */}
          {activeTab === 'USERS' && <UserCrudModule />}

          {/* TAB 4: Deletion Requests */}
          {activeTab === 'DELETIONS' && (
            <div className="glass-card p-6 rounded-2xl border-rose-500/30 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                ⚠️ Pending Account Deletion Requests ({deletions.length})
              </h3>
              {deletions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">No pending deletion requests.</div>
              ) : (
                <div className="space-y-3">
                  {deletions.map((d: any) => (
                    <div key={d.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold text-white">{d.shopName}</h4>
                        <p className="text-slate-400">Reason: {d.reason}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteAccount(d.userId, d.shopName)}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                      >
                        Confirm Delete Account
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
