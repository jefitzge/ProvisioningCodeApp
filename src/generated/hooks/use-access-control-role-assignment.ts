import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AccessControlRoleAssignmentService } from "../services/access-control-role-assignment-service";
import type { AccessControlRoleAssignment } from "../models/access-control-role-assignment-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all AccessControlRoleAssignment records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, roleAssignmentName, activeState, assignedBy, assignedDate
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useAccessControlRoleAssignmentList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["accessControlRoleAssignment-list", options],
    queryFn: () => queueDataverseCollectionRead(() => AccessControlRoleAssignmentService.getAll(options)),
  });
}

/**
 * Retrieve a single AccessControlRoleAssignment record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useAccessControlRoleAssignment(id: string) {
  return useQuery({
    queryKey: ["accessControlRoleAssignment", id],
    queryFn: () => AccessControlRoleAssignmentService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new AccessControlRoleAssignment record.
 * @remarks Form validation: use CreateAccessControlRoleAssignmentSchema with zodResolver for type-safe create forms
 */
export function useCreateAccessControlRoleAssignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AccessControlRoleAssignment, "id">) => AccessControlRoleAssignmentService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["accessControlRoleAssignment-list"] });
    },
  });
}

/**
 * Update an existing AccessControlRoleAssignment record.
 * @remarks Form validation: use UpdateAccessControlRoleAssignmentSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateAccessControlRoleAssignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<AccessControlRoleAssignment, "id">>;
    }) => AccessControlRoleAssignmentService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["accessControlRoleAssignment-list"] });
      client.invalidateQueries({ queryKey: ["accessControlRoleAssignment", variables.id] });
    },
  });
}

/**
 * Delete a AccessControlRoleAssignment record by its unique identifier.
 */
export function useDeleteAccessControlRoleAssignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => AccessControlRoleAssignmentService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["accessControlRoleAssignment-list"] });
      client.invalidateQueries({ queryKey: ["accessControlRoleAssignment", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const AccessControlRoleAssignment_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { AccessControlRoleAssignmentSchema, CreateAccessControlRoleAssignmentSchema, UpdateAccessControlRoleAssignmentSchema } from "../validators/access-control-role-assignment-validator";
export type { AccessControlRoleAssignmentInput, CreateAccessControlRoleAssignmentInput, UpdateAccessControlRoleAssignmentInput } from "../validators/access-control-role-assignment-validator";