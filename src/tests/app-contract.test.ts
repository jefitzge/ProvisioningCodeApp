import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (relativePath: string): string => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const expectIncludes = (content: string, expected: string): void => {
  expect(content.includes(expected)).toBe(true);
};

const expectExcludes = (content: string, unexpected: string): void => {
  expect(content.includes(unexpected)).toBe(false);
};

describe('current application contracts', () => {
  test('all pages render inside the persistent shared application shell', () => {
    const app = source('src/app.tsx');
    const layout = source('src/pages/_layout.tsx');
    const pageFiles = [
      'dashboard-page.tsx',
      'requests-page.tsx',
      'request-detail-page.tsx',
      'new-request-page.tsx',
      'applications-page.tsx',
      'templates-page.tsx',
      'guides-page.tsx',
      'access-control-page.tsx',
      'activity-page.tsx',
      'not-found.tsx',
    ];

    expectIncludes(app, "element: <Layout />");
    expectIncludes(layout, '<AppShell');
    expectIncludes(layout, '<Outlet />');
    for (const pageFile of pageFiles) {
      expectExcludes(source(`src/pages/${pageFile}`), '<AppShell');
    }
  });

  test('the live clock is isolated to the shared shell header', () => {
    const shell = source('src/components/app-shell.tsx');
    const shellState = source('src/hooks/use-app-shell-state.ts');
    const clock = source('src/components/app-clock.tsx');

    expectIncludes(shell, '<AppClock />');
    expectExcludes(shellState, 'setInterval');
    expectIncludes(clock, 'setInterval');
    expectIncludes(clock, 'window.clearInterval');
  });

  test('the decorative train remains rendered in the shared header', () => {
    const shell = source('src/components/app-shell.tsx');
    const styles = source('src/index.css');

    expectIncludes(shell, 'header-train-track');
    expectIncludes(shell, 'header-train header-speed-train');
    expectIncludes(shell, '<svg');
    expectIncludes(styles, '@keyframes header-speed-train-crossing');
  });

  test('the Activity page keeps its current search, filters, sort, export, and paging', () => {
    const activity = source('src/pages/activity-page.tsx');

    for (const expected of [
      "const pageSizes = ['10', '25', '50']",
      'placeholder="Search activity"',
      "'All actions'",
      'Newest first',
      'Oldest first',
      'Export CSV',
      'Rows per page',
      'Previous',
      'Next',
      'rows.slice((currentPage - 1) * size, currentPage * size)',
    ]) {
      expectIncludes(activity, expected);
    }
  });

  test('request completion remains gated by sent notifications and supports reopen', () => {
    const detail = source('src/pages/request-detail-page.tsx');

    expectIncludes(detail, "notification.statusKey === 'Sent'");
    expectIncludes(detail, 'selectedRequest.statusKey === \'Completed\' || !allUsersNotified');
    expectIncludes(detail, "await changeRequestStatus(request, 'InProgress')");
    expectIncludes(detail, '>Reopen</Button>');
  });

  test('notification sending uses Dataverse status polling for no more than three minutes', () => {
    const detail = source('src/pages/request-detail-page.tsx');

    expectIncludes(detail, "statusKey: 'Sending'");
    expectIncludes(detail, 'const pollIntervalMs = 5_000');
    expectIncludes(detail, 'const pollTimeoutMs = 3 * 60_000');
    expectIncludes(detail, 'NotificationRecordService.get(notificationId)');
    expectIncludes(detail, "notification.statusKey === 'Failed'");
    expectIncludes(detail, "disabled={!pending || pending.statusKey === 'Sending'}");
  });

  test('Dataverse queries do not mount until Power Apps initialization completes', () => {
    const app = source('src/app.tsx');

    expectIncludes(app, 'const [platformReady, setPlatformReady] = useState(false)');
    expectIncludes(app, '.then(() => {');
    expectIncludes(app, 'if (active) setPlatformReady(true)');
    expectIncludes(app, 'if (!platformReady) return null');
  });

  test('Dashboard avoids the unused requested-user collection read', () => {
    const dashboard = source('src/pages/dashboard-page.tsx');

    expectExcludes(dashboard, 'useRequestedUserList');
    expectExcludes(dashboard, 'requestedUserQuery');
  });

  test('published runtime safeguards ignore host observer noise and avoid unused New Request reads', () => {
    const app = source('src/app.tsx');
    const newRequest = source('src/pages/new-request-page.tsx');

    expectIncludes(app, "event.filename.includes('web-client-content-script.js')");
    expectIncludes(app, "captureFailure('host-mutation-observer'");
    expectExcludes(newRequest, 'useActivityRecordList');
    expectExcludes(newRequest, 'activityQuery');
  });

  test('Email Templates serializes published provider list reads', () => {
    const templates = source('src/pages/templates-page.tsx');

    expectIncludes(templates, 'enabled: query.isSuccess');
    expectIncludes(templates, 'const templateResult = await query.refetch()');
    expectIncludes(templates, 'const applicationResult = await appQuery.refetch()');
    expectExcludes(templates, 'Promise.all([query.refetch(), appQuery.refetch()])');
  });

  test('all generated Dataverse collection hooks use the provider-safe read queue', () => {
    const hookFiles = [
      'use-access-control-entry.ts',
      'use-access-control-environment-assignment.ts',
      'use-access-control-role-assignment.ts',
      'use-access-role.ts',
      'use-activity-record.ts',
      'use-application.ts',
      'use-email-template.ts',
      'use-environment.ts',
      'use-guide-link.ts',
      'use-notification-record.ts',
      'use-provisioning-request.ts',
      'use-request-stage-configuration.ts',
      'use-request-user-role.ts',
      'use-request-user.ts',
      'use-requested-user-stage-progress.ts',
      'use-requested-user.ts',
      'use-security-configuration.ts',
      'use-workflow-stage-option.ts',
    ];

    const queue = source('src/lib/dataverse-read-queue.ts');
    expectIncludes(queue, 'collectionReadQueue.then(read, read)');
    expectIncludes(queue, '() => undefined');
    for (const hookFile of hookFiles) {
      const hook = source(`src/generated/hooks/${hookFile}`);
      expectIncludes(hook, "from '../../lib/dataverse-read-queue'");
      expectIncludes(hook, 'queryFn: () => queueDataverseCollectionRead');
    }
  });

  test('published runtime suppresses only unavailable AppGen diagnostic transport errors before SDK imports execute', () => {
    const main = source('src/main.tsx');
    const filter = source('src/lib/published-console-filter.ts');

    expectIncludes(main, "import '@/lib/published-console-filter';");
    expect(main.indexOf("import '@/lib/published-console-filter';") < main.indexOf("import App from '@/app.tsx';")).toBe(true);
    expectIncludes(filter, 'PING failed to receive PONG message');
    expectIncludes(filter, 'Failed to log info for ');
    expectIncludes(filter, 'Failed to log warning for ');
    expectIncludes(filter, 'Failed to log error for ');
    expectIncludes(filter, "Timed out after 30000ms while making a call to the 'In Memory Data Provider'");
    expectIncludes(filter, "Object.defineProperty(console, 'error'");
    expectIncludes(filter, 'configurable: false');
    expectIncludes(filter, 'originalConsoleError(...args)');
  });

  test('application security configuration uses the direct application relationship', () => {
    const applications = source('src/pages/applications-page.tsx');
    const model = source('src/generated/models/security-configuration-model.ts');

    expectIncludes(model, "application?: Pick<Application, 'id' | 'applicationName'>");
    expectIncludes(applications, 'configuration.application && sameDataverseId(configuration.application.id, item.id)');
    expectIncludes(applications, 'entry.application && sameDataverseId(entry.application.id, item.id)');
  });
});
