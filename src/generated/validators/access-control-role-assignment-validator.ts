import { z } from 'zod';

/**
 * Zod schema for AccessControlRoleAssignment validation
 */
export const AccessControlRoleAssignmentSchema = z.object({
  id: z.string().uuid(),
  roleAssignmentName: z.string(),
  accessControlEntry: z.object({ id: z.string().uuid(), accessControlEntryName: z.string() }),
  accessRole: z.object({ id: z.string().uuid(), accessRoleName: z.string() }),
  activeState: z.boolean(),
  assignedBy: z.string().optional(),
  assignedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
});

/**
 * Schema for creating a new AccessControlRoleAssignment (omits system-generated ID)
 */
export const CreateAccessControlRoleAssignmentSchema = AccessControlRoleAssignmentSchema.omit({ id: true });

/**
 * Schema for updating an existing AccessControlRoleAssignment
 */
export const UpdateAccessControlRoleAssignmentSchema = AccessControlRoleAssignmentSchema;

export type AccessControlRoleAssignmentInput = z.infer<typeof AccessControlRoleAssignmentSchema>;
export type CreateAccessControlRoleAssignmentInput = z.infer<typeof CreateAccessControlRoleAssignmentSchema>;
export type UpdateAccessControlRoleAssignmentInput = z.infer<typeof UpdateAccessControlRoleAssignmentSchema>;