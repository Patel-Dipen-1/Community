'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLoginMutation } from '../../../lib/redux/api/authApi';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const data = await login({ username, password }).unwrap();
      if (data.error) {
        setErrorMsg(data.error);
      } else {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));

        if (data.user.email === 'dnpatel2002@gmail.com' || data.user.role === 'SUPER_ADMIN') {
          router.push('/admin');
        } else {
          router.push('/profile');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.data?.error || 'Server error. Make sure backend API is running.');
    }
  };

  return (
    <div className="glass-card max-w-md w-full p-8 rounded-3xl border-indigo-500/30">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xl text-white mx-auto mb-3 shadow-lg shadow-indigo-500/30">
          B2B
        </div>
        <h1 className="text-2xl font-bold text-white">Sign In to Your Business</h1>
        <p className="text-xs text-slate-400 mt-1">Multi-Community Verified Network</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 font-semibold mb-1">Mobile Number or Email</label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. xyz@gmail.com or 9876543210"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition text-sm shadow-xl shadow-indigo-600/30 mt-2 disabled:opacity-50"
        >
          {isLoading ? 'Signing In...' : 'Sign In ➔'}
        </button>
      </form>

      <p className="text-center text-xs text-slate-400 mt-6">
        Don't have a business account?{' '}
        <Link href="/register" className="text-indigo-400 font-semibold hover:underline">
          Register Shop
        </Link>
      </p>
    </div>
  );
}
