import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AccessControlEnvironmentAssignmentService } from "../services/access-control-environment-assignment-service";
import type { AccessControlEnvironmentAssignment } from "../models/access-control-environment-assignment-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all AccessControlEnvironmentAssignment records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, environmentAssignmentName
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useAccessControlEnvironmentAssignmentList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["accessControlEnvironmentAssignment-list", options],
    queryFn: () => queueDataverseCollectionRead(() => AccessControlEnvironmentAssignmentService.getAll(options)),
  });
}

/**
 * Retrieve a single AccessControlEnvironmentAssignment record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useAccessControlEnvironmentAssignment(id: string) {
  return useQuery({
    queryKey: ["accessControlEnvironmentAssignment", id],
    queryFn: () => AccessControlEnvironmentAssignmentService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new AccessControlEnvironmentAssignment record.
 * @remarks Form validation: use CreateAccessControlEnvironmentAssignmentSchema with zodResolver for type-safe create forms
 */
export function useCreateAccessControlEnvironmentAssignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AccessControlEnvironmentAssignment, "id">) => AccessControlEnvironmentAssignmentService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["accessControlEnvironmentAssignment-list"] });
    },
  });
}

/**
 * Update an existing AccessControlEnvironmentAssignment record.
 * @remarks Form validation: use UpdateAccessControlEnvironmentAssignmentSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateAccessControlEnvironmentAssignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<AccessControlEnvironmentAssignment, "id">>;
    }) => AccessControlEnvironmentAssignmentService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["accessControlEnvironmentAssignment-list"] });
      client.invalidateQueries({ queryKey: ["accessControlEnvironmentAssignment", variables.id] });
    },
  });
}

/**
 * Delete a AccessControlEnvironmentAssignment record by its unique identifier.
 */
export function useDeleteAccessControlEnvironmentAssignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => AccessControlEnvironmentAssignmentService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["accessControlEnvironmentAssignment-list"] });
      client.invalidateQueries({ queryKey: ["accessControlEnvironmentAssignment", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const AccessControlEnvironmentAssignment_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { AccessControlEnvironmentAssignmentSchema, CreateAccessControlEnvironmentAssignmentSchema, UpdateAccessControlEnvironmentAssignmentSchema } from "../validators/access-control-environment-assignment-validator";
export type { AccessControlEnvironmentAssignmentInput, CreateAccessControlEnvironmentAssignmentInput, UpdateAccessControlEnvironmentAssignmentInput } from "../validators/access-control-environment-assignment-validator";