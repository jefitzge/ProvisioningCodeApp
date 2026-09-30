import { z } from 'zod';

/**
 * Zod schema for RequestedUserStageProgress validation
 */
export const RequestedUserStageProgressSchema = z.object({
  id: z.string().uuid(),
  stageProgressName: z.string(),
  requestUser: z.object({ id: z.string().uuid(), requestUserName: z.string() }).optional(),
  sequenceNumber: z.number().int().optional(),
  stateKey: z.enum(['NotStarted', 'InProgress', 'Completed', 'Blocked', 'Skipped']).optional(),
  workflowStageOption: z.object({ id: z.string().uuid(), stageName: z.string() }).optional(),
});

/**
 * Schema for creating a new RequestedUserStageProgress (omits system-generated ID)
 */
export const CreateRequestedUserStageProgressSchema = RequestedUserStageProgressSchema.omit({ id: true });

/**
 * Schema for updating an existing RequestedUserStageProgress
 */
export const UpdateRequestedUserStageProgressSchema = RequestedUserStageProgressSchema;

export type RequestedUserStageProgressInput = z.infer<typeof RequestedUserStageProgressSchema>;
export type CreateRequestedUserStageProgressInput = z.infer<typeof CreateRequestedUserStageProgressSchema>;
export type UpdateRequestedUserStageProgressInput = z.infer<typeof UpdateRequestedUserStageProgressSchema>;