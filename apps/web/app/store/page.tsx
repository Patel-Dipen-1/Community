'use client';

import React from 'react';
import { StoreModule } from '../../features/store/StoreModule';

export default function MyStorePage() {
  return <StoreModule storeIdOrSlug="me" />;
}
