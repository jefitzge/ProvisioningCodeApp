import { Activity } from 'lucide-react';
import type { ReactNode } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/provisioning-utils';

export type QueryStateLike = {
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
};

export function QueryState({ queries, children }: { queries: QueryStateLike[]; children: ReactNode }) {
  const failed = queries.filter((query: QueryStateLike) => query.isError);
  if (queries.some((query: QueryStateLike) => query.isLoading)) {
    return <div className="space-y-5" role="status" aria-label="Loading Dataverse records"><Card><CardHeader><Skeleton aria-hidden="true" className="h-6 w-48" /></CardHeader><CardContent className="space-y-3">{[0, 1, 2].map((item: number) => <Skeleton aria-hidden="true" key={item} className="h-24 w-full" />)}</CardContent></Card><span className="sr-only">Loading records from Dataverse…</span></div>;
  }
  if (failed.length) {
    const details = failed.map((query: QueryStateLike) => errorMessage(query.error)).filter((message: string, index: number, messages: string[]) => messages.indexOf(message) === index).join(' ');
    return <Alert variant="destructive"><Activity className="size-4" /><AlertTitle>Dataverse records could not be loaded</AlertTitle><AlertDescription className="space-y-3"><p>{details}</p><Button variant="outline" size="sm" disabled={failed.some((query: QueryStateLike) => query.isFetching)} onClick={() => failed.forEach((query: QueryStateLike) => { void query.refetch(); })}>Try again</Button></AlertDescription></Alert>;
  }
  return children;
}
