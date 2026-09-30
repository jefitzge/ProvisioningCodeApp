import { z } from 'zod';

/**
 * Zod schema for WorkflowStageOption validation
 */
export const WorkflowStageOptionSchema = z.object({
  id: z.string().uuid(),
  stageName: z.string().min(1, { message: "Stage Name is required" }),
  activeState: z.boolean(),
  description: z.string().optional(),
  sequenceNumber: z.number().int(),
  stageTypeKey: z.enum(['Provisioning', 'Sync', 'AccessAssigned', 'Notify', 'Completed']),
});

/**
 * Schema for creating a new WorkflowStageOption (omits system-generated ID)
 */
export const CreateWorkflowStageOptionSchema = WorkflowStageOptionSchema.omit({ id: true });

/**
 * Schema for updating an existing WorkflowStageOption
 */
export const UpdateWorkflowStageOptionSchema = WorkflowStageOptionSchema;

export type WorkflowStageOptionInput = z.infer<typeof WorkflowStageOptionSchema>;
export type CreateWorkflowStageOptionInput = z.infer<typeof CreateWorkflowStageOptionSchema>;
export type UpdateWorkflowStageOptionInput = z.infer<typeof UpdateWorkflowStageOptionSchema>;