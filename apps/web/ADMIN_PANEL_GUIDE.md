# 📘 Developer Guide: Adding a New Admin CRUD Module

> **Architecture:** Reusable, Configuration-Driven Admin Panel Engine  
> **Location:** `apps/web/features/admin/`

---

## ⚡ How to Add a New Module (e.g. Products / Orders) in 5 Minutes

To add a new CRUD module to the Admin Panel, follow these 3 simple steps:

---

### Step 1: Define Module Configuration (`products.config.ts`)

Create `apps/web/features/admin/products/products.config.ts`:

```typescript
import { FieldConfig } from '../../../components/forms/ConfigurableForm';
import { ColumnConfig } from '../../../components/common/DataTable';

// 1. Single Form Definition for BOTH Create and Edit
export const PRODUCT_FORM_FIELDS: FieldConfig[] = [
  { name: 'name', label: 'Product Name', type: 'text', placeholder: 'e.g. Silk Saree', required: true },
  { name: 'sku', label: 'SKU Code', type: 'text', placeholder: 'SKU-001', required: true },
  { name: 'price', label: 'Price (₹)', type: 'number', required: true },
  { name: 'moq', label: 'Minimum Order Quantity', type: 'number', required: true },
  {
    name: 'category',
    label: 'Category',
    type: 'select',
    options: [
      { label: 'Clothing', value: 'clothing' },
      { label: 'Jewellery', value: 'jewellery' },
    ],
  },
];
```

---

### Step 2: Create Module Component (`ProductCrudModule.tsx`)

Create `apps/web/features/admin/products/ProductCrudModule.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { PageHeader } from '../../../components/common/PageHeader';
import { CommonSearch } from '../../../components/common/CommonSearch';
import { CommonPagination } from '../../../components/common/CommonPagination';
import { DataTable } from '../../../components/common/DataTable';
import { FormModal } from '../../../components/forms/FormModal';
import { ConfigurableForm } from '../../../components/forms/ConfigurableForm';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../components/common/Toast';
import { PRODUCT_FORM_FIELDS } from './products.config';

export function ProductCrudModule() {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<any>({});

  // Connect to your RTK Query endpoints:
  // const { data, isLoading } = useGetProductsQuery({ search, page, limit });

  return (
    <div className="space-y-6">
      <PageHeader
        title="📦 Product Catalog Management"
        description="Create, edit, and manage product inventory"
        action={<button onClick={() => setIsModalOpen(true)}>➕ Create Product</button>}
      />

      <CommonSearch value={search} onChange={setSearch} />

      <DataTable
        columns={[
          { key: 'name', label: 'Product Name', sortable: true },
          { key: 'sku', label: 'SKU Code' },
          { key: 'price', label: 'Price (₹)' },
        ]}
        data={[]}
        keyExtractor={(item) => item.id}
      />

      <CommonPagination page={page} limit={limit} total={0} onPageChange={setPage} />

      <FormModal isOpen={isModalOpen} title={formMode === 'create' ? 'Create Product' : 'Edit Product'} onClose={() => setIsModalOpen(false)}>
        <ConfigurableForm
          mode={formMode}
          fields={PRODUCT_FORM_FIELDS}
          formData={formData}
          onChange={(field, val) => setFormData((prev: any) => ({ ...prev, [field]: val }))}
          onSubmit={(e) => {
            e.preventDefault();
            addToast('Product saved successfully!', 'success');
            setIsModalOpen(false);
          }}
        />
      </FormModal>
    </div>
  );
}
```

---

### Step 3: Register Route / Navigation Sidebar

Add the new item to [`ADMIN_NAV_ITEMS`](file:///e:/1st/apps/web/components/layout/AdminSidebar.tsx):

```typescript
{ id: 'PRODUCTS', label: 'Product Inventory', icon: '📦', permission: 'products.view' },
```

---

### 🎨 Reusable Components Reference

| Component | Path | Description |
| :--- | :--- | :--- |
| **`AdminLayout`** | `components/layout/AdminLayout.tsx` | Shell with responsive Sidebar, Header, Breadcrumbs & Toast |
| **`PageHeader`** | `components/common/PageHeader.tsx` | Standardized header with actions & subtext |
| **`CommonSearch`** | `components/common/CommonSearch.tsx` | Debounced search bar with clear button & loading spinner |
| **`DateRangeFilter`** | `components/common/DateRangeFilter.tsx` | Preset date filter (Today, 7 days, 30 days, Custom) |
| **`CommonPagination`** | `components/common/CommonPagination.tsx` | Page selector, limit dropdown, and total count |
| **`DataTable`** | `components/common/DataTable.tsx` | Dynamic column table with sorting, bulk selection & actions |
| **`ConfirmDialog`** | `components/common/ConfirmDialog.tsx` | Reusable modal for destructive confirmations |
| **`ConfigurableForm`** | `components/forms/ConfigurableForm.tsx` | Unified Create & Edit configuration-driven form builder |
| **`Toast`** | `components/common/Toast.tsx` | Toast notification manager (`useToast().addToast()`) |
| **`useUrlState`** | `hooks/useUrlState.ts` | Syncs filter, search, & page state with URL query strings |
| **`usePermissions`** | `hooks/usePermissions.ts` | Role & permission evaluator (`hasPermission('users.create')`) |
