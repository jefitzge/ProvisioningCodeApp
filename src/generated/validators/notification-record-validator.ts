import { z } from 'zod';

/**
 * Zod schema for NotificationRecord validation
 */
export const NotificationRecordSchema = z.object({
  id: z.string().uuid(),
  notificationRecordName: z.string().min(1, { message: "Notification Record Name is required" }),
  attemptNumber: z.number().int(),
  bCC: z.string().optional(),
  bodySnapshot: z.string().min(1, { message: "Body Snapshot is required" }),
  cC: z.string().optional(),
  emailTemplate: z.object({ id: z.string().uuid(), emailTemplateName: z.string() }),
  errorDetails: z.string().optional(),
  importance: z.boolean().optional(),
  lastUpdatedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  messageID: z.string().optional(),
  processingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  recipientEmail: z.string().email().min(1, { message: "Recipient Email is required" }),
  recipientName: z.string().optional(),
  requestedUser: z.object({ id: z.string().uuid(), fullName: z.string() }),
  requestReferenceSnapshot: z.string().min(1, { message: "Request Reference Snapshot is required" }),
  sentBy: z.string().optional(),
  sentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  statusKey: z.enum(['Sent', 'Failed', 'Queued', 'Sending']),
  subjectSnapshot: z.string().min(1, { message: "Subject Snapshot is required" }),
  supportContactSnapshot: z.string().email().min(1, { message: "Support Contact Snapshot is required" }),
  templateVersionSnapshot: z.number().int(),
});

/**
 * Schema for creating a new NotificationRecord (omits system-generated ID)
 */
export const CreateNotificationRecordSchema = NotificationRecordSchema.omit({ id: true });

/**
 * Schema for updating an existing NotificationRecord
 */
export const UpdateNotificationRecordSchema = NotificationRecordSchema;

export type NotificationRecordInput = z.infer<typeof NotificationRecordSchema>;
export type CreateNotificationRecordInput = z.infer<typeof CreateNotificationRecordSchema>;
export type UpdateNotificationRecordInput = z.infer<typeof UpdateNotificationRecordSchema>;