import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProvisioningRequestService } from "../services/provisioning-request-service";
import type { ProvisioningRequest } from "../models/provisioning-request-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all ProvisioningRequest records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, provisioningRequestName, cancellationReason, cancelledDate, createdDate, exceptionDate, exceptionReason, holdDate, holdReason, notes, ownerEmail, ownerName, sourceReference, sourceTypeKey, statusKey, summary
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useProvisioningRequestList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["provisioningRequest-list", options],
    queryFn: () => queueDataverseCollectionRead(() => ProvisioningRequestService.getAll(options)),
  });
}

/**
 * Retrieve a single ProvisioningRequest record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useProvisioningRequest(id: string) {
  return useQuery({
    queryKey: ["provisioningRequest", id],
    queryFn: () => ProvisioningRequestService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new ProvisioningRequest record.
 * @remarks Form validation: use CreateProvisioningRequestSchema with zodResolver for type-safe create forms
 */
export function useCreateProvisioningRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ProvisioningRequest, "id">) => ProvisioningRequestService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["provisioningRequest-list"] });
    },
  });
}

/**
 * Update an existing ProvisioningRequest record.
 * @remarks Form validation: use UpdateProvisioningRequestSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateProvisioningRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<ProvisioningRequest, "id">>;
    }) => ProvisioningRequestService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["provisioningRequest-list"] });
      client.invalidateQueries({ queryKey: ["provisioningRequest", variables.id] });
    },
  });
}

/**
 * Delete a ProvisioningRequest record by its unique identifier.
 */
export function useDeleteProvisioningRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ProvisioningRequestService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["provisioningRequest-list"] });
      client.invalidateQueries({ queryKey: ["provisioningRequest", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const ProvisioningRequest_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { ProvisioningRequestSchema, CreateProvisioningRequestSchema, UpdateProvisioningRequestSchema } from "../validators/provisioning-request-validator";
export type { ProvisioningRequestInput, CreateProvisioningRequestInput, UpdateProvisioningRequestInput } from "../validators/provisioning-request-validator";