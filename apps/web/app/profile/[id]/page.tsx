'use client';

import React from 'react';
import { BusinessProfile } from '../../../features/profile/components/BusinessProfile';

export default function BusinessProfilePage({ params }: { params: { id: string } }) {
  return <BusinessProfile id={params.id} />;
}
