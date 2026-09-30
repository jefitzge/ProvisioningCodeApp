import { initialize } from '@microsoft/power-apps/app';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  BookOpen,
  CodeXml,
  Eye,
  Italic,
  Link2,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Underline,
} from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateEmailTemplate,
  useDeleteEmailTemplate,
  useEmailTemplateList,
  useUpdateEmailTemplate,
} from '@/generated/hooks';
import type { Application } from '@/generated/models/application-model';
import type { EmailTemplate } from '@/generated/models/email-template-model';
import type { GuideLink } from '@/generated/models/guide-link-model';
import { GuideLinkService } from '@/generated/services/guide-link-service';
import { ApplicationService } from '@/generated/services/application-service';
import { useUser } from '@/hooks/use-user';

interface TemplateForm {
  name: string;
  applicationId: string;
  subject: string;
  body: string;
  from: string;
  support: string;
  cc: string;
  bcc: string;
  important: boolean;
  active: boolean;
}

const blank: TemplateForm = {
  name: '', applicationId: '', subject: '', body: '', from: '', support: '', cc: '', bcc: '', important: false, active: true,
};

const dynamicFields = [
  { label: 'User name', value: '{{UserName}}' },
  { label: 'Application name', value: '{{ApplicationName}}' },
  { label: 'Request reference', value: '{{RequestReference}}' },
  { label: 'Support contact', value: '{{SupportContact}}' },
];

export default function TemplatesPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [open, setOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(blank);
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');

  const userQuery = useUser();
  const query = useEmailTemplateList({ orderBy: ['emailTemplateName asc'] });
  const appQuery = useQuery({
    queryKey: ['application-list', { orderBy: ['applicationName asc'] }],
    queryFn: () => ApplicationService.getAll({ orderBy: ['applicationName asc'] }),
    enabled: query.isSuccess,
  });
  const guideQuery = useQuery({
    queryKey: ['guideLink-list', 'template-editor', form.applicationId],
    queryFn: async () => {
      await initialize();
      return GuideLinkService.getAll({
        orderBy: ['label asc'],
        filter: `application/id eq '${form.applicationId}'`,
      });
    },
    enabled: open && Boolean(form.applicationId),
  });
  const createItem = useCreateEmailTemplate();
  const updateItem = useUpdateEmailTemplate();
  const deleteItem = useDeleteEmailTemplate();
  const templates = query.data ?? [];
  const applications = appQuery.data ?? [];
  const guides = guideQuery.data ?? [];
  const [insertTarget, setInsertTarget] = useState<'subject' | 'body'>('body');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const visualBodyRef = useRef<HTMLDivElement>(null);
  const latestBodyRef = useRef(form.body);
  latestBodyRef.current = form.body;

  const setVisualBodyRef = useCallback((node: HTMLDivElement | null) => {
    visualBodyRef.current = node;
    if (node) node.innerHTML = latestBodyRef.current;
  }, []);

  const rows = useMemo(
    () => templates.filter((item: EmailTemplate) =>
      (!search || `${item.emailTemplateName} ${item.subject}`.toLowerCase().includes(search.toLowerCase()))
      && (filter === 'all' || item.application.id === filter),
    ),
    [filter, search, templates],
  );

  const selectedApplication = applications.find((item: Application) => item.id === form.applicationId);
  const selectedGuides = guides.filter((item: GuideLink) => item.activeState && item.application?.id === form.applicationId);

  const begin = (item?: EmailTemplate) => {
    const app = applications[0];
    if (!item && !app) {
      toast.error('Configure an application first.');
      return;
    }
    setEditing(item ?? null);
    setForm(item ? {
      name: item.emailTemplateName,
      applicationId: item.application.id,
      subject: item.subject,
      body: item.body,
      from: item.sendFromAddress,
      support: item.supportContact,
      cc: item.cCAddresses ?? '',
      bcc: item.bCCAddresses ?? '',
      important: item.important,
      active: item.activeState,
    } : {
      ...blank,
      applicationId: app.id,
      from: userQuery.data?.userPrincipalName ?? '',
      support: userQuery.data?.userPrincipalName ?? '',
    });
    setEditorMode('visual');
    setInsertTarget('body');
    setOpen(true);
  };

  const save = async () => {
    const app = applications.find((item: Application) => item.id === form.applicationId);
    const body = editorMode === 'visual' ? (visualBodyRef.current?.innerHTML ?? form.body) : form.body;
    if (!app || !form.name.trim() || !form.subject.trim() || !body.trim() || !form.from.trim() || !form.support.trim()) {
      toast.error('Complete all required fields.');
      return;
    }
    const fields = {
      emailTemplateName: form.name.trim(),
      application: { id: app.id, applicationName: app.applicationName },
      subject: form.subject.trim(),
      body: body.trim(),
      sendFromAddress: form.from.trim(),
      supportContact: form.support.trim(),
      cCAddresses: form.cc.trim() || undefined,
      bCCAddresses: form.bcc.trim() || undefined,
      important: form.important,
      activeState: form.active,
      version: (editing?.version ?? 0) + 1,
    };
    try {
      if (editing) await updateItem.mutateAsync({ id: editing.id, changedFields: fields });
      else await createItem.mutateAsync(fields);
      setOpen(false);
      toast.success('Template saved.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Unable to save template.');
    }
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteItem.mutateAsync(templateToDelete.id);
      setTemplateToDelete(null);
      toast.success('Template deleted.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete template.');
    }
  };

  const syncVisualBody = () => {
    const editor = visualBodyRef.current;
    if (editor) setForm((current: TemplateForm) => ({ ...current, body: editor.innerHTML }));
  };

  const insertText = (value: string) => {
    if (insertTarget === 'subject') {
      setForm((current: TemplateForm) => ({ ...current, subject: `${current.subject}${value}` }));
      return;
    }
    if (editorMode === 'visual' && visualBodyRef.current) {
      visualBodyRef.current.focus();
      document.execCommand(value.startsWith('<') ? 'insertHTML' : 'insertText', false, value);
      syncVisualBody();
      return;
    }
    const editor = bodyRef.current;
    const start = editor?.selectionStart ?? form.body.length;
    const end = editor?.selectionEnd ?? form.body.length;
    setForm((current: TemplateForm) => ({ ...current, body: `${current.body.slice(0, start)}${value}${current.body.slice(end)}` }));
  };

  const wrapSelection = (before: string, after: string = before) => {
    const editor = bodyRef.current;
    const start = editor?.selectionStart ?? form.body.length;
    const end = editor?.selectionEnd ?? form.body.length;
    setForm((current: TemplateForm) => ({
      ...current,
      body: `${current.body.slice(0, start)}${before}${current.body.slice(start, end)}${after}${current.body.slice(end)}`,
    }));
  };

  const formatVisual = (command: string, value?: string) => {
    visualBodyRef.current?.focus();
    document.execCommand(command, false, value);
    syncVisualBody();
  };

  const editorActions = [
    { label: 'Bold', icon: Bold, action: () => editorMode === 'visual' ? formatVisual('bold') : wrapSelection('<strong>', '</strong>') },
    { label: 'Italic', icon: Italic, action: () => editorMode === 'visual' ? formatVisual('italic') : wrapSelection('<em>', '</em>') },
    { label: 'Underline', icon: Underline, action: () => editorMode === 'visual' ? formatVisual('underline') : wrapSelection('<u>', '</u>') },
    { label: 'Align left', icon: AlignLeft, action: () => editorMode === 'visual' ? formatVisual('justifyLeft') : wrapSelection('<div style="text-align:left">', '</div>') },
    { label: 'Align center', icon: AlignCenter, action: () => editorMode === 'visual' ? formatVisual('justifyCenter') : wrapSelection('<div style="text-align:center">', '</div>') },
    { label: 'Align right', icon: AlignRight, action: () => editorMode === 'visual' ? formatVisual('justifyRight') : wrapSelection('<div style="text-align:right">', '</div>') },
    { label: 'Justify text', icon: AlignJustify, action: () => editorMode === 'visual' ? formatVisual('justifyFull') : wrapSelection('<div style="text-align:justify">', '</div>') },
    { label: 'Bulleted list', icon: List, action: () => editorMode === 'visual' ? formatVisual('insertUnorderedList') : wrapSelection('<ul><li>', '</li></ul>') },
    { label: 'Numbered list', icon: ListOrdered, action: () => editorMode === 'visual' ? formatVisual('insertOrderedList') : wrapSelection('<ol><li>', '</li></ol>') },
    { label: 'Decrease indent', icon: ListIndentDecrease, action: () => editorMode === 'visual' ? formatVisual('outdent') : wrapSelection('<div style="margin-left:0">', '</div>') },
    { label: 'Increase indent', icon: ListIndentIncrease, action: () => editorMode === 'visual' ? formatVisual('indent') : wrapSelection('<div style="margin-left:2rem">', '</div>') },
    { label: 'Insert hyperlink', icon: Link2, action: () => editorMode === 'visual' ? formatVisual('createLink', 'https://example.com') : wrapSelection('<a href="https://example.com">', '</a>') },
  ];

  return (
    <>
      <Card className="border-0 bg-transparent py-0 shadow-none">
        <CardHeader className="px-0">
          <div className="flex flex-wrap justify-between gap-3">
            <div><CardTitle>Email templates</CardTitle><CardDescription>Versioned notification content by application.</CardDescription></div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={query.isFetching || appQuery.isFetching}
                onClick={() => {
                  void (async () => {
                    const templateResult = await query.refetch();
                    const applicationResult = await appQuery.refetch();
                    if (templateResult.isError || applicationResult.isError) {
                      toast.warning('Templates refresh did not work.');
                      return;
                    }
                    toast.success('Templates refreshed.');
                  })();
                }}
              >
                <RefreshCw className={query.isFetching || appQuery.isFetching ? 'animate-spin' : undefined} />
                Refresh
              </Button>
              <Button onClick={() => begin()}><Plus />New template</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-0 flex-1 sm:min-w-64">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Search templates" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All applications</SelectItem>
                {applications.filter((item: Application) => Boolean(item.id)).map((item: Application) => <SelectItem key={item.id} value={item.id}>{item.applicationName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {rows.length ? (
            <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((item: EmailTemplate) => (
                <Card key={item.id} className="relative flex min-w-0 h-full flex-col gap-0 overflow-hidden py-0">
                  <CardHeader className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden p-4">
                    <div className="flex min-w-0 items-start pr-28">
                      <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><Mail className="size-5" /></div>
                      <div className="absolute right-4 top-4 flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="size-8 text-destructive hover:bg-transparent hover:text-destructive dark:hover:bg-transparent" aria-label={`Delete ${item.emailTemplateName}`} disabled={deleteItem.isPending} onClick={() => setTemplateToDelete(item)}><Trash2 /></Button>
                        <Badge className={item.activeState ? 'h-6 w-24 justify-center bg-status-success text-status-success-foreground ring-1 ring-inset ring-status-success' : 'h-6 w-24 justify-center'} variant={item.activeState ? 'default' : 'destructive'}>{item.activeState ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    </div>
                    <div className="min-h-12 min-w-0 overflow-hidden">
                      <CardTitle className="flex min-w-0 items-baseline gap-x-1.5 overflow-hidden text-base leading-5"><span className="min-w-0 truncate">{item.emailTemplateName}</span><span className="shrink-0 font-bold leading-5 text-foreground" aria-hidden="true">•</span><span className="shrink-0 whitespace-nowrap text-xs font-normal leading-5">v{item.version}</span></CardTitle>
                      <CardDescription className="mt-1.5 grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 overflow-hidden leading-5"><span className="max-w-32 truncate">{item.application.applicationName}</span><span className="shrink-0" aria-hidden="true">·</span><span className="min-w-0 overflow-hidden"><span className="block w-full min-w-0 truncate italic">{item.subject}</span></span></CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0"><Button variant="outline" className="w-full" onClick={() => begin(item)}><Pencil />Edit template</Button></CardContent>
                </Card>
              ))}
            </div>
          ) : <div className="py-16 text-center"><Mail className="mx-auto mb-3 size-8" /><p className="font-semibold">No matching templates</p></div>}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:w-[75vw] sm:max-w-[75vw]">
          <DialogHeader className="border-b px-6 py-5 pr-12">
            <DialogTitle className="break-words">{editing?.emailTemplateName ?? 'New template'}</DialogTitle>
            <DialogDescription>{editing ? 'Edit template details and save a new Dataverse version.' : 'Create notification content and save it to Dataverse.'}</DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 min-w-0 flex-1 gap-x-5 gap-y-6 overflow-y-auto overscroll-contain px-6 py-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 space-y-2"><Label>Template title <span className="text-destructive" aria-hidden="true">*</span></Label><Input maxLength={850} value={form.name} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: event.target.value })} /></div>
            <div className="min-w-0 space-y-2">
              <Label>Application <span className="text-destructive" aria-hidden="true">*</span></Label>
              <Select value={form.applicationId || 'none'} onValueChange={(value: string) => setForm({ ...form, applicationId: value === 'none' ? '' : value })}>
                <SelectTrigger className="w-full min-w-0"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Select application</SelectItem>{applications.filter((item: Application) => Boolean(item.id)).map((item: Application) => <SelectItem key={item.id} value={item.id}>{item.applicationName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-3 pb-2 md:col-span-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-8 lg:col-span-2">
              <label className="flex shrink-0 items-center gap-3"><Checkbox checked={form.important} onCheckedChange={(checked: boolean | 'indeterminate') => setForm({ ...form, important: checked === true })} />Mark as important <span className="text-destructive" aria-hidden="true">*</span></label>
              <label className="flex shrink-0 items-center gap-3"><Checkbox checked={form.active} onCheckedChange={(checked: boolean | 'indeterminate') => setForm({ ...form, active: checked === true })} />Active <span className="text-destructive" aria-hidden="true">*</span></label>
            </div>

            <div className="min-w-0 space-y-2 md:col-span-2 lg:col-span-4"><Label>Subject <span className="text-destructive" aria-hidden="true">*</span></Label><Input maxLength={100} value={form.subject} onFocus={() => setInsertTarget('subject')} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, subject: event.target.value })} /></div>

            <div className="min-w-0 space-y-2 md:col-span-2 lg:col-span-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Body <span className="text-destructive" aria-hidden="true">*</span></Label>
                <div className="flex gap-1 rounded-md border bg-muted p-1 text-muted-foreground">
                  <Button type="button" size="sm" variant={editorMode === 'visual' ? 'default' : 'ghost'} onClick={() => setEditorMode('visual')}><Eye />Visual</Button>
                  <Button type="button" size="sm" variant={editorMode === 'html' ? 'default' : 'ghost'} onClick={() => { syncVisualBody(); setEditorMode('html'); }}><CodeXml />HTML</Button>
                </div>
              </div>
              <div className="overflow-hidden rounded-md border bg-background text-foreground">
                {editorMode === 'visual' ? (
                  <div className="bg-card text-card-foreground">
                    <div className="flex flex-wrap gap-1 border-b bg-muted p-2 text-muted-foreground">
                      {editorActions.map(({ label, icon: Icon, action }, index: number) => <Button key={label} type="button" size="icon" variant="ghost" className={index === 3 || index === 7 ? 'ml-2' : ''} aria-label={label} title={label} onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault()} onClick={action}><Icon /></Button>)}
                    </div>
                    <div
                      ref={setVisualBodyRef}
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      aria-multiline="true"
                      aria-label="Email body rich text editor"
                      className="min-h-56 p-3 text-sm outline-none [&_a]:underline [&_blockquote]:ml-10 [&_li]:ml-0 [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc"

                      onFocus={() => setInsertTarget('body')}
                      onBlur={syncVisualBody}
                    />
                  </div>
                ) : (
                  <Textarea ref={bodyRef} aria-label="Email body HTML editor" className="min-h-56 resize-y rounded-none border-0 p-3 font-mono shadow-none focus-visible:ring-0" value={form.body} onFocus={() => setInsertTarget('body')} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, body: event.target.value })} />
                )}
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{editorMode === 'visual' ? 'Edit formatted content directly, or switch to HTML to edit the source.' : 'Edit the HTML source, then switch to Visual to continue rich-text editing.'}</span><span>{form.body.length}/2000</span></div>
            </div>

            <div className="min-w-0 space-y-2"><Label htmlFor="template-send-from">Send from <span className="text-destructive" aria-hidden="true">*</span></Label><Input id="template-send-from" type="email" maxLength={100} value={form.from} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, from: event.target.value })} /></div>
            <div className="min-w-0 space-y-2"><Label htmlFor="template-support-contact">Support contact <span className="text-destructive" aria-hidden="true">*</span></Label><Input id="template-support-contact" type="email" maxLength={100} value={form.support} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, support: event.target.value })} /></div>
            <div className="min-w-0 space-y-2"><Label htmlFor="template-cc">CC</Label><Input id="template-cc" type="email" maxLength={2000} placeholder="name@example.com; another@example.com" value={form.cc} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, cc: event.target.value })} /></div>
      <AlertDialog open={Boolean(templateToDelete)} onOpenChange={(isOpen: boolean) => { if (!isOpen && !deleteItem.isPending) setTemplateToDelete(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete email template?</AlertDialogTitle><AlertDialogDescription>{templateToDelete ? `${templateToDelete.emailTemplateName} version ${templateToDelete.version} will be permanently removed from Dataverse.` : 'This email template will be permanently removed from Dataverse.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleteItem.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={deleteItem.isPending} onClick={(event: React.MouseEvent<HTMLButtonElement>) => { event.preventDefault(); void confirmDelete(); }}>{deleteItem.isPending ? 'Deleting…' : 'Delete template'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
            <div className="min-w-0 space-y-2"><Label htmlFor="template-bcc">BCC</Label><Input id="template-bcc" type="email" maxLength={2000} placeholder="name@example.com; another@example.com" value={form.bcc} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, bcc: event.target.value })} /></div>

            <div className="space-y-4 rounded-md border p-5 md:col-span-2 lg:col-span-4">
              <div><p className="font-medium">Insert dynamic content</p><p className="mt-1 text-sm text-muted-foreground">Choose Subject or Body, place the cursor, then insert a field or application resource.</p></div>
              <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant={insertTarget === 'subject' ? 'default' : 'outline'} onClick={() => setInsertTarget('subject')}>Subject</Button><Button type="button" size="sm" variant={insertTarget === 'body' ? 'default' : 'outline'} onClick={() => setInsertTarget('body')}>Body</Button></div>
              <div className="space-y-2"><p className="text-sm font-medium">Fields</p><div className="flex flex-wrap gap-2">{dynamicFields.map((field: { label: string; value: string }) => <Button key={field.value} type="button" size="sm" variant="secondary" onClick={() => insertText(field.value)}>{field.label}</Button>)}</div></div>
              <div className="space-y-3 border-t pt-4"><div><p className="text-sm font-medium">Guides &amp; links</p><p className="mt-1 text-sm text-muted-foreground">Active resources for {selectedApplication?.applicationName ?? 'the selected application'}.</p></div><div className="flex flex-wrap gap-2">{selectedGuides.length ? selectedGuides.map((guide: GuideLink) => <Button key={guide.id} type="button" size="sm" variant="outline" onClick={() => insertText(`<a href=&quot;${guide.uRL}&quot;>${guide.label}</a>`)}><BookOpen />{guide.label}</Button>) : <span className="text-sm text-muted-foreground">No active resources configured.</span>}</div></div>
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4"><Button variant="outline" onClick={() => setOpen(false)}>Close</Button><Button onClick={() => { void save(); }}><Save />Save version</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
