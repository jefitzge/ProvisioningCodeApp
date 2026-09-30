import { useMemo, useState, type ChangeEvent } from 'react';
import { CheckCircle2, FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAccessControlEntryList, useAccessControlEnvironmentAssignmentList, useAccessControlRoleAssignmentList, useAccessRoleList, useApplicationList, useCreateAccessControlEntry, useCreateAccessControlEnvironmentAssignment, useCreateAccessControlRoleAssignment, useCreateRequestedUser, useEnvironmentList, useRequestedUserList, useUpdateAccessControlEntry, useUpdateRequestedUser } from '@/generated/hooks';
import type { AccessControlEntry } from '@/generated/models/access-control-entry-model';
import type { AccessControlEnvironmentAssignment } from '@/generated/models/access-control-environment-assignment-model';
import type { AccessControlRoleAssignment } from '@/generated/models/access-control-role-assignment-model';
import type { AccessRole } from '@/generated/models/access-role-model';
import type { Application } from '@/generated/models/application-model';
import type { Environment } from '@/generated/models/environment-model';
import type { RequestedUser } from '@/generated/models/requested-user-model';

type ImportStatus = 'ready' | 'duplicate' | 'rejected' | 'imported' | 'failed';
type RawImportRow = { fullName: string; email: string; bSCID: string; application: string; environment: string; role: string; provisionDate: string; completedDate: string; ticketNumber: string };
type ImportRow = RawImportRow & { rowNumber: number; status: ImportStatus; reason: string; provisionDateIso?: string; completedDateIso?: string; applicationRecord?: Application; environmentRecord?: Environment; roleRecord?: AccessRole; requestedUserRecord?: RequestedUser; accessEntryRecord?: AccessControlEntry };

const normalize = (value: string) => value.trim().toLowerCase();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const requiredHeaders = ['full name', 'email', 'bsc id', 'application', 'environment', 'role / team', 'provision date', 'completed date', 'associated ticket number'] as const;
const parseImportDate = (value: string): string | undefined => {
  if (!value.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

/** Parses CSV content, including quoted commas and escaped quotes. */
function parseCsv(content: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]; const next = content[index + 1];
    if (character === '"' && quoted && next === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) { if (character === '\r' && next === '\n') index += 1; row.push(cell.trim()); if (row.some((value: string) => value.length > 0)) rows.push(row); row = []; cell = ''; }
    else cell += character;
  }
  row.push(cell.trim()); if (row.some((value: string) => value.length > 0)) rows.push(row); return rows;
}

/** Downloads the supported import columns as a CSV template. */
function downloadTemplate() {
  const csv = `${requiredHeaders.join(',')}\r\nJane Doe,jane.doe@example.com,1234567,Finance,Production,Approver,2026-09-01,2026-09-03,INC0012345\r\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'access-control-import-template.csv'; link.click(); URL.revokeObjectURL(url);
}

/** Provides upload, validation preview, and confirmed Dataverse import for access assignments. */
export function AccessControlImportDialog({ open, onOpenChange, actorName, onImported }: { open: boolean; onOpenChange: (open: boolean) => void; actorName?: string; onImported: () => void }) {
  const applicationQuery = useApplicationList(); const environmentQuery = useEnvironmentList(); const roleQuery = useAccessRoleList(); const requestedUserQuery = useRequestedUserList(); const entryQuery = useAccessControlEntryList(); const environmentAssignmentQuery = useAccessControlEnvironmentAssignmentList(); const roleAssignmentQuery = useAccessControlRoleAssignmentList();
  const createRequestedUser = useCreateRequestedUser(); const updateRequestedUser = useUpdateRequestedUser(); const createEntry = useCreateAccessControlEntry(); const updateEntry = useUpdateAccessControlEntry(); const createEnvironmentAssignment = useCreateAccessControlEnvironmentAssignment(); const createRoleAssignment = useCreateAccessControlRoleAssignment();
  const [fileName, setFileName] = useState(''); const [rows, setRows] = useState<ImportRow[]>([]); const [fileError, setFileError] = useState(''); const [isImporting, setIsImporting] = useState(false);
  const applications = useMemo(() => applicationQuery.data ?? [], [applicationQuery.data]); const environments = useMemo(() => environmentQuery.data ?? [], [environmentQuery.data]); const roles = useMemo(() => roleQuery.data ?? [], [roleQuery.data]); const requestedUsers = useMemo(() => requestedUserQuery.data ?? [], [requestedUserQuery.data]); const entries = useMemo(() => entryQuery.data ?? [], [entryQuery.data]); const environmentAssignments = useMemo(() => environmentAssignmentQuery.data ?? [], [environmentAssignmentQuery.data]); const roleAssignments = useMemo(() => roleAssignmentQuery.data ?? [], [roleAssignmentQuery.data]);
  const readyCount = rows.filter((row: ImportRow) => row.status === 'ready').length; const duplicateCount = rows.filter((row: ImportRow) => row.status === 'duplicate').length; const rejectedCount = rows.filter((row: ImportRow) => row.status === 'rejected').length;

  /** Resolves source values to Dataverse configuration and classifies duplicates or errors. */
  const validateRows = (sourceRows: RawImportRow[]): ImportRow[] => {
    const fileKeys = new Set<string>();
    return sourceRows.map((source: RawImportRow, index: number) => {
      const application = applications.find((item: Application) => normalize(item.applicationName) === normalize(source.application));
      const environment = environments.find((item: Environment) => application && item.application.id === application.id && (normalize(item.environmentName) === normalize(source.environment) || normalize(item.environmentCode) === normalize(source.environment)));
      const role = roles.find((item: AccessRole) => application && item.application.id === application.id && normalize(item.accessRoleName) === normalize(source.role));
      const requestedUser = requestedUsers.find((item: RequestedUser) => normalize(item.normalizedEmail || item.email) === normalize(source.email));
      const entry = entries.find((item: AccessControlEntry) => requestedUser && application && item.requestedUser.id === requestedUser.id && item.application.id === application.id);
      const hasEnvironment = Boolean(entry && environment && environmentAssignments.some((item: AccessControlEnvironmentAssignment) => item.accessControlEntry.id === entry.id && item.environment.id === environment.id));
      const hasRole = Boolean(entry && role && roleAssignments.some((item: AccessControlRoleAssignment) => item.accessControlEntry.id === entry.id && item.accessRole.id === role.id && item.activeState));
      const key = [normalize(source.email), normalize(source.application), normalize(source.environment), normalize(source.role)].join('|'); const duplicateInFile = fileKeys.has(key); fileKeys.add(key);
      const missing = [!source.fullName && 'Full name', !source.email && 'Email', !source.bSCID && 'BSC ID', !source.application && 'Application', !source.environment && 'Environment', !source.role && 'Role / Team'].filter(Boolean);
      const provisionDateIso = parseImportDate(source.provisionDate); const completedDateIso = parseImportDate(source.completedDate);
      let status: ImportStatus = 'ready'; let reason = 'Ready to import';
      if (missing.length) { status = 'rejected'; reason = `Missing ${missing.join(', ')}`; } else if (!emailPattern.test(source.email)) { status = 'rejected'; reason = 'Invalid email address'; } else if (!/^\d{7}$/.test(source.bSCID)) { status = 'rejected'; reason = 'BSC ID must be exactly 7 digits'; } else if (source.provisionDate && !provisionDateIso) { status = 'rejected'; reason = 'Provision Date is invalid'; } else if (source.completedDate && !completedDateIso) { status = 'rejected'; reason = 'Completed Date is invalid'; } else if (!application) { status = 'rejected'; reason = 'Application not found'; } else if (!environment) { status = 'rejected'; reason = 'Environment not found for application'; } else if (!role) { status = 'rejected'; reason = 'Role / Team not found for application'; } else if (duplicateInFile) { status = 'duplicate'; reason = 'Duplicate row in file'; } else if (entry && hasEnvironment && hasRole) { status = 'duplicate'; reason = 'Assignment already exists in Dataverse'; }
      return { ...source, rowNumber: index + 2, status, reason, provisionDateIso, completedDateIso, applicationRecord: application, environmentRecord: environment, roleRecord: role, requestedUserRecord: requestedUser, accessEntryRecord: entry };
    });
  };

  /** Reads a CSV exported from Excel and prepares its validation preview. */
  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; setFileError(''); setRows([]); setFileName(file.name);
    if (!file.name.toLowerCase().endsWith('.csv')) { setFileError('Save the Excel worksheet as CSV UTF-8, then upload the CSV file.'); return; }
    try { const parsed = parseCsv(await file.text()); if (parsed.length < 2) throw new Error('The file does not contain data rows.'); const headers = parsed[0].map((header: string) => normalize(header.replace(/^\uFEFF/, ''))); const missingHeaders = requiredHeaders.filter((header: string) => !headers.includes(header)); if (missingHeaders.length) throw new Error(`Missing columns: ${missingHeaders.join(', ')}.`); const value = (record: string[], header: string) => record[headers.indexOf(header)]?.trim() ?? ''; setRows(validateRows(parsed.slice(1).map((record: string[]) => ({ fullName: value(record, 'full name'), email: value(record, 'email'), bSCID: value(record, 'bsc id'), application: value(record, 'application'), environment: value(record, 'environment'), role: value(record, 'role / team'), provisionDate: value(record, 'provision date'), completedDate: value(record, 'completed date'), ticketNumber: value(record, 'associated ticket number') })))); } catch (error: unknown) { setFileError(error instanceof Error ? error.message : 'The CSV file could not be read.'); }
  };

  /** Imports valid rows and preserves parent IDs for related assignment records. */
  const importRows = async () => {
    if (!readyCount) return; setIsImporting(true); const nextRows = [...rows]; const userCache = new Map(requestedUsers.map((item: RequestedUser) => [normalize(item.normalizedEmail || item.email), item])); const entryCache = new Map(entries.map((item: AccessControlEntry) => [`${item.requestedUser.id}|${item.application.id}`, item]));
    for (let index = 0; index < nextRows.length; index += 1) {
      const row = nextRows[index]; if (row.status !== 'ready' || !row.applicationRecord || !row.environmentRecord || !row.roleRecord) continue;
      try { let requestedUser = row.requestedUserRecord ?? userCache.get(normalize(row.email)); if (!requestedUser) { requestedUser = await createRequestedUser.mutateAsync({ fullName: row.fullName, email: row.email, normalizedEmail: normalize(row.email), bSCID: row.bSCID, application: { id: row.applicationRecord.id, applicationName: row.applicationRecord.applicationName }, activeState: true, statusKey: 'AccessConfirmed', provisioningTicketReference: row.ticketNumber || undefined }); userCache.set(normalize(row.email), requestedUser); } else if (row.ticketNumber && requestedUser.provisioningTicketReference !== row.ticketNumber) { requestedUser = await updateRequestedUser.mutateAsync({ id: requestedUser.id, changedFields: { provisioningTicketReference: row.ticketNumber } }); userCache.set(normalize(row.email), requestedUser); }
        const entryKey = `${requestedUser.id}|${row.applicationRecord.id}`; let entry = row.accessEntryRecord ?? entryCache.get(entryKey); if (!entry) { const now = new Date().toISOString(); entry = await createEntry.mutateAsync({ accessControlEntryName: `${row.fullName} - ${row.applicationRecord.applicationName}`, requestedUser: { id: requestedUser.id, fullName: requestedUser.fullName }, application: { id: row.applicationRecord.id, applicationName: row.applicationRecord.applicationName }, activeState: true, dateProvisioned: row.provisionDateIso ?? now, grantedDate: row.completedDateIso ?? now, grantedBy: actorName }); entryCache.set(entryKey, entry); } else if (row.provisionDateIso || row.completedDateIso) { entry = await updateEntry.mutateAsync({ id: entry.id, changedFields: { ...(row.provisionDateIso ? { dateProvisioned: row.provisionDateIso } : {}), ...(row.completedDateIso ? { grantedDate: row.completedDateIso } : {}) } }); entryCache.set(entryKey, entry); }
        if (!environmentAssignments.some((item: AccessControlEnvironmentAssignment) => item.accessControlEntry.id === entry.id && item.environment.id === row.environmentRecord?.id)) await createEnvironmentAssignment.mutateAsync({ environmentAssignmentName: `${row.fullName} - ${row.applicationRecord.applicationName} - ${row.environmentRecord.environmentName}`, accessControlEntry: { id: entry.id, accessControlEntryName: entry.accessControlEntryName }, environment: { id: row.environmentRecord.id, environmentName: row.environmentRecord.environmentName } });
        if (!roleAssignments.some((item: AccessControlRoleAssignment) => item.accessControlEntry.id === entry.id && item.accessRole.id === row.roleRecord?.id && item.activeState)) await createRoleAssignment.mutateAsync({ roleAssignmentName: `${row.fullName} - ${row.applicationRecord.applicationName} - ${row.roleRecord.accessRoleName}`, accessControlEntry: { id: entry.id, accessControlEntryName: entry.accessControlEntryName }, accessRole: { id: row.roleRecord.id, accessRoleName: row.roleRecord.accessRoleName }, activeState: true, assignedDate: new Date().toISOString(), assignedBy: actorName });
        nextRows[index] = { ...row, status: 'imported', reason: 'Imported successfully' };
      } catch (error: unknown) { nextRows[index] = { ...row, status: 'failed', reason: error instanceof Error ? error.message : 'Dataverse import failed' }; }
      setRows([...nextRows]);
    }
    await Promise.all([entryQuery.refetch(), environmentAssignmentQuery.refetch(), roleAssignmentQuery.refetch(), requestedUserQuery.refetch()]); onImported(); setIsImporting(false); const imported = nextRows.filter((row: ImportRow) => row.status === 'imported').length; const failed = nextRows.filter((row: ImportRow) => row.status === 'failed').length; failed ? toast.warning(`${imported} assignments imported; ${failed} failed.`) : toast.success(`${imported} access assignments imported into Dataverse.`);
  };

  const closeDialog = (nextOpen: boolean) => { if (isImporting) return; onOpenChange(nextOpen); if (!nextOpen) { setRows([]); setFileName(''); setFileError(''); } };
  return <Dialog open={open} onOpenChange={closeDialog}><DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-6xl"><DialogHeader className="border-b px-6 py-5 pr-12"><DialogTitle>Import access control list</DialogTitle><DialogDescription>Upload, validate, and review access assignments before creating Dataverse records.</DialogDescription></DialogHeader><div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5"><div className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"><div className="space-y-2"><Label htmlFor="access-import-file">CSV file</Label><Input id="access-import-file" type="file" accept=".csv,text/csv" disabled={isImporting} onChange={(event: ChangeEvent<HTMLInputElement>) => { void handleFile(event); }} /><p className="text-sm text-muted-foreground">Required columns: Full name, Email, BSC ID, Application, Environment, Role / Team, Provision Date, Completed Date, Associated Ticket Number. Date and ticket values may be blank.</p></div><Button type="button" variant="outline" onClick={downloadTemplate}><FileSpreadsheet />Download template</Button></div>{fileError && <Alert variant="destructive"><TriangleAlert className="size-4" /><AlertTitle>File could not be validated</AlertTitle><AlertDescription>{fileError}</AlertDescription></Alert>}{rows.length > 0 && <><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-md border border-primary bg-card p-3 text-card-foreground"><p className="text-sm font-medium">Ready to import</p><p className="mt-1 text-2xl font-semibold">{readyCount}</p></div><div className="rounded-md border bg-card p-3 text-card-foreground"><p className="text-sm font-medium">Duplicates skipped</p><p className="mt-1 text-2xl font-semibold">{duplicateCount}</p></div><div className="rounded-md border border-destructive bg-card p-3 text-card-foreground"><p className="text-sm font-medium">Rejected</p><p className="mt-1 text-2xl font-semibold">{rejectedCount}</p></div></div><div className="rounded-md border"><div className="max-h-[45vh] overflow-auto"><Table><TableHeader className="sticky top-0 z-10 bg-card"><TableRow><TableHead>Row</TableHead><TableHead>User</TableHead><TableHead>Application</TableHead><TableHead>Environment</TableHead><TableHead>Role / Team</TableHead><TableHead>Provisioned</TableHead><TableHead>Completed</TableHead><TableHead>Ticket</TableHead><TableHead>Status</TableHead><TableHead>Result</TableHead></TableRow></TableHeader><TableBody>{rows.map((row: ImportRow) => <TableRow key={`${row.rowNumber}-${row.email}-${row.application}`}><TableCell>{row.rowNumber}</TableCell><TableCell><p className="font-medium">{row.fullName || '—'}</p><p className="text-xs text-muted-foreground">{row.email || '—'} · {row.bSCID || '—'}</p></TableCell><TableCell>{row.application || '—'}</TableCell><TableCell>{row.environment || '—'}</TableCell><TableCell>{row.role || '—'}</TableCell><TableCell>{row.provisionDate || '—'}</TableCell><TableCell>{row.completedDate || '—'}</TableCell><TableCell>{row.ticketNumber || '—'}</TableCell><TableCell><Badge variant={row.status === 'rejected' || row.status === 'failed' ? 'destructive' : row.status === 'duplicate' ? 'secondary' : 'outline'}>{row.status}</Badge></TableCell><TableCell className="max-w-64"><span className="text-sm">{row.reason}</span></TableCell></TableRow>)}</TableBody></Table></div></div>{(rejectedCount > 0 || duplicateCount > 0) && <Alert><CheckCircle2 className="size-4" /><AlertTitle>Only valid new assignments will be imported</AlertTitle><AlertDescription>Rejected and duplicate rows remain in the report and do not modify Dataverse.</AlertDescription></Alert>}</>}</div><DialogFooter className="border-t px-6 py-4"><Button type="button" variant="outline" disabled={isImporting} onClick={() => closeDialog(false)}>Close</Button><Button type="button" disabled={!readyCount || isImporting} onClick={() => { void importRows(); }}><Upload />{isImporting ? 'Importing…' : `Import ${readyCount} assignment${readyCount === 1 ? '' : 's'}`}</Button></DialogFooter>{fileName && <span className="sr-only">Selected file: {fileName}</span>}</DialogContent></Dialog>;
}
