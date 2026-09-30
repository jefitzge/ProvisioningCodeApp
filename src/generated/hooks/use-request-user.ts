import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RequestUserService } from "../services/request-user-service";
import type { RequestUser } from "../models/request-user-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all RequestUser records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, requestUserName, exceptionReason, notes, provisioningTicketReference, statusKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useRequestUserList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["requestUser-list", options],
    queryFn: () => queueDataverseCollectionRead(() => RequestUserService.getAll(options)),
  });
}

/**
 * Retrieve a single RequestUser record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useRequestUser(id: string) {
  return useQuery({
    queryKey: ["requestUser", id],
    queryFn: () => RequestUserService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new RequestUser record.
 * @remarks Form validation: use CreateRequestUserSchema with zodResolver for type-safe create forms
 */
export function useCreateRequestUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<RequestUser, "id">) => RequestUserService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["requestUser-list"] });
    },
  });
}

/**
 * Update an existing RequestUser record.
 * @remarks Form validation: use UpdateRequestUserSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateRequestUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<RequestUser, "id">>;
    }) => RequestUserService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["requestUser-list"] });
      client.invalidateQueries({ queryKey: ["requestUser", variables.id] });
    },
  });
}

/**
 * Delete a RequestUser record by its unique identifier.
 */
export function useDeleteRequestUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => RequestUserService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["requestUser-list"] });
      client.invalidateQueries({ queryKey: ["requestUser", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const RequestUser_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { RequestUserSchema, CreateRequestUserSchema, UpdateRequestUserSchema } from "../validators/request-user-validator";
export type { RequestUserInput, CreateRequestUserInput, UpdateRequestUserInput } from "../validators/request-user-validator";