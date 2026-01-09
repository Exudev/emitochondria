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

  // ⚡ Biological aliases
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
 * // Biological API ⚡
 * mito.bind('user:login', (data) => console.log(data.userId));
 * mito.pulse('user:login', { userId: '123' });
 * ```
 */
export function createEmitochondria<T extends EventMap>(): Emitochondria<T> {
  const handlers: Map<string, Set<EventHandler<unknown>>> = new Map();
  const wildcardHandlers: Set<WildcardHandler<T>> = new Set();

  function getHandlers(event: string): Set<EventHandler<unknown>> {
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    return set;
  }

  const e: Emitochondria<T> = {
    on(event, handler) {
      getHandlers(event).add(handler as EventHandler<unknown>);
      return () => e.off(event, handler);
    },

    off(event, handler) {
      getHandlers(event).delete(handler as EventHandler<unknown>);
    },

    once(event, handler) {
      const wrapper = ((payload: T[typeof event]) => {
        e.off(event, wrapper as EventHandler<T[typeof event]>);
        return handler(payload);
      }) as EventHandler<T[typeof event]>;

      return e.on(event, wrapper);
    },

    emit(event, ...payload) {
      const data = payload[0];
      getHandlers(event).forEach((handler) => handler(data));
      wildcardHandlers.forEach((handler) => handler(event, data as T[typeof event]));
    },

    async emitAsync(event, ...payload) {
      const data = payload[0];
      const promises: Promise<void>[] = [];

      getHandlers(event).forEach((handler) => {
        const result = handler(data);
        if (result instanceof Promise) {
          promises.push(result);
        }
      });

      wildcardHandlers.forEach((handler) => {
        const result = handler(event, data as T[typeof event]);
        if (result instanceof Promise) {
          promises.push(result);
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
