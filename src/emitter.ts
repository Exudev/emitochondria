import {
  EventMap,
  EventKey,
  EventHandler,
  WildcardHandler,
  ErrorHandler,
  EmitochondriaOptions,
  Emitochondria,
} from './types.js';
import { Logger } from './logger.js';
import { mergeConfig } from './config.js';

// ============================================================
// DEFAULT HANDLERS
// ============================================================

const defaultMaxListenersHandler = <T extends EventMap>(
  _event: EventKey<T>,
  _count: number,
  _max: number
): void => {
  // Handled by logger
};

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createEmitochondria<T extends EventMap>(
  options: EmitochondriaOptions<T> = {}
): Emitochondria<T> {
  // Merge file config with options
  const config = mergeConfig(options);

  // Initialize logger
  const logger = new Logger(config.logging);

  // Handler storage
  const handlers: Map<string, Set<EventHandler<unknown>>> = new Map();
  const wildcards: Set<WildcardHandler<T>> = new Set();

  // Configuration state
  let maxListeners = config.maxListeners ?? 10;
  let onMaxListenersExceeded = options.onMaxListenersExceeded ?? defaultMaxListenersHandler;
  let errorHandler: ErrorHandler<T> | 'throw' | 'default' = config.onError ?? 'default';

  // Memory leak tracking
  const warned = new Set<string>();

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  // Track original handlers for once() wrappers
  type WrappedHandler<T> = EventHandler<T> & { __original?: EventHandler<T> };

  const get = (e: string) => handlers.get(e) ?? handlers.set(e, new Set()).get(e)!;

  const handleError = <K extends EventKey<T>>(
    error: unknown,
    event: K,
    handler: EventHandler<unknown>
  ): void => {
    logger.logError(event, error, handler);

    if (errorHandler === 'throw') {
      throw error;
    } else if (typeof errorHandler === 'function') {
      errorHandler(error, event, handler);
    }
    // 'default' = just log (already done above)
  };

  const safeCall = <K extends EventKey<T>>(
    handler: EventHandler<unknown>,
    event: K,
    payload: unknown
  ): void | Promise<void> => {
    try {
      const result = handler(payload);
      if (result instanceof Promise) {
        return result.catch((err) => handleError(err, event, handler));
      }
    } catch (err) {
      handleError(err, event, handler);
    }
  };

  const checkMaxListeners = <K extends EventKey<T>>(event: K, count: number): void => {
    if (maxListeners > 0 && count > maxListeners && !warned.has(event)) {
      warned.add(event);

      const message = `Possible memory leak: ${count} listeners (max: ${maxListeners})`;
      logger.logWarning(event, message, { count, max: maxListeners });

      onMaxListenersExceeded(event, count, maxListeners);
    }
  };

  // ============================================================
  // EMITTER IMPLEMENTATION
  // ============================================================

  const emitter: Emitochondria<T> = {
    on(event, handler) {
      const set = get(event);
      set.add(handler as EventHandler<unknown>);
      checkMaxListeners(event, set.size);
      return () => emitter.off(event, handler);
    },

    off(event, handler) {
      const set = get(event);

      // Try direct removal first
      if (set.delete(handler as EventHandler<unknown>)) {
        if (set.size <= maxListeners) {
          warned.delete(event);
        }
        return;
      }

      // Search for wrapped handler (for once handlers)
      for (const wrapped of set) {
        const w = wrapped as WrappedHandler<unknown>;
        if (w.__original === handler) {
          set.delete(wrapped);
          if (set.size <= maxListeners) {
            warned.delete(event);
          }
          break;
        }
      }
    },

    once(event, handler) {
      const wrapper = ((payload: T[typeof event]) => {
        emitter.off(event, wrapper as EventHandler<T[typeof event]>);
        return handler(payload);
      }) as WrappedHandler<T[typeof event]>;

      // Store original reference for manual removal
      wrapper.__original = handler;

      return emitter.on(event, wrapper);
    },

    emit(event, ...payload) {
      const data = payload[0];

      logger.logEvent(event, data);

      get(event).forEach((h) => safeCall(h, event, data));
      wildcards.forEach((h) => {
        try {
          h(event, data as T[typeof event]);
        } catch (err) {
          handleError(err, event, h as unknown as EventHandler<unknown>);
        }
      });
    },

    async emitAsync(event, ...payload) {
      const data = payload[0];
      const promises: Promise<void>[] = [];

      logger.logEvent(event, data);

      get(event).forEach((h) => {
        const result = safeCall(h, event, data);
        if (result instanceof Promise) promises.push(result);
      });

      wildcards.forEach((h) => {
        try {
          const result = h(event, data as T[typeof event]);
          if (result instanceof Promise) {
            promises.push(result.catch((err) =>
              handleError(err, event, h as unknown as EventHandler<unknown>)
            ));
          }
        } catch (err) {
          handleError(err, event, h as unknown as EventHandler<unknown>);
        }
      });

      await Promise.all(promises);
    },

    onAny(handler) {
      wildcards.add(handler);
      return () => emitter.offAny(handler);
    },

    offAny(handler) {
      wildcards.delete(handler);
    },

    clear(event?) {
      if (event) {
        handlers.delete(event);
        warned.delete(event);
      } else {
        handlers.clear();
        wildcards.clear();
        warned.clear();
      }
    },

    listenerCount(event) {
      return get(event).size;
    },

    setErrorHandler(handler) {
      errorHandler = handler;
    },

    setMaxListeners(n) {
      maxListeners = n;
      if (n === 0) warned.clear();
    },

    getMaxListeners() {
      return maxListeners;
    },

    eventNames() {
      return Array.from(handlers.keys()).filter(
        (k) => handlers.get(k)!.size > 0
      ) as EventKey<T>[];
    },

    listeners(event) {
      const set = get(event);
      // Return unwrapped handlers for better debugging
      return Array.from(set).map(handler => {
        const wrapped = handler as WrappedHandler<unknown>;
        return (wrapped.__original || handler) as EventHandler<T[typeof event]>;
      });
    },

    wildcardListeners() {
      return Array.from(wildcards);
    },

    hasListener(event, handler) {
      const set = get(event);

      // Check direct match
      if (set.has(handler as EventHandler<unknown>)) {
        return true;
      }

      // Check wrapped handlers (once)
      for (const wrapped of set) {
        const w = wrapped as WrappedHandler<unknown>;
        if (w.__original === handler) {
          return true;
        }
      }

      return false;
    },
  };

  return emitter;
}
