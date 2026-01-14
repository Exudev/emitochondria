import { EmitochondriaConfig, EmitochondriaOptions, EventMap } from './types.js';

// ============================================================
// CONFIG FILE LOADING
// ============================================================

const CONFIG_FILENAME = 'emitochondria.config.json';

let cachedConfig: EmitochondriaConfig | null = null;

/**
 * Synchronous version for initial load.
 * Falls back to empty config if loading fails.
 */
function loadConfigFileSync(): EmitochondriaConfig {
  if (cachedConfig !== null) return cachedConfig;

  const proc = (globalThis as any).process;
  if (typeof proc === 'undefined' || !proc?.versions?.node) {
    cachedConfig = {};
    return cachedConfig;
  }

  try {
    const req = (globalThis as any).require;
    if (!req) {
      cachedConfig = {};
      return cachedConfig;
    }

    const fs = req('fs');
    const path = req('path');

    const configPath = path.join(proc.cwd(), CONFIG_FILENAME);
    const content = fs.readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(content) as EmitochondriaConfig;

    return cachedConfig;
  } catch {
    cachedConfig = {};
    return cachedConfig;
  }
}

// ============================================================
// CONFIG MERGING
// ============================================================

/**
 * Deep merge two objects, with second taking precedence.
 */
function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base };

  for (const key in override) {
    if (override[key] !== undefined) {
      if (
        typeof override[key] === 'object' &&
        override[key] !== null &&
        !Array.isArray(override[key]) &&
        typeof result[key] === 'object' &&
        result[key] !== null
      ) {
        result[key] = deepMerge(result[key], override[key]);
      } else {
        result[key] = override[key] as T[typeof key];
      }
    }
  }

  return result;
}

/**
 * Merge file config with options.
 * Options take precedence over file config.
 */
export function mergeConfig<T extends EventMap>(
  options: EmitochondriaOptions<T> = {}
): EmitochondriaOptions<T> {
  const fileConfig = loadConfigFileSync();
  // Type assertion is safe here because we control both inputs
  const merged = deepMerge(fileConfig as any, options as any);
  return merged as EmitochondriaOptions<T>;
}

/**
 * Clear cached config (useful for testing).
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}
