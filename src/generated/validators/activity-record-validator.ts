import { z } from 'zod';

/**
 * Zod schema for ActivityRecord validation
 */
export const ActivityRecordSchema = z.object({
  id: z.string().uuid(),
  activityRecordName: z.string().min(1, { message: "Activity Record Name is required" }),
  actionTypeKey: z.enum(['IntakeCreated', 'UserAdded', 'SentToProvisioning', 'ConfirmationUpdated', 'NotificationSent', 'ExceptionLogged', 'RequestOnHold', 'RequestResumed']),
  actorEmail: z.string().email().min(1, { message: "Actor Email is required" }),
  actorName: z.string().min(1, { message: "Actor Name is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  provisioningRequest: z.object({ id: z.string().uuid(), provisioningRequestName: z.string() }),
  requestedUser: z.object({ id: z.string().uuid(), fullName: z.string() }).optional(),
  timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Timestamp is required" }),
});

/**
 * Schema for creating a new ActivityRecord (omits system-generated ID)
 */
export const CreateActivityRecordSchema = ActivityRecordSchema.omit({ id: true });

/**
 * Schema for updating an existing ActivityRecord
 */
export const UpdateActivityRecordSchema = ActivityRecordSchema;

export type ActivityRecordInput = z.infer<typeof ActivityRecordSchema>;
export type CreateActivityRecordInput = z.infer<typeof CreateActivityRecordSchema>;
export type UpdateActivityRecordInput = z.infer<typeof UpdateActivityRecordSchema>;