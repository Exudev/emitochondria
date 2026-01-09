/**
 * Base type for event maps.
 * Keys are event names, values are payload types.
 */
export type EventMap = Record<string, unknown>;

/**
 * Extracts event names from an event map as a string union.
 */
export type EventKey<T extends EventMap> = keyof T & string;

/**
 * Handler function for a specific event payload.
 * Can be sync or async.
 */
export type EventHandler<T> = (payload: T) => void | Promise<void>;

/**
 * Wildcard handler that receives event name and payload.
 * Useful for logging/debugging.
 */
export type WildcardHandler<T extends EventMap> = <K extends EventKey<T>>(
  event: K,
  payload: T[K]
) => void | Promise<void>;

/**
 * Internal type for wrapped handlers (used by once()).
 * Stores reference to original handler for manual removal.
 * @internal
 */
type WrappedHandler<T> = EventHandler<T> & {
  __original?: EventHandler<T>;
};

/**
 * Options for creating an Emitochondria instance.
 */
export interface EmitochondriaOptions {
  /**
   * Custom error handler for errors thrown by event handlers.
   *
   * @default - Logs to console in development, silent in production
   * @example 'throw' - Preserve original throwing behavior
   * @example (error, event) => logger.error(error)
   */
  onError?:
    | ((error: Error, event: string, handler: EventHandler<unknown>) => void)
    | 'throw';

  /**
   * Maximum listeners per event before warning.
   * Set to 0 to disable warnings.
   * @default 10
   */
  maxListeners?: number;

  /**
   * Custom handler when max listeners is exceeded.
   * If not provided, logs a warning to console.
   */
  onMaxListenersExceeded?: (event: string, count: number, max: number) => void;
}

/**
 * The typed emitter interface.
 */
export interface Emitochondria<T extends EventMap> {
  /** Subscribe to an event. Returns unsubscribe function. */
  on<K extends EventKey<T>>(event: K, handler: EventHandler<T[K]>): () => void;
  /** Unsubscribe a handler from an event. */
  off<K extends EventKey<T>>(event: K, handler: EventHandler<T[K]>): void;
  /** Subscribe for a single emission only. */
  once<K extends EventKey<T>>(event: K, handler: EventHandler<T[K]>): () => void;
  /** Emit an event synchronously. */
  emit<K extends EventKey<T>>(event: K, ...payload: T[K] extends void ? [] : [T[K]]): void;
  /** Emit an event and await all handlers. */
  emitAsync<K extends EventKey<T>>(event: K, ...payload: T[K] extends void ? [] : [T[K]]): Promise<void>;
  /** Subscribe to all events (wildcard). */
  onAny(handler: WildcardHandler<T>): () => void;
  /** Unsubscribe a wildcard handler. */
  offAny(handler: WildcardHandler<T>): void;
  /** Clear handlers for a specific event or all events. */
  clear<K extends EventKey<T>>(event?: K): void;
  /** Get the number of listeners for an event. */
  listenerCount<K extends EventKey<T>>(event: K): number;
  /** Set a custom error handler at runtime. */
  setErrorHandler(handler: EmitochondriaOptions['onError']): void;
  /** Set the maximum number of listeners per event before warning. */
  setMaxListeners(n: number): void;
  /** Get the current max listener limit. */
  getMaxListeners(): number;
  /** Get all event names that currently have registered listeners. */
  eventNames(): EventKey<T>[];
  /** Get all handlers registered for a specific event. */
  listeners<K extends EventKey<T>>(event: K): ReadonlyArray<EventHandler<T[K]>>;
  /** Get all wildcard handlers. */
  wildcardListeners(): ReadonlyArray<WildcardHandler<T>>;
  /** Check if a specific handler is registered for an event. */
  hasListener<K extends EventKey<T>>(event: K, handler: EventHandler<T[K]>): boolean;

  // Biological aliases
  /** Alias for `on` — Bind a receptor to a signal. */
  bind: Emitochondria<T>['on'];
  /** Alias for `off` — Release a receptor. */
  release: Emitochondria<T>['off'];
  /** Alias for `emit` — Pulse energy through the system. */
  pulse: Emitochondria<T>['emit'];
  /** Alias for `emitAsync` — Trigger a signal cascade. */
  cascade: Emitochondria<T>['emitAsync'];
  /** Alias for `once` — Single spike of energy. */
  spike: Emitochondria<T>['once'];
  /** Alias for `onAny` — Membrane catches all signals. */
  membrane: Emitochondria<T>['onAny'];
  /** Alias for `clear` — Programmed cell death. */
  apoptosis: Emitochondria<T>['clear'];
  /** Alias for `listenerCount` — Count of receptors. */
  receptors: Emitochondria<T>['listenerCount'];
}

/**
 * Create a new typed event emitter.
 *
 * @example
 * ```typescript
 * type MyEvents = {
 *   'user:login': { userId: string };
 *   'app:ready': void;
 * };
 *
 * const mito = createEmitochondria<MyEvents>();
 *
 * // Standard API
 * mito.on('user:login', (data) => {
 *   console.log(data.userId); // fully typed!
 * });
 * mito.emit('user:login', { userId: '123' });
 * mito.emit('app:ready');
 *
 * // Biological API
 * mito.bind('user:login', (data) => console.log(data.userId));
 * mito.pulse('user:login', { userId: '123' });
 * ```
 */
export function createEmitochondria<T extends EventMap>(
  options: EmitochondriaOptions = {}
): Emitochondria<T> {
  const handlers: Map<string, Set<WrappedHandler<unknown>>> = new Map();
  const wildcardHandlers: Set<WildcardHandler<T>> = new Set();

  // Default error handler
  let errorHandler: EmitochondriaOptions['onError'] = options.onError ?? ((error: Error, event: string) => {
    // Log in development, silent in production
    // Check for NODE_ENV in a way that works in both Node and browser
    const nodeEnv = (globalThis as any).process?.env?.NODE_ENV;
    if (nodeEnv !== 'production') {
      console.error(`[Emitochondria] Error in handler for event "${event}":`, error);
    }
  });

  // Max listeners configuration
  let maxListeners = options.maxListeners ?? 10;

  const onMaxListenersExceeded = options.onMaxListenersExceeded ?? ((event, count, max) => {
    console.warn(
      `[Emitochondria] Possible memory leak detected: ` +
      `${count} listeners added for event "${event}". ` +
      `Maximum is ${max}. Use setMaxListeners() to increase limit.`
    );
  });

  /**
   * Check if max listeners exceeded and warn if needed.
   */
  function checkMaxListeners(event: string, count: number): void {
    if (maxListeners > 0 && count > maxListeners) {
      onMaxListenersExceeded(event, count, maxListeners);
    }
  }

  /**
   * Safely execute a handler, catching errors according to configuration.
   */
  function safeCall<K extends EventKey<T>>(
    handler: EventHandler<unknown>,
    event: K,
    payload: unknown
  ): void | Promise<void> {
    try {
      const result = handler(payload);

      // Handle async errors
      if (result instanceof Promise) {
        return result.catch((error) => {
          if (errorHandler === 'throw') throw error;
          if (typeof errorHandler === 'function') {
            errorHandler(error, event, handler);
          }
        });
      }

      return result;
    } catch (error) {
      if (errorHandler === 'throw') throw error;
      if (typeof errorHandler === 'function') {
        errorHandler(error as Error, event, handler);
      }
    }
  }

  function getHandlers(event: string): Set<WrappedHandler<unknown>> {
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    return set;
  }

  const e: Emitochondria<T> = {
    on(event, handler) {
      const set = getHandlers(event);
      set.add(handler as EventHandler<unknown>);

      // Check for potential memory leak
      checkMaxListeners(event, set.size);

      return () => e.off(event, handler);
    },

    off(event, handler) {
      const set = handlers.get(event);
      if (!set) return;

      // Try direct removal first (for regular handlers)
      if (set.delete(handler as EventHandler<unknown>)) {
        // Clean up empty sets to prevent memory leak
        if (set.size === 0) {
          handlers.delete(event);
        }
        return;
      }

      // Search for wrapped handler (for once handlers)
      for (const wrapped of set) {
        if (wrapped.__original === handler) {
          set.delete(wrapped);
          if (set.size === 0) {
            handlers.delete(event);
          }
          break;
        }
      }
    },

    once(event, handler) {
      const wrapper = ((payload: T[typeof event]) => {
        e.off(event, wrapper as EventHandler<T[typeof event]>);
        return handler(payload);
      }) as WrappedHandler<T[typeof event]>;

      // Store original reference for manual removal
      wrapper.__original = handler;

      return e.on(event, wrapper);
    },

    emit(event, ...payload) {
      const data = payload[0];
      getHandlers(event).forEach((handler) => {
        safeCall(handler, event, data);
      });
      wildcardHandlers.forEach((handler) => {
        // Wildcard handlers have different signature (event, payload)
        try {
          const result = handler(event, data as T[typeof event]);
          if (result instanceof Promise) {
            result.catch((error) => {
              if (errorHandler === 'throw') throw error;
              if (typeof errorHandler === 'function') {
                errorHandler(error, event, handler as EventHandler<unknown>);
              }
            });
          }
        } catch (error) {
          if (errorHandler === 'throw') throw error;
          if (typeof errorHandler === 'function') {
            errorHandler(error as Error, event, handler as EventHandler<unknown>);
          }
        }
      });
    },

    async emitAsync(event, ...payload) {
      const data = payload[0];
      const promises: Promise<void>[] = [];

      getHandlers(event).forEach((handler) => {
        const result = safeCall(handler, event, data);
        if (result instanceof Promise) {
          promises.push(result);
        }
      });

      wildcardHandlers.forEach((handler) => {
        try {
          const result = handler(event, data as T[typeof event]);
          if (result instanceof Promise) {
            promises.push(
              result.catch((error) => {
                if (errorHandler === 'throw') throw error;
                if (typeof errorHandler === 'function') {
                  errorHandler(error, event, handler as EventHandler<unknown>);
                }
              })
            );
          }
        } catch (error) {
          if (errorHandler === 'throw') throw error;
          if (typeof errorHandler === 'function') {
            errorHandler(error as Error, event, handler as EventHandler<unknown>);
          }
        }
      });

      await Promise.all(promises);
    },

    onAny(handler) {
      wildcardHandlers.add(handler);
      return () => e.offAny(handler);
    },

    offAny(handler) {
      wildcardHandlers.delete(handler);
    },

    clear(event?) {
      if (event) {
        handlers.delete(event);
      } else {
        handlers.clear();
        wildcardHandlers.clear();
      }
    },

    listenerCount(event) {
      return getHandlers(event).size;
    },

    setErrorHandler(handler) {
      errorHandler = handler;
    },

    setMaxListeners(n) {
      maxListeners = n;
    },

    getMaxListeners() {
      return maxListeners;
    },

    eventNames() {
      return Array.from(handlers.keys()).filter(
        key => {
          const set = handlers.get(key);
          return set && set.size > 0;
        }
      ) as EventKey<T>[];
    },

    listeners(event) {
      const set = handlers.get(event);
      if (!set) return [];

      // Return unwrapped handlers for better debugging
      return Array.from(set).map(handler => {
        const wrapped = handler as WrappedHandler<unknown>;
        return (wrapped.__original || handler) as EventHandler<T[typeof event]>;
      });
    },

    wildcardListeners() {
      return Array.from(wildcardHandlers);
    },

    hasListener(event, handler) {
      const set = handlers.get(event);
      if (!set) return false;

      // Check direct match
      if (set.has(handler as EventHandler<unknown>)) {
        return true;
      }

      // Check wrapped handlers (once)
      for (const wrapped of set) {
        if (wrapped.__original === handler) {
          return true;
        }
      }

      return false;
    },

    // ⚡ Biological aliases (zero-cost: just references)
    bind: null as unknown as Emitochondria<T>['on'],
    release: null as unknown as Emitochondria<T>['off'],
    pulse: null as unknown as Emitochondria<T>['emit'],
    cascade: null as unknown as Emitochondria<T>['emitAsync'],
    spike: null as unknown as Emitochondria<T>['once'],
    membrane: null as unknown as Emitochondria<T>['onAny'],
    apoptosis: null as unknown as Emitochondria<T>['clear'],
    receptors: null as unknown as Emitochondria<T>['listenerCount'],
  };

  // Assign aliases (smaller than repeating in object literal)
  e.bind = e.on;
  e.release = e.off;
  e.pulse = e.emit;
  e.cascade = e.emitAsync;
  e.spike = e.once;
  e.membrane = e.onAny;
  e.apoptosis = e.clear;
  e.receptors = e.listenerCount;

  return e;
}

// Default export for convenience
export default createEmitochondria;
