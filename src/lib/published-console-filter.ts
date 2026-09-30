const originalConsoleError = console.error.bind(console);

/**
 * Suppresses only failures from the generated AppGen authoring-diagnostics RPC.
 * Published apps do not expose its `data-agent-provider` endpoint, so its PING and
 * log calls time out even though Dataverse uses the separate Power Apps data client.
 */
function shouldSuppress(args: unknown[]): boolean {
  const message = args.map((value: unknown) => value instanceof Error ? value.message : String(value)).join(' ');
  const isUnavailableDiagnosticProvider = message.includes(
    "Timed out after 30000ms while making a call to the 'In Memory Data Provider'",
  );
  const isGeneratedDiagnosticCall = message.includes('PING failed to receive PONG message')
    || message.includes('Failed to log info for ')
    || message.includes('Failed to log warning for ')
    || message.includes('Failed to log error for ');
  return isUnavailableDiagnosticProvider && isGeneratedDiagnosticCall;
}

const filteredConsoleError = (...args: unknown[]): void => {
  if (shouldSuppress(args)) return;
  originalConsoleError(...args);
};

Object.defineProperty(console, 'error', {
  configurable: false,
  enumerable: true,
  get: () => filteredConsoleError,
  set: () => undefined,
});
