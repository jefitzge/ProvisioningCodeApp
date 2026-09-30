import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ActivityRecordService } from "../services/activity-record-service";
import type { ActivityRecord } from "../models/activity-record-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all ActivityRecord records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, activityRecordName, actionTypeKey, actorEmail, actorName, description, timestamp
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useActivityRecordList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["activityRecord-list", options],
    queryFn: () => queueDataverseCollectionRead(() => ActivityRecordService.getAll(options)),
  });
}

/**
 * Retrieve a single ActivityRecord record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useActivityRecord(id: string) {
  return useQuery({
    queryKey: ["activityRecord", id],
    queryFn: () => ActivityRecordService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new ActivityRecord record.
 * @remarks Form validation: use CreateActivityRecordSchema with zodResolver for type-safe create forms
 */
export function useCreateActivityRecord() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ActivityRecord, "id">) => ActivityRecordService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["activityRecord-list"] });
    },
  });
}

/**
 * Update an existing ActivityRecord record.
 * @remarks Form validation: use UpdateActivityRecordSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateActivityRecord() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<ActivityRecord, "id">>;
    }) => ActivityRecordService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["activityRecord-list"] });
      client.invalidateQueries({ queryKey: ["activityRecord", variables.id] });
    },
  });
}

/**
 * Delete a ActivityRecord record by its unique identifier.
 */
export function useDeleteActivityRecord() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ActivityRecordService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["activityRecord-list"] });
      client.invalidateQueries({ queryKey: ["activityRecord", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const ActivityRecord_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { ActivityRecordSchema, CreateActivityRecordSchema, UpdateActivityRecordSchema } from "../validators/activity-record-validator";
export type { ActivityRecordInput, CreateActivityRecordInput, UpdateActivityRecordInput } from "../validators/activity-record-validator";