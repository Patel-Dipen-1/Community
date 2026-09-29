'use client';

import React from 'react';

export type FieldType = 'text' | 'number' | 'email' | 'password' | 'select' | 'checkbox' | 'textarea';

export interface Option {
  label: string;
  value: string;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: Option[];
  gridSpan?: 1 | 2 | 3;
}

export interface ConfigurableFormProps {
  mode: 'create' | 'edit';
  fields: FieldConfig[];
  formData: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export const ConfigurableForm: React.FC<ConfigurableFormProps> = ({
  mode,
  fields,
  formData,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel,
}) => {
  const defaultLabel = mode === 'create' ? 'Create Record ➔' : 'Save Changes ➔';

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => {
          const value = formData[field.name] ?? '';

          if (field.type === 'checkbox') {
            return (
              <div
                key={field.name}
                className={`${field.gridSpan === 2 ? 'sm:col-span-2' : ''} flex items-center gap-2 pt-2`}
              >
                <input
                  type="checkbox"
                  id={field.name}
                  checked={Boolean(value)}
                  onChange={(e) => onChange(field.name, e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor={field.name} className="text-slate-300 font-semibold cursor-pointer select-none">
                  {field.label} {field.required && '*'}
                </label>
              </div>
            );
          }

          if (field.type === 'select') {
            return (
              <div
                key={field.name}
                className={field.gridSpan === 2 ? 'sm:col-span-2' : ''}
              >
                <label className="block text-slate-300 font-semibold mb-1">
                  {field.label} {field.required && '*'}
                </label>
                <select
                  value={value}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  required={field.required}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select {field.label}</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (field.type === 'textarea') {
            return (
              <div
                key={field.name}
                className={field.gridSpan === 2 ? 'sm:col-span-2' : ''}
              >
                <label className="block text-slate-300 font-semibold mb-1">
                  {field.label} {field.required && '*'}
                </label>
                <textarea
                  value={value}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            );
          }

          return (
            <div
              key={field.name}
              className={field.gridSpan === 2 ? 'sm:col-span-2' : ''}
            >
              <label className="block text-slate-300 font-semibold mb-1">
                {field.label} {field.required && '*'}
              </label>
              <input
                type={field.type}
                value={value}
                onChange={(e) => onChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold transition disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : submitLabel || defaultLabel}
        </button>
      </div>
    </form>
  );
};
