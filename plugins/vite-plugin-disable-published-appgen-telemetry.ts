import type { Plugin } from 'vite';

/**
 * The generated AppGen client sends authoring diagnostics through a
 * `data-agent-provider` RPC endpoint. That endpoint is not present in the
 * published Power Apps player, so the diagnostic PING and log calls time out.
 *
 * Production builds already intend to disable this path via `isPlayingApp`.
 * This transform makes that published-build contract explicit and leaves
 * development/authoring builds unchanged.
 */
export function disablePublishedAppGenTelemetryPlugin(): Plugin {
  return {
    name: 'disable-published-appgen-telemetry',
    apply: 'build',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (!id.replaceAll('\\', '/').endsWith('/app-gen-sdk/constants.ts')) return null;

      return {
        code: code.replace(
          'export const isPlayingApp: boolean = !!import.meta.env.PROD;',
          'export const isPlayingApp: boolean = true;',
        ),
        map: null,
      };
    },
  };
}
