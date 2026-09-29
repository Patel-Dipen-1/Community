import { InquiryModule } from '../../features/inquiry/InquiryModule';

export const metadata = {
  title: 'Product Inquiries & Callback Line | B2B Platform',
  description: 'Manage callback requests and product inquiries from verified buyers.',
};

export default function InquiriesPage() {
  return <InquiryModule />;
}
