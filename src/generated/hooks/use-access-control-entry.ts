import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AccessControlEntryService } from "../services/access-control-entry-service";
import type { AccessControlEntry } from "../models/access-control-entry-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all AccessControlEntry records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, accessControlEntryName, activeState, dateProvisioned, grantedBy, grantedDate
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useAccessControlEntryList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["accessControlEntry-list", options],
    queryFn: () => queueDataverseCollectionRead(() => AccessControlEntryService.getAll(options)),
  });
}

/**
 * Retrieve a single AccessControlEntry record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useAccessControlEntry(id: string) {
  return useQuery({
    queryKey: ["accessControlEntry", id],
    queryFn: () => AccessControlEntryService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new AccessControlEntry record.
 * @remarks Form validation: use CreateAccessControlEntrySchema with zodResolver for type-safe create forms
 */
export function useCreateAccessControlEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AccessControlEntry, "id">) => AccessControlEntryService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["accessControlEntry-list"] });
    },
  });
}

/**
 * Update an existing AccessControlEntry record.
 * @remarks Form validation: use UpdateAccessControlEntrySchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateAccessControlEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<AccessControlEntry, "id">>;
    }) => AccessControlEntryService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["accessControlEntry-list"] });
      client.invalidateQueries({ queryKey: ["accessControlEntry", variables.id] });
    },
  });
}

/**
 * Delete a AccessControlEntry record by its unique identifier.
 */
export function useDeleteAccessControlEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => AccessControlEntryService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["accessControlEntry-list"] });
      client.invalidateQueries({ queryKey: ["accessControlEntry", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const AccessControlEntry_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { AccessControlEntrySchema, CreateAccessControlEntrySchema, UpdateAccessControlEntrySchema } from "../validators/access-control-entry-validator";
export type { AccessControlEntryInput, CreateAccessControlEntryInput, UpdateAccessControlEntryInput } from "../validators/access-control-entry-validator";