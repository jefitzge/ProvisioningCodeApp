import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkflowStageOptionService } from "../services/workflow-stage-option-service";
import type { WorkflowStageOption } from "../models/workflow-stage-option-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';
import { queueDataverseCollectionRead } from '../../lib/dataverse-read-queue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all WorkflowStageOption records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, stageName, activeState, description, sequenceNumber, stageTypeKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useWorkflowStageOptionList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["workflowStageOption-list", options],
    queryFn: () => queueDataverseCollectionRead(() => WorkflowStageOptionService.getAll(options)),
  });
}

/**
 * Retrieve a single WorkflowStageOption record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useWorkflowStageOption(id: string) {
  return useQuery({
    queryKey: ["workflowStageOption", id],
    queryFn: () => WorkflowStageOptionService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new WorkflowStageOption record.
 * @remarks Form validation: use CreateWorkflowStageOptionSchema with zodResolver for type-safe create forms
 */
export function useCreateWorkflowStageOption() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<WorkflowStageOption, "id">) => WorkflowStageOptionService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["workflowStageOption-list"] });
    },
  });
}

/**
 * Update an existing WorkflowStageOption record.
 * @remarks Form validation: use UpdateWorkflowStageOptionSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateWorkflowStageOption() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<WorkflowStageOption, "id">>;
    }) => WorkflowStageOptionService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["workflowStageOption-list"] });
      client.invalidateQueries({ queryKey: ["workflowStageOption", variables.id] });
    },
  });
}

/**
 * Delete a WorkflowStageOption record by its unique identifier.
 */
export function useDeleteWorkflowStageOption() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => WorkflowStageOptionService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["workflowStageOption-list"] });
      client.invalidateQueries({ queryKey: ["workflowStageOption", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const WorkflowStageOption_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { WorkflowStageOptionSchema, CreateWorkflowStageOptionSchema, UpdateWorkflowStageOptionSchema } from "../validators/workflow-stage-option-validator";
export type { WorkflowStageOptionInput, CreateWorkflowStageOptionInput, UpdateWorkflowStageOptionInput } from "../validators/workflow-stage-option-validator";