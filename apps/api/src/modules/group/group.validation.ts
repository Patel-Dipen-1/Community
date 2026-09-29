import { z } from 'zod';

export const CreateGroupSchema = z.object({
  title: z.string().min(3, "Group title is required"),
  description: z.string().optional(),
  type: z.enum(['GROUP', 'BROADCAST']).default('GROUP'),
  maxCapacity: z.number().int().positive().default(40), // Configurable member limit (capped by Super Admin limit e.g. 40)
  onlyAdminCanPost: z.boolean().default(false),         // Only Admin Can Post toggle
  hideMemberIdentity: z.boolean().default(true),        // Hide Member Identity (ON/OFF)
  membersCanSeeMemberList: z.boolean().default(false),  // Members Can See Member List (ON/OFF)
});

export const UpdateGroupSettingsSchema = z.object({
  hideMemberIdentity: z.boolean().optional(),
  membersCanSeeMemberList: z.boolean().optional(),
  onlyAdminCanPost: z.boolean().optional(),
  maxCapacity: z.number().int().positive().optional(),
  title: z.string().min(3).optional(),
  description: z.string().optional(),
});

export const AddGroupMemberSchema = z.object({
  userId: z.string(),
});

export const SendGroupMessageSchema = z.object({
  text: z.string().optional(),
  productCode: z.string().optional(),
  mediaUrl: z.string().optional(),
  clientMessageId: z.string().optional(),
});


