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
  /**
   * Subscribe to an event.
   * @param event - Event name
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  on<K extends EventKey<T>>(event: K, handler: EventHandler<T[K]>): () => void;

  /**
   * Unsubscribe a handler from an event.
   * @param event - Event name
   * @param handler - Handler to remove
   */
  off<K extends EventKey<T>>(event: K, handler: EventHandler<T[K]>): void;

  /**
   * Subscribe to an event for a single emission.
   * @param event - Event name
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  once<K extends EventKey<T>>(event: K, handler: EventHandler<T[K]>): () => void;

  /**
   * Emit an event synchronously.
   * @param event - Event name
   * @param payload - Event payload (optional for void events)
   */
  emit<K extends EventKey<T>>(
    event: K,
    ...payload: T[K] extends void ? [] : [T[K]]
  ): void;

  /**
   * Emit an event and await all handlers.
   * @param event - Event name
   * @param payload - Event payload (optional for void events)
   */
  emitAsync<K extends EventKey<T>>(
    event: K,
    ...payload: T[K] extends void ? [] : [T[K]]
  ): Promise<void>;

  /**
   * Subscribe to all events (wildcard).
   * @param handler - Handler that receives event name and payload
   * @returns Unsubscribe function
   */
  onAny(handler: WildcardHandler<T>): () => void;

  /**
   * Unsubscribe a wildcard handler.
   * @param handler - Handler to remove
   */
  offAny(handler: WildcardHandler<T>): void;

  /**
   * Clear handlers for a specific event or all events.
   * @param event - Optional event name. If omitted, clears everything.
   */
  clear<K extends EventKey<T>>(event?: K): void;

  /**
   * Get the number of listeners for an event.
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount<K extends EventKey<T>>(event: K): number;
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
 * const emitter = createEmitochondria<MyEvents>();
 *
 * emitter.on('user:login', (data) => {
 *   console.log(data.userId); // fully typed!
 * });
 *
 * emitter.emit('user:login', { userId: '123' });
 * emitter.emit('app:ready');
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

  const emitter: Emitochondria<T> = {
    on(event, handler) {
      getHandlers(event).add(handler as EventHandler<unknown>);
      return () => emitter.off(event, handler);
    },

    off(event, handler) {
      getHandlers(event).delete(handler as EventHandler<unknown>);
    },

    once(event, handler) {
      const wrapper = ((payload: T[typeof event]) => {
        emitter.off(event, wrapper as EventHandler<T[typeof event]>);
        return handler(payload);
      }) as EventHandler<T[typeof event]>;

      return emitter.on(event, wrapper);
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
      return () => emitter.offAny(handler);
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
  };

  return emitter;
}

// Default export for convenience
export default createEmitochondria;
