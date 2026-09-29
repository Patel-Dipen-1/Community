import { ColumnConfig } from '../../../components/common/DataTable';
import { FieldConfig } from '../../../components/forms/ConfigurableForm';

export interface UserMedia {
  url: string;
  mediaType?: 'IMAGE' | 'VIDEO' | string;
  title?: string;
}

export interface UserRecord {
  userId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  shopName: string;
  address?: string;
  gstNumber?: string;
  assignedRole: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'BLACK';
  allowedCommunities: string[];
  shopPhotosAndVideos?: UserMedia[];
}

export const AVAILABLE_COMMUNITIES = [
  { id: 'clothing', label: 'Clothing & Textiles', icon: '👕' },
  { id: 'jewellery', label: 'Jewellery & Gems', icon: '💎' },
  { id: 'electronics', label: 'Electronics & Mobiles', icon: '📱' },
  { id: 'footwear', label: 'Footwear & Leather', icon: '👟' },
  { id: 'textiles', label: 'Textiles & Yarns', icon: '🧵' },
  { id: 'cosmetics', label: 'Cosmetics & Beauty', icon: '💄' },
  { id: 'hardware', label: 'Hardware & Tools', icon: '🔧' },
  { id: 'food', label: 'Food & Spices', icon: '🌾' },
  { id: 'handicrafts', label: 'Handicrafts & Decor', icon: '🎨' },
];

/**
 * 1. Configuration-Driven Form Fields (Reused for Create and Edit)
 */
export const USER_FORM_FIELDS: FieldConfig[] = [
  { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'e.g. Dipen Patel', required: true },
  { name: 'email', label: 'Email Address', type: 'email', placeholder: 'e.g. owner@example.com', required: true },
  { name: 'mobileNumber', label: 'Mobile Number', type: 'text', placeholder: 'e.g. 9876543210', required: true },
  { name: 'password', label: 'Password', type: 'password', placeholder: '•••••••• (leave blank to keep unchanged)', required: false },
  { name: 'shopName', label: 'Shop / Business Name', type: 'text', placeholder: 'e.g. Royal Textiles', required: true },
  {
    name: 'assignedRole',
    label: 'Assigned Role',
    type: 'select',
    required: true,
    options: [
      { label: 'WHOLESALER', value: 'WHOLESALER' },
      { label: 'MANUFACTURER', value: 'MANUFACTURER' },
      { label: 'DISTRIBUTOR', value: 'DISTRIBUTOR' },
      { label: 'RETAILER', value: 'RETAILER' },
      { label: 'SUPER_ADMIN', value: 'SUPER_ADMIN' },
    ],
  },
  {
    name: 'status',
    label: 'Account Status',
    type: 'select',
    required: true,
    options: [
      { label: 'APPROVED (Active Vendor)', value: 'APPROVED' },
      { label: 'PENDING (Under Review)', value: 'PENDING' },
      { label: 'REJECTED (Denied Access)', value: 'REJECTED' },
      { label: '⛔ BLOCKED / BLACKLISTED', value: 'BLOCKED' },
    ],
  },
  { name: 'gstNumber', label: 'GST Number', type: 'text', placeholder: '24AAAAA0000A1Z5' },
  { name: 'address', label: 'Shop Address / Location', type: 'textarea', placeholder: 'e.g. Ring Road, Surat, Gujarat', gridSpan: 2 },
];

/**
 * 2. Configuration-Driven Role Options for Filters
 */
export const USER_ROLE_FILTER_OPTIONS = [
  { label: 'All Roles', value: 'ALL' },
  { label: 'WHOLESALER', value: 'WHOLESALER' },
  { label: 'MANUFACTURER', value: 'MANUFACTURER' },
  { label: 'DISTRIBUTOR', value: 'DISTRIBUTOR' },
  { label: 'RETAILER', value: 'RETAILER' },
  { label: 'SUPER_ADMIN', value: 'SUPER_ADMIN' },
];

export const USER_STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'APPROVED', value: 'APPROVED' },
  { label: 'PENDING', value: 'PENDING' },
  { label: 'REJECTED', value: 'REJECTED' },
  { label: '⛔ BLOCKED', value: 'BLOCKED' },
];

