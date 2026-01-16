// ============================================================
// NODE MODULE LOADER
// Provides ESM and CJS compatible loading of fs and path modules
// ============================================================

const isNode = typeof (globalThis as any).process !== 'undefined'
  && (globalThis as any).process?.versions?.node != null;

// Cached modules
let fsModule: typeof import('fs') | null = null;
let pathModule: typeof import('path') | null = null;
let loadPromise: Promise<{ fs: typeof import('fs') | null; path: typeof import('path') | null }> | null = null;
let loadAttempted = false;

/**
 * Check if we're in a Node.js environment.
 */
export function isNodeEnvironment(): boolean {
  return isNode;
}

/**
 * Try to load modules synchronously using require (CJS).
 * This is attempted first for immediate availability in CJS environments.
 * Returns true if sync loading succeeded.
 */
export function tryLoadSync(): boolean {
  if (!isNode || loadAttempted) return fsModule !== null;

  try {
    // Try globalThis.require (available in bundled CJS)
    if (typeof (globalThis as any).require === 'function') {
      fsModule = (globalThis as any).require('fs');
      pathModule = (globalThis as any).require('path');
      loadAttempted = true;
      return true;
    }

    // Try Function constructor for CJS context
    const req = Function('return typeof require !== "undefined" ? require : null')();
    if (req) {
      fsModule = req('fs');
      pathModule = req('path');
      loadAttempted = true;
      return true;
    }
  } catch {
    // Sync loading failed, will need async
  }

  return false;
}

/**
 * Load fs and path modules asynchronously.
 * Works in both ESM and CJS environments.
 * Returns cached modules if already loaded.
 */
export async function loadNodeModules(): Promise<{ fs: typeof import('fs') | null; path: typeof import('path') | null }> {
  if (!isNode) {
    loadAttempted = true;
    return { fs: null, path: null };
  }

  // Return cached if already loaded
  if (loadAttempted && fsModule && pathModule) {
    return { fs: fsModule, path: pathModule };
  }

  // Return existing promise if load in progress
  if (loadPromise) {
    return loadPromise;
  }

  // Start async load
  loadPromise = (async () => {
    try {
      // Dynamic import works in both ESM and CJS
      const [fs, path] = await Promise.all([
        import('fs'),
        import('path')
      ]);
      fsModule = fs;
      pathModule = path;
    } catch (err) {
      console.warn('[Emitochondria] Failed to load Node.js modules:', err);
      fsModule = null;
      pathModule = null;
    } finally {
      loadAttempted = true;
    }
    return { fs: fsModule, path: pathModule };
  })();

  return loadPromise;
}

/**
 * Get cached modules if already loaded (synchronous access).
 * Returns loaded state to indicate if loading has completed.
 */
export function getNodeModules(): { fs: typeof import('fs') | null; path: typeof import('path') | null; loaded: boolean } {
  return {
    fs: fsModule,
    path: pathModule,
    loaded: loadAttempted
  };
}

/**
 * Check if async loading is in progress.
 */
export function isLoadingInProgress(): boolean {
  return loadPromise !== null && !loadAttempted;
}

// Attempt sync load immediately at module load time
// This ensures CJS environments have modules available right away
tryLoadSync();
