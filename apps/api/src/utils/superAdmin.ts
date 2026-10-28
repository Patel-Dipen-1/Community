/**
 * Utility functions for Super Admin identity checks.
 * Resolves the primary Super Admin email from environment variables (SUPER_ADMIN_EMAIL),
 * with backward-compatible fallback, eliminating hardcoded email strings across the codebase.
 */

export const getSuperAdminEmail = (): string => {
  return process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() || 'dnpatel2002@gmail.com';
};

export const isSuperAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === getSuperAdminEmail();
};

export const isSuperAdminUser = (user?: {
  email?: string | null;
  role?: string | null;
  business?: { assignedRole?: string | null } | null;
} | null): boolean => {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.business?.assignedRole === 'SUPER_ADMIN') return true;
  return isSuperAdminEmail(user.email);
};
