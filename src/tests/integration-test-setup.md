# Dataverse integration test setup

The test suite includes `src/tests/app-contract.test.ts` for current UI and workflow contracts plus `src/tests/dataverse-integration.test.ts` for live Dataverse verification. Together they cover the persistent shared shell and isolated clock, Activity page controls and paging, request completion and notification polling rules, direct Application-to-Security Configuration usage, table access, metadata contracts, current option-set values, production-style queries, missing-record behavior, and an Application CRUD lifecycle.

## Prerequisites

- Access to the target Dataverse environment.
- An Entra ID application or service principal authorized for that environment.
- Dataverse permissions to read the configured tables and create, update, and delete Application records.
- Bun installed for running the test suite.

## Environment variables

Configure the credentials expected by the test before running it. Keep secrets outside source control.

```bash
export DATAVERSE_TEST_URL="https://your-environment.crm.dynamics.com"
export DATAVERSE_TEST_TOKEN="your-short-lived-oauth-access-token"
export DATAVERSE_INTEGRATION_TESTS="true"
```

`DATAVERSE_TEST_URL` should be the environment base URL without a trailing slash. `DATAVERSE_TEST_TOKEN` must be an OAuth access token whose audience is that Dataverse environment. The integration suite remains skipped unless `DATAVERSE_INTEGRATION_TESTS` is explicitly set to `true`.

## Run application contract tests

From `apps/provisioning-hub`, run:

```bash
bun run test
```

These tests do not contact Dataverse and verify that the current route, Activity page, notification, request completion, and security relationship contracts remain present.

## Run the tests

From `apps/provisioning-hub`, run the reporting wrapper:

```bash
bun src/tests/run-dataverse-integration-tests.ts
```

The wrapper runs the live suite with a 60-second timeout and writes a CI-compatible JUnit XML report to `src/tests/results/dataverse-integration-results.xml`. Its exit code matches the test result, so pipelines fail when an integration assertion fails.

To choose a different report location, set `DATAVERSE_TEST_REPORT_PATH`:

```bash
export DATAVERSE_TEST_REPORT_PATH="src/tests/results/custom-results.xml"
bun src/tests/run-dataverse-integration-tests.ts
```

For console-only output without creating a report, run:

```bash
bun test src/tests/dataverse-integration.test.ts --timeout 60000
```

## Opt-in build with integration tests

The default `bun run build` remains unchanged and does not contact Dataverse. To run a production build followed by the live Dataverse integration suite, use:

```bash
DATAVERSE_INTEGRATION_TESTS=true bun src/tests/build-with-dataverse-integration.ts
```

The command stops immediately if the production build fails. If the build succeeds, it runs the Dataverse suite, writes the JUnit report, and returns a nonzero exit code when any integration test fails. Configure `DATAVERSE_TEST_URL` and `DATAVERSE_TEST_TOKEN` before invoking it.

## Test result report

The generated JUnit XML includes suite and test names, pass/fail status, execution time, skipped tests, and failure details. Open the XML directly or publish it with a CI system that supports JUnit reports.

Without `DATAVERSE_INTEGRATION_TESTS=true`, the integration suite is recorded as skipped and does not contact Dataverse. Report files are generated artifacts and should not be committed.

## Test behavior

- Verifies the current shared route layout owns the single persistent AppShell and isolated clock.
- Verifies the Activity page retains search, action filters, sorting, CSV export, and 10/25/50 paging.
- Verifies request completion remains gated by sent notifications and completed requests can be reopened.
- Verifies Mark Sent writes `Sending`, polls every five seconds for no more than three minutes, and disables Preview while sending.
- Verifies Security Configuration uses its direct Application lookup in the generated model and Applications page.
- Authenticates against the configured Dataverse environment.
- Verifies read access for every configured table.
- Confirms every table's logical name and primary key through Dataverse metadata.
- Confirms current Notification Status and Security Architecture option-set labels.
- Confirms the Security Configuration table exposes the direct Application lookup.
- Exercises filtered, ordered, projected, and limited collection queries, including the Activity page ordering.
- Confirms a missing-record request returns `404` without changing data.
- Creates, reads, updates, and deletes a temporary Application record, with cleanup after failures.

## Troubleshooting

- **401 Unauthorized:** Verify the tenant, client ID, client secret, and token audience.
- **403 Forbidden:** Confirm the service principal has the required Dataverse security role and table privileges.
- **404 Not Found:** Verify the environment URL and table entity-set names.
- **Test skipped:** Set `DATAVERSE_INTEGRATION_TESTS=true` in the test process.
- **Cleanup failure:** Locate the temporary Application record created by the suite and remove it manually.

Never commit client secrets, access tokens, or environment-specific credentials to this folder.
