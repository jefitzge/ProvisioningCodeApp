import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RequestedUserStageProgressService } from "../services/requested-user-stage-progress-service";
import type { RequestedUserStageProgress } from "../models/requested-user-stage-progress-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all RequestedUserStageProgress records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, stageProgressName, sequenceNumber, stateKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useRequestedUserStageProgressList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["requestedUserStageProgress-list", options],
    queryFn: () => queueDataverseCollectionRead(() => RequestedUserStageProgressService.getAll(options)),
  });
}

/**
 * Retrieve a single RequestedUserStageProgress record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useRequestedUserStageProgress(id: string) {
  return useQuery({
    queryKey: ["requestedUserStageProgress", id],
    queryFn: () => RequestedUserStageProgressService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new RequestedUserStageProgress record.
 * @remarks Form validation: use CreateRequestedUserStageProgressSchema with zodResolver for type-safe create forms
 */
export function useCreateRequestedUserStageProgress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<RequestedUserStageProgress, "id">) => RequestedUserStageProgressService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["requestedUserStageProgress-list"] });
    },
  });
}

/**
 * Update an existing RequestedUserStageProgress record.
 * @remarks Form validation: use UpdateRequestedUserStageProgressSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateRequestedUserStageProgress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<RequestedUserStageProgress, "id">>;
    }) => RequestedUserStageProgressService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["requestedUserStageProgress-list"] });
      client.invalidateQueries({ queryKey: ["requestedUserStageProgress", variables.id] });
    },
  });
}

/**
 * Delete a RequestedUserStageProgress record by its unique identifier.
 */
export function useDeleteRequestedUserStageProgress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => RequestedUserStageProgressService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["requestedUserStageProgress-list"] });
      client.invalidateQueries({ queryKey: ["requestedUserStageProgress", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const RequestedUserStageProgress_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { RequestedUserStageProgressSchema, CreateRequestedUserStageProgressSchema, UpdateRequestedUserStageProgressSchema } from "../validators/requested-user-stage-progress-validator";
export type { RequestedUserStageProgressInput, CreateRequestedUserStageProgressInput, UpdateRequestedUserStageProgressInput } from "../validators/requested-user-stage-progress-validator";