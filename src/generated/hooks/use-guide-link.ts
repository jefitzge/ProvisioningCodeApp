import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GuideLinkService } from "../services/guide-link-service";
import type { GuideLink } from "../models/guide-link-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all GuideLink records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, label, activeState, typeKey, uRL
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useGuideLinkList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["guideLink-list", options],
    queryFn: () => queueDataverseCollectionRead(() => GuideLinkService.getAll(options)),
  });
}

/**
 * Retrieve a single GuideLink record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useGuideLink(id: string) {
  return useQuery({
    queryKey: ["guideLink", id],
    queryFn: () => GuideLinkService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new GuideLink record.
 * @remarks Form validation: use CreateGuideLinkSchema with zodResolver for type-safe create forms
 */
export function useCreateGuideLink() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<GuideLink, "id">) => GuideLinkService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["guideLink-list"] });
    },
  });
}

/**
 * Update an existing GuideLink record.
 * @remarks Form validation: use UpdateGuideLinkSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateGuideLink() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<GuideLink, "id">>;
    }) => GuideLinkService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["guideLink-list"] });
      client.invalidateQueries({ queryKey: ["guideLink", variables.id] });
    },
  });
}

/**
 * Delete a GuideLink record by its unique identifier.
 */
export function useDeleteGuideLink() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => GuideLinkService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["guideLink-list"] });
      client.invalidateQueries({ queryKey: ["guideLink", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const GuideLink_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { GuideLinkSchema, CreateGuideLinkSchema, UpdateGuideLinkSchema } from "../validators/guide-link-validator";
export type { GuideLinkInput, CreateGuideLinkInput, UpdateGuideLinkInput } from "../validators/guide-link-validator";