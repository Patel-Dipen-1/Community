import { z } from 'zod';

export const ApproveVerificationSchema = z.object({
  userId: z.string(),
  assignedCategory: z.string(),
  assignedRole: z.string(),
});

export const TerminateSessionSchema = z.object({
  sessionId: z.string(),
});

export const AssignCommunitiesSchema = z.object({
  businessId: z.string(),
  allowedCommunities: z.array(z.string()).min(1, "At least one allowed community is required"),
});

export const UpdateGroupCapacitySchema = z.object({
  groupId: z.string(),
  maxCapacity: z.number().int().positive("Capacity must be a positive integer"),
});
