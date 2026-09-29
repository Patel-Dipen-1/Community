import { z } from 'zod';

// Business Registration Schema (Validation for Registration Form)
export const RegisterBusinessSchema = z.object({
  fullName: z.string().min(2, "Owner name must be at least 2 characters"),
  shopName: z.string().min(2, "Shop name is required"),
  mobileNumber: z.string().min(10, "Valid 10-digit mobile number required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  streetAddress: z.string().min(3, "Shop address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().min(4, "Pincode is required"),
  gstNumber: z.string().optional(),
  shopMediaUrls: z.array(z.string()).max(5, "Maximum 5 shop photos/videos allowed"),
});

export type RegisterBusinessInput = z.infer<typeof RegisterBusinessSchema>;

// Account Login Schema
export const LoginSchema = z.object({
  username: z.string().min(3, "Mobile number or Email required"),
  password: z.string().min(6, "Password required"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// Lead Capture Schema ("Chat With Us" Modal for Shared Product Links)
export const LeadCaptureSchema = z.object({
  businessId: z.string().uuid(),
  visitorName: z.string().min(2, "Name is required"),
  mobileNumber: z.string().min(10, "Valid mobile number required"),
  productCode: z.string().optional(),
});

export type LeadCaptureInput = z.infer<typeof LeadCaptureSchema>;

// Dynamic Product Creation Schema
export const CreateProductSchema = z.object({
  title: z.string().min(3, "Product title required"),
  communityId: z.string().uuid(),
  categoryId: z.string().uuid(),
  code: z.string().min(3, "Product code (e.g. SKU-001) required"),
  description: z.string().min(10, "Detailed description required"),
  moq: z.number().int().positive().default(1),
  priceTiers: z.array(z.object({
    minQty: z.number().int().positive(),
    price: z.number().positive(),
  })),
  images: z.array(z.string()).min(1, "At least 1 product image required"),
  videoUrl: z.string().optional(),
  specs: z.record(z.any()), // Dynamic category specs (Clothing vs Jewellery)
  isHotSelling: z.boolean().default(false),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
