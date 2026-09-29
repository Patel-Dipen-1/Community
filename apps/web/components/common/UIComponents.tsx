'use client';

import React from 'react';

// ============================================================================
// 1. AVATAR COMPONENT (User, Group, Admin Crown & Status Dot)
// ============================================================================
interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'APPROVED' | 'PENDING' | 'REJECTED' | 'ONLINE' | 'OFFLINE';
  isAdmin?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = 'User',
  src,
  size = 'md',
  status,
  isAdmin = false,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  }[size];

  const initial = name ? name.charAt(0).toUpperCase() : 'U';

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <div
        className={`${sizeClasses} rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 border border-slate-700/80 text-white font-extrabold flex items-center justify-center shadow-sm overflow-hidden select-none`}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      {/* Admin Crown Indicator */}
      {isAdmin && (
        <span
          className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1 rounded-full border border-slate-900 shadow"
          title="Group Admin"
        >
          👑
        </span>
      )}

      {/* Status Dot */}
      {status && (
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
            status === 'APPROVED' || status === 'ONLINE'
              ? 'bg-emerald-400'
              : status === 'PENDING'
              ? 'bg-amber-400'
              : 'bg-slate-500'
          }`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
};

// ============================================================================
// 2. BADGE COMPONENT (Role, Status, Counts, Tags)
// ============================================================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple' | 'slate';
  size?: 'sm' | 'md';
  icon?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'emerald',
  size = 'md',
  icon,
  className = '',
}) => {
  const variantClasses = {
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
  }[variant];

  const sizeClasses = {
    sm: 'text-[9px] px-2 py-0.5 rounded-md',
    md: 'text-[11px] px-2.5 py-1 rounded-lg font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 border ${variantClasses} ${sizeClasses} select-none ${className}`}
    >
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

// ============================================================================
// 3. BUTTON COMPONENT (Primary, Secondary, Danger, Ghost)
// ============================================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const variantClasses = {
    primary:
      'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold shadow-md shadow-emerald-600/20 active:scale-[0.98]',
    secondary:
      'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-bold active:scale-[0.98]',
    danger:
      'bg-rose-600 hover:bg-rose-500 text-white font-extrabold shadow-md shadow-rose-600/20 active:scale-[0.98]',
    outline:
      'bg-transparent hover:bg-slate-800/60 text-slate-300 border border-slate-700 font-semibold',
    ghost:
      'bg-transparent hover:bg-slate-800/40 text-slate-400 hover:text-white font-medium',
  }[variant];

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 rounded-lg',
    md: 'text-xs px-4 py-2.5 rounded-xl',
    lg: 'text-sm px-6 py-3.5 rounded-xl font-bold',
  }[size];

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span>{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};

// ============================================================================
// 4. INPUT & SEARCH INPUT COMPONENTS
// ============================================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => (
  <div className="w-full space-y-1">
    {label && (
      <label className="block text-xs font-semibold text-slate-300">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs">
          {icon}
        </span>
      )}
      <input
        className={`w-full bg-slate-950 text-white text-xs ${
          icon ? 'pl-9' : 'pl-3.5'
        } pr-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 placeholder-slate-500 transition ${className}`}
        {...props}
      />
    </div>
    {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
  </div>
);

// ============================================================================
// 5. TOGGLE / SWITCH COMPONENT (WhatsApp Style Slider Switch)
// ============================================================================
interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => (
  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
    <div className="pr-3">
      <span className="font-bold text-white text-xs block">{label}</span>
      {description && (
        <span className="text-[10px] text-slate-400 block mt-0.5">
          {description}
        </span>
      )}
    </div>

    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-emerald-600' : 'bg-slate-800'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5 bg-white' : 'translate-x-0 bg-slate-400'
        }`}
      />
    </button>
  </div>
);

// ============================================================================
// 6. SKELETON LOADER COMPONENT (Placeholder Animated Shimmer)
// ============================================================================
export const SkeletonLoader: React.FC<{ count?: number; height?: string }> = ({
  count = 3,
  height = 'h-12',
}) => (
  <div className="space-y-3 w-full animate-pulse">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className={`w-full ${height} bg-slate-900 border border-slate-800 rounded-2xl`}
      />
    ))}
  </div>
);

// ============================================================================
// 7. CARD COMPONENT
// ============================================================================
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-lg ${
      onClick ? 'cursor-pointer hover:border-emerald-500/50 transition' : ''
    } ${className}`}
  >
    {children}
  </div>
);
