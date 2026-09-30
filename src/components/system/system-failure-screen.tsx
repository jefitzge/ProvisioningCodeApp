import { useState } from 'react';
import { ClipboardCopy, RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Presents a fatal startup failure with reload and support-reference actions. */
export function SystemFailureScreen({ title = 'Provisioning Hub could not start', message, correlationId }: { title?: string; message: string; correlationId: string }) {
  /** Copies the correlation identifier for support escalation. */
  const [copied, setCopied] = useState(false);
  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(correlationId);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return <main className="grid min-h-screen place-items-center bg-background p-4 text-foreground"><Card className="w-full max-w-xl"><CardHeader><div className="mb-2 grid size-10 place-items-center rounded-md bg-destructive text-destructive-foreground"><TriangleAlert className="size-5" /></div><CardTitle>{title}</CardTitle><CardDescription>{message}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-md border bg-muted p-3 text-muted-foreground"><p className="text-xs font-medium">Support reference</p><p className="mt-1 break-all font-mono text-sm text-foreground">{correlationId}</p></div><p className="text-sm text-muted-foreground">No additional changes will be made until the app is reloaded. If the issue continues, provide the support reference above.</p><div className="flex flex-wrap gap-2"><Button onClick={() => window.location.reload()}><RefreshCw />Reload app</Button><Button variant="outline" onClick={() => void copyReference()}><ClipboardCopy />{copied ? 'Copied' : 'Copy reference'}</Button></div></CardContent></Card></main>;
}
