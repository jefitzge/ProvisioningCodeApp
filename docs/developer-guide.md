# Developer guide

> Living document: update this file in the same change whenever routes, features, data entities, integrations, build commands, debugging behavior, or architectural boundaries change.
# IDE Setup

```bash
node --version
pa --version
npm install --save-dev "oxlint-tsgolint@^7.0.2001" --allow-remote=all
`npm approve-scripts --allow-scripts-pending` to review, or `npm approve-scripts <pkg>`
pa app init
pa app run
npm run build
pa app push
```

## Project at a glance

Provisioning Notification Hub is a single React code app for Power Platform administrators. It records access requests, tracks each requested user through provisioning stages, maintains application and access-control configuration, and supports onboarding notifications and operational auditing.

The current implementation is already organized like a code app: routes are feature-owned React pages, Dataverse access is exposed through generated typed hooks, and Power Apps host initialization supplies runtime context. A future conversion should preserve these boundaries and replace platform-specific bootstrapping or generated data access only where the target code-app runtime requires it.

## Repository map

```text
/
├── project.json                         # Project identity and description
├── docs/
│   ├── overview.md                      # Product purpose, users, scenarios, design
│   ├── developer-guide.md               # Architecture, maintenance, and debugging guide
│   └── github-ci-and-publishing.md       # GitHub validation, credentials, and publishing guidance
├── data-model/
│   └── full-data-model.json             # Source data-model metadata; do not edit manually
└── apps/provisioning-hub/
    ├── src/
    │   ├── app.tsx                      # Providers, platform initialization, route table
    │   ├── main.tsx                     # Browser entry point
    │   ├── index.css                    # Tailwind theme tokens and app-wide styling
    │   ├── pages/                       # Route-owned feature state, queries, handlers, JSX
    │   ├── components/                  # Reusable app and UI components
    │   ├── hooks/                       # Shared authored hooks
    │   ├── lib/                         # Shared utilities, query client, telemetry
    │   ├── generated/                   # Generated models, validators, services, hooks
    │   └── tests/                       # Dataverse integration suite and test tooling
    ├── app-gen-sdk/                     # Generated Power Apps data runtime
    ├── .power/dataverse/                # Generated Dataverse table schemas
    ├── plugins/                         # Authored Vite plugins
    ├── scripts/                         # Repository checks such as filename validation
    ├── power.config.json                # App and Dataverse registrations
    ├── package.json                     # Commands and dependencies
    └── vite.config.ts                   # Vite configuration
```

## Runtime architecture

1. `src/main.tsx` mounts the React application.
2. `src/app.tsx` initializes `@microsoft/power-apps`, installs the React Query, Jotai, theme, toast, and error-boundary providers, and declares all routes.
3. `src/pages/_layout.tsx` owns the persistent `AppShell`, signed-in-user query, sidebar state, route-title mapping, and routed `<Outlet />`. The shell therefore remains mounted during navigation.
4. `components/app-clock.tsx` owns the single one-second timer used by the shell header, preventing clock ticks from re-rendering routed page content.
5. Each file in `src/pages/` owns its feature-specific state, queries, mutations, handlers, and JSX.
6. Pages consume typed hooks from `src/generated/hooks`; those hooks call generated services and the App Gen SDK data client.
7. Shared request aggregation lives in `src/hooks/use-request-data.ts`. Cross-feature formatting, identity comparison, workflow mapping, and safe template HTML handling live in `src/lib/provisioning-utils.ts`.
8. React Query caches reads for five minutes, does not retry failed operations, and does not refetch on window focus. Mutations also do not retry automatically.

## Routes and feature ownership

| Route | Page | Responsibility |
| --- | --- | --- |
| `/` | `dashboard-page.tsx` | Operational summary and work requiring attention |
| `/requests` | `requests-page.tsx` | Request listing, filtering, and deletion workflow |
| `/requests/:id` | `request-detail-page.tsx` | Request-user workflow progress and request actions |
| `/new-request` | `new-request-page.tsx` | Multi-user request creation and validation |
| `/access-control` | `access-control-page.tsx` | User/application access records and import workflow |
| `/applications` | `applications-page.tsx` | Application and provisioning configuration |
| `/templates` | `templates-page.tsx` | Onboarding email-template maintenance |
| `/guides` | `guides-page.tsx` | Operational guide-link maintenance |
| `/activity` | `activity-page.tsx` | Activity, notification outcomes, and local diagnostics |
| `/data-sources` | `activity-page.tsx` | Compatibility alias for the activity view |

Add a route by creating a lower-case kebab-case page under `src/pages/`, adding a static import and route entry in `src/app.tsx`, and adding navigation only if it is a primary destination. Keep feature state and mutations in the page or a feature-focused hook; do not recreate a central workspace component.

## Shared authored modules

- `components/app-shell.tsx`: persistent sidebar, page header, theme toggle, identity status, and global new-request action.
- `components/app-clock.tsx`: isolated header clock and one-second timer; keep this timer out of route pages and shell state.
- `components/query-state.tsx`: reusable loading and query-failure presentation.
- `components/request-status-badge.tsx`: consistent request status rendering.
- `components/request-workflow-progress.tsx`: reusable workflow-stage display.
- `components/access-control-import-dialog.tsx`: access-control import flow.
- `hooks/use-app-shell-state.ts`: sidebar collapse state only; user identity belongs to the shared layout and time belongs to `app-clock.tsx`.
- `hooks/use-request-data.ts`: joins request, user, role, and stage records for request-oriented pages.
- `hooks/use-user.ts`: obtains the signed-in Power Apps user through runtime context.
- `lib/provisioning-utils.ts`: dates, normalized email, Dataverse ID comparison, duplicate checks, workflow status mapping, and email HTML sanitization.
- `lib/query-client.ts`: global React Query behavior.
- `lib/telemetry.ts`: correlation IDs and locally retained failure diagnostics.

## Data and generated code

Dataverse is the system of record. Registered tables are declared in `power.config.json`; the root data model is stored in `data-model/full-data-model.json`. Core entities cover applications, environments, access roles, provisioning requests, requested users, request-user links, role assignments, workflow stages and progress, access-control entries, email templates, guides, notifications, and activity records.

Treat these paths as generated artifacts:

- `src/generated/**`
- `app-gen-sdk/**`
- `.power/dataverse/**`
- `data-model/full-data-model.json`

Do not hand-edit them. Change the data model through the platform data-model workflow, then regenerate the data layer. Generated hook, model, and service names are part of the current page contracts; review compile errors after regeneration for schema changes.

Lookup comparisons should use `sameDataverseId` because Dataverse identifiers may differ in casing. User emails should pass through `normalizeEmail` before matching. Mutations that require attribution depend on a valid signed-in user; the shell displays an error and disables affected operations when identity cannot be verified.

## Development workflow

Run commands from `apps/provisioning-hub`.

```bash
bun run check
bun run build
bun run lint
bun run typecheck
```

- `bun run check` is the normal local gate: native TypeScript checking, an esbuild bundle check, oxlint, and Tailwind CSS compilation run in parallel.
- `bun run build` performs TypeScript checking and creates the production Vite bundle in `dist`.
- `bun run lint` runs oxlint. The repository also includes `scripts/check-file-names.mjs`; authored files must use lower-case kebab-case.
- Run `bun test src/tests/app-contract.test.ts` for the credential-free application contract suite. There is currently no `test` script alias in `package.json`.
- Use the platform-level project validator before completing a change because it also validates project metadata and Power Apps SDK usage.
- Never commit secrets, access tokens, generated test reports, or environment-specific credentials. See `docs/github-ci-and-publishing.md` for GitHub Actions, OIDC, environment files, and optional publishing guidance.

## Debugging playbook

### App does not start

1. Inspect the failure screen for its correlation ID.
2. Check the browser console for the matching telemetry event and the failing initialization scope.
3. Confirm the app is running in a supported Power Apps host and that `initialize()` in `src/app.tsx` can complete.
4. Verify `power.config.json` still points to the intended Dataverse environment and registered tables.

### A page fails to load data

1. Identify the generated list hook used by the page.
2. Inspect its React Query state and the reusable query-state message.
3. Confirm the logical table name in `power.config.json` matches the generated schema and service.
4. Check the user's Dataverse read privilege for that table.
5. Remember that global query retries and focus refetching are disabled; explicitly use the page retry or refetch action after correcting the cause.

### A save, update, or delete fails

1. Verify user identity loaded successfully in the shell; attributed mutations may be intentionally disabled otherwise.
2. Read the semantic toast message and browser console telemetry.
3. Locate the page mutation and inspect its payload type from `src/generated/models`.
4. Verify required lookup IDs and use `sameDataverseId` when comparing existing records.
5. Check Dataverse create, write, append, append-to, and delete privileges as appropriate.

### Data looks stale

React Query considers data fresh for five minutes and does not refetch on window focus. Use the page's explicit refresh/refetch flow or invalidate the relevant generated query after a successful mutation. If adding a mutation, verify every affected list/detail key is refreshed.

### Navigation or blank-page problem

1. Check the static page import and route in `src/app.tsx`.
2. Confirm the page is rendered beneath `src/pages/_layout.tsx`.
3. Check for a matching link in `components/app-shell.tsx` if the destination should be in primary navigation.
4. Inspect the error boundary and browser console for a render exception.

### Theme or layout regression

The authoritative global styling baseline is `src/index.css` together with `components/app-shell.tsx`. It uses a cool blue operational palette with blue/cyan semantic accents, per-route sidebar navigation colors, workflow status tokens, a decorative header train, an 80px shell header, and responsive content spacing (`p-3`, `sm:p-5`, `lg:p-8`). Preserve these global tokens, component classes, animations, and shell dimensions when changing feature pages; route-specific layout remains owned by each page.

### Integration-test failure

See `src/tests/integration-test-setup.md` for credential setup and full commands. The live Dataverse suite is opt-in and requires:

```bash
export DATAVERSE_TEST_URL="https://your-environment.crm.dynamics.com"
export DATAVERSE_TEST_TOKEN="your-short-lived-oauth-access-token"
export DATAVERSE_INTEGRATION_TESTS="true"
bun src/tests/run-dataverse-integration-tests.ts
```

A `401` usually indicates token or audience problems, `403` indicates security-role privileges, and `404` indicates an environment URL or entity-set mismatch. The suite creates a temporary Application record and attempts cleanup even after failure.

## Error handling and diagnostics

`src/app.tsx` catches Power Apps initialization failures, global runtime errors, and unhandled promise rejections. `components/system/error-boundary.tsx` handles React render failures. `lib/telemetry.ts` stores up to 100 recent events in browser local storage under `provisioning-hub-telemetry`, emits browser events for the activity view, and includes route, timestamp, severity, message, and correlation ID.

When adding error handling:

- Convert unknown errors to safe user-facing messages.
- Record unexpected operational failures with `captureFailure`.
- Preserve correlation IDs in recovery UI.
- Do not log credentials, tokens, email-template contents, or unnecessary personal data.
- Do not allow telemetry failures to interrupt the user workflow.

## Testing strategy

The credential-free contract suite in `src/tests/app-contract.test.ts` verifies the current shared shell and isolated clock, route and Activity controls, request completion/reopen behavior, notification polling rules, and the direct Application-to-Security Configuration relationship. Run it with:

```bash
bun test src/tests/app-contract.test.ts
```

The opt-in live suite in `src/tests/dataverse-integration.test.ts` verifies registered-table access, metadata and option-set contracts, production-style queries, missing-record behavior, and create/read/update/delete behavior for a temporary Application record. Use `src/tests/run-dataverse-integration-tests.ts` to produce JUnit XML; see `src/tests/integration-test-setup.md` for credentials and commands.

For feature changes, manually verify the affected route in addition to automated validation:

- Initial loading, empty, populated, and error states.
- Filters, paging, sorting, and derived counts.
- Create/edit/delete success and failure behavior.
- Query invalidation and refresh failure toasts after mutations or explicit refreshes.
- Identity-dependent controls.
- Keyboard and narrow-screen usability.

Add focused unit tests when extracting non-trivial pure logic from pages, especially validation, workflow-state mapping, payload construction, and sanitization.

## Code-app conversion notes

Preserve the feature-page boundary during conversion. The main seams are:

- Host startup: `initialize()` and `getContext()` from `@microsoft/power-apps/app`.
- Data access: generated hooks/services plus `app-gen-sdk`.
- Environment registration: `power.config.json` and `.power/dataverse` schemas.
- Identity: `hooks/use-user.ts` and audit-attribution fields.

Before conversion, inventory every generated hook used by each page and map it to the target code-app data API. Keep React Query as the UI-facing cache boundary where practical so pages do not need a wholesale rewrite. Preserve model semantics, lookup relationships, status keys, optimistic-concurrency expectations in integration tests, error correlation IDs, and HTML sanitization. Move environment identifiers and secrets into deployment configuration; never embed them in source. For repository CI, secure Dataverse credentials, branch protection, JUnit artifacts, and an optional gated publish stage, follow `docs/github-ci-and-publishing.md`.

## Change checklist

Every app change should include the applicable documentation update:

- Update this guide for route, folder, module ownership, generated-code, command, debugging, testing, or conversion changes.
- Update `docs/overview.md` only when the product purpose, users, scenarios, boundaries, or design direction changes.
- Update `src/tests/integration-test-setup.md` when integration-test credentials, behavior, or commands change.
- Update `docs/github-ci-and-publishing.md` when CI events, secrets, authentication, reports, or publishing guidance changes.
- Regenerate data code after an approved data-model change.
- Run the application contract suite when its covered behaviors change, then run full project validation and resolve all errors.
- Confirm all new authored filenames are lower-case kebab-case.
