import { getClient } from '../../../app-gen-sdk/data';
import type { RequestUserRole } from '../models/request-user-role-model';
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const DATA_SOURCE_NAME = 'RequestUserRole';

export class RequestUserRoleService {
  static async create(record: Omit<RequestUserRole, 'id'>): Promise<RequestUserRole> {
    const result = await getClient().createRecordAsync(DATA_SOURCE_NAME, record);
    if (!result.success) throw result.error;
    return result.data as RequestUserRole;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<RequestUserRole, 'id'>>
  ): Promise<RequestUserRole> {
    const result = await getClient().updateRecordAsync(DATA_SOURCE_NAME, id, changedFields);
    if (!result.success) throw result.error;
    return result.data as RequestUserRole;
  }

  static async delete(id: string): Promise<void> {
    const result = await getClient().deleteRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
  }

  static async get(id: string): Promise<RequestUserRole> {
    const result = await getClient().retrieveRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
    return result.data as RequestUserRole;
  }

  static async getAll(options?: IOperationOptions): Promise<RequestUserRole[]> {
    const result = await getClient().retrieveMultipleRecordsAsync(DATA_SOURCE_NAME, options);
    if (!result.success) throw result.error;
    return result.data as RequestUserRole[];
  }
}