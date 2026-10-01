# Provisioning Hub
[![CI](https://github.com/jefitzge/ProvisioningCodeApp/actions/workflows/ci.yml/badge.svg)](https://github.com/jefitzge/ProvisioningCodeApp/actions/workflows/ci.yml)

Provisioning Hub manages application access requests, configuration, provisioning activity, notifications, and access-control records backed by Dataverse.

## Dataverse integration tests

The opt-in integration suite is located at `src/tests/dataverse-integration.test.ts`. It validates read access to every configured Dataverse table and runs an Application create, read, update, and delete lifecycle against a live environment.

### Prerequisites

- Bun and the app dependencies must be installed.
- Use a non-production Dataverse environment intended for testing.
- Obtain an OAuth bearer token whose audience is your Dataverse organization URL.
- The test identity needs read permission for all configured tables and create, read, update, and delete permission for the Application table.

### Environment variables

Set these variables only in the terminal session used to run the test:

| Variable | Required value |
| --- | --- |
| `DATAVERSE_INTEGRATION_TESTS` | `true` to enable the otherwise skipped live suite |
| `DATAVERSE_TEST_URL` | Organization URL, such as `https://your-org.crm.dynamics.com` |
| `DATAVERSE_TEST_TOKEN` | OAuth access token for that organization |

Do not commit access tokens to source control, configuration files, screenshots, or documentation. Tokens expire, so obtain a fresh token if Dataverse returns `401 Unauthorized`.

### Run the suite

From `apps/provisioning-hub`, set the variables and run the named script.

Bash or zsh:

```bash
export DATAVERSE_INTEGRATION_TESTS=true
export DATAVERSE_TEST_URL="https://your-org.crm.dynamics.com"
export DATAVERSE_TEST_TOKEN="<access-token>"
bun run test:dataverse
```

PowerShell:

```powershell
$env:DATAVERSE_INTEGRATION_TESTS = "true"
$env:DATAVERSE_TEST_URL = "https://your-org.crm.dynamics.com"
$env:DATAVERSE_TEST_TOKEN = "<access-token>"
bun run test:dataverse
```

### Test behavior

- The read test requests one row from each of the 18 configured entity sets to verify authentication, permissions, and entity-set names.
- The CRUD test creates a uniquely named temporary Application, reads it, updates its name, deletes it, and confirms that the deleted row returns `404`.
- An `afterAll` cleanup removes the temporary Application if the test fails after creation.
- The suite is skipped unless `DATAVERSE_INTEGRATION_TESTS` is exactly `true`, preventing accidental writes during normal validation.

### Troubleshooting

| Result | Likely cause |
| --- | --- |
| Suite is skipped | `DATAVERSE_INTEGRATION_TESTS` is missing or is not exactly `true` |
| `401 Unauthorized` | Token is missing, expired, or issued for a different Dataverse audience |
| `403 Forbidden` | Test identity lacks the required table privileges |
| `404 Not Found` on a table | Environment schema or entity-set name differs from the configured app schema |
| Create or update fails | Application table privileges, required columns, or business rules prevent the operation |

The suite performs live writes. Run it only against an approved test environment and verify that no temporary Application remains if the process is terminated before cleanup executes.
