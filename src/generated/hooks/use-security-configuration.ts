import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SecurityConfigurationService } from "../services/security-configuration-service";
import type { SecurityConfiguration } from "../models/security-configuration-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all SecurityConfiguration records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, securityConfigurationName, activeState, architectureKey, configurationTypeKey, instructions
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useSecurityConfigurationList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["securityConfiguration-list", options],
    queryFn: () => queueDataverseCollectionRead(() => SecurityConfigurationService.getAll(options)),
  });
}

/**
 * Retrieve a single SecurityConfiguration record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useSecurityConfiguration(id: string) {
  return useQuery({
    queryKey: ["securityConfiguration", id],
    queryFn: () => SecurityConfigurationService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new SecurityConfiguration record.
 * @remarks Form validation: use CreateSecurityConfigurationSchema with zodResolver for type-safe create forms
 */
export function useCreateSecurityConfiguration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SecurityConfiguration, "id">) => SecurityConfigurationService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["securityConfiguration-list"] });
    },
  });
}

/**
 * Update an existing SecurityConfiguration record.
 * @remarks Form validation: use UpdateSecurityConfigurationSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateSecurityConfiguration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<SecurityConfiguration, "id">>;
    }) => SecurityConfigurationService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["securityConfiguration-list"] });
      client.invalidateQueries({ queryKey: ["securityConfiguration", variables.id] });
    },
  });
}

/**
 * Delete a SecurityConfiguration record by its unique identifier.
 */
export function useDeleteSecurityConfiguration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SecurityConfigurationService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["securityConfiguration-list"] });
      client.invalidateQueries({ queryKey: ["securityConfiguration", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const SecurityConfiguration_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { SecurityConfigurationSchema, CreateSecurityConfigurationSchema, UpdateSecurityConfigurationSchema } from "../validators/security-configuration-validator";
export type { SecurityConfigurationInput, CreateSecurityConfigurationInput, UpdateSecurityConfigurationInput } from "../validators/security-configuration-validator";