import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * Runs the live Dataverse integration suite and writes a CI-compatible JUnit report.
 * Execute from apps/provisioning-hub with:
 * `bun src/tests/run-dataverse-integration-tests.ts`
 */
const reportPath = resolve(
  process.env.DATAVERSE_TEST_REPORT_PATH ?? 'src/tests/results/dataverse-integration-results.xml',
);

/** Ensure the selected report directory exists before Bun opens the output file. */
mkdirSync(dirname(reportPath), { recursive: true });

/**
 * Reuse the current Bun executable so local and CI runs use the same runtime.
 * Environment variables, including Dataverse credentials, are inherited safely.
 */
const result = spawnSync(
  process.execPath,
  [
    'test',
    'src/tests/dataverse-integration.test.ts',
    '--timeout',
    '60000',
    '--reporter=junit',
    `--reporter-outfile=${reportPath}`,
  ],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  },
);

/** Surface launch failures and preserve Bun's test exit code for CI pipelines. */
if (result.error) {
  console.error(`Unable to start the integration test runner: ${result.error.message}`);
  process.exit(1);
}

console.info(`JUnit integration test report: ${reportPath}`);
process.exit(result.status ?? 1);
