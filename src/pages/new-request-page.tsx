import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useBlocker, useNavigate } from 'react-router-dom';
import { AppWindow, ChevronDown, ClipboardCopy, Plus, Save, TriangleAlert, X } from 'lucide-react';
import { toast } from 'sonner';

import { QueryState } from '@/components/query-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useAccessControlEntryList,

  useApplicationList,
  useCreateActivityRecord,
  useCreateProvisioningRequest,
  useCreateRequestedUser,
  useCreateRequestedUserStageProgress,
  useCreateRequestUser,
  useCreateRequestUserRole,
  useEnvironmentList,
  useUpdateRequestedUser,
} from '@/generated/hooks';
import type { AccessControlEntry } from '@/generated/models/access-control-entry-model';
import type { AccessRole } from '@/generated/models/access-role-model';
import type { Application } from '@/generated/models/application-model';
import type { Environment } from '@/generated/models/environment-model';
import type { ProvisioningRequest } from '@/generated/models/provisioning-request-model';
import type { RequestedUser } from '@/generated/models/requested-user-model';
import type { RequestStageConfiguration } from '@/generated/models/request-stage-configuration-model';
import type { RequestUser } from '@/generated/models/request-user-model';
import type { RequestUserRole } from '@/generated/models/request-user-role-model';
import { useRequestData } from '@/hooks/use-request-data';
import { useUser } from '@/hooks/use-user';
import { errorMessage, hasDuplicateValues, isDuplicateDraftUserField, normalizeEmail, sameDataverseId } from '@/lib/provisioning-utils';

type DraftUser = { name: string; email: string; bsc: string; roleIds: string[] };
type RequestForm = { source: 'ServiceNow' | 'Email'; reference: string; summary: string; applicationId: string; environmentId: string; notes: string };
const emptyUser = (): DraftUser => ({ name: '', email: '', bsc: '', roleIds: [] });

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate text-sm font-medium" title={value}>{value}</p></div>;
}

export default function NewRequestPage() {
  const navigate = useNavigate();
  const userQuery = useUser();
  const workspace = useRequestData();
  const applicationQuery = useApplicationList({ orderBy: ['applicationName asc'] });
  const environmentQuery = useEnvironmentList({ orderBy: ['environmentName asc'] });
  const accessEntryQuery = useAccessControlEntryList();

  const createRequest = useCreateProvisioningRequest();
  const createRequestedUser = useCreateRequestedUser();
  const updateRequestedUser = useUpdateRequestedUser();
  const createRequestUser = useCreateRequestUser();
  const createRequestUserRole = useCreateRequestUserRole();
  const createStageProgress = useCreateRequestedUserStageProgress();
  const createActivity = useCreateActivityRecord();
  const [form, setForm] = useState<RequestForm>({ source: 'ServiceNow', reference: '', summary: '', applicationId: '', environmentId: '', notes: '' });
  const [draftUsers, setDraftUsers] = useState<DraftUser[]>([emptyUser()]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cleanState = useRef('');
  const skipWarning = useRef(false);
  const applications = useMemo(() => applicationQuery.data ?? [], [applicationQuery.data]);
  const environments = useMemo(() => environmentQuery.data ?? [], [environmentQuery.data]);
  const accessEntries = useMemo(() => accessEntryQuery.data ?? [], [accessEntryQuery.data]);
  const selectedApplication = applications.find((item: Application) => sameDataverseId(item.id, form.applicationId));
  const availableEnvironments = useMemo(
    () => environments.filter((item: Environment) => sameDataverseId(item.application.id, form.applicationId)),
    [environments, form.applicationId],
  );
  const availableRoles = useMemo(
    () => workspace.roleQuery.data?.filter((item: AccessRole) => sameDataverseId(item.application.id, form.applicationId)) ?? [],
    [workspace.roleQuery.data, form.applicationId],
  );
  const selectedEnvironment = availableEnvironments.find((item: Environment) => sameDataverseId(item.id, form.environmentId));
  const selectedRoleIds = new Set(draftUsers.flatMap((item: DraftUser) => item.roleIds));
  const selectedRoles = availableRoles.filter((item: AccessRole) => selectedRoleIds.has(item.id));
  const editableState = JSON.stringify({ form, draftUsers });
  const hasInput = Boolean(form.reference.trim() || form.summary.trim() || form.notes.trim() || draftUsers.some((item: DraftUser) => item.name.trim() || item.email.trim() || item.bsc.trim() || item.roleIds.length));
  const blocker = useBlocker(() => !skipWarning.current && cleanState.current !== editableState && hasInput);

  useEffect(() => { cleanState.current = JSON.stringify({ form: { source: 'ServiceNow', reference: '', summary: '', applicationId: '', environmentId: '', notes: '' }, draftUsers: [emptyUser()] }); }, []);
  useEffect(() => { if (!form.applicationId && applications[0]) setForm((current: RequestForm) => ({ ...current, applicationId: applications[0].id })); }, [applications, form.applicationId]);
  useEffect(() => {
    if (!form.environmentId && availableEnvironments[0]) {
      setForm((current: RequestForm) => ({ ...current, environmentId: availableEnvironments[0].id }));
    }
    setDraftUsers((current: DraftUser[]) => {
      let changed = false;
      const next = current.map((item: DraftUser) => {
        const roleIds = item.roleIds.filter((roleId: string) =>
          availableRoles.some((role: AccessRole) => sameDataverseId(role.id, roleId)),
        );
        if (roleIds.length === item.roleIds.length) return item;
        changed = true;
        return { ...item, roleIds };
      });
      return changed ? next : current;
    });
  }, [availableEnvironments, availableRoles, form.environmentId]);
  useEffect(() => {
    if (!hasInput) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { if (!skipWarning.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasInput]);

  const duplicateField = (index: number, field: 'email' | 'bsc') => isDuplicateDraftUserField(draftUsers, index, field);
  const existingField = (item: DraftUser, field: 'email' | 'bsc') => {
    const value = field === 'email' ? normalizeEmail(item.email) : item.bsc.trim();
    return Boolean(value && workspace.requestedUsers.some((user: RequestedUser) => (field === 'email' ? user.normalizedEmail : user.bSCID.trim()) === value));
  };

  const copyHandoff = async () => {
    await navigator.clipboard.writeText([`Application: ${selectedApplication?.applicationName ?? 'Not selected'}`, `Environment: ${selectedEnvironment?.environmentName ?? 'Not selected'}`, `Roles: ${selectedRoles.map((role: AccessRole) => role.accessRoleName).join(', ') || 'None'}`, `Requested users: ${draftUsers.filter((item: DraftUser) => item.name.trim()).length}`].join('\n'));
    toast.success('Provisioning handoff copied.');
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitError(null);
    const actor = userQuery.data;
    const validUsers = draftUsers.filter((item: DraftUser) => item.name.trim() && item.email.trim() && item.bsc.trim());
    if (!actor?.fullName || !actor.userPrincipalName) { toast.error('Identity verification is required.'); return; }
    if (!selectedApplication || !selectedEnvironment || !form.reference.trim() || !form.summary.trim() || !validUsers.length || validUsers.some((item: DraftUser) => !item.roleIds.length)) { toast.error('Complete all required fields and select at least one role per user.'); return; }
    if (validUsers.some((item: DraftUser) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email.trim()) || !/^\d{7}$/.test(item.bsc.trim()))) { toast.error('Enter a valid email and seven-digit BSC ID for every user.'); return; }
    if (hasDuplicateValues(validUsers.map((item: DraftUser) => normalizeEmail(item.email))) || hasDuplicateValues(validUsers.map((item: DraftUser) => item.bsc.trim()))) { toast.error('Each user must have a unique email and BSC ID.'); return; }
    const existingAccess = validUsers.find((item: DraftUser) => { const user = workspace.requestedUsers.find((candidate: RequestedUser) => candidate.normalizedEmail === normalizeEmail(item.email)); return user && accessEntries.some((entry: AccessControlEntry) => sameDataverseId(entry.requestedUser.id, user.id) && sameDataverseId(entry.application.id, selectedApplication.id)); });
    if (existingAccess) { toast.info(`${existingAccess.name} already has access to ${selectedApplication.applicationName}.`); navigate('/access-control'); return; }
    setSubmitting(true);
    try {
      let request = workspace.requests.find((item: ProvisioningRequest) => item.sourceTypeKey === form.source && item.sourceReference.toLowerCase() === form.reference.trim().toLowerCase());
      if (!request) request = await createRequest.mutateAsync({ provisioningRequestName: form.reference.trim(), sourceReference: form.reference.trim(), sourceTypeKey: form.source, summary: form.summary.trim(), notes: form.notes.trim() || undefined, ownerName: actor.fullName, ownerEmail: actor.userPrincipalName, createdDate: new Date().toISOString(), statusKey: 'InProgress' });
      for (const draft of validUsers) {
        const normalizedEmail = normalizeEmail(draft.email);
        let person = workspace.requestedUsers.find((item: RequestedUser) => item.normalizedEmail === normalizedEmail);
        if (!person) person = await createRequestedUser.mutateAsync({ fullName: draft.name.trim(), email: draft.email.trim(), normalizedEmail, bSCID: draft.bsc.trim(), activeState: true, application: { id: selectedApplication.id, applicationName: selectedApplication.applicationName }, statusKey: 'New' });
        else if (person.fullName !== draft.name.trim() || person.bSCID !== draft.bsc.trim()) await updateRequestedUser.mutateAsync({ id: person.id, changedFields: { fullName: draft.name.trim(), email: draft.email.trim(), normalizedEmail, bSCID: draft.bsc.trim() } });
        let requestUser = workspace.requestUsers.find((item: RequestUser) => sameDataverseId(item.provisioningRequest.id, request.id) && sameDataverseId(item.requestedUser.id, person.id) && sameDataverseId(item.application?.id, selectedApplication.id));
        if (!requestUser) requestUser = await createRequestUser.mutateAsync({ requestUserName: `${request.sourceReference} - ${person.fullName}`, provisioningRequest: { id: request.id, provisioningRequestName: request.provisioningRequestName }, requestedUser: { id: person.id, fullName: person.fullName }, application: { id: selectedApplication.id, applicationName: selectedApplication.applicationName }, environment: { id: selectedEnvironment.id, environmentName: selectedEnvironment.environmentName }, statusKey: 'New', notes: form.notes.trim() || undefined });
        for (const roleId of draft.roleIds) {
          const role = availableRoles.find((item: AccessRole) => sameDataverseId(item.id, roleId));
          if (role && !workspace.requestUserRoles.some((item: RequestUserRole) => sameDataverseId(item.requestUser.id, requestUser.id) && sameDataverseId(item.accessRole.id, role.id))) await createRequestUserRole.mutateAsync({ requestUserRoleName: `${requestUser.requestUserName} - ${role.accessRoleName}`, requestUser: { id: requestUser.id, requestUserName: requestUser.requestUserName }, accessRole: { id: role.id, accessRoleName: role.accessRoleName }, activeState: true });
        }
        const stages = workspace.roleStages.filter((stage: RequestStageConfiguration) => stage.activeState && draft.roleIds.some((roleId: string) => sameDataverseId(roleId, stage.accessRole.id))).sort((a: RequestStageConfiguration, b: RequestStageConfiguration) => a.sequenceNumber - b.sequenceNumber);
        for (const [index, stage] of stages.entries()) if (!workspace.stageProgress.some((item) => sameDataverseId(item.requestUser?.id, requestUser.id) && item.workflowStageOption?.stageName.toLowerCase() === stage.stageName.toLowerCase())) await createStageProgress.mutateAsync({ stageProgressName: `${requestUser.requestUserName} - ${stage.stageName}`, requestUser: { id: requestUser.id, requestUserName: requestUser.requestUserName }, workflowStageOption: { id: stage.id, stageName: stage.stageName }, sequenceNumber: index + 1, stateKey: index === 0 ? 'InProgress' : 'NotStarted' });
      }
      await createActivity.mutateAsync({ activityRecordName: `IntakeCreated - ${request.sourceReference}`, actionTypeKey: 'IntakeCreated', actorEmail: actor.userPrincipalName, actorName: actor.fullName, description: `Request created with ${validUsers.length} requested user(s).`, provisioningRequest: { id: request.id, provisioningRequestName: request.provisioningRequestName }, timestamp: new Date().toISOString() });
      skipWarning.current = true;
      toast.success('Request created in Dataverse.');
      navigate(`/requests/${request.id}`);
    } catch (error: unknown) { const message = errorMessage(error); setSubmitError(message); toast.error(message); }
    finally { setSubmitting(false); }
  };

  const content = !applications.length ? <Empty className="py-20"><EmptyHeader><EmptyMedia variant="icon"><AppWindow /></EmptyMedia><EmptyTitle>Configure an application first</EmptyTitle><EmptyDescription>Provisioning requests require an application, environment, and role.</EmptyDescription></EmptyHeader><EmptyContent><Button asChild><Link to="/applications"><Plus />Add application</Link></Button></EmptyContent></Empty> : <div className="space-y-5"><Card><CardHeader><CardTitle>Provisioning handoff</CardTitle><CardDescription>Review the configuration accompanying this intake.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end"><Info label="Application" value={selectedApplication?.applicationName ?? 'Not selected'} /><Info label="Environment" value={selectedEnvironment?.environmentName ?? 'Not selected'} /><Info label="Roles" value={selectedRoles.map((role: AccessRole) => role.accessRoleName).join(', ') || 'None'} /><Info label="Requested users" value={String(draftUsers.filter((item: DraftUser) => item.name.trim()).length)} /><Button variant="outline" className="w-full sm:col-span-2 xl:col-span-1 xl:w-auto" onClick={() => void copyHandoff()}><ClipboardCopy />Copy handoff</Button></CardContent></Card><Card className="gap-3"><CardHeader><CardTitle>Request intake</CardTitle><CardDescription>Create the request and requested-user records in Dataverse.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="grid gap-2 md:grid-cols-2"><div className="space-y-1"><Label>Source <span className="text-destructive" aria-hidden="true">*</span></Label><Select value={form.source} onValueChange={(value: 'ServiceNow' | 'Email') => setForm({ ...form, source: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ServiceNow">ServiceNow</SelectItem><SelectItem value="Email">Email</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Reference <span className="text-destructive" aria-hidden="true">*</span></Label><Input className="placeholder:font-light placeholder:italic placeholder:text-muted-foreground" placeholder="ServiceNow request/task number or email reference" value={form.reference} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, reference: event.target.value })} /></div><div className="space-y-1 md:col-span-2"><Label>Summary <span className="text-destructive" aria-hidden="true">*</span></Label><Input className="placeholder:font-light placeholder:italic placeholder:text-muted-foreground" placeholder="Brief description of the request" value={form.summary} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, summary: event.target.value })} /></div><div className="space-y-1"><Label>Application <span className="text-destructive" aria-hidden="true">*</span></Label><Select value={form.applicationId || 'none'} onValueChange={(value: string) => setForm({ ...form, applicationId: value, environmentId: '' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{applications.filter((item: Application) => item.id).map((item: Application) => <SelectItem key={item.id} value={item.id}>{item.applicationName}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Environment <span className="text-destructive" aria-hidden="true">*</span></Label><Select value={form.environmentId || 'none'} onValueChange={(value: string) => setForm({ ...form, environmentId: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{availableEnvironments.filter((item: Environment) => item.id).map((item: Environment) => <SelectItem key={item.id} value={item.id}>{item.environmentName}</SelectItem>)}</SelectContent></Select></div></div><div className="space-y-1"><div className="flex items-center justify-between"><Label>Requested users <span className="text-destructive" aria-hidden="true">*</span></Label><Button variant="outline" size="sm" onClick={() => setDraftUsers((current: DraftUser[]) => [...current, emptyUser()])}><Plus />Add user</Button></div>{draftUsers.map((item: DraftUser, index: number) => <div key={index} className="relative min-w-0 rounded-md py-1.5"><div className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_minmax(14rem,1fr)]">{index > 0 && <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="absolute right-full top-1/2 size-6 -translate-y-1/2 text-destructive transition-none hover:-translate-y-1/2 hover:shadow-none active:-translate-y-1/2 active:scale-100 active:shadow-none" onClick={() => setDraftUsers((current: DraftUser[]) => current.filter((_row: DraftUser, rowIndex: number) => rowIndex !== index))}><X /></Button></TooltipTrigger><TooltipContent>Remove user</TooltipContent></Tooltip>}<Input placeholder="Full name" value={item.name} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftUsers((current: DraftUser[]) => current.map((row: DraftUser, rowIndex: number) => rowIndex === index ? { ...row, name: event.target.value } : row))} /><div><Input placeholder="Email" value={item.email} aria-invalid={duplicateField(index, 'email') || existingField(item, 'email')} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftUsers((current: DraftUser[]) => current.map((row: DraftUser, rowIndex: number) => rowIndex === index ? { ...row, email: event.target.value } : row))} />{(duplicateField(index, 'email') || existingField(item, 'email')) && <p className="text-xs text-destructive">Email is already in use.</p>}</div><div><Input placeholder="BSC ID" inputMode="numeric" maxLength={7} value={item.bsc} aria-invalid={duplicateField(index, 'bsc') || existingField(item, 'bsc')} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraftUsers((current: DraftUser[]) => current.map((row: DraftUser, rowIndex: number) => rowIndex === index ? { ...row, bsc: event.target.value.replace(/\D/g, '').slice(0, 7) } : row))} />{(duplicateField(index, 'bsc') || existingField(item, 'bsc')) && <p className="text-xs text-destructive">BSC ID is already in use.</p>}</div><Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="w-full justify-between font-normal"><span className="truncate">{item.roleIds.length ? `${item.roleIds.length} selected` : 'Select roles'}</span><ChevronDown /></Button></PopoverTrigger><PopoverContent align="end" className="w-72 p-2"><p className="px-2 pb-2 text-sm font-medium">Roles / Teams for {item.name.trim() || `user ${index + 1}`}</p><div className="max-h-60 space-y-1 overflow-y-auto">{availableRoles.filter((role: AccessRole) => role.id).map((role: AccessRole) => <label key={role.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent hover:text-accent-foreground"><Checkbox checked={item.roleIds.includes(role.id)} onCheckedChange={(checked: boolean | 'indeterminate') => setDraftUsers((current: DraftUser[]) => current.map((row: DraftUser, rowIndex: number) => rowIndex === index ? { ...row, roleIds: checked === true ? [...row.roleIds, role.id] : row.roleIds.filter((roleId: string) => roleId !== role.id) } : row))} />{role.accessRoleName}</label>)}</div></PopoverContent></Popover></div></div>)}</div><div className="space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, notes: event.target.value })} /></div>{submitError && <Alert variant="destructive"><TriangleAlert /><AlertTitle>Request could not be created</AlertTitle><AlertDescription>{submitError}</AlertDescription></Alert>}<Button disabled={submitting} onClick={() => void submit()}><Save />{submitting ? 'Creating…' : 'Create Request'}</Button></CardContent></Card></div>;

  return <><QueryState queries={[applicationQuery, environmentQuery, workspace.roleQuery, workspace.requestQuery, workspace.requestedUserQuery, workspace.requestUserQuery, workspace.requestUserRoleQuery, workspace.stageProgressQuery, workspace.roleStageQuery, accessEntryQuery]}>{content}</QueryState><AlertDialog open={blocker.state === 'blocked'} onOpenChange={(open: boolean) => { if (!open && blocker.state === 'blocked') blocker.reset?.(); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard unsaved request?</AlertDialogTitle><AlertDialogDescription>Your request details and requested users will be lost.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => blocker.reset?.()}>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => blocker.proceed?.()}>Discard changes</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
