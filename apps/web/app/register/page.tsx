'use client';

import React from 'react';
import { RegisterForm } from '../../features/auth/components/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <RegisterForm />
    </div>
  );
}
