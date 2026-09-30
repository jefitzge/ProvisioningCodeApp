import { getClient } from '../../../app-gen-sdk/data';
import type { AccessControlEnvironmentAssignment } from '../models/access-control-environment-assignment-model';
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const DATA_SOURCE_NAME = 'AccessControlEnvironmentAssignment';

export class AccessControlEnvironmentAssignmentService {
  static async create(record: Omit<AccessControlEnvironmentAssignment, 'id'>): Promise<AccessControlEnvironmentAssignment> {
    const result = await getClient().createRecordAsync(DATA_SOURCE_NAME, record);
    if (!result.success) throw result.error;
    return result.data as AccessControlEnvironmentAssignment;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<AccessControlEnvironmentAssignment, 'id'>>
  ): Promise<AccessControlEnvironmentAssignment> {
    const result = await getClient().updateRecordAsync(DATA_SOURCE_NAME, id, changedFields);
    if (!result.success) throw result.error;
    return result.data as AccessControlEnvironmentAssignment;
  }

  static async delete(id: string): Promise<void> {
    const result = await getClient().deleteRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
  }

  static async get(id: string): Promise<AccessControlEnvironmentAssignment> {
    const result = await getClient().retrieveRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
    return result.data as AccessControlEnvironmentAssignment;
  }

  static async getAll(options?: IOperationOptions): Promise<AccessControlEnvironmentAssignment[]> {
    const result = await getClient().retrieveMultipleRecordsAsync(DATA_SOURCE_NAME, options);
    if (!result.success) throw result.error;
    return result.data as AccessControlEnvironmentAssignment[];
  }
}