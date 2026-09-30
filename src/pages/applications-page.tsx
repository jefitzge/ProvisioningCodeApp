import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AppWindow, ChevronDown, Pencil, Plus, RefreshCw, Search, Settings2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Textarea } from '@/components/ui/textarea';
import {
  useAccessControlEntryList, useAccessRoleList, useApplicationList, useCreateAccessRole, useCreateApplication,
  useCreateEnvironment, useCreateRequestStageConfiguration, useCreateWorkflowStageOption, useDeleteAccessRole,
  useDeleteApplication, useDeleteEnvironment, useDeleteRequestStageConfiguration, useDeleteWorkflowStageOption,
  useEmailTemplateList, useEnvironmentList, useGuideLinkList, useRequestStageConfigurationList, useRequestedUserList,
  useRequestUserList, useSecurityConfigurationList, useUpdateAccessRole, useUpdateApplication, useUpdateEnvironment,
  useUpdateRequestStageConfiguration, useUpdateSecurityConfiguration, useUpdateWorkflowStageOption, useWorkflowStageOptionList,
} from '@/generated/hooks';
import type { AccessRole } from '@/generated/models/access-role-model';
import type { Application } from '@/generated/models/application-model';
import { RequestStageConfigurationStageTypeKeyToLabel, type RequestStageConfiguration, type RequestStageConfigurationStageTypeKey } from '@/generated/models/request-stage-configuration-model';
import type { Environment } from '@/generated/models/environment-model';
import type { EmailTemplate } from '@/generated/models/email-template-model';
import { EnvironmentEnvironmentTypeKeyToLabel, type EnvironmentEnvironmentTypeKey } from '@/generated/models/environment-model';
import { GuideLinkTypeKeyToLabel, type GuideLink } from '@/generated/models/guide-link-model';
import { SecurityConfigurationArchitectureKeyToLabel, SecurityConfigurationConfigurationTypeKeyToLabel, type SecurityConfiguration, type SecurityConfigurationArchitectureKey } from '@/generated/models/security-configuration-model';
import { WorkflowStageOptionStageTypeKeyToLabel, type WorkflowStageOption, type WorkflowStageOptionStageTypeKey } from '@/generated/models/workflow-stage-option-model';
import { sameDataverseId } from '@/lib/provisioning-utils';
type DeleteTarget =
  | { kind: 'application'; item: Application }
  | { kind: 'role'; item: AccessRole }
  | { kind: 'environment'; item: Environment }
  | { kind: 'stage'; item: RequestStageConfiguration }
  | { kind: 'workflow'; item: WorkflowStageOption };


const emptyApplication = { name: '', description: '', active: true, architecture: 'DirectRole' as SecurityConfigurationArchitectureKey };
const emptyEnvironment = { name: '', code: '', type: 'Development' as EnvironmentEnvironmentTypeKey, active: true };
const emptyRole = { name: '', description: '', active: true };
const emptyStage = { name: '', stageName: '', roleId: '', type: 'Provisioning' as RequestStageConfigurationStageTypeKey, sequence: '1', active: true };
const emptyWorkflow = { stageName: '', description: '', type: 'Provisioning' as WorkflowStageOptionStageTypeKey, sequence: '1', active: true };
type SortOrder = 'name-asc' | 'name-desc';

export default function ApplicationsPage() {
  const query = useApplicationList({ orderBy: ['applicationName asc'] });
  const environmentQuery = useEnvironmentList();
  const roleQuery = useAccessRoleList();
  const securityConfigurationQuery = useSecurityConfigurationList();
  const accessEntryQuery = useAccessControlEntryList();
  const emailTemplateQuery = useEmailTemplateList();
  const deleteApplication = useDeleteApplication();
  const guideLinkQuery = useGuideLinkList();
  const requestUserQuery = useRequestUserList();
  const requestedUserQuery = useRequestedUserList();
  const stageConfigQuery = useRequestStageConfigurationList({ orderBy: ['sequenceNumber asc'] });
  const workflowQuery = useWorkflowStageOptionList({ orderBy: ['sequenceNumber asc'] });
  const createApplication = useCreateApplication();
  const updateApplication = useUpdateApplication();
  const updateSecurityConfiguration = useUpdateSecurityConfiguration();
  const createRole = useCreateAccessRole();
  const createEnvironment = useCreateEnvironment();
  const updateEnvironment = useUpdateEnvironment();
  const deleteEnvironment = useDeleteEnvironment();
  const updateRole = useUpdateAccessRole();
  const deleteRole = useDeleteAccessRole();
  const createStage = useCreateRequestStageConfiguration();
  const updateStage = useUpdateRequestStageConfiguration();
  const deleteStage = useDeleteRequestStageConfiguration();
  const accessEntries = accessEntryQuery.data ?? [];
  const emailTemplates = emailTemplateQuery.data ?? [];
  const guideLinks = guideLinkQuery.data ?? [];
  const requestUsers = requestUserQuery.data ?? [];
  const requestedUsers = requestedUserQuery.data ?? [];
  const createWorkflow = useCreateWorkflowStageOption();
  const updateWorkflow = useUpdateWorkflowStageOption();
  const deleteWorkflow = useDeleteWorkflowStageOption();
  const securityConfigurations = securityConfigurationQuery.data ?? [];
  const applications = query.data ?? [];
  const environments = environmentQuery.data ?? [];
  const roles = roleQuery.data ?? [];
  const stageConfigurations = stageConfigQuery.data ?? [];
  const workflowStages = workflowQuery.data ?? [];
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('name-asc');
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [applicationForm, setApplicationForm] = useState(emptyApplication);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [environmentOpen, setEnvironmentOpen] = useState(false);
  const [environmentForm, setEnvironmentForm] = useState(emptyEnvironment);
  const [editingRole, setEditingRole] = useState<AccessRole | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleForm, setRoleForm] = useState(emptyRole);
  const [rolesOpen, setRolesOpen] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [editingStage, setEditingStage] = useState<RequestStageConfiguration | null>(null);
  const [stageOpen, setStageOpen] = useState(false);
  const [stageForm, setStageForm] = useState(emptyStage);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowStageOption | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [stageSearch, setStageSearch] = useState('');
  const [stageApplicationIds, setStageApplicationIds] = useState<string[]>([]);
  const [workflowForm, setWorkflowForm] = useState(emptyWorkflow);

  const filteredStageConfigurations = useMemo(() => stageConfigurations.filter((item: RequestStageConfiguration) => {
    const role = item.accessRole ? roles.find((entry: AccessRole) => sameDataverseId(entry.id, item.accessRole?.id ?? '')) : undefined;
    const applicationId = role?.application?.id;
    const matchesSearch = !stageSearch || `${item.requestStageConfigurationName} ${item.accessRole?.accessRoleName ?? ''} ${item.stageName}`.toLowerCase().includes(stageSearch.toLowerCase());
    const matchesApplication = stageApplicationIds.length === 0 || Boolean(applicationId && stageApplicationIds.some((id: string) => sameDataverseId(id, applicationId)));
    return matchesSearch && matchesApplication;
  }), [roles, stageApplicationIds, stageConfigurations, stageSearch]);
  const rows = useMemo(() => applications
    .filter((item: Application) => !search || `${item.applicationName} ${item.description ?? ''}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a: Application, b: Application) => sortOrder === 'name-asc' ? a.applicationName.localeCompare(b.applicationName) : b.applicationName.localeCompare(a.applicationName)), [applications, search, sortOrder]);

  const beginApplication = (item?: Application) => {
    const linkedConfiguration = item ? securityConfigurations.find((configuration: SecurityConfiguration) =>
      configuration.application && sameDataverseId(configuration.application.id, item.id)) : undefined;
    setEditingApplication(item ?? null);
    setApplicationForm(item ? { name: item.applicationName, description: item.description ?? '', active: item.activeState, architecture: linkedConfiguration?.architectureKey ?? 'DirectRole' } : emptyApplication);
    setEditingRole(null);
    setRoleForm(emptyRole);
    setApplicationOpen(true);
  };

  const saveApplication = async () => {
    if (!applicationForm.name.trim()) return toast.error('Enter an application name.');
    const fields = { applicationName: applicationForm.name.trim(), description: applicationForm.description.trim() || undefined, activeState: applicationForm.active };
    try {
      if (editingApplication) {
        await updateApplication.mutateAsync({ id: editingApplication.id, changedFields: fields });
        const linkedConfigurations = securityConfigurations.filter((configuration: SecurityConfiguration) =>
          configuration.application && sameDataverseId(configuration.application.id, editingApplication.id));
        await Promise.all(linkedConfigurations.map((configuration: SecurityConfiguration) => updateSecurityConfiguration.mutateAsync({
          id: configuration.id,
          changedFields: {
            architectureKey: applicationForm.architecture,
            application: { id: editingApplication.id, applicationName: applicationForm.name.trim() },
          },
        })));
      } else await createApplication.mutateAsync(fields);
      setApplicationOpen(false);
      toast.success('Application saved.');
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Unable to save application.'); }
  };

  const beginRole = (item?: AccessRole) => {
    setEditingRole(item ?? null);
    setRoleForm(item ? { name: item.accessRoleName, description: item.description ?? '', active: item.activeState } : emptyRole);
    setRoleOpen(true);
  };

  const saveRole = async () => {
    if (!editingApplication || !roleForm.name.trim()) return toast.error('Enter a role or team name.');
    const fields = { accessRoleName: roleForm.name.trim(), description: roleForm.description.trim() || undefined, activeState: roleForm.active, application: { id: editingApplication.id, applicationName: editingApplication.applicationName } };
    try {
      if (editingRole) await updateRole.mutateAsync({ id: editingRole.id, changedFields: fields });
      else await createRole.mutateAsync(fields);
      setRoleOpen(false);
      setEditingRole(null);
      setRoleForm(emptyRole);
      toast.success('Role configuration saved.');
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Unable to save role configuration.'); }
  };

  const beginEnvironment = (item?: Environment) => {
    setEditingEnvironment(item ?? null);
    setEnvironmentForm(item ? { name: item.environmentName, code: item.environmentCode, type: item.environmentTypeKey, active: item.activeState } : emptyEnvironment);
    setEnvironmentOpen(true);
  };

  const saveEnvironment = async () => {
    if (!editingApplication || !environmentForm.name.trim() || !environmentForm.code.trim()) return toast.error('Enter an environment name and code.');
    const fields = { environmentName: environmentForm.name.trim(), environmentCode: environmentForm.code.trim(), environmentTypeKey: environmentForm.type, activeState: environmentForm.active, application: { id: editingApplication.id, applicationName: editingApplication.applicationName } };
    try {
      if (editingEnvironment) await updateEnvironment.mutateAsync({ id: editingEnvironment.id, changedFields: fields });
      else await createEnvironment.mutateAsync(fields);
      setEnvironmentOpen(false);
      setEditingEnvironment(null);
      setEnvironmentForm(emptyEnvironment);
      toast.success('Environment saved.');
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Unable to save environment.'); }
  };

  const beginStage = (item?: RequestStageConfiguration) => {
    setEditingStage(item ?? null);
    setStageForm(item ? { name: item.requestStageConfigurationName, stageName: item.stageName, roleId: item.accessRole?.id ?? '', type: item.stageTypeKey, sequence: String(item.sequenceNumber), active: item.activeState } : emptyStage);
    setStageOpen(true);
  };

  const saveStageConfiguration = async () => {
    const role = roles.find((item: AccessRole) => sameDataverseId(item.id, stageForm.roleId));
    const sequence = Number(stageForm.sequence);
    if (!stageForm.name.trim() || !stageForm.stageName.trim() || !role || !Number.isFinite(sequence)) return toast.error('Complete all stage configuration fields.');
    const fields = { requestStageConfigurationName: stageForm.name.trim(), stageName: stageForm.stageName.trim(), accessRole: { id: role.id, accessRoleName: role.accessRoleName }, stageTypeKey: stageForm.type, sequenceNumber: sequence, activeState: stageForm.active };
    try {
      if (editingStage) await updateStage.mutateAsync({ id: editingStage.id, changedFields: fields });
      else await createStage.mutateAsync(fields);
      setStageOpen(false); toast.success('Stage configuration saved.');
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Unable to save stage configuration.'); }
  };

  const beginWorkflow = (item?: WorkflowStageOption) => {
    setEditingWorkflow(item ?? null);
    setWorkflowForm(item ? { stageName: item.stageName, description: item.description ?? '', type: item.stageTypeKey, sequence: String(item.sequenceNumber), active: item.activeState } : emptyWorkflow);
    setWorkflowOpen(true);
  };

  const saveWorkflowOption = async () => {
    const sequence = Number(workflowForm.sequence);
    if (!workflowForm.stageName.trim() || !Number.isFinite(sequence)) return toast.error('Enter a stage name and sequence.');
    const fields = { stageName: workflowForm.stageName.trim(), description: workflowForm.description.trim() || undefined, stageTypeKey: workflowForm.type, sequenceNumber: sequence, activeState: workflowForm.active };
    try {
      if (editingWorkflow) await updateWorkflow.mutateAsync({ id: editingWorkflow.id, changedFields: fields });
      else await createWorkflow.mutateAsync(fields);
      setWorkflowOpen(false);
      toast.success('Workflow option saved.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Unable to save workflow option.');
    }
  };

  const applicationDependencyCount = (applicationId: string) =>
    environments.filter((item: Environment) => item.application && sameDataverseId(item.application.id, applicationId)).length
    + roles.filter((item: AccessRole) => item.application && sameDataverseId(item.application.id, applicationId)).length
    + accessEntries.filter((item) => item.application && sameDataverseId(item.application.id, applicationId)).length
    + emailTemplates.filter((item) => item.application && sameDataverseId(item.application.id, applicationId)).length
    + guideLinks.filter((item) => item.application && sameDataverseId(item.application.id, applicationId)).length
    + requestUsers.filter((item) => item.application && sameDataverseId(item.application.id, applicationId)).length
    + requestedUsers.filter((item) => item.application && sameDataverseId(item.application.id, applicationId)).length;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'application' && applicationDependencyCount(deleteTarget.item.id) > 0) {
      toast.error('This application cannot be deleted until its linked dependencies are removed or replaced.');
      return;
    }
    try {
      if (deleteTarget.kind === 'application') {
        await deleteApplication.mutateAsync(deleteTarget.item.id);
        toast.success('Application deleted.');
      } else if (deleteTarget.kind === 'role') {
        await deleteRole.mutateAsync(deleteTarget.item.id);
        setRoleOpen(false);
        setEditingRole(null);
        setRoleForm(emptyRole);
        toast.success('Role deleted.');
      } else if (deleteTarget.kind === 'environment') {
        const dependencyCount = securityConfigurations.filter((item: SecurityConfiguration) => item.environment && sameDataverseId(item.environment.id, deleteTarget.item.id)).length;
        if (dependencyCount > 0) {
          toast.error('This environment cannot be deleted until its linked dependencies are removed or replaced.');
          return;
        }
        await deleteEnvironment.mutateAsync(deleteTarget.item.id);
        toast.success('Environment deleted.');
      } else if (deleteTarget.kind === 'stage') {
        await deleteStage.mutateAsync(deleteTarget.item.id);
        toast.success('Stage configuration deleted.');
      } else {
        await deleteWorkflow.mutateAsync(deleteTarget.item.id);
        toast.success('Workflow option deleted.');
      }
      setDeleteTarget(null);
    } catch (error: unknown) {
      const fallback = deleteTarget.kind === 'application'
        ? 'This application cannot be deleted until its linked dependencies are removed or replaced.'
        : 'Unable to delete the Dataverse record.';
      toast.error(error instanceof Error && error.message ? error.message : fallback);
    }
  };
  const deletePending = deleteApplication.isPending || deleteRole.isPending || deleteEnvironment.isPending || deleteStage.isPending || deleteWorkflow.isPending;
  const deleteName = deleteTarget?.kind === 'application' ? deleteTarget.item.applicationName : deleteTarget?.kind === 'role' ? deleteTarget.item.accessRoleName : deleteTarget?.kind === 'environment' ? deleteTarget.item.environmentName : deleteTarget?.kind === 'stage' ? deleteTarget.item.requestStageConfigurationName : deleteTarget?.item.stageName;
  const deleteLabel = deleteTarget?.kind === 'application' ? 'application' : deleteTarget?.kind === 'role' ? 'role or team' : deleteTarget?.kind === 'environment' ? 'environment' : deleteTarget?.kind === 'stage' ? 'stage configuration' : 'workflow option';
  const selectedApplicationDependencyCount = deleteTarget?.kind === 'application' ? applicationDependencyCount(deleteTarget.item.id) : 0;

  const refresh = async () => {
    const results = await Promise.all([query.refetch(), environmentQuery.refetch(), roleQuery.refetch(), stageConfigQuery.refetch(), workflowQuery.refetch(), accessEntryQuery.refetch(), emailTemplateQuery.refetch(), guideLinkQuery.refetch(), securityConfigurationQuery.refetch(), requestUserQuery.refetch(), requestedUserQuery.refetch()]);
    if (results.some((result: { isError: boolean }) => result.isError)) {
      toast.warning('Application configuration refresh did not work.');
      return;
    }
    toast.success('Application configuration refreshed.');
  };
  const applicationRoles = editingApplication ? roles.filter((item: AccessRole) => item.application && sameDataverseId(item.application.id, editingApplication.id)) : [];
  const applicationEnvironments = editingApplication ? environments.filter((item: Environment) => item.application && sameDataverseId(item.application.id, editingApplication.id)) : [];
  const applicationStages = stageConfigurations.filter((item: RequestStageConfiguration) => item.accessRole && applicationRoles.some((role: AccessRole) => sameDataverseId(role.id, item.accessRole.id)));
  const applicationSecurityConfigurations = securityConfigurations.filter((item: SecurityConfiguration) => item.application && editingApplication && sameDataverseId(item.application.id, editingApplication.id));
  const applicationGuides = editingApplication ? guideLinks.filter((item: GuideLink) => item.application && sameDataverseId(item.application.id, editingApplication.id)) : [];
  const applicationEmailTemplates = editingApplication ? emailTemplates.filter((item: EmailTemplate) => item.application && sameDataverseId(item.application.id, editingApplication.id)) : [];

  return (
    <>
      <div className="min-w-0 space-y-4 lg:space-y-5">
        <div>
          <h2 className="text-base font-semibold leading-none">Applications</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Manage applications and their provisioning configuration.</p>
        </div>
        <Tabs defaultValue="applications" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="max-w-full justify-start overflow-x-auto">
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="request-stage-configurations">Request stage configuration</TabsTrigger>
              <TabsTrigger value="workflow-stages">Workflow stage options</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={() => { void refresh(); }}><RefreshCw />Refresh</Button>
          </div>

          <TabsContent value="applications" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex min-w-64 flex-1 flex-wrap items-end gap-2">
                <div className="relative w-full min-w-0 flex-1 sm:min-w-64"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Search applications" aria-label="Search applications" /></div>
                <Select value={sortOrder} onValueChange={(value: string) => setSortOrder(value as SortOrder)}><SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="name-asc">Name A to Z</SelectItem><SelectItem value="name-desc">Name Z to A</SelectItem></SelectContent></Select>
              </div>
              <Button onClick={() => beginApplication()}><Plus />Add application</Button>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {rows.map((item: Application) => {
                const itemEnvironments = environments.filter((entry: Environment) => entry.application && sameDataverseId(entry.application.id, item.id));
                const itemRoles = roles.filter((entry: AccessRole) => entry.application && sameDataverseId(entry.application.id, item.id));
                const itemSecurityConfiguration = securityConfigurations.find((entry: SecurityConfiguration) => entry.application && sameDataverseId(entry.application.id, item.id));
                const assignments = itemRoles.map((entry: AccessRole) => entry.accessRoleName).join(', ') || 'None configured';
                const securityArchitecture = itemSecurityConfiguration ? SecurityConfigurationArchitectureKeyToLabel[itemSecurityConfiguration.architectureKey] : 'Not configured';
                return <Card key={item.id} className="flex h-full flex-col overflow-hidden"><CardHeader className="space-y-4"><div className="flex items-start justify-between gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><AppWindow className="size-5" /></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ kind: 'application', item })} className="text-destructive" aria-label={`Delete ${item.applicationName}`}><Trash2 /></Button><StatusBadge active={item.activeState} /></div></div><div className="min-w-0 space-y-1.5"><CardTitle className="break-words">{item.applicationName}</CardTitle><CardDescription className="relative h-12 overflow-hidden break-words leading-5"><span className="line-clamp-2">{item.description || 'No description'}</span></CardDescription></div></CardHeader><CardContent className="flex flex-1 flex-col gap-4"><div><p className="text-xs text-muted-foreground">Provisioning assignments</p><p className="relative mt-1 h-10 overflow-hidden break-words text-sm font-medium leading-5"><span className="line-clamp-2">{assignments}</span></p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Stat label="Security" value={securityArchitecture} /><Stat label="Environments" value={String(itemEnvironments.length)} /><Stat label="Roles / Teams" value={String(itemRoles.length)} /></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Stat label="Open requests" value="0" /><Stat label="Active users" value="0" /><Stat label="Welcome template" value="Not available" /></div><div className="mt-auto"><Button variant="outline" size="sm" className="w-full" onClick={() => beginApplication(item)}><Pencil />Manage configuration</Button></div></CardContent></Card>;
              })}
            </div>
          </TabsContent>

          <TabsContent value="request-stage-configurations" className="space-y-3">
            <SectionHeading title="Request stage configuration" description="Ordered provisioning stages assigned to access roles." actionLabel="Add configuration" onAction={() => beginStage()} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" value={stageSearch} onChange={(event: ChangeEvent<HTMLInputElement>) => setStageSearch(event.target.value)} placeholder="Search stage configurations" aria-label="Search stage configurations" /></div>
              <Popover>
                <PopoverTrigger asChild><Button variant="outline" className="justify-between sm:w-60">{stageApplicationIds.length ? `${stageApplicationIds.length} application${stageApplicationIds.length === 1 ? '' : 's'}` : 'All applications'}<ChevronDown className="size-4" /></Button></PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-2"><div className="max-h-64 space-y-1 overflow-y-auto">{applications.filter((application: Application) => application.id).map((application: Application) => { const checked = stageApplicationIds.some((id: string) => sameDataverseId(id, application.id)); return <label key={application.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary hover:text-secondary-foreground"><Checkbox checked={checked} onCheckedChange={(value: boolean | 'indeterminate') => setStageApplicationIds((current: string[]) => value === true ? [...current, application.id] : current.filter((id: string) => !sameDataverseId(id, application.id)))} /><span className="min-w-0 truncate">{application.applicationName}</span></label>; })}</div>{stageApplicationIds.length > 0 && <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setStageApplicationIds([])}>Clear filter</Button>}</PopoverContent>
              </Popover>
            </div>
            <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead className="h-9 px-3">Configuration</TableHead><TableHead className="h-9 px-3">Access role</TableHead><TableHead className="h-9 px-3">Stage</TableHead><TableHead className="h-9 px-3">Status</TableHead><TableHead className="h-9 px-3 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
              {filteredStageConfigurations.map((item: RequestStageConfiguration) => <TableRow key={item.id}><TableCell className="px-3 py-2 font-medium">{item.requestStageConfigurationName}</TableCell><TableCell className="px-3 py-2">{item.accessRole?.accessRoleName ?? 'Unassigned'}</TableCell><TableCell className="px-3 py-2">{item.stageName}</TableCell><TableCell className="px-3 py-2"><StatusBadge active={item.activeState} /></TableCell><TableCell className="px-3 py-2 text-right"><RowActions onEdit={() => beginStage(item)} onDelete={() => setDeleteTarget({ kind: 'stage', item })} /></TableCell></TableRow>)}
            </TableBody></Table>{!filteredStageConfigurations.length && <EmptyRows text="No request stage configurations found." />}</CardContent></Card>
          </TabsContent>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(isOpen: boolean) => { if (!isOpen && !deletePending) setDeleteTarget(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{selectedApplicationDependencyCount > 0 ? 'Application cannot be deleted' : `Delete ${deleteLabel}?`}</AlertDialogTitle><AlertDialogDescription>{selectedApplicationDependencyCount > 0 ? `${deleteName} has ${selectedApplicationDependencyCount} linked ${selectedApplicationDependencyCount === 1 ? 'dependency' : 'dependencies'} and cannot be deleted until they are removed or replaced.` : deleteName ? `${deleteName} will be permanently removed from Dataverse.` : 'This record will be permanently removed from Dataverse.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deletePending}>{selectedApplicationDependencyCount > 0 ? 'Close' : 'Cancel'}</AlertDialogCancel>{selectedApplicationDependencyCount === 0 && <AlertDialogAction disabled={deletePending} onClick={(event: React.MouseEvent<HTMLButtonElement>) => { event.preventDefault(); void confirmDelete(); }}>{deletePending ? 'Deleting…' : 'Delete'}</AlertDialogAction>}</AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

          <TabsContent value="workflow-stages" className="space-y-4">
            <SectionHeading title="Workflow stage options" description="Reusable stage options available across provisioning workflows." actionLabel="Add workflow option" onAction={() => beginWorkflow()} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workflowStages.map((item: WorkflowStageOption) => <Card key={item.id} className="flex h-full flex-col overflow-hidden"><CardHeader className="space-y-4"><div className="flex items-start justify-between gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><Settings2 className="size-5" /></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ kind: 'workflow', item })} className="text-destructive" aria-label={`Delete ${item.stageName}`}><Trash2 /></Button><StatusBadge active={item.activeState} /></div></div><div className="min-w-0 space-y-1.5"><CardTitle className="break-words">{item.stageName}</CardTitle><CardDescription className="relative h-12 overflow-hidden break-words leading-5"><span className="line-clamp-2">{item.description || 'No description'}</span></CardDescription></div></CardHeader><CardContent className="flex flex-1 flex-col gap-4"><div className="grid grid-cols-2 gap-3"><Stat label="Stage type" value={WorkflowStageOptionStageTypeKeyToLabel[item.stageTypeKey]} /><Stat label="Sequence" value={String(item.sequenceNumber)} /></div><div className="mt-auto"><Button variant="outline" size="sm" className="w-full" onClick={() => beginWorkflow(item)}><Pencil />Manage workflow option</Button></div></CardContent></Card>)}
            </div>
            {!workflowStages.length && <Card><CardContent className="pt-6"><EmptyRows text="No workflow stage options found." /></CardContent></Card>}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={applicationOpen} onOpenChange={setApplicationOpen}>
        <DialogContent className={`max-h-[90vh] overflow-y-auto ${editingApplication ? 'w-[75vw] max-w-[75vw] sm:max-w-[75vw]' : 'max-w-2xl'}`}>
          <DialogHeader><DialogTitle>{editingApplication ? 'Manage application configuration' : 'Add application'}</DialogTitle><DialogDescription>Configure application details{editingApplication ? ', roles, and teams.' : '.'}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid items-end gap-4 sm:grid-cols-12">
              <div className="sm:col-span-6"><Field label="Application name"><Input value={applicationForm.name} onChange={(event: ChangeEvent<HTMLInputElement>) => setApplicationForm({ ...applicationForm, name: event.target.value })} /></Field></div>
              <div className="sm:col-span-4"><SelectField label="Security architecture" value={applicationForm.architecture} onChange={(value: string) => setApplicationForm({ ...applicationForm, architecture: value as SecurityConfigurationArchitectureKey })} options={Object.entries(SecurityConfigurationArchitectureKeyToLabel).map(([value, label]: [string, string]) => ({ value, label }))} /></div>
              <div className="flex h-9 items-center gap-2 sm:col-span-2"><Checkbox id="active-application" checked={applicationForm.active} onCheckedChange={(checked: boolean | 'indeterminate') => setApplicationForm({ ...applicationForm, active: checked === true })} /><Label htmlFor="active-application">Active application</Label></div>
            </div>
            <Field label="Description"><Textarea className="min-h-24" value={applicationForm.description} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setApplicationForm({ ...applicationForm, description: event.target.value })} /></Field>
            {editingApplication && <Collapsible open={rolesOpen} onOpenChange={setRolesOpen} className="border-t pt-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><CollapsibleTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Toggle roles and teams"><ChevronDown className={`size-4 transition-transform ${rolesOpen ? 'rotate-180' : ''}`} /></Button></CollapsibleTrigger><span className="font-semibold">Roles and teams</span><span className="text-xs font-normal text-muted-foreground">{applicationRoles.length} configured</span></div><Button size="sm" variant="outline" onClick={() => beginRole()}><Plus />New role</Button></div>
              <CollapsibleContent>
                {applicationRoles.length ? <div className="min-w-0 max-w-full overflow-hidden rounded-md border">{applicationRoles.map((item: AccessRole) => <div key={item.id} className="grid min-h-10 min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b px-3 py-1.5 last:border-b-0"><div className="flex min-w-0 max-w-full items-baseline gap-2 overflow-hidden"><span className="shrink-0 text-sm font-medium">{item.accessRoleName}</span>{item.description && <OverflowDescription description={item.description} />}</div><div className="flex shrink-0 items-center gap-1"><RowActions onEdit={() => beginRole(item)} onDelete={() => setDeleteTarget({ kind: 'role', item })} /><StatusBadge active={item.activeState} /></div></div>)}</div> : <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">No roles or teams configured.</p>}
              </CollapsibleContent>
            </Collapsible>}
            {editingApplication && <CompactConfigurationSection title="Environments" count={applicationEnvironments.length} action={<Button size="sm" variant="outline" onClick={() => beginEnvironment()}><Plus />New environment</Button>}>
              {applicationEnvironments.length ? <CompactConfigurationList>{applicationEnvironments.map((item: Environment) => <CompactConfigurationRow key={item.id} title={item.environmentName} detail={`${item.environmentCode} · ${EnvironmentEnvironmentTypeKeyToLabel[item.environmentTypeKey]}`} actions={<RowActions onEdit={() => beginEnvironment(item)} onDelete={() => setDeleteTarget({ kind: 'environment', item })} />} status={<StatusBadge active={item.activeState} />} />)}</CompactConfigurationList> : <ConfigurationEmpty text="No environments configured." />}
            </CompactConfigurationSection>}
            {editingApplication && <CompactConfigurationSection title="Request stage configuration" count={applicationStages.length} action={<Button size="sm" variant="outline" onClick={() => beginStage()}><Plus />New stage</Button>}>
              {applicationStages.length ? <CompactConfigurationList>{applicationStages.map((item: RequestStageConfiguration) => <CompactConfigurationRow key={item.id} title={item.stageName} detail={`${item.accessRole?.accessRoleName ?? 'Unassigned'} · ${RequestStageConfigurationStageTypeKeyToLabel[item.stageTypeKey]} · Sequence ${item.sequenceNumber}`} actions={<RowActions onEdit={() => beginStage(item)} onDelete={() => setDeleteTarget({ kind: 'stage', item })} />} status={<StatusBadge active={item.activeState} />} />)}</CompactConfigurationList> : <ConfigurationEmpty text="No request stages configured for this application." />}
            </CompactConfigurationSection>}
            {editingApplication && <CompactConfigurationSection title="Provisioning assignments and groups" count={applicationSecurityConfigurations.length}>
              {applicationSecurityConfigurations.length ? <CompactConfigurationList>{applicationSecurityConfigurations.map((item: SecurityConfiguration) => <CompactConfigurationRow key={item.id} title={item.securityConfigurationName} detail={`${item.environment?.environmentName ?? 'Unassigned'} · ${SecurityConfigurationArchitectureKeyToLabel[item.architectureKey]} · ${SecurityConfigurationConfigurationTypeKeyToLabel[item.configurationTypeKey]}`} status={<StatusBadge active={item.activeState} />} />)}</CompactConfigurationList> : <ConfigurationEmpty text="No provisioning assignments or groups configured." />}
            </CompactConfigurationSection>}
            {editingApplication && <CompactConfigurationSection title="Guide links" count={applicationGuides.length}>
              {applicationGuides.length ? <CompactConfigurationList>{applicationGuides.map((item: GuideLink) => <CompactConfigurationRow key={item.id} title={item.label} detail={`${GuideLinkTypeKeyToLabel[item.typeKey]} · ${item.environment?.environmentName ?? 'All environments'} · ${item.accessRole?.accessRoleName ?? 'All roles'}`} status={<StatusBadge active={item.activeState} />} />)}</CompactConfigurationList> : <ConfigurationEmpty text="No guide links configured." />}
            </CompactConfigurationSection>}
            {editingApplication && <CompactConfigurationSection title="Email templates" count={applicationEmailTemplates.length}>
              {applicationEmailTemplates.length ? <CompactConfigurationList>{applicationEmailTemplates.map((item: EmailTemplate) => <CompactConfigurationRow key={item.id} title={item.emailTemplateName} detail={`Version ${item.version} · ${item.subject}`} status={<StatusBadge active={item.activeState} />} />)}</CompactConfigurationList> : <ConfigurationEmpty text="No email templates configured." />}
            </CompactConfigurationSection>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setApplicationOpen(false)}>Cancel</Button><Button onClick={() => { void saveApplication(); }} disabled={createApplication.isPending || updateApplication.isPending || updateSecurityConfiguration.isPending}>{createApplication.isPending || updateApplication.isPending || updateSecurityConfiguration.isPending ? 'Saving…' : 'Save application'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleOpen} onOpenChange={(isOpen: boolean) => { setRoleOpen(isOpen); if (!isOpen) { setEditingRole(null); setRoleForm(emptyRole); } }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
          <DialogHeader><DialogTitle>{editingRole ? 'Edit role or team' : 'Add role or team'}</DialogTitle><DialogDescription>Configure this application provisioning assignment.</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-1 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Application"><Input value={editingApplication?.applicationName ?? ''} disabled /></Field></div>
            <div className="sm:col-span-2"><Field label="Role or team name"><Input value={roleForm.name} onChange={(event: ChangeEvent<HTMLInputElement>) => setRoleForm({ ...roleForm, name: event.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Description"><Textarea className="min-h-20 resize-y" value={roleForm.description} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setRoleForm({ ...roleForm, description: event.target.value })} /></Field></div>
            <div className="flex items-center gap-2 sm:col-span-2"><Checkbox id="active-role" checked={roleForm.active} onCheckedChange={(checked: boolean | 'indeterminate') => setRoleForm({ ...roleForm, active: checked === true })} /><Label htmlFor="active-role">Active role or team</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRoleOpen(false)}>Cancel</Button><Button onClick={() => { void saveRole(); }} disabled={createRole.isPending || updateRole.isPending}>{createRole.isPending || updateRole.isPending ? 'Saving…' : editingRole ? 'Save changes' : 'Add role'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={environmentOpen} onOpenChange={(isOpen: boolean) => { setEnvironmentOpen(isOpen); if (!isOpen) { setEditingEnvironment(null); setEnvironmentForm(emptyEnvironment); } }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-xl">
          <DialogHeader><DialogTitle>{editingEnvironment ? 'Edit environment' : 'Add environment'}</DialogTitle><DialogDescription>Configure an environment for this application.</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-1 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Application"><Input value={editingApplication?.applicationName ?? ''} disabled /></Field></div>
            <Field label="Environment name"><Input value={environmentForm.name} onChange={(event: ChangeEvent<HTMLInputElement>) => setEnvironmentForm({ ...environmentForm, name: event.target.value })} /></Field>
            <Field label="Environment code"><Input value={environmentForm.code} onChange={(event: ChangeEvent<HTMLInputElement>) => setEnvironmentForm({ ...environmentForm, code: event.target.value })} /></Field>
            <SelectField label="Environment type" value={environmentForm.type} onChange={(value: string) => setEnvironmentForm({ ...environmentForm, type: value as EnvironmentEnvironmentTypeKey })} options={Object.entries(EnvironmentEnvironmentTypeKeyToLabel).map(([value, label]: [string, string]) => ({ value, label }))} />
            <div className="flex items-end pb-2"><div className="flex items-center gap-2"><Checkbox id="active-environment" checked={environmentForm.active} onCheckedChange={(checked: boolean | 'indeterminate') => setEnvironmentForm({ ...environmentForm, active: checked === true })} /><Label htmlFor="active-environment">Active environment</Label></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEnvironmentOpen(false)}>Cancel</Button><Button onClick={() => { void saveEnvironment(); }} disabled={createEnvironment.isPending || updateEnvironment.isPending}>{createEnvironment.isPending || updateEnvironment.isPending ? 'Saving…' : editingEnvironment ? 'Save changes' : 'Add environment'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stageOpen} onOpenChange={setStageOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{editingStage ? 'Edit stage configuration' : 'Add stage configuration'}</DialogTitle><DialogDescription>Assign an ordered workflow stage to an access role.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><Field label="Configuration name"><Input value={stageForm.name} onChange={(event: ChangeEvent<HTMLInputElement>) => setStageForm({ ...stageForm, name: event.target.value })} /></Field><Field label="Stage name"><Input value={stageForm.stageName} onChange={(event: ChangeEvent<HTMLInputElement>) => setStageForm({ ...stageForm, stageName: event.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-2"><SelectField label="Access role" value={stageForm.roleId || 'none'} onChange={(value: string) => setStageForm({ ...stageForm, roleId: value === 'none' ? '' : value })} options={roles.filter((item: AccessRole) => item.id && item.application).map((item: AccessRole) => ({ value: item.id, label: `${item.application.applicationName} · ${item.accessRoleName}` }))} /><SelectField label="Stage type" value={stageForm.type} onChange={(value: string) => setStageForm({ ...stageForm, type: value as RequestStageConfigurationStageTypeKey })} options={Object.entries(RequestStageConfigurationStageTypeKeyToLabel).map(([value, label]: [string, string]) => ({ value, label }))} /></div><Field label="Sequence"><Input type="number" min="1" value={stageForm.sequence} onChange={(event: ChangeEvent<HTMLInputElement>) => setStageForm({ ...stageForm, sequence: event.target.value })} /></Field><ToggleField label="Active" description="Include this stage in active request workflows." checked={stageForm.active} onChange={(active: boolean) => setStageForm({ ...stageForm, active })} /></div><DialogFooter><Button variant="outline" onClick={() => setStageOpen(false)}>Cancel</Button><Button onClick={() => { void saveStageConfiguration(); }}>{editingStage ? 'Save changes' : 'Add configuration'}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={workflowOpen} onOpenChange={setWorkflowOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{editingWorkflow ? 'Edit workflow option' : 'Add workflow option'}</DialogTitle><DialogDescription>Manage a reusable stage available to provisioning workflows.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><Field label="Stage name"><Input value={workflowForm.stageName} onChange={(event: ChangeEvent<HTMLInputElement>) => setWorkflowForm({ ...workflowForm, stageName: event.target.value })} /></Field><Field label="Description"><Textarea value={workflowForm.description} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setWorkflowForm({ ...workflowForm, description: event.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-2"><SelectField label="Stage type" value={workflowForm.type} onChange={(value: string) => setWorkflowForm({ ...workflowForm, type: value as WorkflowStageOptionStageTypeKey })} options={Object.entries(WorkflowStageOptionStageTypeKeyToLabel).map(([value, label]: [string, string]) => ({ value, label }))} /><Field label="Sequence"><Input type="number" min="1" value={workflowForm.sequence} onChange={(event: ChangeEvent<HTMLInputElement>) => setWorkflowForm({ ...workflowForm, sequence: event.target.value })} /></Field></div><ToggleField label="Active" description="Make this option available for workflow configuration." checked={workflowForm.active} onChange={(active: boolean) => setWorkflowForm({ ...workflowForm, active })} /></div><DialogFooter><Button variant="outline" onClick={() => setWorkflowOpen(false)}>Cancel</Button><Button onClick={() => { void saveWorkflowOption(); }}>{editingWorkflow ? 'Save changes' : 'Add option'}</Button></DialogFooter></DialogContent></Dialog>
    </>
  );
}
function CompactConfigurationSection({ title, count, action, children }: { title: string; count: number; action?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <Collapsible open={open} onOpenChange={setOpen} className="border-t pt-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><CollapsibleTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Toggle ${title}`}><ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} /></Button></CollapsibleTrigger><span className="font-semibold">{title}</span><span className="text-xs font-normal text-muted-foreground">{count} configured</span></div>{action}</div><CollapsibleContent>{children}</CollapsibleContent></Collapsible>;
}
function CompactConfigurationList({ children }: { children: React.ReactNode }) { return <div className="min-w-0 max-w-full overflow-hidden rounded-md border">{children}</div>; }
function CompactConfigurationRow({ title, detail, actions, status }: { title: string; detail: string; actions?: React.ReactNode; status: React.ReactNode }) { return <div className="grid min-h-10 min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b px-3 py-1.5 last:border-b-0"><div className="flex min-w-0 items-baseline gap-2 overflow-hidden"><span className="shrink-0 text-sm font-medium">{title}</span><span className="min-w-0 truncate text-xs italic text-muted-foreground">{detail}</span></div><div className="flex shrink-0 items-center gap-1">{actions}{status}</div></div>; }
function ConfigurationEmpty({ text }: { text: string }) { return <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{text}</p>; }
function OverflowDescription({ description }: { description: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    const checkOverflow = () => setIsOverflowing(element.scrollWidth > element.clientWidth);
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [description]);

  return (
    <span className="relative block min-w-0 flex-1 overflow-hidden">
      <span ref={textRef} className="block w-full overflow-hidden whitespace-nowrap text-xs italic text-muted-foreground">{description}</span>
      {isOverflowing && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-r from-transparent to-card" />}
    </span>
  );
}


function Stat({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{label}</p><span className="mt-1 block truncate text-sm font-medium">{value}</span></div>; }
function StatusBadge({ active }: { active: boolean }) { return <Badge className={active ? 'h-6 w-24 bg-status-success text-status-success-foreground ring-1 ring-inset ring-status-success' : 'h-6 w-24 bg-destructive text-destructive-foreground ring-1 ring-inset ring-destructive'}>{active ? 'Active' : 'Inactive'}</Badge>; }
function EmptyRows({ text }: { text: string }) { return <div className="py-12 text-center text-sm text-muted-foreground">{text}</div>; }
function SectionHeading({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) { return <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><Button onClick={onAction}><Plus />{actionLabel}</Button></div>; }
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) { return <div className="inline-flex gap-1"><Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit"><Pencil /></Button><Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive" aria-label="Delete"><Trash2 /></Button></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function ToggleField({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) { return <div className="flex items-center justify-between gap-4 rounded-md border p-3"><div><Label>{label}</Label><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onChange} /></div>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) { return <div className="space-y-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{value === 'none' && <SelectItem value="none">Select a role</SelectItem>}{options.filter((option: { value: string; label: string }) => option.value).map((option: { value: string; label: string }) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>; }
