import { z } from 'zod';

/**
 * Zod schema for Application validation
 */
export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  applicationName: z.string().min(1, { message: "Application Name is required" }),
  activeState: z.boolean(),
  description: z.string().optional(),
});

/**
 * Schema for creating a new Application (omits system-generated ID)
 */
export const CreateApplicationSchema = ApplicationSchema.omit({ id: true });

/**
 * Schema for updating an existing Application
 */
export const UpdateApplicationSchema = ApplicationSchema;

export type ApplicationInput = z.infer<typeof ApplicationSchema>;
export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>;