# GitHub CI and Power Apps publishing

This guide describes a practical path for exporting Provisioning Hub as a Power Apps code app, storing it in GitHub, running validation on every pull request and merge, securely supplying Dataverse test credentials, and optionally publishing a validated build.

## Recommended pipeline

Use three separate jobs:

1. **Application validation** runs for every pull request and every merge to the protected branch. It installs locked dependencies, runs the application contract tests, performs static checks, and builds the production bundle.
2. **Power Platform Checker** runs for every pull request and push that changes the unpacked Power Platform solution. It packages the solution, submits it to Microsoft Power Platform Checker, and fails the required check when the configured issue threshold is exceeded.
3. **Publish** runs only after application validation, Checker, and any live Dataverse tests succeed on the protected branch. It targets an approved GitHub Environment and uses the Microsoft-supported Power Platform CLI or GitHub Action available when the exported code app is configured.

Keep the live Dataverse suite separate from ordinary contract tests because it connects to a real environment and temporarily creates an Application row. Run it against a dedicated non-production Dataverse environment. Power Platform Checker analyzes a solution package, so export and unpack the app in a Power Platform solution before enabling its job.

## Repository preparation

After export, keep the existing repository structure and run app commands from `apps/provisioning-hub`.

The current useful commands are:

```bash
bun test src/tests/app-contract.test.ts
bun src/tests/run-dataverse-integration-tests.ts
# bun run check
# bun run build
```

The integration wrapper writes JUnit XML to `src/tests/results/dataverse-integration-results.xml` and returns a failing exit code when a test fails.

## Automatic CI versioning

Use Git tags as the authoritative production version and derive non-release build versions from GitHub metadata. This avoids CI committing changes back to `package.json` while still stamping every tested bundle and artifact with a traceable version.

Recommended formats:

- Release tag `v1.4.2` produces version `1.4.2`.
- A pull request produces `0.1.0-pr.<pull-request-number>.<run-number>`.
- A push to `main` produces `0.1.<run-number>`.
- Local builds fall back to the checked-in package version, currently `0.0.0`.

Add version calculation before tests and the production build in the `app` job:

```yaml
      - name: Calculate build version
        id: version
        shell: bash
        run: |
          if [[ "${GITHUB_REF}" == refs/tags/v* ]]; then
            VERSION="${GITHUB_REF_NAME#v}"
          elif [[ "${GITHUB_EVENT_NAME}" == "pull_request" ]]; then
            VERSION="0.1.0-pr.${{ github.event.pull_request.number }}.${GITHUB_RUN_NUMBER}"
          else
            VERSION="0.1.${GITHUB_RUN_NUMBER}"
          fi

          echo "value=$VERSION" >> "$GITHUB_OUTPUT"
          echo "APP_VERSION=$VERSION" >> "$GITHUB_ENV"
          echo "VITE_APP_VERSION=$VERSION" >> "$GITHUB_ENV"

      - name: Stamp package metadata
        run: npm pkg set version="${APP_VERSION}"

      - name: Run application contract tests
        run: bun test src/tests/app-contract.test.ts

      - name: Run static checks
        run: bun run check

      - name: Build versioned production bundle
        env:
          VITE_APP_VERSION: ${{ env.APP_VERSION }}
        run: bun run build

      - name: Upload versioned build artifact
        uses: actions/upload-artifact@v4
        with:
          name: provisioning-hub-${{ steps.version.outputs.value }}
          path: apps/provisioning-hub/dist
          if-no-files-found: error
```

Because the job-level working directory is `apps/provisioning-hub`, `npm pkg set` changes only the runner workspace. Do not push that generated `package.json` change back to the repository. The build artifact, workflow run, commit SHA, and optional Git tag provide the release audit trail.

To expose the stamped value in the Vite app or diagnostics, read it with a safe fallback:

```typescript
export const appVersion =
  import.meta.env.VITE_APP_VERSION ?? '0.0.0-local';
```

If TypeScript does not yet declare the variable, add it to the existing Vite environment declarations:

```typescript
interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

Do not display the version unless the UI is intentionally changed. Supplying `VITE_APP_VERSION` alone does not alter the current interface.

For production, create and push a semantic-version tag only after the target commit passes required checks:

```bash
git tag v1.2.0
git push origin v1.2.0
```

Include tag events in the workflow if tagged builds should be tested and published:

```yaml
on:
  pull_request:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:
```

A publish job should consume the exact versioned artifact produced by the validated job, rather than rebuilding unrelated source. If publishing requires a rebuild, check out the same commit SHA, recalculate the same tag-derived version, and rerun the full test, check, and build sequence before deployment.

Before the first push, extend `apps/provisioning-hub/.gitignore`; the current file ignores `*.local` but does not ignore every `.env` variant or generated test reports:

```gitignore
.env
.env.*
!.env.example
src/tests/results/
```

Do not commit real `.env` files, tokens, client secrets, certificates, downloaded publish profiles, or test reports. Commit the resulting `.gitignore` change before introducing local credentials.

## Local environment file

Create `apps/provisioning-hub/.env.example` as a safe template:

```dotenv
DATAVERSE_INTEGRATION_TESTS=false
DATAVERSE_TEST_URL=https://your-test-environment.crm.dynamics.com
DATAVERSE_TEST_TOKEN=
DATAVERSE_TEST_REPORT_PATH=src/tests/results/dataverse-integration-results.xml
```

Developers can copy it to `.env.local` and populate local values. The existing test code reads `process.env`; Bun automatically loads common `.env` files when commands are run from the app directory. Keep `DATAVERSE_INTEGRATION_TESTS=false` unless live writes to the approved test environment are intended.

`DATAVERSE_TEST_TOKEN` is a short-lived OAuth access token whose audience must be the URL in `DATAVERSE_TEST_URL`. It is suitable for a quick local run but should not be stored as a long-lived GitHub secret.

## Dataverse test identity

Create a dedicated Microsoft Entra application/service principal for CI and add it as an application user in the test Power Platform environment. Assign a least-privilege Dataverse security role that provides:

- Read access to every table registered in `power.config.json`.
- Metadata read access.
- Create, read, update, and delete privileges for the Application table used by the CRUD test.

Never point the write-enabled integration suite at production.

### Preferred GitHub authentication

Use GitHub OpenID Connect federation instead of a client secret:

1. Create a federated credential on the Entra application for the GitHub repository and protected GitHub Environment.
2. Grant the workflow `id-token: write` permission.
3. Store only non-secret identifiers in GitHub variables: tenant ID, client ID, and Dataverse URL.
4. Use `azure/login` with OIDC, then request a Dataverse token at runtime with Azure CLI.

If federation is not available, store a client secret in the protected GitHub Environment and rotate it regularly. Do not store a generated bearer token because it expires.

## GitHub configuration

Create a GitHub Environment such as `dataverse-test` and configure:

**Environment variables**

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID` — required by the example `azure/login` configuration
- `DATAVERSE_TEST_URL`

**Environment secrets, only if OIDC cannot be used**

- `AZURE_CLIENT_SECRET`

### Power Platform Checker identity and policy

Power Platform Checker is most useful when the code app, flows, connection references, and related Dataverse customizations are stored in an unpacked solution. Create a separate least-privilege Entra application for Checker, add it as an application user in a non-production Power Platform environment, and grant only the permissions required to upload and analyze solutions.

Add these values to a protected GitHub Environment such as `power-platform-checker`:

- Variable `POWER_PLATFORM_URL` — the non-production environment URL.
- Variable `POWER_PLATFORM_SOLUTION_NAME` — the unique solution name used when packing.
- Variable `POWER_PLATFORM_RULESET` — optional Checker ruleset ID approved by your organization.
- Secrets `POWER_PLATFORM_CLIENT_ID`, `POWER_PLATFORM_TENANT_ID`, and `POWER_PLATFORM_CLIENT_SECRET` if the selected official action requires service-principal secret authentication.

Do not reuse the production deployment identity. Rotate the secret and restrict the environment to trusted branches. If the current official Power Platform action supports workload identity in your tenant, prefer that over a client secret.
Protect the environment with required reviewers if the workflow can write test data. Configure branch protection on `main` so the validation workflow is a required status check before merge.

## Example validation workflow

Create `.github/workflows/validate.yml` after export:

```yaml
name: Validate Provisioning Hub

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: validate-${{ github.ref }}
  cancel-in-progress: true

jobs:
  app:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/provisioning-hub
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          # Replace with an approved, tested Bun version and update deliberately.
          bun-version: latest


## Power Platform Checker on commit and push

Checker cannot scan the React source directory by itself; it scans a packaged Power Platform solution. After exporting the app, keep the solution source in a path such as `solutions/provisioning-hub/`. Include the code app, notification flow, connection references, environment-variable definitions, Dataverse components, and security roles that belong to the release.

Add a Checker job to `.github/workflows/validate.yml`. The example below uses Microsoft's official `microsoft/powerplatform-actions` actions. Pin each action to an organization-approved release or full commit SHA rather than leaving `@v1` indefinitely.

```yaml
  power-platform-checker:
    # Run on PRs and pushes only when solution or workflow files change.
    if: github.event_name == 'workflow_dispatch' || github.event_name == 'push' || github.event_name == 'pull_request'
    runs-on: windows-latest
    environment: power-platform-checker
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Pack unmanaged solution for analysis
        uses: microsoft/powerplatform-actions/pack-solution@v1
        with:
          solution-folder: solutions/provisioning-hub
          solution-file: artifacts/provisioning-hub-unmanaged.zip
          solution-type: Unmanaged

      - name: Run Power Platform Checker
        uses: microsoft/powerplatform-actions/check-solution@v1
        with:
          environment-url: ${{ vars.POWER_PLATFORM_URL }}
          app-id: ${{ secrets.POWER_PLATFORM_CLIENT_ID }}
          client-secret: ${{ secrets.POWER_PLATFORM_CLIENT_SECRET }}
          tenant-id: ${{ secrets.POWER_PLATFORM_TENANT_ID }}
          path: artifacts/provisioning-hub-unmanaged.zip
          geo: unitedstates
          # Add rule-level-override only after agreeing on the team's
          # warning/error threshold and verifying the current action syntax.
```

Limit workflow triggering at the workflow level so documentation-only commits do not spend Checker capacity:

```yaml
on:
  pull_request:
    paths:
      - "apps/provisioning-hub/**"
      - "solutions/provisioning-hub/**"
      - ".github/workflows/validate.yml"
  push:
    branches: [main]
    paths:
      - "apps/provisioning-hub/**"
      - "solutions/provisioning-hub/**"
      - ".github/workflows/validate.yml"
  workflow_dispatch:
```

If the same workflow must also validate documentation changes, omit the global `paths` filter and use a changed-files job to conditionally run only the Checker job. GitHub required checks can remain pending when an entire path-filtered workflow is skipped, so confirm branch-protection behavior before making Checker required.

Configure branch protection so both `app` and `power-platform-checker` must pass before merge. Treat new critical and high-severity findings as blocking. Establish a reviewed baseline for existing findings rather than suppressing rules broadly; store any approved exclusions in source control with an owner and expiry date.

The `geo` value must match the tenant's Checker geography. Verify the supported input names and authentication options against the pinned action release because Microsoft can revise action inputs. First test packaging and Checker submission against a development solution before making the check mandatory.
      - name: Install locked dependencies
        run: bun install --frozen-lockfile

      - name: Run application contract tests
        run: bun test src/tests/app-contract.test.ts

      - name: Run static checks
        run: bun run check

      - name: Build production bundle
        run: bun run build
```

This job needs no credentials and should be the required pull-request check. A merge to `main` triggers it again against the exact merged revision. For reproducible CI, replace `bun-version: latest` with a specific version after confirming the exported app builds with it; keep that version aligned across validation, integration, and publish jobs.

## Example live Dataverse job

Add this second job to the same workflow, or place it in a separate workflow. Using a protected environment prevents untrusted pull-request code from receiving credentials.

```yaml
  dataverse:
    if: github.event_name != 'pull_request'
    needs: app
    runs-on: ubuntu-latest
    environment: dataverse-test
    permissions:
      contents: read
      id-token: write
    defaults:
      run:
        working-directory: apps/provisioning-hub
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install locked dependencies
        run: bun install --frozen-lockfile

      - name: Sign in to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Acquire Dataverse access token and run integration tests
        shell: bash
        env:
          DATAVERSE_INTEGRATION_TESTS: "true"
          DATAVERSE_TEST_URL: ${{ vars.DATAVERSE_TEST_URL }}
        run: |
          token=$(az account get-access-token \
            --resource "$DATAVERSE_TEST_URL" \
            --query accessToken \
            --output tsv)
- Confirm pull-request, `main`, and `v*` builds receive the expected version format.
- Confirm the uploaded artifact name contains the calculated version and its contents came from the tested job.
- Confirm CI does not commit the temporary `package.json` version change back to the repository.
- Confirm a release tag and the published artifact report the same semantic version.
          echo "::add-mask::$token"
          DATAVERSE_TEST_TOKEN="$token" \
            bun src/tests/run-dataverse-integration-tests.ts

      - name: Upload integration report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: dataverse-integration-results
          path: apps/provisioning-hub/src/tests/results/dataverse-integration-results.xml
- Confirm the exported solution can be packed from `solutions/provisioning-hub/` without missing dependencies.
- Confirm Checker runs on a solution-changing pull request and blocks the merge for a known high-severity test finding.
- Confirm documentation-only changes do not consume Checker capacity while required checks still resolve correctly.
- Pin the Power Platform actions and verify `geo`, authentication inputs, and any rule override syntax against those exact releases.
          if-no-files-found: warn
```

The example assumes the deployment identity can log in through an Azure subscription and therefore requires `AZURE_SUBSCRIPTION_ID`. If the CI identity is intentionally tenant-only, replace the login step with the tenant-level authentication flow supported by the current `azure/login` release and verify token acquisition in the test environment before enabling CI.

For secret-based login, replace the OIDC step with the supported credentials input and source the client secret from `${{ secrets.AZURE_CLIENT_SECRET }}`. Keep the environment protection and never print authentication output. The example keeps the short-lived Dataverse bearer token inside one shell step rather than publishing it as a GitHub Actions output.

## Optional publish stage

Publishing should be a separate job that depends on both validation jobs and runs only for `main` or a release tag. Use a second protected GitHub Environment such as `power-apps-production` with required reviewers.

The app already builds to `apps/provisioning-hub/dist`, as declared by `power.config.json`. A publish job should therefore:

1. Check out the exact validated revision.
2. Install dependencies with the lockfile.
3. Run tests and `bun run build` again, or download a build artifact produced by the validation job.
4. Authenticate to the target Power Platform environment with a dedicated deployment identity.
5. Invoke the **current Microsoft-supported Power Platform CLI command or GitHub Action for publishing a code app**, pointing it at `apps/provisioning-hub` and its `power.config.json`/`dist` output.
6. Record the commit SHA, target environment, app ID, and deployment result in the workflow summary.

Use a guarded skeleton until the exact command is confirmed for the exported code-app tooling version:

```yaml
  publish:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: [app, dataverse]
    runs-on: ubuntu-latest
    environment: power-apps-production
    permissions:
      contents: read
      id-token: write
    defaults:
      run:
        working-directory: apps/provisioning-hub
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build

      # Authenticate with the deployment service principal here.
      # Install the Microsoft Power Platform CLI or selected official action.
      # Replace this comment with the publish command documented for the
      # exported code-app format and CLI version used by your tenant.
```

Do not guess or pin an unverified publish command. Power Apps code-app deployment commands and preview capabilities can change; use the command generated by the export experience or the current Microsoft Learn documentation, test it in a development environment, and only then enable the production job.

## Safer release progression

A low-risk rollout is:

1. Require contract tests, static checks, production build, and Power Platform Checker on pull requests.
2. Run the same checks again against the merged commit on `main`.
3. Run live Dataverse tests after merges to `main` in a dedicated test environment.
4. Publish automatically to a development Power Platform environment.
5. Add an approval gate before production publishing.
6. Prefer immutable release tags for production and retain the prior deployable artifact for rollback.

## Branch and secret safety

- Do not expose credentials to workflows triggered from forks.
- Pin third-party actions to reviewed release tags or commit SHAs according to organizational policy.
- Enable Dependabot and secret scanning.
- Restrict who can approve protected deployment environments.
- Use separate identities and security roles for test and production.
- Avoid persisting access tokens in artifacts, logs, job summaries, or workflow outputs longer than necessary.
- Keep `power.config.json` under review because it contains environment and app identifiers, even though it should not contain credentials.

## Verification checklist

Before relying on the pipeline:

- Confirm `.env`, `.env.*`, and `src/tests/results/` are ignored while `.env.example` remains tracked.
- Pin and test one Bun version across every job.
- Open a pull request and confirm contract tests, checks, and build run without secrets.
- Merge a harmless change and confirm the merged SHA is tested again.
- Confirm the Dataverse job acquires a fresh token and writes only to the test environment.
- Confirm the temporary Application row is deleted after successful and failed tests.
- Confirm the JUnit report is uploaded when a test fails.
- Confirm protected environment approval is required before publishing.
- Confirm the published app corresponds to the tested commit SHA.
- Test rollback in a non-production environment before enabling production deployment.
