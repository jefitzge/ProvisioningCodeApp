import { z } from 'zod';

/**
 * Zod schema for AccessRole validation
 */
export const AccessRoleSchema = z.object({
  id: z.string().uuid(),
  accessRoleName: z.string().min(1, { message: "Access Role Name is required" }),
  activeState: z.boolean(),
  application: z.object({ id: z.string().uuid(), applicationName: z.string() }),
  description: z.string().optional(),
});

/**
 * Schema for creating a new AccessRole (omits system-generated ID)
 */
export const CreateAccessRoleSchema = AccessRoleSchema.omit({ id: true });

/**
 * Schema for updating an existing AccessRole
 */
export const UpdateAccessRoleSchema = AccessRoleSchema;

export type AccessRoleInput = z.infer<typeof AccessRoleSchema>;
export type CreateAccessRoleInput = z.infer<typeof CreateAccessRoleSchema>;
export type UpdateAccessRoleInput = z.infer<typeof UpdateAccessRoleSchema>;