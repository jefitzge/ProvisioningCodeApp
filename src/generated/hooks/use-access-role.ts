import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AccessRoleService } from "../services/access-role-service";
import type { AccessRole } from "../models/access-role-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all AccessRole records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, accessRoleName, activeState, description
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useAccessRoleList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["accessRole-list", options],
    queryFn: () => queueDataverseCollectionRead(() => AccessRoleService.getAll(options)),
  });
}

/**
 * Retrieve a single AccessRole record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useAccessRole(id: string) {
  return useQuery({
    queryKey: ["accessRole", id],
    queryFn: () => AccessRoleService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new AccessRole record.
 * @remarks Form validation: use CreateAccessRoleSchema with zodResolver for type-safe create forms
 */
export function useCreateAccessRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AccessRole, "id">) => AccessRoleService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["accessRole-list"] });
    },
  });
}

/**
 * Update an existing AccessRole record.
 * @remarks Form validation: use UpdateAccessRoleSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateAccessRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<AccessRole, "id">>;
    }) => AccessRoleService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["accessRole-list"] });
      client.invalidateQueries({ queryKey: ["accessRole", variables.id] });
    },
  });
}

/**
 * Delete a AccessRole record by its unique identifier.
 */
export function useDeleteAccessRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => AccessRoleService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["accessRole-list"] });
      client.invalidateQueries({ queryKey: ["accessRole", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const AccessRole_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { AccessRoleSchema, CreateAccessRoleSchema, UpdateAccessRoleSchema } from "../validators/access-role-validator";
export type { AccessRoleInput, CreateAccessRoleInput, UpdateAccessRoleInput } from "../validators/access-role-validator";