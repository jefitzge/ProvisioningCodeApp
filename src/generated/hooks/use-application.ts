import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApplicationService } from "../services/application-service";
import type { Application } from "../models/application-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Application records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, applicationName, activeState, description
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useApplicationList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["application-list", options],
    queryFn: () => queueDataverseCollectionRead(() => ApplicationService.getAll(options)),
  });
}

/**
 * Retrieve a single Application record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useApplication(id: string) {
  return useQuery({
    queryKey: ["application", id],
    queryFn: () => ApplicationService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Application record.
 * @remarks Form validation: use CreateApplicationSchema with zodResolver for type-safe create forms
 */
export function useCreateApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Application, "id">) => ApplicationService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["application-list"] });
    },
  });
}

/**
 * Update an existing Application record.
 * @remarks Form validation: use UpdateApplicationSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Application, "id">>;
    }) => ApplicationService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["application-list"] });
      client.invalidateQueries({ queryKey: ["application", variables.id] });
    },
  });
}

/**
 * Delete a Application record by its unique identifier.
 */
export function useDeleteApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ApplicationService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["application-list"] });
      client.invalidateQueries({ queryKey: ["application", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Application_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { ApplicationSchema, CreateApplicationSchema, UpdateApplicationSchema } from "../validators/application-validator";
export type { ApplicationInput, CreateApplicationInput, UpdateApplicationInput } from "../validators/application-validator";