import { UserProfileModule } from '../../features/profile/UserProfileModule';

export const metadata = {
  title: 'My Profile | B2B Business Platform',
  description: 'View and manage your authenticated business profile and account details.',
};

export default function ProfilePage() {
  return <UserProfileModule />;
}
