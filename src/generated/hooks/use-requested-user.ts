import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RequestedUserService } from "../services/requested-user-service";
import type { RequestedUser } from "../models/requested-user-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all RequestedUser records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, fullName, activeState, bSCID, email, exceptionReason, normalizedEmail, notes, provisioningTicketReference, statusKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useRequestedUserList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["requestedUser-list", options],
    queryFn: () => queueDataverseCollectionRead(() => RequestedUserService.getAll(options)),
  });
}

/**
 * Retrieve a single RequestedUser record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useRequestedUser(id: string) {
  return useQuery({
    queryKey: ["requestedUser", id],
    queryFn: () => RequestedUserService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new RequestedUser record.
 * @remarks Form validation: use CreateRequestedUserSchema with zodResolver for type-safe create forms
 */
export function useCreateRequestedUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<RequestedUser, "id">) => RequestedUserService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["requestedUser-list"] });
    },
  });
}

/**
 * Update an existing RequestedUser record.
 * @remarks Form validation: use UpdateRequestedUserSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateRequestedUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<RequestedUser, "id">>;
    }) => RequestedUserService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["requestedUser-list"] });
      client.invalidateQueries({ queryKey: ["requestedUser", variables.id] });
    },
  });
}

/**
 * Delete a RequestedUser record by its unique identifier.
 */
export function useDeleteRequestedUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => RequestedUserService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["requestedUser-list"] });
      client.invalidateQueries({ queryKey: ["requestedUser", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const RequestedUser_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { RequestedUserSchema, CreateRequestedUserSchema, UpdateRequestedUserSchema } from "../validators/requested-user-validator";
export type { RequestedUserInput, CreateRequestedUserInput, UpdateRequestedUserInput } from "../validators/requested-user-validator";