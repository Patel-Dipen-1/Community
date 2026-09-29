'use client';

import React, { useState } from 'react';
import { LoadingState, EmptyState, ErrorState } from './StandardUIStates';

export interface ColumnConfig<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
}

export interface RowAction<T> {
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: (item: T) => void;
  permission?: string;
}

export interface DataTableProps<T> {
  columns: ColumnConfig<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  actions?: RowAction<T>[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  bulkActions?: React.ReactNode;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortKey: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  loading = false,
  error = false,
  errorMessage,
  onRetry,
  actions,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  bulkActions,
  sortKey,
  sortOrder = 'asc',
  onSortChange,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records matching your current request.',
}: DataTableProps<T>) {
  const isAllSelected = data.length > 0 && data.every((item) => selectedIds.includes(keyExtractor(item)));

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map((item) => keyExtractor(item)));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (loading) {
    return <LoadingState message="Fetching table records..." />;
  }

  if (error) {
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {/* Bulk Action Header Bar */}
      {selectable && selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-xs text-indigo-200 shadow-lg animate-fade-in">
          <span className="font-bold flex items-center gap-2">
            <span>☑️</span>
            <span>{selectedIds.length} item(s) selected</span>
          </span>
          <div className="flex items-center gap-2">{bulkActions}</div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <table className="w-full text-left min-w-[700px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/90">
              {selectable && (
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
              )}

              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && onSortChange && onSortChange(col.key)}
                  className={`py-3.5 px-4 ${col.sortable ? 'cursor-pointer hover:text-white select-none' : ''} ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div className="flex items-center gap-1.5 inline-flex">
                    <span>{col.label}</span>
                    {col.sortable && (
                      <span className="text-[10px] opacity-70">
                        {sortKey === col.key ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              ))}

              {actions && actions.length > 0 && (
                <th className="py-3.5 px-4 text-right">Actions</th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/80">
            {data.map((item, index) => {
              const id = keyExtractor(item);
              const isSelected = selectedIds.includes(id);

              return (
                <tr
                  key={id}
                  className={`hover:bg-slate-900/60 transition ${
                    isSelected ? 'bg-indigo-950/20' : ''
                  }`}
                >
                  {selectable && (
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(id)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                  )}

                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3.5 px-4 ${
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(item, index) : item[col.key] ?? 'N/A'}
                    </td>
                  ))}

                  {actions && actions.length > 0 && (
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {actions.map((act, actIdx) => (
                          <button
                            key={actIdx}
                            onClick={() => act.onClick(item)}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                              act.variant === 'danger'
                                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                                : act.variant === 'primary'
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {act.icon && <span className="mr-1">{act.icon}</span>}
                            {act.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
