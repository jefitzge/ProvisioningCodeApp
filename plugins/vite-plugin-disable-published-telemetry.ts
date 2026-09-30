import type { Plugin } from 'vite';

const loggerPathSuffix = '/app-gen-sdk/data/common/logger-client.ts';
const publishedGuard = "if (isPlayingApp) {\n    return;\n  }";

/**
 * Prevents generated authoring telemetry from calling the unavailable in-memory
 * logging provider in production bundles. Dataverse operations and their errors
 * remain unchanged; only logInfo, logWarning, and logError become no-ops when
 * Vite is building the published app.
 */
export function disablePublishedTelemetryPlugin(): Plugin {
  return {
    name: 'disable-published-appgen-telemetry',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (!id.replaceAll('\\', '/').endsWith(loggerPathSuffix)) return null;

      const transformed = code.replaceAll(
        publishedGuard,
        "if (import.meta.env.PROD || isPlayingApp) {\n    return;\n  }",
      );

      if (transformed === code) {
        this.error('Unable to apply the published AppGen telemetry guard.');
      }

      return { code: transformed, map: null };
    },
  };
}
