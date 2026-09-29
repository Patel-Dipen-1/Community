'use client';

import React, { useState } from 'react';
import {
  useGetPaymentCyclesQuery,
  useCreatePaymentCycleMutation,
  useUpdatePaymentCycleMutation,
  useDeletePaymentCycleMutation,
  PaymentCycleData,
} from '../../../lib/redux/api/subscriptionApi';

export function AdminCyclesManager() {
  const { data: cycles, isLoading, refetch } = useGetPaymentCyclesQuery();
  const [createCycle, { isLoading: isCreating }] = useCreatePaymentCycleMutation();
  const [updateCycle, { isLoading: isUpdating }] = useUpdatePaymentCycleMutation();
  const [deleteCycle, { isLoading: isDeleting }] = useDeletePaymentCycleMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<PaymentCycleData | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    durationMonths: 1,
    amount: 4999,
    currency: 'INR',
    description: '',
    isActive: true,
  });

  if (isLoading || !cycles) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading Dynamic Payment Cycles...</div>;
  }

  const handleOpenCreate = () => {
    setEditingCycle(null);
    setForm({
      name: '',
      durationMonths: 1,
      amount: 4999,
      currency: 'INR',
      description: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cycle: PaymentCycleData) => {
    setEditingCycle(cycle);
    setForm({
      name: cycle.name,
      durationMonths: cycle.durationMonths,
      amount: cycle.amount,
      currency: cycle.currency || 'INR',
      description: cycle.description || '',
      isActive: cycle.isActive,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (cycle: PaymentCycleData) => {
    try {
      await updateCycle({ id: cycle.id, data: { isActive: !cycle.isActive } }).unwrap();
      setMsg(`Cycle "${cycle.name}" is now ${!cycle.isActive ? 'ACTIVE' : 'DISABLED'}`);
      refetch();
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(`❌ ${err?.data?.error || err?.message || 'Failed to toggle cycle'}`);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleDelete = async (cycle: PaymentCycleData) => {
    if (!confirm(`Are you sure you want to delete payment cycle "${cycle.name}"?`)) return;

    try {
      await deleteCycle(cycle.id).unwrap();
      setMsg(`🗑️ Cycle "${cycle.name}" deleted successfully.`);
      refetch();
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(`❌ ${err?.data?.error || err?.message || 'Failed to delete'}`);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCycle) {
        await updateCycle({ id: editingCycle.id, data: form }).unwrap();
        setMsg(`🎉 Payment cycle "${form.name}" updated successfully!`);
      } else {
        await createCycle(form).unwrap();
        setMsg(`🎉 New Payment cycle "${form.name}" created successfully!`);
      }

      setIsModalOpen(false);
      refetch();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg(`❌ ${err?.data?.error || err?.message || 'Failed to save cycle'}`);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  return (
    <div className="glass-card p-6 rounded-2xl border-slate-800 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🔄</span>
            <h3 className="font-extrabold text-lg text-white">Dynamic Payment Cycles & Subscription Plans</h3>
          </div>
          <p className="text-xs text-slate-400">
            Create, edit, toggle, or delete subscription cycles (1 Month, 2 Months, 3 Months, 6 Months, 12 Months, etc.). Newly created active cycles instantly appear on user payment screens.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
        >
          <span>➕</span> Create New Payment Cycle
        </button>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Grid of Cycles Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cycles.map((c) => (
          <div
            key={c.id}
            className={`glass-card p-5 rounded-2xl border transition-all space-y-3 relative ${
              c.isActive ? 'border-indigo-500/40 bg-slate-900/60' : 'border-slate-800 opacity-60 bg-slate-950/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                c.isActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {c.isActive ? '✓ ACTIVE' : '✕ DISABLED'}
              </span>
              <span className="text-xs font-bold text-indigo-400">{c.durationMonths} Month(s)</span>
            </div>

            <div>
              <h4 className="font-extrabold text-base text-white">{c.name}</h4>
              <p className="text-xl font-extrabold text-emerald-400 font-mono mt-1">₹{c.amount.toLocaleString()}</p>
              {c.description && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{c.description}</p>}
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs gap-1">
              <button
                disabled={isUpdating}
                onClick={() => handleToggleActive(c)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                  c.isActive ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {c.isActive ? 'Disable' : 'Enable'}
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold"
                >
                  Edit
                </button>
                <button
                  disabled={isDeleting}
                  onClick={() => handleDelete(c)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white text-[10px] font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Form for Create / Edit Payment Cycle */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <form
            onSubmit={handleSubmitForm}
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 text-left"
          >
            <h3 className="font-extrabold text-lg text-white">
              {editingCycle ? 'Edit Payment Cycle Plan' : 'Create New Payment Cycle Plan'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cycle / Plan Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3 Months Plan, Quarterly B2B"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Duration (Months):</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={form.durationMonths}
                    onChange={(e) => setForm({ ...form, durationMonths: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Price Amount (INR):</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description (Features):</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Full enterprise membership access for 3 months"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cycleActiveCheckbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                />
                <label htmlFor="cycleActiveCheckbox" className="text-slate-300 font-semibold cursor-pointer">
                  Active (Visible on User Payment Screen)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg"
              >
                {editingCycle ? 'Save Changes' : 'Create Cycle Plan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
