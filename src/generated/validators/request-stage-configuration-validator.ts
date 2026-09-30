import { z } from 'zod';

/**
 * Zod schema for RequestStageConfiguration validation
 */
export const RequestStageConfigurationSchema = z.object({
  id: z.string().uuid(),
  requestStageConfigurationName: z.string().min(1, { message: "Request Stage Configuration Name is required" }),
  accessRole: z.object({ id: z.string().uuid(), accessRoleName: z.string() }),
  activeState: z.boolean(),
  sequenceNumber: z.number().int(),
  stageName: z.string().min(1, { message: "Stage Name is required" }),
  stageTypeKey: z.enum(['Provisioning', 'GCCSync', 'AccessConfirmation', 'NotificationReady', 'NotificationSent']),
});

/**
 * Schema for creating a new RequestStageConfiguration (omits system-generated ID)
 */
export const CreateRequestStageConfigurationSchema = RequestStageConfigurationSchema.omit({ id: true });

/**
 * Schema for updating an existing RequestStageConfiguration
 */
export const UpdateRequestStageConfigurationSchema = RequestStageConfigurationSchema;

export type RequestStageConfigurationInput = z.infer<typeof RequestStageConfigurationSchema>;
export type CreateRequestStageConfigurationInput = z.infer<typeof CreateRequestStageConfigurationSchema>;
export type UpdateRequestStageConfigurationInput = z.infer<typeof UpdateRequestStageConfigurationSchema>;