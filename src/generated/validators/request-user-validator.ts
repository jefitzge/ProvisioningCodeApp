import { z } from 'zod';

/**
 * Zod schema for RequestUser validation
 */
export const RequestUserSchema = z.object({
  id: z.string().uuid(),
  requestUserName: z.string(),
  application: z.object({ id: z.string().uuid(), applicationName: z.string() }).optional(),
  environment: z.object({ id: z.string().uuid(), environmentName: z.string() }),
  exceptionReason: z.string().optional(),
  notes: z.string().optional(),
  provisioningRequest: z.object({ id: z.string().uuid(), provisioningRequestName: z.string() }),
  provisioningTicketReference: z.string().optional(),
  requestedUser: z.object({ id: z.string().uuid(), fullName: z.string() }),
  statusKey: z.enum(['New', 'Provisioned', 'GCCSyncComplete', 'AccessConfirmed', 'NotificationReady', 'Notified', 'Exception']).optional(),
});

/**
 * Schema for creating a new RequestUser (omits system-generated ID)
 */
export const CreateRequestUserSchema = RequestUserSchema.omit({ id: true });

/**
 * Schema for updating an existing RequestUser
 */
export const UpdateRequestUserSchema = RequestUserSchema;

export type RequestUserInput = z.infer<typeof RequestUserSchema>;
export type CreateRequestUserInput = z.infer<typeof CreateRequestUserSchema>;
export type UpdateRequestUserInput = z.infer<typeof UpdateRequestUserSchema>;