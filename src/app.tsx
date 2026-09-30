import { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import { initialize } from '@microsoft/power-apps/app';
import { ThemeProvider } from 'next-themes';

import Layout from '@/pages/_layout';
import { queryClient } from '@/lib/query-client';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from '@/components/system/error-boundary';
import { SystemFailureScreen } from '@/components/system/system-failure-screen';
import { captureFailure, createCorrelationId } from '@/lib/telemetry';

import AccessControlPage from '@/pages/access-control-page';
import ActivityPage from '@/pages/activity-page';
import ApplicationsPage from '@/pages/applications-page';
import DashboardPage from '@/pages/dashboard-page';
import GuidesPage from '@/pages/guides-page';
import NewRequestPage from '@/pages/new-request-page';
import RequestDetailPage from '@/pages/request-detail-page';
import RequestsPage from '@/pages/requests-page';
import TemplatesPage from '@/pages/templates-page';
import NotFoundPage from '@/pages/not-found';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'requests', element: <RequestsPage /> },
      { path: 'requests/:id', element: <RequestDetailPage /> },
      { path: 'new-request', element: <NewRequestPage /> },
      { path: 'applications', element: <ApplicationsPage /> },
      { path: 'templates', element: <TemplatesPage /> },
      { path: 'guides', element: <GuidesPage /> },
      { path: 'data-sources', element: <ActivityPage /> },
      { path: 'access-control', element: <AccessControlPage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

/** Initializes platform services and mounts the routed application providers. */
function App() {
  const [startupFailure, setStartupFailure] = useState<{ message: string; correlationId: string } | null>(null);
  const [platformReady, setPlatformReady] = useState(false);

  useEffect(() => {
    let active = true;
    void initialize()
      .then(() => {
        if (active) setPlatformReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const correlationId = captureFailure('power-apps-initialization', error);
        setStartupFailure({ message: 'The Power Apps connection could not be initialized. Check your connection and reload the app.', correlationId });
      });

    const handleError = (event: ErrorEvent) => {
      const isHostObserverError = event.message.includes("Failed to execute 'observe' on 'MutationObserver'")
        && event.filename.includes('web-client-content-script.js');
      if (isHostObserverError) {
        captureFailure('host-mutation-observer', event.error ?? event.message);
        return;
      }
      const correlationId = captureFailure('global-runtime-error', event.error ?? event.message);
      setStartupFailure({ message: 'A serious application error occurred. Your current operation may be incomplete.', correlationId });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const reasonMessage = event.reason instanceof Error ? event.reason.message : String(event.reason ?? '');
      const isProviderTimeout = reasonMessage.includes("Timed out after 30000ms while making a call to the 'In Memory Data Provider'");
      if (isProviderTimeout) {
        captureFailure('data-provider-timeout', event.reason);
        return;
      }
      const correlationId = captureFailure('unhandled-promise-rejection', event.reason);
      setStartupFailure({ message: 'An unexpected background operation failed. Your current operation may be incomplete.', correlationId });
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      active = false;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (startupFailure) return <SystemFailureScreen message={startupFailure.message} correlationId={startupFailure.correlationId || createCorrelationId()} />;
  if (!platformReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary resetQueryCache>
        <JotaiProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <Toaster richColors position="top-right" />
            <RouterProvider router={router} />
          </ThemeProvider>
        </JotaiProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
