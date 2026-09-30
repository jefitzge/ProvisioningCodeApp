import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RequestUserRoleService } from "../services/request-user-role-service";
import type { RequestUserRole } from "../models/request-user-role-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all RequestUserRole records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, requestUserRoleName, activeState
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useRequestUserRoleList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["requestUserRole-list", options],
    queryFn: () => queueDataverseCollectionRead(() => RequestUserRoleService.getAll(options)),
  });
}

/**
 * Retrieve a single RequestUserRole record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useRequestUserRole(id: string) {
  return useQuery({
    queryKey: ["requestUserRole", id],
    queryFn: () => RequestUserRoleService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new RequestUserRole record.
 * @remarks Form validation: use CreateRequestUserRoleSchema with zodResolver for type-safe create forms
 */
export function useCreateRequestUserRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<RequestUserRole, "id">) => RequestUserRoleService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["requestUserRole-list"] });
    },
  });
}

/**
 * Update an existing RequestUserRole record.
 * @remarks Form validation: use UpdateRequestUserRoleSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateRequestUserRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<RequestUserRole, "id">>;
    }) => RequestUserRoleService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["requestUserRole-list"] });
      client.invalidateQueries({ queryKey: ["requestUserRole", variables.id] });
    },
  });
}

/**
 * Delete a RequestUserRole record by its unique identifier.
 */
export function useDeleteRequestUserRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => RequestUserRoleService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["requestUserRole-list"] });
      client.invalidateQueries({ queryKey: ["requestUserRole", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const RequestUserRole_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { RequestUserRoleSchema, CreateRequestUserRoleSchema, UpdateRequestUserRoleSchema } from "../validators/request-user-role-validator";
export type { RequestUserRoleInput, CreateRequestUserRoleInput, UpdateRequestUserRoleInput } from "../validators/request-user-role-validator";