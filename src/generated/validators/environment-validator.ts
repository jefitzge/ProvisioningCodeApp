import { z } from 'zod';

/**
 * Zod schema for Environment validation
 */
export const EnvironmentSchema = z.object({
  id: z.string().uuid(),
  environmentName: z.string().min(1, { message: "Environment Name is required" }),
  activeState: z.boolean(),
  application: z.object({ id: z.string().uuid(), applicationName: z.string() }),
  environmentCode: z.string().min(1, { message: "Environment Code is required" }),
  environmentTypeKey: z.enum(['Development', 'Test', 'Production']),
});

/**
 * Schema for creating a new Environment (omits system-generated ID)
 */
export const CreateEnvironmentSchema = EnvironmentSchema.omit({ id: true });

/**
 * Schema for updating an existing Environment
 */
export const UpdateEnvironmentSchema = EnvironmentSchema;

export type EnvironmentInput = z.infer<typeof EnvironmentSchema>;
export type CreateEnvironmentInput = z.infer<typeof CreateEnvironmentSchema>;
export type UpdateEnvironmentInput = z.infer<typeof UpdateEnvironmentSchema>;