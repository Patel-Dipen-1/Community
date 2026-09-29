'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [activeCommunity, setActiveCommunity] = useState<'CLOTHING' | 'JEWELLERY'>('CLOTHING');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center font-extrabold text-white text-xl shadow-lg shadow-indigo-500/30">
            B2B
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight">Business Network</h1>
            <p className="text-xs text-slate-400">Multi-Community B2B Platform</p>
          </div>
        </div>

        {/* Community Switcher Dropdown */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
          <span className="text-xs text-slate-400 px-2 font-medium">Community:</span>
          <button
            onClick={() => setActiveCommunity('CLOTHING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCommunity === 'CLOTHING'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            👕 Clothing & Textiles
          </button>
          <button
            onClick={() => setActiveCommunity('JEWELLERY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCommunity === 'JEWELLERY'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            💎 Jewellery & Gems
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/products" className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-300 hover:text-white bg-indigo-600/20 border border-indigo-500/30 transition">
            👕 Clothing Directory
          </Link>
          <Link href="/groups" className="px-3.5 py-2 rounded-xl text-xs font-bold text-purple-300 hover:text-white bg-purple-600/20 border border-purple-500/30 transition">
            👥 Trade Groups
          </Link>
          <Link href="/profile" className="px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition">
            👤 My Profile
          </Link>
          <Link href="/login" className="px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition">
            Sign In
          </Link>
          <Link href="/register" className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-indigo-500/25 transition">
            Register Shop
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            Verified Business Community Engine
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            Connect Directly with Verified Manufacturers & Wholesalers
          </h2>
          <p className="text-slate-400 text-base md:text-lg mb-8">
            Isolated B2B networks for {activeCommunity === 'CLOTHING' ? 'Clothing & Textiles' : 'Jewellery & Gems'}. Discover suppliers, request quotes, and chat in real time.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/register" className="px-6 py-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 transition text-sm">
              Verify & Register Your Shop
            </Link>
            <Link href="/admin" className="px-6 py-3.5 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-sm">
              Super Admin Portal
            </Link>
          </div>
        </div>

        {/* Community Category Preview Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="glass-card glass-card-hover p-6 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl mb-4">
              {activeCommunity === 'CLOTHING' ? '👔' : '✨'}
            </div>
            <h3 className="font-bold text-lg text-white mb-2">
              {activeCommunity === 'CLOTHING' ? 'Men, Women & Kids Wear' : '1 Gram Jewellery'}
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              {activeCommunity === 'CLOTHING'
                ? 'Shirts, T-Shirts, Kurtis, Denim Jeans, Fabric Rolls from verified Surat & Ahmedabad manufacturers.'
                : 'High-margin 1 Gram Gold necklaces, chains, earrings, and bracelets with unique product codes.'}
            </p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mb-4">
              {activeCommunity === 'CLOTHING' ? '🧵' : '🔱'}
            </div>
            <h3 className="font-bold text-lg text-white mb-2">
              {activeCommunity === 'CLOTHING' ? 'Fabrics & Accessories' : 'Original Gold & Silver'}
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              {activeCommunity === 'CLOTHING'
                ? 'GSM ratings, weave specs, custom fabric dyeing, and bulk trims.'
                : 'Hallmarked 14K, 18K, 22K Gold and 925 Silver ornaments with purity certification.'}
            </p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mb-4">
              🛡️
            </div>
            <h3 className="font-bold text-lg text-white mb-2">Super Admin Verified</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Every business undergoes GST validation & mandatory 5 shop photo/video inspection before unlocking community access.
            </p>
          </div>
        </div>

        {/* Featured Shareable Product Demo Link */}
        <div className="glass-card p-6 rounded-2xl text-center border-indigo-500/30">
          <h4 className="font-bold text-white mb-2">Try Shareable Product Link & Lead Capture</h4>
          <p className="text-xs text-slate-400 mb-4">Click below to experience how guests click product links and connect via "Chat With Us":</p>
          <Link href="/product/demo-sku-001" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-xs transition shadow-lg shadow-indigo-500/20">
            View Shared Product Link Demo (`SKU-CLOTH-001`) ➔
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        © 2026 Multi-Community B2B Business Platform. All Rights Reserved.
      </footer>
    </div>
  );
}
