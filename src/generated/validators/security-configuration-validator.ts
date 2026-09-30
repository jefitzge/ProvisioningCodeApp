import { z } from 'zod';

/**
 * Zod schema for SecurityConfiguration validation
 */
export const SecurityConfigurationSchema = z.object({
  id: z.string().uuid(),
  securityConfigurationName: z.string().min(1, { message: "Security Configuration Name is required" }),
  activeState: z.boolean(),
  application: z.object({ id: z.string().uuid(), applicationName: z.string() }).optional(),
  architectureKey: z.enum(['DirectRole', 'TeamBased', 'Combined']),
  configurationTypeKey: z.enum(['DirectRole', 'OwnerTeam', 'AccessTeam', 'SecurityGroup']),
  environment: z.object({ id: z.string().uuid(), environmentName: z.string() }),
  instructions: z.string().min(1, { message: "Instructions is required" }),
});

/**
 * Schema for creating a new SecurityConfiguration (omits system-generated ID)
 */
export const CreateSecurityConfigurationSchema = SecurityConfigurationSchema.omit({ id: true });

/**
 * Schema for updating an existing SecurityConfiguration
 */
export const UpdateSecurityConfigurationSchema = SecurityConfigurationSchema;

export type SecurityConfigurationInput = z.infer<typeof SecurityConfigurationSchema>;
export type CreateSecurityConfigurationInput = z.infer<typeof CreateSecurityConfigurationSchema>;
export type UpdateSecurityConfigurationInput = z.infer<typeof UpdateSecurityConfigurationSchema>;