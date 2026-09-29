'use client';

import React from 'react';
import { StoreModule } from '../../../features/store/StoreModule';

export default function StoreDetailPage({ params }: { params: { id: string } }) {
  return <StoreModule storeIdOrSlug={params.id} />;
}
