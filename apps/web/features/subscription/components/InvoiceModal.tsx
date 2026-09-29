'use client';

import React from 'react';
import { PaymentTransactionData } from '../../../lib/redux/api/subscriptionApi';

interface InvoiceModalProps {
  transaction: PaymentTransactionData | null;
  onClose: () => void;
}

export function InvoiceModal({ transaction, onClose }: InvoiceModalProps) {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const subtotal = Math.round(transaction.amount / 1.18);
  const gstAmount = transaction.amount - subtotal;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200 print:p-0 print:bg-white">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6 text-slate-100 relative print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Invoice Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6 print:border-slate-300">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm">
                B2B
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">TAX INVOICE</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 print:text-slate-600">Multi-Community Business Platform Inc.</p>
          </div>

          <div className="text-right">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 print:bg-emerald-100 print:text-emerald-800">
              {transaction.status}
            </span>
            <p className="text-xs font-mono text-slate-400 mt-2 print:text-slate-700">{transaction.invoiceNumber}</p>
          </div>
        </div>

        {/* Invoice Details Grid */}
        <div className="grid grid-cols-2 gap-6 text-xs border-b border-slate-800 pb-6 print:border-slate-300">
          <div className="space-y-1">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] print:text-slate-500">Billed To (Customer):</p>
            <p className="font-bold text-sm text-white print:text-black">{transaction.user?.business?.shopName || transaction.user?.fullName || 'B2B Member'}</p>
            <p className="text-slate-300 print:text-slate-700">{transaction.user?.fullName}</p>
            <p className="text-slate-400 print:text-slate-600">Mobile: {transaction.user?.mobileNumber}</p>
            <p className="text-slate-400 print:text-slate-600">{transaction.user?.email}</p>
          </div>

          <div className="space-y-1 text-right">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] print:text-slate-500">Payment Metadata:</p>
            <p className="text-slate-300 print:text-slate-700">
              <strong>Invoice Date:</strong> {transaction.paymentDate ? new Date(transaction.paymentDate).toLocaleDateString() : new Date(transaction.createdAt).toLocaleDateString()}
            </p>
            <p className="text-slate-300 print:text-slate-700">
              <strong>Payment Cycle:</strong> {transaction.cycleName}
            </p>
            <p className="text-slate-300 print:text-slate-700">
              <strong>Payment Method:</strong> {transaction.paymentMethod}
            </p>
            {transaction.nextDueDate && (
              <p className="text-slate-300 print:text-slate-700">
                <strong>Next Due Date:</strong> {new Date(transaction.nextDueDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Invoice Item Table */}
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider print:border-slate-300 print:text-slate-600">
              <th className="py-2">Description</th>
              <th className="py-2">Cycle</th>
              <th className="py-2 text-right">Amount ({transaction.currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
            <tr>
              <td className="py-3 font-semibold text-white print:text-black">
                {transaction.planName} - Enterprise Business Membership
              </td>
              <td className="py-3 text-slate-400 print:text-slate-600">{transaction.cycleName}</td>
              <td className="py-3 text-right font-mono text-white print:text-black">₹{subtotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="py-2 text-slate-400 print:text-slate-600">GST (18% Integrated)</td>
              <td className="py-2 text-slate-400 print:text-slate-600">Tax</td>
              <td className="py-2 text-right font-mono text-slate-400 print:text-slate-700">₹{gstAmount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {/* Invoice Total */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 print:border-slate-300">
          <span className="text-xs text-slate-400 print:text-slate-600">Thank you for your business membership!</span>
          <div className="text-right">
            <span className="text-xs text-slate-400 print:text-slate-600 block">Total Amount Paid:</span>
            <span className="text-xl font-extrabold text-emerald-400 print:text-black font-mono">
              ₹{transaction.amount.toLocaleString()} {transaction.currency}
            </span>
          </div>
        </div>

        {/* Actions (Hidden in Print) */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg flex items-center gap-1.5"
          >
            <span>🖨️</span> Print / Download PDF Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
