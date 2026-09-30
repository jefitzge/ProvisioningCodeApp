import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EmailTemplateService } from "../services/email-template-service";
import type { EmailTemplate } from "../models/email-template-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all EmailTemplate records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, emailTemplateName, activeState, bCCAddresses, body, cCAddresses, important, sendFromAddress, subject, supportContact, version
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useEmailTemplateList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["emailTemplate-list", options],
    queryFn: () => queueDataverseCollectionRead(() => EmailTemplateService.getAll(options)),
  });
}

/**
 * Retrieve a single EmailTemplate record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useEmailTemplate(id: string) {
  return useQuery({
    queryKey: ["emailTemplate", id],
    queryFn: () => EmailTemplateService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new EmailTemplate record.
 * @remarks Form validation: use CreateEmailTemplateSchema with zodResolver for type-safe create forms
 */
export function useCreateEmailTemplate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<EmailTemplate, "id">) => EmailTemplateService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["emailTemplate-list"] });
    },
  });
}

/**
 * Update an existing EmailTemplate record.
 * @remarks Form validation: use UpdateEmailTemplateSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateEmailTemplate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<EmailTemplate, "id">>;
    }) => EmailTemplateService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["emailTemplate-list"] });
      client.invalidateQueries({ queryKey: ["emailTemplate", variables.id] });
    },
  });
}

/**
 * Delete a EmailTemplate record by its unique identifier.
 */
export function useDeleteEmailTemplate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => EmailTemplateService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["emailTemplate-list"] });
      client.invalidateQueries({ queryKey: ["emailTemplate", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const EmailTemplate_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { EmailTemplateSchema, CreateEmailTemplateSchema, UpdateEmailTemplateSchema } from "../validators/email-template-validator";
export type { EmailTemplateInput, CreateEmailTemplateInput, UpdateEmailTemplateInput } from "../validators/email-template-validator";