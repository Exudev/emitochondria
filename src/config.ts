import { EmitochondriaConfig, EmitochondriaOptions, EventMap } from './types.js';

// ============================================================
// CONFIG FILE LOADING
// ============================================================

const CONFIG_FILENAME = 'emitochondria.config.json';

// Environment detection
const isNode = typeof (globalThis as any).process !== 'undefined'
  && (globalThis as any).process?.versions?.node != null;

// Get require function - works in both ESM and CJS
function getRequireFunction(): ((id: string) => any) | null {
  if (!isNode) return null;

  // CJS: globalThis.require is available (bundlers like tsup inject this)
  if (typeof (globalThis as any).require === 'function') {
    return (globalThis as any).require;
  }

  // Try Function constructor to get require in CJS context
  try {
    const req = Function('return typeof require !== "undefined" ? require : null')();
    if (req) return req;
  } catch {
    // Ignore
  }

  // ESM: use createRequire
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createRequire } = Function('return require("node:module")')();
    // import.meta.url might be empty in CJS, use a fallback
    const url = typeof import.meta?.url === 'string' && import.meta.url
      ? import.meta.url
      : 'file://' + (globalThis as any).process?.cwd?.() + '/';
    return createRequire(url);
  } catch {
    return null;
  }
}

const nodeRequire = getRequireFunction();

let cachedConfig: EmitochondriaConfig | null = null;
let cachedProjectRoot: string | null = null;

/**
 * Find project root by walking up directories looking for package.json.
 */
function findProjectRoot(): string {
  if (cachedProjectRoot !== null) return cachedProjectRoot;

  const proc = (globalThis as any).process;
  if (typeof proc === 'undefined' || !proc?.versions?.node) {
    cachedProjectRoot = '';
    return '';
  }

  try {
    if (!nodeRequire) {
      const cwd: string = proc.cwd();
      cachedProjectRoot = cwd;
      return cwd;
    }

    const path = nodeRequire('path');
    const fs = nodeRequire('fs');

    let dir: string = proc.cwd();

    // Walk up looking for package.json
    while (dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, 'package.json'))) {
        cachedProjectRoot = dir;
        return dir;
      }
      dir = path.dirname(dir);
    }

    // Fallback to cwd if no package.json found
    const cwd: string = proc.cwd();
    cachedProjectRoot = cwd;
    return cwd;
  } catch {
    const cwd: string = proc.cwd();
    cachedProjectRoot = cwd;
    return cwd;
  }
}

/**
 * Get the cached project root (for use by logger).
 */
export function getProjectRoot(): string {
  return findProjectRoot();
}

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
    if (!nodeRequire) {
      cachedConfig = {};
      return cachedConfig;
    }

    const fs = nodeRequire('fs');
    const path = nodeRequire('path');

    // Look for config in project root first
    const projectRoot = findProjectRoot();
    const configPath = path.join(projectRoot, CONFIG_FILENAME);

    if (!fs.existsSync(configPath)) {
      // Also try cwd as fallback
      const cwdPath = path.join(proc.cwd(), CONFIG_FILENAME);
      if (fs.existsSync(cwdPath)) {
        const content = fs.readFileSync(cwdPath, 'utf-8');
        cachedConfig = JSON.parse(content) as EmitochondriaConfig;

        if (proc.env?.NODE_ENV !== 'production') {
          console.log(`[Emitochondria] Config loaded from: ${cwdPath}`);
        }

        return cachedConfig;
      }

      cachedConfig = {};
      return cachedConfig;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(content) as EmitochondriaConfig;

    if (proc.env?.NODE_ENV !== 'production') {
      console.log(`[Emitochondria] Config loaded from: ${configPath}`);
    }

    return cachedConfig;
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      console.warn(`[Emitochondria] Failed to load config: ${err?.message}`);
    }
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
  cachedProjectRoot = null;
}
