import { z } from 'zod';

/**
 * Zod schema for ProvisioningRequest validation
 */
export const ProvisioningRequestSchema = z.object({
  id: z.string().uuid(),
  provisioningRequestName: z.string().min(1, { message: "Provisioning Request Name is required" }),
  cancellationReason: z.string().optional(),
  cancelledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  createdDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Created Date is required" }),
  exceptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  exceptionReason: z.string().optional(),
  holdDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  holdReason: z.string().optional(),
  notes: z.string().optional(),
  ownerEmail: z.string().email().min(1, { message: "Owner Email is required" }),
  ownerName: z.string().min(1, { message: "Owner Name is required" }),
  sourceReference: z.string().min(1, { message: "Source Reference is required" }),
  sourceTypeKey: z.enum(['ServiceNow', 'Email']),
  statusKey: z.enum(['New', 'InReview', 'InProgress', 'Completed', 'Exception', 'Cancelled', 'OnHold']),
  summary: z.string().min(1, { message: "Summary is required" }),
});

/**
 * Schema for creating a new ProvisioningRequest (omits system-generated ID)
 */
export const CreateProvisioningRequestSchema = ProvisioningRequestSchema.omit({ id: true });

/**
 * Schema for updating an existing ProvisioningRequest
 */
export const UpdateProvisioningRequestSchema = ProvisioningRequestSchema;

export type ProvisioningRequestInput = z.infer<typeof ProvisioningRequestSchema>;
export type CreateProvisioningRequestInput = z.infer<typeof CreateProvisioningRequestSchema>;
export type UpdateProvisioningRequestInput = z.infer<typeof UpdateProvisioningRequestSchema>;