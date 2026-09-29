import { z } from 'zod';

export const RegisterUserSchema = z.object({
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

export const LoginUserSchema = z.object({
  username: z.string().min(3, "Mobile number or Email required"),
  password: z.string().min(6, "Password required"),
});

export const RequestAccountDeletionSchema = z.object({
  reason: z.string().min(5, "Please specify a reason for requesting account deletion"),
});
