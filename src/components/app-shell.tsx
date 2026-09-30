import { type ReactNode } from 'react';
import { AppClock } from '@/components/app-clock';
import { Link, NavLink } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
  Activity,
  AppWindow,
  BookOpen,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  Mail,
  Menu,
  Moon,

  Plus,
  ShieldCheck,
  Sun,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, styleClass: 'nav-dashboard' },
  { to: '/new-request', label: 'New Request', icon: Plus, styleClass: 'nav-new-request' },
  { to: '/requests', label: 'Requests', icon: ClipboardList, styleClass: 'nav-requests' },
  { to: '/access-control', label: 'Access Control List', icon: ShieldCheck, styleClass: 'nav-access' },
  { to: '/applications', label: 'Applications', icon: AppWindow, styleClass: 'nav-applications' },
  { to: '/templates', label: 'Email Templates', icon: Mail, styleClass: 'nav-templates' },
  { to: '/guides', label: 'Guides & Links', icon: BookOpen, styleClass: 'nav-guides' },
  { to: '/activity', label: 'Activity Log', icon: Activity, styleClass: 'nav-activity' },
] as const;

const navGroups = [navItems.slice(0, 1), navItems.slice(1, 4), navItems.slice(4)] as const;
const externalNavItems = [
  { href: 'https://gcc.admin.powerplatform.microsoft.us/', label: 'GCC Admin', icon: ExternalLink },
] as const;

type AppUser = {
  fullName?: string;
  userPrincipalName?: string;
};

type AppShellProps = {
  children: ReactNode;
  pageTitle: string;

  sidebarCollapsed: boolean;
  onSidebarCollapsedChange: (collapsed: boolean) => void;
  user?: AppUser;
  identityError?: string;
  identityRefreshing: boolean;
  onRetryIdentity: () => void;
  contentPadding?: boolean;
};



export function AppShell({
  children,
  pageTitle,

  sidebarCollapsed,
  onSidebarCollapsedChange,
  user,
  identityError,
  identityRefreshing,
  onRetryIdentity,
  contentPadding = true,
}: AppShellProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-20 flex w-16 flex-col bg-sidebar text-sidebar-foreground ${sidebarCollapsed ? 'md:w-16' : 'md:w-64'}`}>
        <div className="flex h-20 items-center gap-3 border-b border-sidebar-border p-3">
          <Button variant="ghost" size="icon" className="hover:!bg-transparent hover:!text-sidebar-foreground dark:hover:!bg-transparent dark:hover:!text-sidebar-foreground" onClick={() => onSidebarCollapsedChange(!sidebarCollapsed)}>
            <Menu />
          </Button>
          {!sidebarCollapsed && (
            <>
              <div className="hidden size-10 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground md:grid">
                <svg className="size-6" viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <g strokeWidth="0" />
                  <g strokeLinecap="round" strokeLinejoin="round" />
                  <g>
                    <path d="M128,84a44,44,0,1,0,44,44A44.04978,44.04978,0,0,0,128,84Zm0,64a20,20,0,1,1,20-20A20.02229,20.02229,0,0,1,128,148ZM85.57324,170.42676A11.99992,11.99992,0,0,1,68.60254,187.397a83.9413,83.9413,0,0,1,0-118.79394,11.99992,11.99992,0,1,1,16.9707,16.97021,59.94065,59.94065,0,0,0,0,84.85352Zm119.82031-9.72656A83.698,83.698,0,0,1,187.39746,187.397a11.99992,11.99992,0,1,1-16.9707-16.97021,59.94065,59.94065,0,0,0,0-84.85352A11.99992,11.99992,0,1,1,187.39746,68.603a84.07684,84.07684,0,0,1,17.99609,92.09717ZM57.28906,198.71094a11.99992,11.99992,0,0,1-16.9707,16.97021,123.90643,123.90643,0,0,1,0-175.3623,11.99992,11.99992,0,0,1,16.9707,16.97021,99.90643,99.90643,0,0,0,0,141.42188ZM252,128a123.65477,123.65477,0,0,1-36.31836,87.68115,11.99992,11.99992,0,1,1-16.9707-16.97021,99.90643,99.90643,0,0,0,0-141.42188,11.99992,11.99992,0,1,1,16.9707-16.97021A123.65937,123.65937,0,0,1,252,128Z" />
                  </g>
                </svg>
              </div>
              <div className="hidden min-w-0 md:block">
                <p className="font-semibold">Provisioning Hub</p>
                <p className="text-xs italic text-sidebar-foreground">v{import.meta.env.VITE_APP_VERSION ?? '0.0.0-local'}</p>
              </div>
            </>
          )}
        </div>
        <nav className="flex flex-1 flex-col p-3">
          {navGroups.map((group, groupIndex: number) => (
            <div key={group[0].to}>
              {groupIndex > 0 && <div role="separator" className="mx-2 my-2 h-px bg-sidebar-border" />}
              <div className="space-y-1">
                {group.map(({ to, label, icon: Icon, styleClass }) => (
                  <NavLink key={to} to={to} end={to === '/'} className={({ isActive }: { isActive: boolean }) => `sidebar-nav-item ${styleClass} flex items-center justify-center rounded-md p-2.5 text-sm font-medium ${sidebarCollapsed ? 'md:justify-center' : 'md:justify-start md:gap-3'} ${isActive ? 'is-active' : ''}`}>
                    <Icon className="size-4" />
                    {!sidebarCollapsed && <span className="hidden md:inline">{label}</span>}
                  </NavLink>

                ))}
              </div>
            </div>
          ))}
          <div role="separator" className="mx-2 my-2 h-px bg-sidebar-border" />
          <div className="space-y-1">
            {externalNavItems.map(({ href, label, icon: Icon }) => (
              <a key={href} href={href} target="_blank" rel="noreferrer" className={`flex items-center justify-center rounded-md p-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${sidebarCollapsed ? 'md:justify-center' : 'md:justify-start md:gap-3'}`}>
                <Icon className="size-4" />
                {!sidebarCollapsed && <span className="hidden md:inline">{label}</span>}
              </a>
            ))}
          </div>
          <div className="mt-auto pt-3">
            <button type="button" onClick={() => setTheme(darkMode ? 'light' : 'dark')} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`} title={`Switch to ${darkMode ? 'light' : 'dark'} mode`} className="grid size-9 place-items-center rounded-md text-sidebar-foreground">
              {darkMode ? <Moon key="moon" className="theme-mode-icon size-4" /> : <Sun key="sun" className="theme-mode-icon size-4" />}
            </button>
          </div>
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className={`flex items-center justify-center ${sidebarCollapsed ? 'md:justify-center' : 'md:gap-3'}`}>
            <Avatar className="size-9"><AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">{user?.fullName?.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() || '—'}</AvatarFallback></Avatar>
            {!sidebarCollapsed && <div className="hidden min-w-0 md:block"><p className="truncate text-sm font-medium">{user?.fullName ?? 'Identity unavailable'}</p><p className="truncate text-xs">{user?.userPrincipalName ?? 'Dataverse changes disabled'}</p></div>}
          </div>
        </div>
      </aside>
      <main className={`pl-16 ${sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'}`}>
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-3 overflow-hidden border-b bg-background px-3 py-3 sm:px-5 lg:px-8">
          <div className="header-train-track pointer-events-none absolute inset-x-0 bottom-0 h-3 overflow-hidden" aria-hidden="true">
            <svg className="header-train header-speed-train h-3 w-[21.25rem] text-primary motion-reduce:hidden" viewBox="0 0 334 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 8.5V3.25H25C16 3.25 10 4.1 5 5.7Q2 6.4 2 7.3Q2 8.5 5 8.5H50Z" fill="currentColor" />
              <path d="M46 4.25H34V6.5H46V4.25ZM31 4.25H22V6.5H31V4.25ZM19 4.45C15 4.75 12 5.45 9 6.65H19V4.45Z" fill="var(--background)" />
              <g>
                <path d="M52 3.25H79V8.5H52V3.25Z" fill="currentColor" />
                <path d="M56 4.25H63V6.5H56V4.25ZM68 4.25H75V6.5H68V4.25Z" fill="var(--background)" />
              </g>
              <g>
                <path d="M81 3.25H108V8.5H81V3.25Z" fill="currentColor" />
                <path d="M85 4.25H92V6.5H85V4.25ZM97 4.25H104V6.5H97V4.25Z" fill="var(--background)" />
              </g>
              <g>
                <path d="M110 3.25H137V8.5H110V3.25Z" fill="currentColor" />
                <path d="M114 4.25H121V6.5H114V4.25ZM126 4.25H133V6.5H126V4.25Z" fill="var(--background)" />
              </g>
              <g>
                <path d="M139 3.25H166V8.5H139V3.25Z" fill="currentColor" />
                <path d="M143 4.25H150V6.5H143V4.25ZM155 4.25H162V6.5H155V4.25Z" fill="var(--background)" />
              </g>
              <g>
                <path d="M168 3.25H195V8.5H168V3.25Z" fill="currentColor" />
                <path d="M172 4.25H179V6.5H172V4.25ZM184 4.25H191V6.5H184V4.25Z" fill="var(--background)" />
              </g>
              <g>
                <path d="M197 3.25H224V8.5H197V3.25Z" fill="currentColor" />
                <path d="M201 4.25H208V6.5H201V4.25ZM213 4.25H220V6.5H213V4.25Z" fill="var(--background)" />
              </g>
              <g>
                <path d="M226 3.25H253V8.5H226V3.25Z" fill="currentColor" />
                <path d="M230 4.25H237V6.5H230V4.25ZM242 4.25H249V6.5H242V4.25Z" fill="var(--background)" />
              </g>
              <g>
                <path d="M255 3.25H282V8.5H255V3.25Z" fill="currentColor" />
                <path d="M259 4.25H266V6.5H259V4.25ZM271 4.25H278V6.5H271V4.25Z" fill="var(--background)" />
              </g>
              <path d="M284 8.5V3.25H309C318 3.25 324 4.1 329 5.7Q332 6.4 332 7.3Q332 8.5 329 8.5H284Z" fill="currentColor" />
              <path d="M288 4.25H300V6.5H288V4.25ZM303 4.25H312V6.5H303V4.25ZM315 4.45C319 4.75 322 5.45 325 6.65H315V4.45Z" fill="var(--background)" />
            </svg>
          </div>
          <div className="relative z-10 min-w-0"><p className="hidden text-xs text-muted-foreground sm:block">PROVISIONING OPERATIONS</p><div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><h1 className="truncate text-xl font-semibold sm:text-2xl">{pageTitle}</h1><AppClock /></div></div>
          <Button asChild size="sm" className="relative z-10"><Link to="/new-request"><Plus /><span className="hidden sm:inline">New Request</span></Link></Button>
        </header>
        <div className={contentPadding ? 'min-w-0 space-y-4 p-3 sm:p-5 lg:space-y-5 lg:p-8' : 'min-w-0 space-y-4 lg:space-y-5'}>
          {identityError && <Alert variant="destructive"><ShieldCheck className="size-4" /><AlertTitle>Identity could not be verified</AlertTitle><AlertDescription className="space-y-2"><p>{identityError} Dataverse changes that require audit attribution are disabled.</p><Button variant="outline" size="sm" disabled={identityRefreshing} onClick={onRetryIdentity}>{identityRefreshing ? 'Retrying…' : 'Try again'}</Button></AlertDescription></Alert>}
          {children}
        </div>
      </main>
    </div>
  );
}
