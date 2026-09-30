import { z } from 'zod';

/**
 * Zod schema for RequestUserRole validation
 */
export const RequestUserRoleSchema = z.object({
  id: z.string().uuid(),
  requestUserRoleName: z.string(),
  accessRole: z.object({ id: z.string().uuid(), accessRoleName: z.string() }),
  activeState: z.boolean(),
  requestUser: z.object({ id: z.string().uuid(), requestUserName: z.string() }),
});

/**
 * Schema for creating a new RequestUserRole (omits system-generated ID)
 */
export const CreateRequestUserRoleSchema = RequestUserRoleSchema.omit({ id: true });

/**
 * Schema for updating an existing RequestUserRole
 */
export const UpdateRequestUserRoleSchema = RequestUserRoleSchema;

export type RequestUserRoleInput = z.infer<typeof RequestUserRoleSchema>;
export type CreateRequestUserRoleInput = z.infer<typeof CreateRequestUserRoleSchema>;
export type UpdateRequestUserRoleInput = z.infer<typeof UpdateRequestUserRoleSchema>;