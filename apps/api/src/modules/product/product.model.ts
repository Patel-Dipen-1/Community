export interface IProduct {
  id: string;
  code: string; // SKU-001
  businessId: string;
  communityId: string;
  categoryId: string;
  title: string;
  description: string;
  moq: number;
  priceTiers: { minQty: number; price: number }[];
  images: string[];
  videoUrl?: string | null;
  specs: Record<string, any>;
  isHotSelling: boolean;
  createdAt: Date;
}
