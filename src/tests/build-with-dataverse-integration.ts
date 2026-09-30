import { spawnSync } from 'node:child_process';

/**
 * Runs the production app build and, only after it succeeds, executes the live
 * Dataverse integration suite. Credentials and the explicit integration-test
 * opt-in flag are inherited from the calling process.
 */
const runStep = (label: string, args: string[]): void => {
  console.info(`\n${label}`);
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`${label} could not start: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

/** Build first so integration traffic is never generated for invalid code. */
runStep('Building Provisioning Hub', ['run', 'build']);

/** Run the reporting wrapper to preserve JUnit output and CI-friendly status. */
runStep('Running Dataverse integration tests', [
  'src/tests/run-dataverse-integration-tests.ts',
]);

console.info('\nBuild and Dataverse integration tests passed.');
