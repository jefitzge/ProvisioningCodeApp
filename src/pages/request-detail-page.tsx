import { initialize } from '@microsoft/power-apps/app';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, CircleCheck, CircleX, ClipboardCopy, Eye, Pause, Play, RotateCcw, TriangleAlert, Users } from 'lucide-react';
import { toast } from 'sonner';

import { QueryState } from '@/components/query-state';
import { RequestStatusBadge } from '@/components/request-status-badge';
import { RequestWorkflowProgress } from '@/components/request-workflow-progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useAccessControlEntryList,
  useActivityRecordList,
  useCreateActivityRecord,
  useCreateNotificationRecord,
  useEmailTemplateList,
  useNotificationRecordList,
  useUpdateNotificationRecord,
  useUpdateProvisioningRequest,
  useUpdateRequestedUserStageProgress,
  useUpdateRequestUser,
  useWorkflowStageOptionList,
} from '@/generated/hooks';
import type { AccessRole } from '@/generated/models/access-role-model';
import type { ActivityRecord } from '@/generated/models/activity-record-model';
import type { EmailTemplate } from '@/generated/models/email-template-model';
import type { NotificationRecord } from '@/generated/models/notification-record-model';
import { NotificationRecordService } from '@/generated/services/notification-record-service';
import { ProvisioningRequestStatusKeyToLabel, type ProvisioningRequest, type ProvisioningRequestStatusKey } from '@/generated/models/provisioning-request-model';
import type { RequestedUserStageProgress } from '@/generated/models/requested-user-stage-progress-model';
import type { RequestStageConfiguration } from '@/generated/models/request-stage-configuration-model';
import { RequestUserStatusKeyToLabel, type RequestUserStatusKey } from '@/generated/models/request-user-model';
import type { WorkflowStageOption } from '@/generated/models/workflow-stage-option-model';
import { type RequestUserView, useRequestData } from '@/hooks/use-request-data';
import { useUser } from '@/hooks/use-user';
import { errorMessage, sameDataverseId, statusForWorkflowStage, workflowStageOptionForConfiguration } from '@/lib/provisioning-utils';

const userStatusLabel = (status: RequestUserStatusKey) => status === 'New' ? 'New Request' : RequestUserStatusKeyToLabel[status];

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate text-sm font-medium" title={value}>{value}</p></div>;
}

export default function RequestDetailPage() {
  const { id } = useParams();
  const userQuery = useUser();
  const workspace = useRequestData();
  const notificationQuery = useNotificationRecordList({ orderBy: ['lastUpdatedDate desc'] });
  const activityQuery = useActivityRecordList({ orderBy: ['timestamp desc'] });
  const templateQuery = useEmailTemplateList({ orderBy: ['emailTemplateName asc'] });
  const stageOptionQuery = useWorkflowStageOptionList({ orderBy: ['sequenceNumber asc'] });
  const accessEntryQuery = useAccessControlEntryList();
  const updateRequest = useUpdateProvisioningRequest();
  const updateRequestUser = useUpdateRequestUser();
  const updateStageProgress = useUpdateRequestedUserStageProgress();
  const createNotification = useCreateNotificationRecord();
  const updateNotification = useUpdateNotificationRecord();
  const createActivity = useCreateActivityRecord();
  const [statusAction, setStatusAction] = useState<ProvisioningRequestStatusKey | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [preview, setPreview] = useState<NotificationRecord | null>(null);
  const [reopenRequest, setReopenRequest] = useState<ProvisioningRequest | null>(null);
  const [closing, setClosing] = useState(false);
  const [optimisticStages, setOptimisticStages] = useState<Record<string, string>>({});

  const selectedRequest = workspace.requests.find((request: ProvisioningRequest) => sameDataverseId(request.id, id));
  const notifications = useMemo(() => notificationQuery.data ?? [], [notificationQuery.data]);
  const activities = useMemo(() => activityQuery.data ?? [], [activityQuery.data]);
  const templates = useMemo(() => templateQuery.data ?? [], [templateQuery.data]);
  const stageOptions = useMemo(() => stageOptionQuery.data ?? [], [stageOptionQuery.data]);
  const selectedRequestUsers = selectedRequest ? workspace.usersForRequest(selectedRequest.id) : [];
  const allUsersNotified = selectedRequestUsers.length > 0 && selectedRequestUsers.every((item: RequestUserView) => notifications.some((notification: NotificationRecord) => sameDataverseId(notification.requestedUser.id, item.id) && notification.statusKey === 'Sent'));

  const logActivity = async (request: ProvisioningRequest, description: string, item?: RequestUserView) => {
    const user = userQuery.data;
    if (!user?.fullName || !user.userPrincipalName) throw new Error('Identity verification is required.');
    if (activities.some((activity: ActivityRecord) => sameDataverseId(activity.provisioningRequest.id, request.id) && activity.description === description)) return;
    await createActivity.mutateAsync({ activityRecordName: `ConfirmationUpdated - ${request.sourceReference}`, actionTypeKey: 'ConfirmationUpdated', actorEmail: user.userPrincipalName, actorName: user.fullName, description, provisioningRequest: { id: request.id, provisioningRequestName: request.provisioningRequestName }, requestedUser: item ? { id: item.id, fullName: item.fullName } : undefined, timestamp: new Date().toISOString() });
  };

  const changeRequestStatus = async (request: ProvisioningRequest, statusKey: ProvisioningRequestStatusKey, reason?: string) => {
    try {
      const now = new Date().toISOString();
      await updateRequest.mutateAsync({ id: request.id, changedFields: { statusKey, cancelledDate: statusKey === 'Cancelled' ? now : undefined, cancellationReason: statusKey === 'Cancelled' ? reason : undefined, exceptionDate: statusKey === 'Exception' ? now : undefined, exceptionReason: statusKey === 'Exception' ? reason : undefined, holdDate: statusKey === 'OnHold' ? now : undefined, holdReason: statusKey === 'OnHold' ? reason : undefined } });
      await logActivity(request, reason ? `${ProvisioningRequestStatusKeyToLabel[statusKey]}: ${reason}` : `Request status changed to ${ProvisioningRequestStatusKeyToLabel[statusKey]}.`);
      await Promise.all([workspace.requestQuery.refetch(), activityQuery.refetch()]);
      setStatusAction(null); setStatusReason('');
      toast.success('Request status updated.');
    } catch (error: unknown) { toast.error(errorMessage(error)); }
  };

  const advanceStage = async (item: RequestUserView, stage: RequestStageConfiguration) => {
    if (!selectedRequest) return;
    const configured = workspace.configuredStagesForUser(item);
    const targetIndex = configured.findIndex((entry: RequestStageConfiguration) => sameDataverseId(entry.id, stage.id));
    if (targetIndex < 0) return;
    setOptimisticStages((current: Record<string, string>) => ({ ...current, [item.requestUser.id]: stage.id }));
    try {
      const targetOption = workflowStageOptionForConfiguration(stage, stageOptions);
      if (!targetOption) throw new Error('The workflow stage option is unavailable.');
      const related = workspace.stageProgress.filter((entry: RequestedUserStageProgress) => sameDataverseId(entry.requestUser?.id, item.requestUser.id));
      await Promise.all(related.map((entry: RequestedUserStageProgress) => updateStageProgress.mutateAsync({ id: entry.id, changedFields: { stateKey: (entry.sequenceNumber ?? 0) < targetIndex + 1 ? 'Completed' : (sameDataverseId(entry.workflowStageOption?.id, targetOption.id) ? 'InProgress' : 'NotStarted') } })));
      const statusKey = statusForWorkflowStage(stage, stageOptions);
      await updateRequestUser.mutateAsync({ id: item.requestUser.id, changedFields: { statusKey } });
      await logActivity(selectedRequest, `${item.fullName} moved to ${RequestUserStatusKeyToLabel[statusKey]}.`, item);
      await Promise.all([workspace.requestUserQuery.refetch(), workspace.stageProgressQuery.refetch(), activityQuery.refetch()]);
      toast.success('Workflow stage updated.');
    } catch (error: unknown) { toast.error(errorMessage(error)); }
    finally { setOptimisticStages((current: Record<string, string>) => { const next = { ...current }; delete next[item.requestUser.id]; return next; }); }
  };

  const closeAtFinalStage = async () => {
    if (!selectedRequest || !allUsersNotified) return;
    setClosing(true);
    try {
      for (const item of workspace.usersForRequest(selectedRequest.id)) {
        const configured = workspace.configuredStagesForUser(item);
        const finalStage = configured.at(-1);
        if (finalStage) await advanceStage(item, finalStage);
      }
      await changeRequestStatus(selectedRequest, 'Completed');
    } finally { setClosing(false); }
  };

  const reopen = async (request: ProvisioningRequest) => {
    try {
      for (const item of workspace.usersForRequest(request.id)) {
        const configured = workspace.configuredStagesForUser(item);
        const previous = configured.at(-2) ?? configured[0];
        if (previous) await advanceStage(item, previous);
      }
      await changeRequestStatus(request, 'InProgress');
      setReopenRequest(null);
    } catch (error: unknown) { toast.error(errorMessage(error)); }
  };

  const copyHandoff = async () => {
    if (!selectedRequest) return;
    const users = workspace.usersForRequest(selectedRequest.id);
    await navigator.clipboard.writeText([`Request: ${selectedRequest.sourceReference}`, `Summary: ${selectedRequest.summary}`, `Status: ${ProvisioningRequestStatusKeyToLabel[selectedRequest.statusKey]}`, '', 'Requested users:', ...users.map((item: RequestUserView) => `- ${item.fullName} | ${item.email} | ${item.application.applicationName} | ${item.roles.map((role: Pick<AccessRole, 'id' | 'accessRoleName'>) => role.accessRoleName).join(', ')}`)].join('\n'));
    toast.success('Provisioning handoff copied.');
  };

  const markNotificationReady = async (item: RequestUserView) => {
    if (!selectedRequest) return;
    const template = templates.find((entry: EmailTemplate) => entry.activeState && sameDataverseId(entry.application.id, item.application.id));
    if (!template) { toast.error('An active email template is required.'); return; }
    try {
      await createNotification.mutateAsync({ notificationRecordName: `${selectedRequest.sourceReference} - ${item.fullName}`, attemptNumber: 0, bodySnapshot: template.body.replaceAll('{{UserName}}', item.fullName), emailTemplate: { id: template.id, emailTemplateName: template.emailTemplateName }, importance: template.important, lastUpdatedDate: new Date().toISOString(), recipientEmail: item.email, recipientName: item.fullName, requestedUser: { id: item.id, fullName: item.fullName }, requestReferenceSnapshot: selectedRequest.sourceReference, statusKey: 'Queued', subjectSnapshot: template.subject.replaceAll('{{UserName}}', item.fullName), supportContactSnapshot: template.supportContact, templateVersionSnapshot: template.version, bCC: template.bCCAddresses, cC: template.cCAddresses });
      await notificationQuery.refetch();
      toast.success('Notification is ready for review.');
    } catch (error: unknown) { toast.error(errorMessage(error)); }
  };

  const confirmNotification = async () => {
    if (!preview) return;
    const notificationId = preview.id;
    try {
      await updateNotification.mutateAsync({ id: notificationId, changedFields: { statusKey: 'Sending', processingDate: new Date().toISOString(), lastUpdatedDate: new Date().toISOString() } });
      setPreview(null);
      await notificationQuery.refetch();
      toast.info('Notification is being sent.');

      const pollIntervalMs = 5_000;
      const pollTimeoutMs = 3 * 60_000;
      const pollStartedAt = Date.now();
      while (Date.now() - pollStartedAt < pollTimeoutMs) {
        await initialize();
        await new Promise<void>((resolve: () => void) => window.setTimeout(resolve, pollIntervalMs));
        const notification = await NotificationRecordService.get(notificationId);
        if (notification.statusKey === 'Sent') {
          await notificationQuery.refetch();
          toast.success('Notification sent.');
          return;
        }
        if (notification.statusKey === 'Failed') {
          await notificationQuery.refetch();
          toast.error(notification.errorDetails || 'Notification failed to send.');
          return;
        }
      }

      await notificationQuery.refetch();
      toast.warning('Notification is still sending. Automatic status checks stopped after 3 minutes.');
    } catch (error: unknown) { toast.error(errorMessage(error)); }
  };

  const content = !selectedRequest ? <Empty className="py-20"><EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>Request not found</EmptyTitle><EmptyDescription>The Dataverse record may have been removed or the link is invalid.</EmptyDescription></EmptyHeader><EmptyContent><Button asChild><Link to="/requests">Back to requests</Link></Button></EmptyContent></Empty> : <div className="space-y-5"><Card className="gap-0 py-0"><CardHeader className="gap-2 px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><CardTitle>{selectedRequest.sourceReference}</CardTitle><CardDescription className="truncate">{selectedRequest.summary}</CardDescription></div><RequestStatusBadge value={ProvisioningRequestStatusKeyToLabel[selectedRequest.statusKey]} /></div><div className="flex flex-wrap gap-2 border-t pt-2"><Button size="sm" variant="outline" onClick={copyHandoff}><ClipboardCopy />Copy handoff</Button>{['OnHold', 'Exception'].includes(selectedRequest.statusKey) ? <Button size="sm" onClick={() => void changeRequestStatus(selectedRequest, 'InProgress')}><Play />Resume</Button> : <><Button size="sm" variant="outline" disabled={selectedRequest.statusKey === 'Completed'} onClick={() => setStatusAction('OnHold')}><Pause />Place on hold</Button><Button size="sm" variant="outline" disabled={selectedRequest.statusKey === 'Completed'} onClick={() => setStatusAction('Exception')}><TriangleAlert />Raise exception</Button></>}<Button size="sm" variant="outline" disabled={closing || selectedRequest.statusKey === 'Completed' || !allUsersNotified} onClick={() => void closeAtFinalStage()}><CircleCheck />{closing ? 'Closing…' : 'Close request'}</Button><Button size="sm" variant="destructive" disabled={selectedRequest.statusKey === 'Completed'} onClick={() => setStatusAction('Cancelled')}><CircleX />Cancel request</Button>{selectedRequest.statusKey === 'Completed' && <Button size="sm" onClick={() => setReopenRequest(selectedRequest)}><RotateCcw />Reopen</Button>}</div></CardHeader></Card>{workspace.usersForRequest(selectedRequest.id).map((item: RequestUserView) => {
    const configured = workspace.configuredStagesForUser(item);
    const userNotifications = notifications
      .filter((notification: NotificationRecord) => sameDataverseId(notification.requestedUser.id, item.id))
      .sort((a: NotificationRecord, b: NotificationRecord) => {
        const dateDifference = new Date(b.sentDate ?? b.lastUpdatedDate ?? 0).getTime() - new Date(a.sentDate ?? a.lastUpdatedDate ?? 0).getTime();
        return dateDifference || b.attemptNumber - a.attemptNumber;
      });
    const pending = userNotifications.find((notification: NotificationRecord) => notification.statusKey !== 'Sent');
    return <Card key={item.requestUser.id} className="gap-0 py-0"><CardContent className="px-4 pt-4">{configured.length ? <RequestWorkflowProgress stages={configured} progress={workspace.stageProgress.filter((entry: RequestedUserStageProgress) => sameDataverseId(entry.requestUser?.id, item.requestUser.id))} pending={updateStageProgress.isPending || updateRequestUser.isPending} disabled={['Completed', 'OnHold', 'Exception', 'Cancelled'].includes(selectedRequest.statusKey)} forceFinal={selectedRequest.statusKey === 'Completed'} optimisticStageId={optimisticStages[item.requestUser.id]} onSelect={(stage: RequestStageConfiguration) => { void advanceStage(item, stage); }} /> : <p className="text-sm text-muted-foreground">No active workflow stages are configured.</p>}</CardContent><CardHeader className="px-4 py-2"><div className="flex justify-between gap-3"><div><CardTitle className="text-base">{item.fullName}</CardTitle><CardDescription>{item.email} · {item.bSCID}</CardDescription></div><RequestStatusBadge value={userStatusLabel(item.statusKey)} /></div></CardHeader><CardContent className="space-y-3 px-4 pb-4"><div className="grid gap-3 md:grid-cols-3"><Info label="Application" value={item.application.applicationName} /><Info label="Environment" value={item.environment?.environmentName ?? '—'} /><Info label="Roles" value={item.roles.map((role: Pick<AccessRole, 'id' | 'accessRoleName'>) => role.accessRoleName).join(', ') || 'None'} /></div><details open className="group border-t pt-3"><summary className="flex cursor-pointer justify-between"><span className="font-medium">Notifications <Badge variant="secondary">{userNotifications.length}</Badge></span><ChevronDown className="size-4 group-open:rotate-180" /></summary><div className="space-y-2 pt-2"><div className={userNotifications.length > 3 ? 'max-h-48 overflow-y-auto' : undefined}>{userNotifications.map((notification: NotificationRecord) => <div key={notification.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto] items-center gap-2 border-b py-1.5 last:border-b-0"><Info label="Sent Date" value={notification.sentDate ? new Date(notification.sentDate).toLocaleString() : '—'} /><Info label="Recipient Email" value={notification.recipientEmail} /><Info label="Email Template" value={notification.emailTemplate.emailTemplateName} /><RequestStatusBadge value={notification.statusKey} /></div>)}</div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!pending || pending.statusKey === 'Sending'} onClick={() => pending && setPreview(pending)}><Eye />Preview</Button><Button size="sm" disabled={Boolean(pending)} onClick={() => void markNotificationReady(item)}>Mark notification ready</Button></div></div></details></CardContent></Card>;
  })}</div>;

  return <><QueryState queries={[workspace.requestQuery, workspace.requestedUserQuery, workspace.requestUserQuery, workspace.requestUserRoleQuery, workspace.stageProgressQuery, workspace.roleStageQuery, notificationQuery, activityQuery, templateQuery, stageOptionQuery, accessEntryQuery]}>{content}</QueryState><Dialog open={Boolean(statusAction)} onOpenChange={(open: boolean) => { if (!open) setStatusAction(null); }}><DialogContent><DialogHeader><DialogTitle>Update request status</DialogTitle><DialogDescription>Record the operational reason for this change.</DialogDescription></DialogHeader><div className="space-y-2"><Label>Reason</Label><Textarea value={statusReason} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setStatusReason(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setStatusAction(null)}>Cancel</Button><Button disabled={!statusReason.trim()} onClick={() => selectedRequest && statusAction && void changeRequestStatus(selectedRequest, statusAction, statusReason.trim())}>Confirm</Button></DialogFooter></DialogContent></Dialog><Dialog open={Boolean(preview)} onOpenChange={(open: boolean) => { if (!open) setPreview(null); }}><DialogContent><DialogHeader><DialogTitle>{preview?.subjectSnapshot}</DialogTitle><DialogDescription>Review the queued notification.</DialogDescription></DialogHeader><div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-4 text-muted-foreground">{preview?.bodySnapshot}</div><DialogFooter><Button variant="outline" onClick={() => setPreview(null)}>Close</Button><Button onClick={() => void confirmNotification()}>Mark sent</Button></DialogFooter></DialogContent></Dialog><AlertDialog open={Boolean(reopenRequest)} onOpenChange={(open: boolean) => { if (!open) setReopenRequest(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Reopen completed request?</AlertDialogTitle><AlertDialogDescription>The linked users will return to their previous workflow stage.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep completed</AlertDialogCancel><AlertDialogAction onClick={(event: React.MouseEvent<HTMLButtonElement>) => { event.preventDefault(); if (reopenRequest) void reopen(reopenRequest); }}>Reopen request</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
