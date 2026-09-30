import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationRecordService } from "../services/notification-record-service";
import type { NotificationRecord } from "../models/notification-record-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all NotificationRecord records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, notificationRecordName, attemptNumber, bCC, bodySnapshot, cC, errorDetails, importance, lastUpdatedDate, messageID, processingDate, recipientEmail, recipientName, requestReferenceSnapshot, sentBy, sentDate, statusKey, subjectSnapshot, supportContactSnapshot, templateVersionSnapshot
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useNotificationRecordList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["notificationRecord-list", options],
    queryFn: () => queueDataverseCollectionRead(() => NotificationRecordService.getAll(options)),
  });
}

/**
 * Retrieve a single NotificationRecord record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useNotificationRecord(id: string) {
  return useQuery({
    queryKey: ["notificationRecord", id],
    queryFn: () => NotificationRecordService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new NotificationRecord record.
 * @remarks Form validation: use CreateNotificationRecordSchema with zodResolver for type-safe create forms
 */
export function useCreateNotificationRecord() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<NotificationRecord, "id">) => NotificationRecordService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["notificationRecord-list"] });
    },
  });
}

/**
 * Update an existing NotificationRecord record.
 * @remarks Form validation: use UpdateNotificationRecordSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateNotificationRecord() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<NotificationRecord, "id">>;
    }) => NotificationRecordService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["notificationRecord-list"] });
      client.invalidateQueries({ queryKey: ["notificationRecord", variables.id] });
    },
  });
}

/**
 * Delete a NotificationRecord record by its unique identifier.
 */
export function useDeleteNotificationRecord() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationRecordService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["notificationRecord-list"] });
      client.invalidateQueries({ queryKey: ["notificationRecord", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const NotificationRecord_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { NotificationRecordSchema, CreateNotificationRecordSchema, UpdateNotificationRecordSchema } from "../validators/notification-record-validator";
export type { NotificationRecordInput, CreateNotificationRecordInput, UpdateNotificationRecordInput } from "../validators/notification-record-validator";