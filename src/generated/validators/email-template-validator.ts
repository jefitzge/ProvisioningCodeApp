import { z } from 'zod';

/**
 * Zod schema for EmailTemplate validation
 */
export const EmailTemplateSchema = z.object({
  id: z.string().uuid(),
  emailTemplateName: z.string().min(1, { message: "Email Template Name is required" }),
  accessRole: z.object({ id: z.string().uuid(), accessRoleName: z.string() }).optional(),
  activeState: z.boolean(),
  application: z.object({ id: z.string().uuid(), applicationName: z.string() }),
  bCCAddresses: z.string().optional(),
  body: z.string().min(1, { message: "Body is required" }),
  cCAddresses: z.string().optional(),
  environment: z.object({ id: z.string().uuid(), environmentName: z.string() }).optional(),
  important: z.boolean(),
  sendFromAddress: z.string().email().min(1, { message: "Send From Address is required" }),
  subject: z.string().min(1, { message: "Subject is required" }),
  supportContact: z.string().email().min(1, { message: "Support Contact is required" }),
  version: z.number().int(),
});

/**
 * Schema for creating a new EmailTemplate (omits system-generated ID)
 */
export const CreateEmailTemplateSchema = EmailTemplateSchema.omit({ id: true });

/**
 * Schema for updating an existing EmailTemplate
 */
export const UpdateEmailTemplateSchema = EmailTemplateSchema;

export type EmailTemplateInput = z.infer<typeof EmailTemplateSchema>;
export type CreateEmailTemplateInput = z.infer<typeof CreateEmailTemplateSchema>;
export type UpdateEmailTemplateInput = z.infer<typeof UpdateEmailTemplateSchema>;