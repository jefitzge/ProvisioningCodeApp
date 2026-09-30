import { z } from 'zod';

/**
 * Zod schema for GuideLink validation
 */
export const GuideLinkSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1, { message: "Label is required" }),
  accessRole: z.object({ id: z.string().uuid(), accessRoleName: z.string() }).optional(),
  activeState: z.boolean(),
  application: z.object({ id: z.string().uuid(), applicationName: z.string() }),
  environment: z.object({ id: z.string().uuid(), environmentName: z.string() }).optional(),
  typeKey: z.enum(['Guide', 'ExternalLink', 'DeveloperResource']),
  uRL: z.string().url().min(1, { message: "URL is required" }),
});

/**
 * Schema for creating a new GuideLink (omits system-generated ID)
 */
export const CreateGuideLinkSchema = GuideLinkSchema.omit({ id: true });

/**
 * Schema for updating an existing GuideLink
 */
export const UpdateGuideLinkSchema = GuideLinkSchema;

export type GuideLinkInput = z.infer<typeof GuideLinkSchema>;
export type CreateGuideLinkInput = z.infer<typeof CreateGuideLinkSchema>;
export type UpdateGuideLinkInput = z.infer<typeof UpdateGuideLinkSchema>;