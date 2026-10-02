'use client';

import React, { useState } from 'react';
import {
  useGetCustomRolesQuery,
  useGetPermissionsQuery,
  useCreateOrUpdateCustomRoleMutation,
  useSetUserPermissionOverrideMutation,
  useGetAdminUsersQuery,
} from '../../../lib/redux/api/adminApi';

export function AdminRolesPermissionsPanel() {
  const { data: rolesRes, isLoading: rolesLoading, refetch: refetchRoles } = useGetCustomRolesQuery();
  const { data: permsRes, isLoading: permsLoading } = useGetPermissionsQuery();

  const roles = rolesRes?.roles || [];
  const permissions = permsRes?.permissions || [];

  const [createRole] = useCreateOrUpdateCustomRoleMutation();
  const [setUserOverride] = useSetUserPermissionOverrideMutation();

  const [activeTab, setActiveTab] = useState<'ROLES_MATRIX' | 'USER_OVERRIDES'>('ROLES_MATRIX');

  // Role Creation Modal
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', key: '', description: '' });

  // User Overrides State
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const { data: usersData } = useGetAdminUsersQuery({ page: 1, limit: 10, search: searchUserQuery });
  const users = usersData?.users || usersData?.data || [];
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const [overrideForm, setOverrideForm] = useState({
    permissionKey: '',
    featureKey: 'general',
    isGranted: true,
  });

  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name || !newRole.key) return;
    try {
      await createRole({
        name: newRole.name,
        key: newRole.key.toUpperCase().replace(/\s+/g, '_'),
        description: newRole.description,
      }).unwrap();
      setShowCreateRoleModal(false);
      setNewRole({ name: '', key: '', description: '' });
      refetchRoles();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create role');
    }
  };

  const handleSetUserOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !overrideForm.permissionKey) return;
    try {
      await setUserOverride({
        userId: selectedUser.id,
        permissionKey: overrideForm.permissionKey,
        featureKey: overrideForm.featureKey || 'general',
        isGranted: overrideForm.isGranted,
      }).unwrap();
      alert(`Permission override updated for user ${selectedUser.fullName || selectedUser.email}`);
      setOverrideForm({ permissionKey: '', featureKey: 'general', isGranted: true });
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to set permission override');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>🛡️ Dynamic Roles & Permissions Engine</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Hierarchical authorization matrix: Role Permissions + Custom User Overrides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex text-xs font-semibold">
            <button
              onClick={() => setActiveTab('ROLES_MATRIX')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'ROLES_MATRIX'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Role Matrix
            </button>
            <button
              onClick={() => setActiveTab('USER_OVERRIDES')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'USER_OVERRIDES'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              User Overrides
            </button>
          </div>

          <button
            onClick={() => setShowCreateRoleModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            + Create Role
          </button>
        </div>
      </div>

      {activeTab === 'ROLES_MATRIX' ? (
        <div className="space-y-6">
          {/* Roles Summary Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {roles.map((role: any) => (
              <div
                key={role.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                    {role.key}
                  </span>
                  {role.isSystem && (
                    <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded">
                      SYSTEM
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{role.name}</p>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{role.description || 'No description'}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-2">
                  {role.rolePermissions?.length || 0} permissions active
                </p>
              </div>
            ))}
          </div>

          {/* Matrix Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Permission Authorization Matrix ({permissions.length} System Permissions)
              </h3>
              <span className="text-xs text-slate-400">Configured via backend roles engine</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/30 text-[11px] font-black uppercase text-slate-500">
                    <th className="p-3 pl-4 min-w-[200px]">Permission Key / Action</th>
                    <th className="p-3 min-w-[150px]">Module</th>
                    {roles.map((r: any) => (
                      <th key={r.id} className="p-3 text-center min-w-[100px]">
                        <span className="text-indigo-600 dark:text-indigo-400">{r.key}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {permissions.map((perm: any) => (
                    <tr key={perm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                      <td className="p-3 pl-4">
                        <p className="font-bold text-slate-900 dark:text-white">{perm.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{perm.key}</p>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] font-semibold">
                          {perm.module?.name || perm.action}
                        </span>
                      </td>

                      {roles.map((role: any) => {
                        const rp = role.rolePermissions?.find((x: any) => x.permissionId === perm.id);
                        const isGranted = !!rp?.isGranted;
                        const isSuperAdmin = role.key === 'SUPER_ADMIN';

                        return (
                          <td key={role.id} className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSuperAdmin || isGranted}
                              disabled
                              className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:opacity-75"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* USER SPECIFIC PERMISSION OVERRIDES TAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Select Target User</h3>
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {users.map((u: any) => (
                <div
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                    selectedUser?.id === u.id
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-slate-900 dark:text-white font-bold'
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold">{u.fullName || 'Unnamed User'}</p>
                  <p className="text-[10px] text-slate-400">{u.email}</p>
                  <span className="inline-block text-[9px] font-semibold text-indigo-500 mt-1 uppercase">
                    Role: {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              2. Assign Individual Override {selectedUser ? `for ${selectedUser.fullName || selectedUser.email}` : ''}
            </h3>

            {!selectedUser ? (
              <p className="text-xs text-slate-500 py-8 text-center">Select a user on the left to add a custom permission override.</p>
            ) : (
              <form onSubmit={handleSetUserOverride} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Select Permission to Override
                  </label>
                  <select
                    value={overrideForm.permissionKey}
                    onChange={(e) => setOverrideForm({ ...overrideForm, permissionKey: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">-- Choose Permission --</option>
                    {permissions.map((p: any) => (
                      <option key={p.id} value={p.key}>
                        {p.name} ({p.key})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Override Decision:</label>
                  <label className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="isGranted"
                      checked={overrideForm.isGranted === true}
                      onChange={() => setOverrideForm({ ...overrideForm, isGranted: true })}
                    />
                    Explicit GRANT
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-rose-600 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="isGranted"
                      checked={overrideForm.isGranted === false}
                      onChange={() => setOverrideForm({ ...overrideForm, isGranted: false })}
                    />
                    Explicit DENY
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Save Permission Override
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Custom Role */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create New Dynamic Role</h3>
            <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role Name</label>
                <input
                  type="text"
                  placeholder="e.g. Regional Manager"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Role Unique Key
                </label>
                <input
                  type="text"
                  placeholder="e.g. REGIONAL_MANAGER"
                  value={newRole.key}
                  onChange={(e) => setNewRole({ ...newRole, key: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  placeholder="Responsibilities & privileges of this role..."
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
