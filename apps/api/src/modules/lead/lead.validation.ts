import { z } from 'zod';

export const LeadCaptureSchema = z.object({
  businessId: z.string().optional(),
  visitorName: z.string().min(2, "Name is required"),
  mobileNumber: z.string().min(10, "Valid mobile number required"),
  productCode: z.string().optional(),
  productId: z.string().optional(),
  targetCategory: z.string().optional(),
  message: z.string().optional(),
  quantity: z.number().or(z.string()).optional(),
});

