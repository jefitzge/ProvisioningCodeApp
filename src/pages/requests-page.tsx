import { useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { RequestStatusBadge } from '@/components/request-status-badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useActivityRecordList, useDeleteActivityRecord, useDeleteNotificationRecord, useDeleteProvisioningRequest, useDeleteRequestedUserStageProgress, useDeleteRequestUser, useNotificationRecordList } from '@/generated/hooks';
import type { ActivityRecord } from '@/generated/models/activity-record-model';
import type { NotificationRecord } from '@/generated/models/notification-record-model';
import { ProvisioningRequestStatusKeyToLabel, type ProvisioningRequest } from '@/generated/models/provisioning-request-model';
import type { RequestedUserStageProgress } from '@/generated/models/requested-user-stage-progress-model';
import type { RequestUser } from '@/generated/models/request-user-model';
import { useRequestData } from '@/hooks/use-request-data';
import { errorMessage, sameDataverseId } from '@/lib/provisioning-utils';
const pageSizes = ['10', '25', '50'];


export default function RequestsPage() {
  const { requestQuery, requestedUserQuery, requestUserQuery, stageProgressQuery, requests, requestUsers, stageProgress, usersForRequest, activeStageForRequest } = useRequestData();
  const notificationQuery = useNotificationRecordList();
  const activityQuery = useActivityRecordList();
  const deleteRequest = useDeleteProvisioningRequest();
  const deleteRequestUser = useDeleteRequestUser();
  const deleteProgress = useDeleteRequestedUserStageProgress();
  const deleteNotification = useDeleteNotificationRecord();
  const deleteActivity = useDeleteActivityRecord();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [stage, setStage] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [pageSize, setPageSize] = useState('25');
  const [page, setPage] = useState(1);
  const [requestToDelete, setRequestToDelete] = useState<ProvisioningRequest | null>(null);
  const deleting = deleteRequest.isPending || deleteRequestUser.isPending || deleteProgress.isPending || deleteNotification.isPending || deleteActivity.isPending;
  const stageOptions = useMemo(() => Array.from(new Set(requests.map((item: ProvisioningRequest) => activeStageForRequest(item.id)))).filter((value: string) => value !== '—').sort((first: string, second: string) => first.localeCompare(second)), [requests, requestUsers, stageProgress]);
  const rows = useMemo(() => requests.filter((item: ProvisioningRequest) => {
    const matchesSearch = `${item.provisioningRequestName} ${item.sourceReference} ${item.summary}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (status === 'all' || item.statusKey === status) && (stage === 'all' || activeStageForRequest(item.id) === stage);
  }).sort((first: ProvisioningRequest, second: ProvisioningRequest) => sort === 'newest' ? new Date(second.createdDate).getTime() - new Date(first.createdDate).getTime() : new Date(first.createdDate).getTime() - new Date(second.createdDate).getTime()), [requests, search, sort, stage, status, requestUsers, stageProgress]);
  const size = Number(pageSize);
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * size, currentPage * size);
  const start = rows.length ? (currentPage - 1) * size + 1 : 0;
  const end = Math.min(currentPage * size, rows.length);

  const removeRequest = async () => {
    if (!requestToDelete) return;
    const linkedUsers = requestUsers.filter((item: RequestUser) => sameDataverseId(item.provisioningRequest.id, requestToDelete.id));
    const requestUserIds = new Set(linkedUsers.map((item: RequestUser) => item.id.toLowerCase()));
    const personIds = new Set(linkedUsers.map((item: RequestUser) => item.requestedUser.id.toLowerCase()));
    const notifications = (notificationQuery.data ?? []).filter((item: NotificationRecord) => personIds.has(item.requestedUser.id.toLowerCase()));
    const activities = (activityQuery.data ?? []).filter((item: ActivityRecord) => sameDataverseId(item.provisioningRequest.id, requestToDelete.id));
    const progress = stageProgress.filter((item: RequestedUserStageProgress) => Boolean(item.requestUser?.id && requestUserIds.has(item.requestUser.id.toLowerCase())));
    try {
      await Promise.all(notifications.map((item: NotificationRecord) => deleteNotification.mutateAsync(item.id)));
      await Promise.all(progress.map((item: RequestedUserStageProgress) => deleteProgress.mutateAsync(item.id)));
      await Promise.all(activities.map((item: ActivityRecord) => deleteActivity.mutateAsync(item.id)));
      await Promise.all(linkedUsers.map((item: RequestUser) => deleteRequestUser.mutateAsync(item.id)));
      await deleteRequest.mutateAsync(requestToDelete.id);
      setRequestToDelete(null);
      await requestQuery.refetch();
      toast.success('Request and its request-specific Dataverse records were deleted.');
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  };

  const refreshRequests = async () => {
    const results = await Promise.all([requestQuery.refetch(), requestedUserQuery.refetch()]);
    if (results.some((result: { isError: boolean }) => result.isError)) {
      toast.warning('Requests refresh did not work.');
      return;
    }
    toast.success('Requests refreshed.');
  };

  const loading = requestQuery.isLoading || requestedUserQuery.isLoading || requestUserQuery.isLoading || stageProgressQuery.isLoading;
  return <>
    <Card><CardHeader><div className="flex flex-wrap items-end justify-between gap-4"><div><CardTitle>Provisioning requests</CardTitle><CardDescription>Search and monitor Dataverse intake records.</CardDescription></div><div className="flex gap-2"><Button variant="outline" size="sm" disabled={requestQuery.isFetching} onClick={() => { void refreshRequests(); }}><RefreshCw className={requestQuery.isFetching ? 'animate-spin' : ''} />Refresh</Button><Button asChild size="sm"><Link to="/new-request"><Plus />New request</Link></Button></div></div><div className="mt-3 flex flex-wrap items-end gap-2"><div className="relative w-full min-w-0 flex-1 sm:min-w-64"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => { setSearch(event.target.value); setPage(1); }} placeholder="Search requests" /></div><Select value={status} onValueChange={(value: string) => { setStatus(value); setPage(1); }}><SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(ProvisioningRequestStatusKeyToLabel).filter(([value]: [string, string]) => Boolean(value)).map(([value, label]: [string, string]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Select value={stage} onValueChange={(value: string) => { setStage(value); setPage(1); }}><SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All workflow stages</SelectItem>{stageOptions.filter((value: string) => Boolean(value)).map((value: string) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Select value={sort} onValueChange={(value: 'newest' | 'oldest') => { setSort(value); setPage(1); }}><SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest to oldest</SelectItem><SelectItem value="oldest">Oldest to newest</SelectItem></SelectContent></Select></div></CardHeader><CardContent>{loading ? <p className="py-12 text-center text-muted-foreground">Loading requests…</p> : rows.length ? <><Table><TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Summary</TableHead><TableHead className="text-center">Users</TableHead><TableHead>Status</TableHead><TableHead>Active workflow stage</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{visibleRows.map((request: ProvisioningRequest) => <TableRow key={request.id}><TableCell className="font-medium">{request.sourceReference}</TableCell><TableCell className="max-w-72 truncate">{request.summary}</TableCell><TableCell className="text-center">{usersForRequest(request.id).length}</TableCell><TableCell><RequestStatusBadge value={ProvisioningRequestStatusKeyToLabel[request.statusKey]} /></TableCell><TableCell><Badge variant="secondary">{activeStageForRequest(request.id)}</Badge></TableCell><TableCell className="text-right"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" asChild><Link to={`/requests/${request.id}`} aria-label={`Edit ${request.sourceReference}`}><Pencil /></Link></Button></TooltipTrigger><TooltipContent>Edit request</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className="text-destructive" disabled={deleting} onClick={() => setRequestToDelete(request)} aria-label={`Delete ${request.sourceReference}`}><Trash2 /></Button></TooltipTrigger><TooltipContent>Delete request</TooltipContent></Tooltip></TableCell></TableRow>)}</TableBody></Table><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-sm text-muted-foreground">Showing {start}–{end} of {rows.length}</p><div className="flex flex-wrap items-center gap-2"><Label htmlFor="requests-page-size" className="text-sm">Rows per page</Label><Select value={pageSize} onValueChange={(value: string) => { setPageSize(value); setPage(1); }}><SelectTrigger id="requests-page-size" className="w-20"><SelectValue /></SelectTrigger><SelectContent>{pageSizes.map((value: string) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><span className="min-w-24 text-center text-sm">Page {currentPage} of {pageCount}</span><Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage((value: number) => Math.max(1, value - 1))}>Previous</Button><Button size="sm" variant="outline" disabled={currentPage === pageCount} onClick={() => setPage((value: number) => Math.min(pageCount, value + 1))}>Next</Button></div></div></> : <Empty className="py-12"><EmptyHeader><EmptyMedia variant="icon"><ClipboardList /></EmptyMedia><EmptyTitle>No provisioning requests</EmptyTitle><EmptyDescription>Create the first request to begin tracking user access in Dataverse.</EmptyDescription></EmptyHeader><EmptyContent><Button asChild><Link to="/new-request"><Plus />Create request</Link></Button></EmptyContent></Empty>}</CardContent></Card>
    <AlertDialog open={Boolean(requestToDelete)} onOpenChange={(open: boolean) => { if (!open && !deleting) setRequestToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete request?</AlertDialogTitle><AlertDialogDescription>{requestToDelete ? `${requestToDelete.sourceReference} and its linked operational records will be permanently removed from Dataverse.` : 'This request will be permanently removed.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction disabled={deleting} onClick={(event: React.MouseEvent<HTMLButtonElement>) => { event.preventDefault(); void removeRequest(); }}>{deleting ? 'Deleting…' : 'Delete request'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
