import { z } from 'zod';

/**
 * Zod schema for AccessControlEnvironmentAssignment validation
 */
export const AccessControlEnvironmentAssignmentSchema = z.object({
  id: z.string().uuid(),
  environmentAssignmentName: z.string(),
  accessControlEntry: z.object({ id: z.string().uuid(), accessControlEntryName: z.string() }),
  environment: z.object({ id: z.string().uuid(), environmentName: z.string() }),
});

/**
 * Schema for creating a new AccessControlEnvironmentAssignment (omits system-generated ID)
 */
export const CreateAccessControlEnvironmentAssignmentSchema = AccessControlEnvironmentAssignmentSchema.omit({ id: true });

/**
 * Schema for updating an existing AccessControlEnvironmentAssignment
 */
export const UpdateAccessControlEnvironmentAssignmentSchema = AccessControlEnvironmentAssignmentSchema;

export type AccessControlEnvironmentAssignmentInput = z.infer<typeof AccessControlEnvironmentAssignmentSchema>;
export type CreateAccessControlEnvironmentAssignmentInput = z.infer<typeof CreateAccessControlEnvironmentAssignmentSchema>;
export type UpdateAccessControlEnvironmentAssignmentInput = z.infer<typeof UpdateAccessControlEnvironmentAssignmentSchema>;