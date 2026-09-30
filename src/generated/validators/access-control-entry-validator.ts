import { z } from 'zod';

/**
 * Zod schema for AccessControlEntry validation
 */
export const AccessControlEntrySchema = z.object({
  id: z.string().uuid(),
  accessControlEntryName: z.string().min(1, { message: "Access Control Entry Name is required" }),
  accessRole: z.object({ id: z.string().uuid(), accessRoleName: z.string() }).optional(),
  activeState: z.boolean(),
  application: z.object({ id: z.string().uuid(), applicationName: z.string() }),
  dateProvisioned: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  environment: z.object({ id: z.string().uuid(), environmentName: z.string() }).optional(),
  grantedBy: z.string().optional(),
  grantedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  requestedUser: z.object({ id: z.string().uuid(), fullName: z.string() }),
});

/**
 * Schema for creating a new AccessControlEntry (omits system-generated ID)
 */
export const CreateAccessControlEntrySchema = AccessControlEntrySchema.omit({ id: true });

/**
 * Schema for updating an existing AccessControlEntry
 */
export const UpdateAccessControlEntrySchema = AccessControlEntrySchema;

export type AccessControlEntryInput = z.infer<typeof AccessControlEntrySchema>;
export type CreateAccessControlEntryInput = z.infer<typeof CreateAccessControlEntrySchema>;
export type UpdateAccessControlEntryInput = z.infer<typeof UpdateAccessControlEntrySchema>;