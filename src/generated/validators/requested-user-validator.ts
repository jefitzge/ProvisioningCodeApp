import { z } from 'zod';

/**
 * Zod schema for RequestedUser validation
 */
export const RequestedUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1, { message: "Full Name is required" }),
  accessRole: z.object({ id: z.string().uuid(), accessRoleName: z.string() }).optional(),
  activeState: z.boolean().optional(),
  application: z.object({ id: z.string().uuid(), applicationName: z.string() }),
  bSCID: z.string().min(1, { message: "BSC ID is required" }),
  email: z.string().email().min(1, { message: "Email is required" }),
  environment: z.object({ id: z.string().uuid(), environmentName: z.string() }).optional(),
  exceptionReason: z.string().optional(),
  normalizedEmail: z.string().min(1, { message: "Normalized Email is required" }),
  notes: z.string().optional(),
  provisioningRequest: z.object({ id: z.string().uuid(), provisioningRequestName: z.string() }).optional(),
  provisioningTicketReference: z.string().optional(),
  statusKey: z.enum(['New', 'SentToProvisioning', 'Provisioned', 'GCCSyncComplete', 'AccessConfirmed', 'NotificationReady', 'Notified', 'Exception', 'Cancelled']),
});

/**
 * Schema for creating a new RequestedUser (omits system-generated ID)
 */
export const CreateRequestedUserSchema = RequestedUserSchema.omit({ id: true });

/**
 * Schema for updating an existing RequestedUser
 */
export const UpdateRequestedUserSchema = RequestedUserSchema;

export type RequestedUserInput = z.infer<typeof RequestedUserSchema>;
export type CreateRequestedUserInput = z.infer<typeof CreateRequestedUserSchema>;
export type UpdateRequestedUserInput = z.infer<typeof UpdateRequestedUserSchema>;