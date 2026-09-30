import { Outlet, useLocation } from 'react-router-dom';

import { AppShell } from '@/components/app-shell';
import { useAppShellState } from '@/hooks/use-app-shell-state';
import { useUser } from '@/hooks/use-user';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/requests': 'Requests',
  '/new-request': 'New Request',
  '/applications': 'Applications',
  '/templates': 'Email Templates',
  '/guides': 'Guides & Links',
  '/data-sources': 'Activity Log',
  '/access-control': 'Access Control List',
  '/activity': 'Activity Log',
};

/** Hosts nested application routes inside the persistent application shell. */
export default function Layout() {
  const location = useLocation();
  const userQuery = useUser();
  const { sidebarCollapsed, setSidebarCollapsed } = useAppShellState();
  const pageTitle = location.pathname.startsWith('/requests/') ? 'Request detail' : (pageTitles[location.pathname] ?? 'Page not found');
  const identityError = userQuery.isError ? (userQuery.error instanceof Error ? userQuery.error.message : 'Identity lookup failed.') : undefined;

  return (
    <AppShell
      pageTitle={pageTitle}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarCollapsedChange={setSidebarCollapsed}
      user={userQuery.data}
      identityError={identityError}
      identityRefreshing={userQuery.isFetching}
      onRetryIdentity={() => { void userQuery.refetch(); }}
    >
      <Outlet />
    </AppShell>
  );
}
