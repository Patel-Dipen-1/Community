'use client';

import React from 'react';

export function BusinessProfile({ id }: { id: string }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-6xl mx-auto space-y-8">
      {/* Header Profile Banner */}
      <div className="glass-card p-6 rounded-3xl border-indigo-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-2xl text-white shadow-xl shadow-indigo-500/20">
            RT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">Royal Textiles & Fashion Hub</h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                ✓ Verified Business
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Surat Textile Market, Gujarat • Clothing & Textiles Manufacturer</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="tel:+919876543210"
            className="px-4 py-2.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-2 transition"
          >
            📞 Direct Call
          </a>
          <a
            href="/chat"
            className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 text-xs flex items-center gap-2 hover:opacity-90 transition"
          >
            💬 In-App Chat
          </a>
        </div>
      </div>

      {/* SECTION 1: Hot Selling Items */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            🔥 Section 1: Hot Selling Items
          </h2>
          <span className="text-xs text-indigo-400 font-semibold cursor-pointer">View All ➔</span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-card glass-card-hover p-4 rounded-2xl">
            <img
              src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600"
              alt="Hot item"
              className="w-full h-48 object-cover rounded-xl mb-3"
            />
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">SKU-CLOTH-001</span>
              <span className="text-slate-400">MOQ: 50 pcs</span>
            </div>
            <h3 className="font-bold text-sm text-white">Cotton Printed Kurti Collection</h3>
            <p className="text-indigo-400 font-extrabold text-sm mt-1">₹350 / pc</p>
          </div>
        </div>
      </section>

      {/* SECTION 2: Catalogs & Collections */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            📚 Section 2: Catalogs & Collections
          </h2>
          <input
            type="text"
            placeholder="Search by Product Code (e.g. SKU-001)..."
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card glass-card-hover p-5 rounded-2xl flex gap-4">
            <img
              src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600"
              alt="Catalog Cover"
              className="w-28 h-28 object-cover rounded-xl"
            />
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs text-indigo-400 font-bold">CAT-SUMMER-2026</span>
                <h3 className="font-bold text-sm text-white">Summer Printed Cotton Catalogs</h3>
                <p className="text-xs text-slate-400 mt-1">12 Designs • MOQ 100 pcs</p>
              </div>
              <button className="self-start text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                Browse Full Catalog ➔
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Verified Shop Video & Photos */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          🏪 Section 3: Verified Shopfront Photos & Video Reel
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-card p-3 rounded-2xl">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600"
              alt="Shop Premises"
              className="w-full h-40 object-cover rounded-xl mb-2"
            />
            <p className="text-xs text-slate-400 text-center font-medium">Verification Photo: Main Shop Premises</p>
          </div>
          <div className="glass-card p-3 rounded-2xl">
            <img
              src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600"
              alt="Warehouse"
              className="w-full h-40 object-cover rounded-xl mb-2"
            />
            <p className="text-xs text-slate-400 text-center font-medium">Verification Photo: Stock & Warehouse</p>
          </div>
        </div>
      </section>

      {/* SECTION 4: Business Details & Verification Credentials */}
      <section className="glass-card p-6 rounded-3xl border-slate-800">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          📋 Section 4: Business Credentials & Address
        </h2>
        <div className="grid md:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">GST Tax Identification Number</span>
            <span className="font-mono text-white font-bold text-sm bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 inline-block">
              24AAAAA0000A1Z5
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Registered Address</span>
            <span className="text-white font-medium">102 Ring Road Textile Market, Surat, Gujarat - 395002</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Community Membership</span>
            <span className="text-indigo-400 font-bold">Clothing & Textiles (Manufacturer)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
