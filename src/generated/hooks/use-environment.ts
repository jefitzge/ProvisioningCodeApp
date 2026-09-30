import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EnvironmentService } from "../services/environment-service";
import type { Environment } from "../models/environment-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Environment records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, environmentName, activeState, environmentCode, environmentTypeKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useEnvironmentList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["environment-list", options],
    queryFn: () => queueDataverseCollectionRead(() => EnvironmentService.getAll(options)),
  });
}

/**
 * Retrieve a single Environment record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useEnvironment(id: string) {
  return useQuery({
    queryKey: ["environment", id],
    queryFn: () => EnvironmentService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Environment record.
 * @remarks Form validation: use CreateEnvironmentSchema with zodResolver for type-safe create forms
 */
export function useCreateEnvironment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Environment, "id">) => EnvironmentService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["environment-list"] });
    },
  });
}

/**
 * Update an existing Environment record.
 * @remarks Form validation: use UpdateEnvironmentSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateEnvironment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Environment, "id">>;
    }) => EnvironmentService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["environment-list"] });
      client.invalidateQueries({ queryKey: ["environment", variables.id] });
    },
  });
}

/**
 * Delete a Environment record by its unique identifier.
 */
export function useDeleteEnvironment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => EnvironmentService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["environment-list"] });
      client.invalidateQueries({ queryKey: ["environment", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Environment_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { EnvironmentSchema, CreateEnvironmentSchema, UpdateEnvironmentSchema } from "../validators/environment-validator";
export type { EnvironmentInput, CreateEnvironmentInput, UpdateEnvironmentInput } from "../validators/environment-validator";