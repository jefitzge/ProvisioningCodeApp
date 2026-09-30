import { useMemo, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Database, Download, Pencil, RefreshCw, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAccessControlEntryList, useApplicationList, useDeleteAccessControlEntry, useRequestedUserList } from '@/generated/hooks';
import type { AccessControlEntry } from '@/generated/models/access-control-entry-model';
import type { Application } from '@/generated/models/application-model';
import type { RequestedUser } from '@/generated/models/requested-user-model';

const pageSizes = ['10', '25', '50'];
const accessDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: '2-digit',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'America/New_York',
});
const accessTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
});

const formatAccessDate = (value?: string) => {
  if (!value) return { date: '—', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '—', time: '' };
  return { date: accessDateFormatter.format(date), time: accessTimeFormatter.format(date) };
};

type ResizableColumn = 'user' | 'applications' | 'roles' | 'provisioned' | 'completed' | 'status';

const columnLabels: Array<{ key: ResizableColumn; label: string; minimum: number }> = [
  { key: 'user', label: 'User', minimum: 120 },
  { key: 'applications', label: 'Applications', minimum: 120 },
  { key: 'roles', label: 'Roles / Teams', minimum: 110 },
  { key: 'provisioned', label: 'Date provisioned', minimum: 112 },
  { key: 'completed', label: 'Request completed', minimum: 112 },
  { key: 'status', label: 'Status', minimum: 84 },
];

const initialColumnWidths: Record<ResizableColumn, number> = {
  user: 160,
  applications: 160,
  roles: 140,
  provisioned: 136,
  completed: 136,
  status: 96,
};

export default function AccessControlPage() {
  const query = useAccessControlEntryList();
  const appQuery = useApplicationList({ orderBy: ['applicationName asc'] });
  const peopleQuery = useRequestedUserList();
  const remove = useDeleteAccessControlEntry();
  const entries = query.data ?? [];
  const applications = appQuery.data ?? [];
  const people = peopleQuery.data ?? [];
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [pageSize, setPageSize] = useState('25');
  const [entryToDelete, setEntryToDelete] = useState<AccessControlEntry | null>(null);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => entries.filter((item: AccessControlEntry) => {
    const person = people.find((entry: RequestedUser) => entry.id === item.requestedUser.id);
    return (filter === 'all' || item.application.id === filter) && (!search || `${item.requestedUser.fullName} ${person?.email ?? ''} ${person?.bSCID ?? ''} ${item.application.applicationName}`.toLowerCase().includes(search.toLowerCase()));
  }).sort((a: AccessControlEntry, b: AccessControlEntry) => {
    const first = new Date(a.dateProvisioned ?? a.grantedDate ?? 0).getTime();
    const second = new Date(b.dateProvisioned ?? b.grantedDate ?? 0).getTime();
    return sort === 'newest' ? second - first : first - second;
  }), [entries, filter, people, search, sort]);

  const [columnWidths, setColumnWidths] = useState<Record<ResizableColumn, number>>(initialColumnWidths);

  const startColumnResize = (event: ReactPointerEvent<HTMLButtonElement>, column: ResizableColumn, minimum: number) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = columnWidths[column];
    const handlePointerMove = (moveEvent: PointerEvent) => {
      setColumnWidths((current: Record<ResizableColumn, number>) => ({
        ...current,
        [column]: Math.max(minimum, startWidth + moveEvent.clientX - startX),
      }));
    };
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };
  const size = Number(pageSize);
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * size, currentPage * size);
  const start = rows.length ? (currentPage - 1) * size + 1 : 0;
  const end = Math.min(currentPage * size, rows.length);

  const exportCsv = () => {
    const csv = ['User,Application,Date provisioned,Request completed,Status', ...rows.map((item: AccessControlEntry) => [item.requestedUser.fullName, item.application.applicationName, item.dateProvisioned ?? '', item.grantedDate ?? '', item.activeState ? 'Active' : 'Inactive'].map((value: string) => `"${value.replaceAll('"', '""')}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'access-control.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Access control list exported.');
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      await remove.mutateAsync(entryToDelete.id);
      setEntryToDelete(null);
      toast.success('Access entry deleted.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete access entry.');
    }
  };

  return (
    <>
      <div className="min-w-0 space-y-4 lg:space-y-5">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><CardTitle>Access Control List</CardTitle><CardDescription>User access assignments loaded from Dataverse.</CardDescription></div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" aria-label="Refresh access control list" onClick={() => { void Promise.all([query.refetch(), appQuery.refetch(), peopleQuery.refetch()]).then((results) => { if (results.some((result: { isError: boolean }) => result.isError)) { toast.warning('Access control list refresh did not work.'); return; } toast.success('Access control list refreshed.'); }); }}><RefreshCw />Refresh</Button>
                <Button size="sm" variant="outline" onClick={() => toast.info('Import list is available from the Access Control data source.')}><Database />Import list</Button>
                <Button size="sm" variant="outline" disabled={!rows.length} onClick={exportCsv}><Download />Export to Excel</Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="relative w-full min-w-0 flex-1 sm:min-w-64"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => { setSearch(event.target.value); setPage(1); }} placeholder="Search access control" /></div>
              <div className="space-y-1"><Label htmlFor="access-application-filter">Application</Label><Select value={filter} onValueChange={(value: string) => { setFilter(value); setPage(1); }}><SelectTrigger id="access-application-filter" className="w-full sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All applications</SelectItem>{applications.filter((item: Application) => Boolean(item.id)).map((item: Application) => <SelectItem key={item.id} value={item.id}>{item.applicationName}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label htmlFor="access-created-sort">Date provisioned</Label><Select value={sort} onValueChange={(value: 'newest' | 'oldest') => setSort(value)}><SelectTrigger id="access-created-sort" className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest to oldest</SelectItem><SelectItem value="oldest">Oldest to newest</SelectItem></SelectContent></Select></div>
            </div>
          </CardHeader>
          <CardContent>
            {rows.length ? (<>
              <div className="relative w-full overflow-x-auto">
                <Table className="table-fixed min-w-[860px] [&_th]:h-9 [&_th]:px-1.5 [&_td]:px-1.5 [&_td]:py-1.5">
                  <colgroup>
                    {columnLabels.map((column: { key: ResizableColumn; label: string; minimum: number }) => <col key={column.key} style={{ width: columnWidths[column.key] }} />)}
                    <col style={{ width: 72 }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      {columnLabels.map((column: { key: ResizableColumn; label: string; minimum: number }) => (
                        <TableHead key={column.key} className="relative select-none">
                          <span className="block truncate pr-2">{column.label}</span>
                          <button
                            type="button"
                            aria-label={`Resize ${column.label} column`}
                            className="absolute inset-y-0 right-0 w-2 cursor-col-resize touch-none border-r border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => startColumnResize(event, column.key, column.minimum)}
                          />
                        </TableHead>
                      ))}
                      <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{visibleRows.map((item: AccessControlEntry) => {
                    const person = people.find((entry: RequestedUser) => entry.id === item.requestedUser.id);
                    const provisioned = formatAccessDate(item.dateProvisioned);
                    const completed = formatAccessDate(item.grantedDate);
                    return <TableRow key={item.id}>
                      <TableCell className="overflow-hidden"><p className="truncate font-medium">{item.requestedUser.fullName}</p><p className="truncate text-xs text-muted-foreground">BSC ID: {person?.bSCID ?? '—'}</p></TableCell>
                      <TableCell className="truncate">{item.application.applicationName}</TableCell>
                      <TableCell className="truncate">—</TableCell>
                      <TableCell><span className="block tabular-nums">{provisioned.date}</span>{provisioned.time && <span className="block text-xs text-muted-foreground tabular-nums">{provisioned.time}</span>}</TableCell>
                      <TableCell><span className="block tabular-nums">{completed.date}</span>{completed.time && <span className="block text-xs text-muted-foreground tabular-nums">{completed.time}</span>}</TableCell>
                      <TableCell><span className={`inline-flex h-6 w-24 items-center justify-center rounded-md border px-2.5 text-xs font-semibold shadow-sm ring-1 ring-inset ${item.activeState ? 'border-transparent bg-status-success text-status-success-foreground ring-status-success' : 'bg-secondary text-secondary-foreground ring-border'}`}>{item.activeState ? 'Active' : 'Inactive'}</span></TableCell>
      <AlertDialog open={Boolean(entryToDelete)} onOpenChange={(open: boolean) => { if (!open && !remove.isPending) setEntryToDelete(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete access entry?</AlertDialogTitle><AlertDialogDescription>{entryToDelete ? `Access for ${entryToDelete.requestedUser.fullName} to ${entryToDelete.application.applicationName} will be permanently removed from Dataverse.` : 'This access entry will be permanently removed from Dataverse.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={remove.isPending} onClick={(event: React.MouseEvent<HTMLButtonElement>) => { event.preventDefault(); void confirmDelete(); }}>{remove.isPending ? 'Deleting…' : 'Delete access'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
                      <TableCell className="text-right"><div className="inline-flex items-center gap-1"><Button size="icon-sm" variant="ghost" aria-label={`Edit access for ${item.requestedUser.fullName}`} onClick={() => toast.info('Select the related request to edit this assignment.')}><Pencil /></Button><Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Delete access for ${item.requestedUser.fullName}`} disabled={remove.isPending} onClick={() => setEntryToDelete(item)}><Trash2 /></Button></div></TableCell>
                    </TableRow>;
                  })}</TableBody>
                </Table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">Showing {start}–{end} of {rows.length}</p>
                <div className="flex flex-wrap items-center gap-2"><Label htmlFor="access-page-size" className="text-sm">Rows per page</Label><Select value={pageSize} onValueChange={(value: string) => { setPageSize(value); setPage(1); }}><SelectTrigger id="access-page-size" className="w-20"><SelectValue /></SelectTrigger><SelectContent>{pageSizes.map((value: string) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><span className="min-w-24 text-center text-sm">Page {currentPage} of {pageCount}</span><Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage((value: number) => Math.max(1, value - 1))}>Previous</Button><Button size="sm" variant="outline" disabled={currentPage === pageCount} onClick={() => setPage((value: number) => Math.min(pageCount, value + 1))}>Next</Button></div>
              </div>
            </>) : <div className="py-16 text-center"><ShieldCheck className="mx-auto mb-3 size-8" /><p className="font-semibold">No matching access records</p></div>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
