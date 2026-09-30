import { useMemo } from 'react';
import {
  useAccessRoleList,
  useProvisioningRequestList,
  useRequestedUserList,
  useRequestedUserStageProgressList,
  useRequestStageConfigurationList,
  useRequestUserList,
  useRequestUserRoleList,
} from '@/generated/hooks';
import type { AccessRole } from '@/generated/models/access-role-model';
import type { ProvisioningRequest } from '@/generated/models/provisioning-request-model';
import type { RequestedUser } from '@/generated/models/requested-user-model';
import type { RequestedUserStageProgress } from '@/generated/models/requested-user-stage-progress-model';
import type { RequestStageConfiguration } from '@/generated/models/request-stage-configuration-model';
import {
  RequestUserStatusKeyToLabel,
  type RequestUser,
  type RequestUserStatusKey,
} from '@/generated/models/request-user-model';
import type { RequestUserRole } from '@/generated/models/request-user-role-model';
import { sameDataverseId } from '@/lib/provisioning-utils';

export type RequestUserView = RequestedUser & {
  requestUser: RequestUser;
  application: NonNullable<RequestUser['application']>;
  environment: RequestUser['environment'];
  roles: Array<Pick<AccessRole, 'id' | 'accessRoleName'>>;
  statusKey: RequestUserStatusKey;
};

export const useRequestData = () => {
  const requestQuery = useProvisioningRequestList({ orderBy: ['createdDate desc'] });
  const requestedUserQuery = useRequestedUserList();
  const requestUserQuery = useRequestUserList();
  const requestUserRoleQuery = useRequestUserRoleList();
  const stageProgressQuery = useRequestedUserStageProgressList({ orderBy: ['sequenceNumber asc'] });
  const roleStageQuery = useRequestStageConfigurationList({ orderBy: ['sequenceNumber asc'] });
  const roleQuery = useAccessRoleList({ orderBy: ['accessRoleName asc'] });

  const requests = useMemo(() => requestQuery.data ?? [], [requestQuery.data]);
  const requestedUsers = useMemo(() => requestedUserQuery.data ?? [], [requestedUserQuery.data]);
  const requestUsers = useMemo(() => requestUserQuery.data ?? [], [requestUserQuery.data]);
  const requestUserRoles = useMemo(() => requestUserRoleQuery.data ?? [], [requestUserRoleQuery.data]);
  const stageProgress = useMemo(() => stageProgressQuery.data ?? [], [stageProgressQuery.data]);
  const roleStages = useMemo(() => roleStageQuery.data ?? [], [roleStageQuery.data]);

  const usersForRequest = (requestId: string): RequestUserView[] =>
    requestUsers
      .filter((link: RequestUser) => sameDataverseId(link.provisioningRequest.id, requestId))
      .flatMap((link: RequestUser) => {
        const person = requestedUsers.find((item: RequestedUser) => sameDataverseId(item.id, link.requestedUser.id));
        if (!person || !link.application) return [];
        const roles = requestUserRoles
          .filter(
            (assignment: RequestUserRole) =>
              sameDataverseId(assignment.requestUser.id, link.id) && assignment.activeState,
          )
          .map((assignment: RequestUserRole) => assignment.accessRole);
        return [{
          ...person,
          requestUser: link,
          application: link.application,
          environment: link.environment,
          roles,
          statusKey: link.statusKey ?? 'New',
        }];
      });

  const configuredStagesForUser = (item: RequestUserView): RequestStageConfiguration[] => {
    const roleIds = new Set(item.roles.map((role: Pick<AccessRole, 'id' | 'accessRoleName'>) => role.id));
    const stages = new Map<string, RequestStageConfiguration>();
    roleStages
      .filter((stage: RequestStageConfiguration) => stage.activeState && roleIds.has(stage.accessRole.id))
      .forEach((stage: RequestStageConfiguration) => {
        const key = stage.stageName.trim().toLowerCase();
        const current = stages.get(key);
        if (!current || stage.sequenceNumber < current.sequenceNumber) stages.set(key, stage);
      });
    return Array.from(stages.values()).sort(
      (first: RequestStageConfiguration, second: RequestStageConfiguration) =>
        first.sequenceNumber - second.sequenceNumber,
    );
  };

  const activeStageForRequest = (requestId: string): string => {
    const request = requests.find((item: ProvisioningRequest) => sameDataverseId(item.id, requestId));
    const linkedUsers = usersForRequest(requestId);
    if (!linkedUsers.length) return '—';
    const labels = linkedUsers.map((item: RequestUserView) => {
      const configured = configuredStagesForUser(item);
      if (request?.statusKey === 'Completed') return configured.at(-1)?.stageName ?? 'Completed';
      const progress = stageProgress.filter((entry: RequestedUserStageProgress) =>
        sameDataverseId(entry.requestUser?.id, item.requestUser.id),
      );
      return progress.find((entry: RequestedUserStageProgress) => entry.stateKey === 'InProgress')
        ?.workflowStageOption?.stageName
        ?? configured[0]?.stageName
        ?? (item.statusKey === 'New' ? 'New Request' : RequestUserStatusKeyToLabel[item.statusKey]);
    });
    return new Set(labels.map((label: string) => label.toLowerCase())).size === 1 ? labels[0] : 'Various';
  };

  return {
    requestQuery,
    requestedUserQuery,
    requestUserQuery,
    requestUserRoleQuery,
    stageProgressQuery,
    roleStageQuery,
    roleQuery,
    requests,
    requestedUsers,
    requestUsers,
    requestUserRoles,
    stageProgress,
    roleStages,
    usersForRequest,
    configuredStagesForUser,
    activeStageForRequest,
  };
};
