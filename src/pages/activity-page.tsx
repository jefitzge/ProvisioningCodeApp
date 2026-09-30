import { useMemo, useState, type ChangeEvent } from 'react';
import { Activity, Download, Search } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useActivityRecordList } from '@/generated/hooks';
import { ActivityRecordActionTypeKeyToLabel, type ActivityRecord, type ActivityRecordActionTypeKey } from '@/generated/models/activity-record-model';
import { formatDate } from '@/lib/provisioning-utils';

const pageSizes = ['10', '25', '50'];

export default function ActivityPage() {
  const activityQuery = useActivityRecordList({ orderBy: ['timestamp desc'] });
  const activities = activityQuery.data ?? [];
  const [search, setSearch] = useState('');
  const [actions, setActions] = useState<ActivityRecordActionTypeKey[]>([]);
  const [dateRange] = useState<DateRange | undefined>();
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [pageSize, setPageSize] = useState('25');
  const [page, setPage] = useState(1);
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return activities.filter((item: ActivityRecord) => {
      const created = new Date(item.timestamp);
      const from = dateRange?.from ? new Date(dateRange.from) : undefined;
      const to = dateRange?.to ? new Date(dateRange.to) : undefined;
      if (from) from.setHours(0, 0, 0, 0);
      if (to) to.setHours(23, 59, 59, 999);
      return (!term || [item.activityRecordName, item.description, item.actorName, item.actorEmail].join(' ').toLowerCase().includes(term)) && (!actions.length || actions.includes(item.actionTypeKey)) && (!from || created >= from) && (!to || created <= to);
    }).sort((first: ActivityRecord, second: ActivityRecord) => sort === 'newest' ? new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime() : new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime());
  }, [actions, activities, dateRange, search, sort]);
  const size = Number(pageSize);
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * size, currentPage * size);
  const start = rows.length ? (currentPage - 1) * size + 1 : 0;
  const end = Math.min(currentPage * size, rows.length);
  const exportRows = () => {
    const csv = ['Action,Description,Actor,Timestamp', ...rows.map((item: ActivityRecord) => [item.activityRecordName, item.description, item.actorEmail, item.timestamp].map((value: string) => `"${value.replaceAll('"', '""')}"`).join(','))].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'activity.csv'; link.click(); URL.revokeObjectURL(link.href);
  };
  return <>
    <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Operational activity</CardTitle><CardDescription>Immutable audit actions loaded from Dataverse.</CardDescription></div><Button variant="outline" size="sm" disabled={!rows.length} onClick={exportRows}><Download />Export CSV</Button></div><div className="mt-3 flex flex-wrap gap-2"><div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => { setSearch(event.target.value); setPage(1); }} placeholder="Search activity" /></div><Popover><PopoverTrigger asChild><Button variant="outline">{actions.length ? `${actions.length} actions` : 'All actions'}</Button></PopoverTrigger><PopoverContent className="w-64 p-2">{Object.entries(ActivityRecordActionTypeKeyToLabel).filter(([value]: [string, string]) => Boolean(value)).map(([value, label]: [string, string]) => <label key={value} className="flex items-center gap-2 p-2"><Checkbox checked={actions.includes(value as ActivityRecordActionTypeKey)} onCheckedChange={(checked: boolean | 'indeterminate') => { setActions((current: ActivityRecordActionTypeKey[]) => checked === true ? [...current, value as ActivityRecordActionTypeKey] : current.filter((item: ActivityRecordActionTypeKey) => item !== value)); setPage(1); }} />{label}</label>)}</PopoverContent></Popover><Select value={sort} onValueChange={(value: 'newest' | 'oldest') => { setSort(value); setPage(1); }}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest first</SelectItem><SelectItem value="oldest">Oldest first</SelectItem></SelectContent></Select></div></CardHeader><CardContent>{activityQuery.isLoading ? <p>Loading activity…</p> : rows.length ? <><Table><TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Description</TableHead><TableHead>Actor</TableHead><TableHead>Timestamp</TableHead></TableRow></TableHeader><TableBody>{visibleRows.map((item: ActivityRecord) => <TableRow key={item.id}><TableCell className="font-medium">{item.activityRecordName}</TableCell><TableCell>{item.description}</TableCell><TableCell>{item.actorName}</TableCell><TableCell>{formatDate(item.timestamp)}</TableCell></TableRow>)}</TableBody></Table><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-sm text-muted-foreground">Showing {start}–{end} of {rows.length}</p><div className="flex flex-wrap items-center gap-2"><label htmlFor="activity-page-size" className="text-sm">Rows per page</label><Select value={pageSize} onValueChange={(value: string) => { setPageSize(value); setPage(1); }}><SelectTrigger id="activity-page-size" className="w-20"><SelectValue /></SelectTrigger><SelectContent>{pageSizes.map((value: string) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><span className="min-w-24 text-center text-sm">Page {currentPage} of {pageCount}</span><Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage((value: number) => Math.max(1, value - 1))}>Previous</Button><Button size="sm" variant="outline" disabled={currentPage === pageCount} onClick={() => setPage((value: number) => Math.min(pageCount, value + 1))}>Next</Button></div></div></> : <div className="py-16 text-center"><Activity className="mx-auto mb-3 size-8" /><p className="font-semibold">No matching activity</p></div>}</CardContent></Card>
  </>;
}
