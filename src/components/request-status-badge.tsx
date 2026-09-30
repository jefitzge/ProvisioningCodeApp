import { Badge } from '@/components/ui/badge';

const danger = new Set(['exception', 'cancelled', 'failed', 'inactive', 'rejected']);
const success = new Set(['active', 'completed', 'provisioned', 'gccsynccomplete', 'accessconfirmed', 'sent', 'ready']);
const info = new Set(['new', 'newrequest', 'inprogress', 'notificationready', 'queued', 'sending', 'processing']);
const warning = new Set(['onhold', 'duplicate']);

export function RequestStatusBadge({ value }: { value: string }) {
  const status = value.replace(/[\s_-]/g, '').toLowerCase();
  const className = 'h-6 w-auto min-w-24 shrink-0 justify-center whitespace-nowrap px-2.5 py-0 text-xs font-semibold';
  if (danger.has(status)) return <Badge variant="destructive" className={className}>{value}</Badge>;
  if (success.has(status)) return <Badge variant="outline" className={`${className} border-status-success bg-status-success text-status-success-foreground`}>{value}</Badge>;
  if (warning.has(status)) return <Badge variant="outline" className={`${className} border-accent bg-accent text-accent-foreground`}>{value}</Badge>;
  if (info.has(status)) return <Badge variant="default" className={className}>{value}</Badge>;
  return <Badge variant="secondary" className={className}>{value}</Badge>;
}
