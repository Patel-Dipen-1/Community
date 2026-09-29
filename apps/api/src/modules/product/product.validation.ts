import { z } from 'zod';

export const CreateProductSchema = z.object({
  title: z.string().min(3, "Product title required"),
  communityId: z.string().optional().default('clothing'),
  categoryId: z.string().optional().default('clothing-wear'),
  code: z.string().min(3, "Product code (e.g. SKU-CLOTH-001) required"),
  description: z.string().min(5, "Detailed description required"),
  moq: z.number().int().positive().default(1),
  priceTiers: z.array(z.object({
    minQty: z.number().int().positive(),
    price: z.number().positive(),
  })).optional().default([]),
  images: z.array(z.string()).min(1, "At least 1 product image URL required"),
  videoUrl: z.string().optional().nullable(),
  specs: z.record(z.any()).optional().default({}), // Clothing specs (fabric, sizes, gender, color, fitType, season, workType)
  isHotSelling: z.boolean().optional().default(false),
});

