export type TelemetrySeverity = 'info' | 'warning' | 'error';

export interface TelemetryEvent {
  correlationId: string;
  name: string;
  severity: TelemetrySeverity;
  message: string;
  route: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

const telemetryStorageKey = 'provisioning-hub-telemetry';

/** Creates a unique correlation identifier for operational diagnostics. */
export const createCorrelationId = () => crypto.randomUUID();
/** Reads locally retained telemetry in reverse chronological order. */

export const getTelemetryEvents = (): TelemetryEvent[] => {
  try {
    const events = JSON.parse(window.localStorage.getItem(telemetryStorageKey) ?? '[]') as TelemetryEvent[];
    return events.sort((first: TelemetryEvent, second: TelemetryEvent) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());
  } catch {
    return [];
  }
/** Clears locally retained telemetry without interrupting the application. */
};

export const clearTelemetryEvents = () => {
  try {
    window.localStorage.removeItem(telemetryStorageKey);
    window.dispatchEvent(new CustomEvent('provisioning-hub-telemetry-cleared'));
  } catch {
    // Telemetry maintenance must never interrupt the app.
/** Persists and broadcasts one telemetry event. */
  }
};

export const recordTelemetry = (event: TelemetryEvent) => {
  try {
    const current = JSON.parse(window.localStorage.getItem(telemetryStorageKey) ?? '[]') as TelemetryEvent[];
    window.localStorage.setItem(telemetryStorageKey, JSON.stringify([...current.slice(-99), event]));
  } catch {
    // Telemetry must never interrupt recovery UI.
  }

  if (import.meta.env.DEV) console.error('[telemetry]', event);
/** Captures an unknown failure as correlated error telemetry. */

  window.dispatchEvent(new CustomEvent<TelemetryEvent>('provisioning-hub-telemetry', { detail: event }));
};

export const captureFailure = (name: string, error: unknown, correlationId = createCorrelationId(), metadata?: TelemetryEvent['metadata']) => {
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  recordTelemetry({ correlationId, name, severity: 'error', message, route: window.location.pathname, timestamp: new Date().toISOString(), metadata });
  return correlationId;
};
