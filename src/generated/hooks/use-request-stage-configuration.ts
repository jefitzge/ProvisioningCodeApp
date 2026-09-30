import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RequestStageConfigurationService } from "../services/request-stage-configuration-service";
import type { RequestStageConfiguration } from "../models/request-stage-configuration-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all RequestStageConfiguration records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, requestStageConfigurationName, activeState, sequenceNumber, stageName, stageTypeKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useRequestStageConfigurationList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["requestStageConfiguration-list", options],
    queryFn: () => queueDataverseCollectionRead(() => RequestStageConfigurationService.getAll(options)),
  });
}

/**
 * Retrieve a single RequestStageConfiguration record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useRequestStageConfiguration(id: string) {
  return useQuery({
    queryKey: ["requestStageConfiguration", id],
    queryFn: () => RequestStageConfigurationService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new RequestStageConfiguration record.
 * @remarks Form validation: use CreateRequestStageConfigurationSchema with zodResolver for type-safe create forms
 */
export function useCreateRequestStageConfiguration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<RequestStageConfiguration, "id">) => RequestStageConfigurationService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["requestStageConfiguration-list"] });
    },
  });
}

/**
 * Update an existing RequestStageConfiguration record.
 * @remarks Form validation: use UpdateRequestStageConfigurationSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateRequestStageConfiguration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<RequestStageConfiguration, "id">>;
    }) => RequestStageConfigurationService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["requestStageConfiguration-list"] });
      client.invalidateQueries({ queryKey: ["requestStageConfiguration", variables.id] });
    },
  });
}

/**
 * Delete a RequestStageConfiguration record by its unique identifier.
 */
export function useDeleteRequestStageConfiguration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => RequestStageConfigurationService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["requestStageConfiguration-list"] });
      client.invalidateQueries({ queryKey: ["requestStageConfiguration", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const RequestStageConfiguration_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { RequestStageConfigurationSchema, CreateRequestStageConfigurationSchema, UpdateRequestStageConfigurationSchema } from "../validators/request-stage-configuration-validator";
export type { RequestStageConfigurationInput, CreateRequestStageConfigurationInput, UpdateRequestStageConfigurationInput } from "../validators/request-stage-configuration-validator";