'use client';

import React from 'react';
import { LoginForm } from '../../features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <LoginForm />
    </div>
  );
}
