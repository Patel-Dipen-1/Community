import { z } from 'zod';

export const UpdateBusinessSchema = z.object({
  shopName: z.string().min(2).optional(),
  gstNumber: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});
