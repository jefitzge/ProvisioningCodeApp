import { useMemo, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Activity, BellRing, CircleCheck, ClipboardList, Clock3, Eye, RefreshCw, TriangleAlert, Users, type LucideProps } from 'lucide-react';

import { toast } from 'sonner';
import { RequestStatusBadge } from '@/components/request-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccessControlEntryList, useApplicationList, useNotificationRecordList, useProvisioningRequestList, useRequestUserList } from '@/generated/hooks';
import { ProvisioningRequestStatusKeyToLabel, type ProvisioningRequest, type ProvisioningRequestStatusKey } from '@/generated/models/provisioning-request-model';
import { RequestUserStatusKeyToLabel, type RequestUser, type RequestUserStatusKey } from '@/generated/models/request-user-model';
import type { Application } from '@/generated/models/application-model';
import type { NotificationRecord } from '@/generated/models/notification-record-model';
import type { AccessControlEntry } from '@/generated/models/access-control-entry-model';
import { monthKey, sameDataverseId } from '@/lib/provisioning-utils';

const chartConfig = {
  requests: { label: 'Requests created', color: 'var(--chart-1)' },
  completions: { label: 'Completed', color: 'var(--chart-2)' },
  sent: { label: 'Sent', color: 'var(--chart-2)' },
  failed: { label: 'Failed', color: 'var(--chart-5)' },
} satisfies ChartConfig;

type MetricProps = {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<LucideProps>;
  onClick: () => void;
};

function Metric({ label, value, detail, icon: Icon, onClick }: MetricProps) {
  return (
    <Card className="h-full py-0 transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary hover:shadow-[0_0_0_1px_var(--primary),0_0_18px_-8px_var(--primary)] motion-reduce:transition-none">
      <button type="button" className="h-full w-full text-left" aria-label={`View ${label.toLowerCase()}`} onClick={onClick}>
        <CardContent className="flex h-full min-h-24 items-center justify-between gap-3 p-3 sm:min-h-28 sm:p-4">
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight">{label}</p>
            <p className="mt-0.5 text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs font-medium text-foreground">{detail}</p>
          </div>
          <span className="grid shrink-0 place-items-center rounded-md bg-primary p-2.5 text-primary-foreground">
            <Icon className="size-5" />
          </span>
        </CardContent>
      </button>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const requestQuery = useProvisioningRequestList({ orderBy: ['createdDate desc'] });
  const requestUserQuery = useRequestUserList();
  const notificationQuery = useNotificationRecordList({ orderBy: ['lastUpdatedDate desc'] });
  const applicationQuery = useApplicationList({ orderBy: ['applicationName asc'] });
  const accessEntryQuery = useAccessControlEntryList();
  const requests = requestQuery.data ?? [];

  const requestUsers = requestUserQuery.data ?? [];
  const notifications = notificationQuery.data ?? [];
  const applications = applicationQuery.data ?? [];
  const accessEntries = accessEntryQuery.data ?? [];
  const activeRequests = requests.filter((item: ProvisioningRequest) => !['Completed', 'Cancelled'].includes(item.statusKey));
  const readyUsers = requestUsers.filter((item: RequestUser) => item.statusKey === 'NotificationReady');
  const attempted = notifications.filter((item: NotificationRecord) => ['Sent', 'Failed'].includes(item.statusKey));
  const failed = attempted.filter((item: NotificationRecord) => item.statusKey === 'Failed');
  const failureRate = attempted.length ? Math.round((failed.length / attempted.length) * 100) : 0;
  const activeAccess = accessEntries.filter((item: AccessControlEntry) => item.activeState);
  const now = Date.now();
  const aging = activeRequests.filter((item: ProvisioningRequest) => now - new Date(item.createdDate).getTime() >= 7 * 86_400_000);
  const stageCounts = requestUsers.reduce((counts: Map<RequestUserStatusKey, number>, item: RequestUser) => {
    const status = item.statusKey ?? 'New'; counts.set(status, (counts.get(status) ?? 0) + 1); return counts;
  }, new Map<RequestUserStatusKey, number>());
  const completedRequests = requests.filter((item: ProvisioningRequest) => item.statusKey === 'Completed');
  const averageCompletionDays = completedRequests.length
    ? completedRequests.reduce((total: number, item: ProvisioningRequest) => total + Math.max(0, (now - new Date(item.createdDate).getTime()) / 86_400_000), 0) / completedRequests.length
    : 0;
  const bottleneck = Array.from(stageCounts.entries()).sort((a: [RequestUserStatusKey, number], b: [RequestUserStatusKey, number]) => b[1] - a[1])[0];
  const months = useMemo(() => Array.from({ length: 6 }, (_item: unknown, index: number) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
    return { key: monthKey(date), month: format(date, 'MMM') };
  }), []);
  const requestTrend = months.map((period: { key: string; month: string }) => ({ month: period.month, requests: requests.filter((item: ProvisioningRequest) => monthKey(new Date(item.createdDate)) === period.key).length, completions: requests.filter((item: ProvisioningRequest) => item.statusKey === 'Completed' && monthKey(new Date(item.createdDate)) === period.key).length }));
  const notificationTrend = months.map((period: { key: string; month: string }) => ({ month: period.month, sent: notifications.filter((item: NotificationRecord) => item.statusKey === 'Sent' && item.lastUpdatedDate && monthKey(new Date(item.lastUpdatedDate)) === period.key).length, failed: notifications.filter((item: NotificationRecord) => item.statusKey === 'Failed' && item.lastUpdatedDate && monthKey(new Date(item.lastUpdatedDate)) === period.key).length }));
  const applicationRows = applications.map((application: Application) => {
    const links = requestUsers.filter((item: RequestUser) => sameDataverseId(item.application?.id, application.id));
    return { application, users: new Set(links.map((item: RequestUser) => item.requestedUser.id)).size, requests: new Set(links.map((item: RequestUser) => item.provisioningRequest.id)).size };
  });
  const requestStatusCounts = (Object.keys(ProvisioningRequestStatusKeyToLabel) as ProvisioningRequestStatusKey[]).map((status: ProvisioningRequestStatusKey) => ({ status, count: requests.filter((item: ProvisioningRequest) => item.statusKey === status).length }));
  const sourceCounts = {
    ServiceNow: requests.filter((item: ProvisioningRequest) => item.sourceTypeKey === 'ServiceNow').length,
    Email: requests.filter((item: ProvisioningRequest) => item.sourceTypeKey === 'Email').length,
  };
  const ownerCount = new Set(requests.map((item: ProvisioningRequest) => item.ownerEmail)).size;
  const blockedRequests = requests.filter((item: ProvisioningRequest) => ['Exception', 'OnHold'].includes(item.statusKey));
  const notificationCounts = {
    Sent: notifications.filter((item: NotificationRecord) => item.statusKey === 'Sent').length,
    Queued: notifications.filter((item: NotificationRecord) => item.statusKey === 'Queued').length,
    Sending: notifications.filter((item: NotificationRecord) => item.statusKey === 'Sending').length,
    Failed: notifications.filter((item: NotificationRecord) => item.statusKey === 'Failed').length,
  };
  const retriedNotifications = notifications.filter((item: NotificationRecord) => item.attemptNumber > 1).length;
  const missingAccessDates = activeAccess.filter((item: AccessControlEntry) => !item.dateProvisioned && !item.grantedDate).length;
  const accessByApplication = applications.map((application: Application) => ({
    application,
    count: activeAccess.filter((item: AccessControlEntry) => sameDataverseId(item.application.id, application.id)).length,
  })).filter((row: { application: Application; count: number }) => row.count > 0);

  const refreshDashboard = async () => {
    const results = await Promise.all([requestQuery.refetch(), requestUserQuery.refetch(), notificationQuery.refetch(), applicationQuery.refetch(), accessEntryQuery.refetch()]);
    if (results.some((result: { isError: boolean }) => result.isError)) {
      toast.warning('Dashboard refresh did not work.');
      return;
    }
    toast.success('Dashboard refreshed.');
  };

  return <>
    <Tabs defaultValue="overview" className="space-y-4 sm:space-y-5 lg:space-y-6">
      <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="reports">Reports</TabsTrigger></TabsList>
      <TabsContent value="overview" className="space-y-4 sm:space-y-5 lg:space-y-6">
        <div className="grid auto-rows-fr gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Open requests" value={String(activeRequests.length)} detail="View details" icon={ClipboardList} onClick={() => navigate('/requests')} />
          <Metric label="Users ready for notification" value={String(readyUsers.length)} detail="View details" icon={BellRing} onClick={() => navigate('/requests')} />
          <Metric label="Exceptions" value={String(requests.filter((item: ProvisioningRequest) => item.statusKey === 'Exception').length)} detail="View details" icon={Activity} onClick={() => navigate('/requests')} />
          <Metric label="Average time to complete" value={`${averageCompletionDays.toFixed(1)} days`} detail={`All time: ${averageCompletionDays.toFixed(1)} days`} icon={Clock3} onClick={() => navigate('/requests')} />
        </div>
        <div className="grid auto-rows-fr gap-2.5 sm:gap-3 md:grid-cols-3">
          <Metric label="Aging requests" value={String(aging.length)} detail={`Open 7+ days · Oldest ${aging.length ? Math.max(...aging.map((item: ProvisioningRequest) => Math.floor((now - new Date(item.createdDate).getTime()) / 86_400_000))) : 0} days`} icon={Clock3} onClick={() => navigate('/requests')} />
          <Metric label="Workflow bottleneck" value={bottleneck ? RequestUserStatusKeyToLabel[bottleneck[0]] : 'No backlog'} detail={bottleneck ? `${bottleneck[1]} users at this stage` : 'No active stages'} icon={Users} onClick={() => navigate('/requests')} />
          <Metric label="Notification failure rate" value={`${failureRate}%`} detail={`${failed.length} failed of ${attempted.length} attempts`} icon={TriangleAlert} onClick={() => navigate('/requests')} />
        </div>
        <div className="grid items-stretch gap-3 sm:gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)] xl:grid-rows-[auto_1fr]">
          <Card className="h-full min-w-0 transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary hover:shadow-[0_0_0_1px_var(--primary),0_0_18px_-8px_var(--primary)] motion-reduce:transition-none">
            <CardHeader className="px-4 sm:px-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-base font-semibold leading-tight">Active queue</CardTitle><CardDescription>Live provisioning requests from Dataverse.</CardDescription></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { void refreshDashboard(); }}><RefreshCw />Refresh</Button><Button variant="outline" size="sm" onClick={() => navigate('/requests')}>View all</Button></div></div></CardHeader>
            <CardContent className="px-4 sm:px-6 [&_[data-slot=badge]]:h-6">{activeRequests.length ? <Table><TableHeader><TableRow><TableHead className="w-32 max-w-32">Request</TableHead><TableHead className="w-48">Summary</TableHead><TableHead className="w-32">Status</TableHead><TableHead className="w-20"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{activeRequests.slice(0, 7).map((item: ProvisioningRequest) => <TableRow key={item.id}><TableCell className="w-32 max-w-32 align-middle"><p className="truncate font-medium" title={item.sourceReference}>{item.sourceReference}</p></TableCell><TableCell className="max-w-48 overflow-hidden align-middle"><span className="block truncate" title={item.summary}>{item.summary}</span></TableCell><TableCell><RequestStatusBadge value={ProvisioningRequestStatusKeyToLabel[item.statusKey]} /></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => navigate(`/requests/${item.id}`)}>Open</Button></TableCell></TableRow>)}</TableBody></Table> : <p className="py-6 text-sm text-muted-foreground">No active requests.</p>}</CardContent>
          </Card>
          <Card className="h-full min-w-0 xl:row-span-2 transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary hover:shadow-[0_0_0_1px_var(--primary),0_0_18px_-8px_var(--primary)] motion-reduce:transition-none">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base font-semibold leading-tight">Notification gate</CardTitle>
              <CardDescription>Notification-ready users and queued Dataverse email records.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {readyUsers.length ? (
                <div className="space-y-3">
                  {readyUsers.slice(0, 6).map((item: RequestUser) => {
                    const request = requests.find((candidate: ProvisioningRequest) => sameDataverseId(candidate.id, item.provisioningRequest.id));
                    return (
                      <div key={item.id} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/requests/${item.provisioningRequest.id}`)}>
                            <p className="break-words font-medium hover:underline">{request?.sourceReference ?? item.provisioningRequest.provisioningRequestName}</p>
                            <p className="mt-1 break-words text-sm text-muted-foreground">
                              {item.requestedUser?.fullName ?? 'Requested user'} · {item.application?.applicationName ?? 'Application'} · {request?.summary ?? item.requestUserName}
                            </p>
                          </button>
                          <RequestStatusBadge value={RequestUserStatusKeyToLabel[item.statusKey ?? 'NotificationReady']} />
                        </div>
                        <Button size="sm" className="mt-3 w-full" onClick={() => navigate(`/requests/${item.provisioningRequest.id}`)}>
                          <Eye />
                          Review and send
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty className="py-12"><EmptyHeader><EmptyMedia variant="icon"><BellRing /></EmptyMedia><EmptyTitle>No notifications ready</EmptyTitle><EmptyDescription>Users appear here after Mark Notification Ready creates or links a queued Dataverse notification.</EmptyDescription></EmptyHeader></Empty>
              )}
            </CardContent>
          </Card>
          <Card className="h-full min-w-0 transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary hover:shadow-[0_0_0_1px_var(--primary),0_0_18px_-8px_var(--primary)] motion-reduce:transition-none">
            <CardHeader className="px-4 sm:px-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-base font-semibold leading-tight">Counts by application</CardTitle><CardDescription>Live request and user totals from Dataverse relationships.</CardDescription></div><Button variant="outline" size="sm" onClick={() => navigate('/applications')}>Manage applications</Button></div></CardHeader>
            <CardContent className="px-4 sm:px-6">{applicationRows.length ? <Table><TableHeader><TableRow><TableHead>Application</TableHead><TableHead>Users</TableHead><TableHead>Requests</TableHead><TableHead className="text-right"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{applicationRows.map((row: { application: Application; users: number; requests: number }) => <TableRow key={row.application.id}><TableCell className="font-medium">{row.application.applicationName}</TableCell><TableCell>{row.users}</TableCell><TableCell>{row.requests}</TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => navigate('/applications')}>Open configuration</Button></TableCell></TableRow>)}</TableBody></Table> : <p className="py-6 text-sm text-muted-foreground">No applications configured.</p>}</CardContent>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="reports">
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <Card className="transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary hover:shadow-[0_0_0_1px_var(--primary),0_0_18px_-8px_var(--primary)] motion-reduce:transition-none">
            <CardHeader><CardTitle className="text-base font-semibold leading-tight">Provisioning operations</CardTitle><CardDescription>Request volume by status, source, and owner.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{requestStatusCounts.map((entry: { status: ProvisioningRequestStatusKey; count: number }) => <button key={entry.status} type="button" className="rounded-md border bg-card p-3 text-left text-card-foreground transition-shadow hover:shadow-sm" onClick={() => navigate('/requests')}><span className="text-xs text-muted-foreground">{ProvisioningRequestStatusKeyToLabel[entry.status]}</span><span className="mt-1 block text-xl font-semibold">{entry.count}</span></button>)}</div>
              <div className="flex flex-wrap gap-2"><Badge variant="secondary">ServiceNow {sourceCounts.ServiceNow}</Badge><Badge variant="secondary">Email {sourceCounts.Email}</Badge><Badge variant="outline">{ownerCount} owners</Badge></div>
            </CardContent>
          </Card>
          <Card className="transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary hover:shadow-[0_0_0_1px_var(--primary),0_0_18px_-8px_var(--primary)] motion-reduce:transition-none">
            <CardHeader><CardTitle className="text-base font-semibold leading-tight">Application demand and backlog</CardTitle><CardDescription>Requested users and open requests by application.</CardDescription></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>Application</TableHead><TableHead>Users</TableHead><TableHead className="text-right">Backlog</TableHead></TableRow></TableHeader><TableBody>{applicationRows.map((row: { application: Application; users: number; requests: number }) => <TableRow key={row.application.id}><TableCell className="font-medium">{row.application.applicationName}</TableCell><TableCell>{row.users}</TableCell><TableCell className="text-right">{row.requests}</TableCell></TableRow>)}</TableBody></Table></CardContent>
          </Card>
          <Card className="transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary hover:shadow-[0_0_0_1px_var(--primary),0_0_18px_-8px_var(--primary)] motion-reduce:transition-none">
            <CardHeader><CardTitle className="text-base font-semibold leading-tight">Provisioning cycle time</CardTitle><CardDescription>Elapsed time from request creation to access granted.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3"><div className="min-w-0"><p className="truncate text-xs text-muted-foreground">Last 90 days</p><span className="mt-1 block truncate text-sm font-medium">{averageCompletionDays.toFixed(1)} days</span></div><div className="min-w-0"><p className="truncate text-xs text-muted-foreground">All time</p><span className="mt-1 block truncate text-sm font-medium">{averageCompletionDays.toFixed(1)} days</span></div><div className="min-w-0"><p className="truncate text-xs text-muted-foreground">Completed samples</p><span className="mt-1 block truncate text-sm font-medium">{completedRequests.length}</span></div></CardContent>
          </Card>
          <Card className="transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary hover:shadow-[0_0_0_1px_var(--primary),0_0_18px_-8px_var(--primary)] motion-reduce:transition-none">
            <CardHeader><CardTitle className="text-base font-semibold leading-tight">Exceptions and holds</CardTitle><CardDescription>Requests currently blocked and their owners.</CardDescription></CardHeader>
            <CardContent>{blockedRequests.length ? <div className="space-y-2">{blockedRequests.map((item: ProvisioningRequest) => <button key={item.id} type="button" className="flex w-full items-center justify-between border-b py-2 text-left last:border-b-0" onClick={() => navigate(`/requests/${item.id}`)}><span className="font-medium">{item.sourceReference}</span><RequestStatusBadge value={ProvisioningRequestStatusKeyToLabel[item.statusKey]} /></button>)}</div> : <Empty className="py-12"><EmptyHeader><EmptyMedia variant="icon"><CircleCheck /></EmptyMedia><EmptyTitle>No blocked requests</EmptyTitle><EmptyDescription>There are no active exceptions or holds.</EmptyDescription></EmptyHeader></Empty>}</CardContent>
          </Card>
          <Card className="transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary hover:shadow-[0_0_0_1px_var(--primary),0_0_18px_-8px_var(--primary)] motion-reduce:transition-none">
            <CardHeader><CardTitle className="text-base font-semibold leading-tight">Notification delivery</CardTitle><CardDescription>Delivery status, retries, and recent failure detail.</CardDescription></CardHeader>
            <CardContent className="space-y-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(['Sent', 'Queued', 'Sending', 'Failed'] as const).map((status: 'Sent' | 'Queued' | 'Sending' | 'Failed') => <div key={status} className="rounded-md border bg-card p-3 text-card-foreground"><span className="text-xs text-muted-foreground">{status}</span><span className="mt-1 block text-xl font-semibold">{notificationCounts[status]}</span></div>)}</div><div className="flex flex-wrap gap-2"><Badge variant="secondary">{failureRate}% failure rate</Badge><Badge variant="outline">{retriedNotifications} retried</Badge></div></CardContent>
          </Card>
          <Card className="transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary hover:shadow-[0_0_0_1px_var(--primary),0_0_18px_-8px_var(--primary)] motion-reduce:transition-none">
            <CardHeader><CardTitle className="text-base font-semibold leading-tight">Access provisioning audit</CardTitle><CardDescription>Active access and incomplete audit timestamps.</CardDescription></CardHeader>
            <CardContent className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="min-w-0"><p className="truncate text-xs text-muted-foreground">Active access</p><span className="mt-1 block truncate text-sm font-medium">{activeAccess.length}</span></div><div className="min-w-0"><p className="truncate text-xs text-muted-foreground">Missing dates</p><span className="mt-1 block truncate text-sm font-medium">{missingAccessDates}</span></div></div><div className="space-y-2">{accessByApplication.map((row: { application: Application; count: number }) => <div key={row.application.id} className="flex items-center justify-between border-b py-2 last:border-b-0"><span className="font-medium">{row.application.applicationName}</span><Badge variant="secondary">{row.count}</Badge></div>)}</div></CardContent>
          </Card>
          <Card className="lg:col-span-2 transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary hover:shadow-[0_0_0_1px_var(--primary),0_0_18px_-8px_var(--primary)] motion-reduce:transition-none">
            <CardHeader><CardTitle className="text-base font-semibold leading-tight">Six-month trends</CardTitle><CardDescription>Monthly request intake, completions, and notification outcomes from Dataverse.</CardDescription></CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="min-w-0"><p className="mb-3 text-sm font-medium">Request volume</p><ChartContainer config={chartConfig} className="h-64 w-full aspect-auto"><AreaChart accessibilityLayer data={requestTrend}><CartesianGrid vertical={false} /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><ChartTooltip content={<ChartTooltipContent />} /><Area dataKey="requests" fill="var(--color-requests)" fillOpacity={0.22} stroke="var(--color-requests)" strokeWidth={2} type="monotone" /><Line dataKey="completions" stroke="var(--color-completions)" strokeWidth={2} type="monotone" /></AreaChart></ChartContainer></div>
              <div className="min-w-0"><p className="mb-3 text-sm font-medium">Notification outcomes</p><ChartContainer config={chartConfig} className="h-64 w-full aspect-auto"><LineChart accessibilityLayer data={notificationTrend}><CartesianGrid vertical={false} /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><ChartTooltip content={<ChartTooltipContent />} /><Line dataKey="sent" stroke="var(--color-sent)" strokeWidth={2} type="monotone" /><Line dataKey="failed" stroke="var(--color-failed)" strokeWidth={2} type="monotone" /></LineChart></ChartContainer></div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  </>;
}
