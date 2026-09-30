import { useMemo, useState, type ChangeEvent } from 'react';
import { BookOpen, ExternalLink, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useAccessRoleList,
  useApplicationList,
  useCreateGuideLink,
  useDeleteGuideLink,
  useEnvironmentList,
  useGuideLinkList,
  useUpdateGuideLink,
} from '@/generated/hooks';
import type { AccessRole } from '@/generated/models/access-role-model';
import type { Application } from '@/generated/models/application-model';
import type { Environment } from '@/generated/models/environment-model';
import { GuideLinkTypeKeyToLabel, type GuideLink, type GuideLinkTypeKey } from '@/generated/models/guide-link-model';

const emptyForm = {
  label: '',
  url: '',
  applicationId: '',
  type: 'Guide' as GuideLinkTypeKey,
  environmentId: 'all',
  accessRoleId: 'all',
  active: true,
};

export default function GuidesPage() {
  const guideQuery = useGuideLinkList({ orderBy: ['label asc'] });
  const applicationQuery = useApplicationList({ orderBy: ['applicationName asc'] });
  const environmentQuery = useEnvironmentList({ orderBy: ['environmentName asc'] });
  const accessRoleQuery = useAccessRoleList({ orderBy: ['accessRoleName asc'] });
  const createGuide = useCreateGuideLink();
  const updateGuide = useUpdateGuideLink();
  const deleteGuide = useDeleteGuideLink();
  const guides = guideQuery.data ?? [];
  const applications = applicationQuery.data ?? [];
  const environments = environmentQuery.data ?? [];
  const accessRoles = accessRoleQuery.data ?? [];
  const [search, setSearch] = useState('');
  const [applicationFilter, setApplicationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editing, setEditing] = useState<GuideLink | null>(null);
  const [open, setOpen] = useState(false);
  const [guideToDelete, setGuideToDelete] = useState<GuideLink | null>(null);
  const [form, setForm] = useState(emptyForm);

  const rows = useMemo(
    () => guides.filter((item: GuideLink) =>
      (!search.trim() || `${item.label} ${item.application.applicationName}`.toLowerCase().includes(search.toLowerCase()))
      && (applicationFilter === 'all' || item.application.id === applicationFilter)
      && (typeFilter === 'all' || item.typeKey === typeFilter),
    ),
    [applicationFilter, guides, search, typeFilter],
  );

  const startNew = () => {
    if (!applications[0]) {
      toast.error('Configure an application first.');
      return;
    }
    setEditing(null);
    setForm({ ...emptyForm, applicationId: applications[0].id });
    setOpen(true);
  };

  const startEdit = (item: GuideLink) => {
    setEditing(item);
    setForm({
      label: item.label,
      url: item.uRL,
      applicationId: item.application.id,
      type: item.typeKey,
      environmentId: item.environment?.id ?? 'all',
      accessRoleId: item.accessRole?.id ?? 'all',
      active: item.activeState,
    });
    setOpen(true);
  };

  const save = async () => {
    const application = applications.find((item: Application) => item.id === form.applicationId);
    const environment = environments.find((item: Environment) => item.id === form.environmentId);
    const accessRole = accessRoles.find((item: AccessRole) => item.id === form.accessRoleId);
    if (!application || !form.label.trim() || !form.url.trim()) {
      toast.error('Complete the label, URL, and application.');
      return;
    }
    const fields = {
      label: form.label.trim(),
      uRL: form.url.trim(),
      application: { id: application.id, applicationName: application.applicationName },
      typeKey: form.type,
      environment: environment ? { id: environment.id, environmentName: environment.environmentName } : undefined,
      accessRole: accessRole ? { id: accessRole.id, accessRoleName: accessRole.accessRoleName } : undefined,
      activeState: form.active,
    };
    try {
      if (editing) await updateGuide.mutateAsync({ id: editing.id, changedFields: fields });
      else await createGuide.mutateAsync(fields);
      setOpen(false);
      toast.success(editing ? 'Guide updated.' : 'Guide created.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Unable to save guide.');
    }
  };

  const confirmDelete = async () => {
    if (!guideToDelete) return;
    try {
      await deleteGuide.mutateAsync(guideToDelete.id);
      setGuideToDelete(null);
      toast.success('Guide deleted.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete guide.');
    }
  };

  const refreshDataverseData = async () => {
    const results = await Promise.all([
      guideQuery.refetch(),
      applicationQuery.refetch(),
      environmentQuery.refetch(),
      accessRoleQuery.refetch(),
    ]);
    if (results.some((result: { isError: boolean }) => result.isError)) {
      toast.warning('Guide data refresh did not work.');
      return;
    }
    toast.success('Guide data refreshed.');
  };

  return (
    <>
      <Card className="border-0 bg-transparent py-0 shadow-none">
        <CardHeader className="px-0">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <CardTitle>Guides and resources</CardTitle>
              <CardDescription>Application-specific operational links stored in Dataverse.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { void refreshDataverseData(); }} disabled={guideQuery.isFetching || applicationQuery.isFetching || environmentQuery.isFetching || accessRoleQuery.isFetching}>
                <RefreshCw className={guideQuery.isFetching || applicationQuery.isFetching || environmentQuery.isFetching || accessRoleQuery.isFetching ? 'animate-spin' : undefined} />
                Refresh
              </Button>
              <Button onClick={startNew}><Plus />Create guide</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-60 flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Search guides" />
            </div>
            <Select value={applicationFilter} onValueChange={setApplicationFilter}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All applications</SelectItem>
                {applications.filter((item: Application) => Boolean(item.id)).map((item: Application) => (
                  <SelectItem key={item.id} value={item.id}>{item.applicationName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(GuideLinkTypeKeyToLabel).filter(([value]: [string, string]) => Boolean(value)).map(([value, label]: [string, string]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {rows.length ? (
            <div className="grid auto-rows-fr gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((item: GuideLink) => (
                <Card key={item.id} className="relative flex h-full flex-col gap-0 py-0">
                  <CardHeader className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start pr-28">
                      <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                        <BookOpen className="size-5" />
                      </div>
                      <div className="absolute right-4 top-4 flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="size-8 hover:bg-transparent" onClick={() => startEdit(item)} aria-label={`Edit ${item.label}`}>
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:bg-transparent hover:text-destructive"
                          onClick={() => setGuideToDelete(item)}
                          disabled={deleteGuide.isPending}
                          aria-label={`Delete ${item.label}`}
                        >
                          <Trash2 />
                        </Button>
                        <Badge
                          className={item.activeState
                            ? 'h-6 w-24 justify-center bg-status-success px-1.5 text-status-success-foreground ring-1 ring-inset ring-status-success'
                            : 'h-6 w-24 justify-center px-1.5'
                          }
                          variant={item.activeState ? 'default' : 'destructive'}
>
                          {item.activeState ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <div className="min-h-12">
                      <CardTitle className="text-base leading-5">{item.label}</CardTitle>
                      <CardDescription className="mt-1 leading-5">{item.application.applicationName}</CardDescription>
                    </div>
                    <div className="mt-auto flex min-h-6 flex-wrap content-start gap-2">
                      <Badge variant="secondary">{GuideLinkTypeKeyToLabel[item.typeKey]}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button asChild variant="outline" className="w-full">
                      <a href={item.uRL} target="_blank" rel="noreferrer"><ExternalLink />Open resource</a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <BookOpen className="mx-auto mb-3 size-8" />
              <p className="font-semibold">No matching guides</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] gap-4 p-6 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit guide link' : 'Create guide link'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update this guide or resource in Dataverse.' : 'Add a guide or resource to Dataverse.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="guide-label">Label <span className="text-destructive" aria-hidden="true">*</span></Label>
              <Input id="guide-label" value={form.label} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, label: event.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="guide-url">URL <span className="text-destructive" aria-hidden="true">*</span></Label>
              <Input id="guide-url" value={form.url} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, url: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Application <span className="text-destructive" aria-hidden="true">*</span></Label>
              <Select value={form.applicationId || 'none'} onValueChange={(value: string) => setForm({ ...form, applicationId: value === 'none' ? '' : value, environmentId: 'all', accessRoleId: 'all' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select application</SelectItem>
                  {applications.filter((item: Application) => Boolean(item.id)).map((item: Application) => (
                    <SelectItem key={item.id} value={item.id}>{item.applicationName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type <span className="text-destructive" aria-hidden="true">*</span></Label>
              <Select value={form.type} onValueChange={(value: GuideLinkTypeKey) => setForm({ ...form, type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GuideLinkTypeKeyToLabel).filter(([value]: [string, string]) => Boolean(value)).map(([value, label]: [string, string]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={form.environmentId} onValueChange={(environmentId: string) => setForm({ ...form, environmentId })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All environments</SelectItem>
                  {environments.filter((item: Environment) => Boolean(item.id) && item.application.id === form.applicationId).map((item: Environment) => (
                    <SelectItem key={item.id} value={item.id}>{item.environmentName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Access role</Label>
              <Select value={form.accessRoleId} onValueChange={(accessRoleId: string) => setForm({ ...form, accessRoleId })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {accessRoles.filter((item: AccessRole) => Boolean(item.id) && item.application.id === form.applicationId).map((item: AccessRole) => (
                    <SelectItem key={item.id} value={item.id}>{item.accessRoleName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-3 sm:col-span-2">
      <AlertDialog open={Boolean(guideToDelete)} onOpenChange={(isOpen: boolean) => { if (!isOpen && !deleteGuide.isPending) setGuideToDelete(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete guide or link?</AlertDialogTitle><AlertDialogDescription>{guideToDelete ? `${guideToDelete.label} will be permanently removed from Dataverse.` : 'This guide or link will be permanently removed from Dataverse.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleteGuide.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={deleteGuide.isPending} onClick={(event: React.MouseEvent<HTMLButtonElement>) => { event.preventDefault(); void confirmDelete(); }}>{deleteGuide.isPending ? 'Deleting…' : 'Delete guide'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
              <Switch checked={form.active} onCheckedChange={(active: boolean) => setForm({ ...form, active })} />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { void save(); }}>{editing ? 'Save changes' : 'Create guide'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
