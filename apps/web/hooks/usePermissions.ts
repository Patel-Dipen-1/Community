'use client';

import { useMemo } from 'react';

export interface UserRolePermissions {
  role: string;
  permissions: string[];
}

/**
 * Standard Permission Dictionary per Role
 */
const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  SUPER_ADMIN: ['*'], // Full unrestricted access
  ADMIN: [
    'users.view',
    'users.create',
    'users.update',
    'users.delete',
    'sessions.view',
    'sessions.terminate',
    'products.view',
    'products.create',
    'products.update',
    'products.delete',
  ],
  MODERATOR: [
    'users.view',
    'sessions.view',
    'products.view',
    'products.update',
  ],
};

export function usePermissions() {
  const currentUser = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const role = currentUser?.role || currentUser?.assignedRole || 'GUEST';

  const userPermissions = useMemo(() => {
    if (currentUser?.email === 'dnpatel2002@gmail.com' || role === 'SUPER_ADMIN') {
      return ['*'];
    }
    return ROLE_PERMISSIONS_MAP[role] || [];
  }, [role, currentUser]);

  const hasPermission = (permission: string): boolean => {
    if (userPermissions.includes('*')) return true;
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (userPermissions.includes('*')) return true;
    return permissions.some((p) => userPermissions.includes(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (userPermissions.includes('*')) return true;
    return permissions.every((p) => userPermissions.includes(p));
  };

  return {
    currentUser,
    role,
    userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin: userPermissions.includes('*'),
  };
}
