'use client';

import React from 'react';
import { ProductDetail } from '../../../features/products/components/ProductDetail';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  return <ProductDetail id={params.id} />;
}
