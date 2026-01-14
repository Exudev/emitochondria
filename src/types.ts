// ============================================================
// TYPES
// ============================================================

export type EventMap = Record<string, unknown>;
export type EventKey<T extends EventMap> = keyof T & string;
export type EventHandler<T> = (payload: T) => void | Promise<void>;

export type WildcardHandler<T extends EventMap> = <K extends EventKey<T>>(
  event: K,
  payload: T[K]
) => void | Promise<void>;

export type ErrorHandler<T extends EventMap> = (
  error: unknown,
  event: EventKey<T>,
  handler: EventHandler<unknown>
) => void;

export type MaxListenersHandler<T extends EventMap> = (
  event: EventKey<T>,
  count: number,
  max: number
) => void;

// ============================================================
// LOGGING TYPES
// ============================================================

export type TimestampFormat = 'iso' | 'unix' | 'human';
export type Timezone = 'utc' | 'local';
export type LogFormat = 'text' | 'json';

export interface LoggingOptions {
  /**
   * Enable timestamps in logs.
   * @default false
   */
  timestamps?: boolean;

  /**
   * Timestamp format.
   * - 'iso': 2025-01-13T14:30:00.000Z
   * - 'unix': 1736776200000
   * - 'human': Jan 13, 2:30:00 PM
   * @default 'iso'
   */
  timestampFormat?: TimestampFormat;

  /**
   * Timezone for timestamps.
   * - 'utc': UTC time
   * - 'local': System local time
   * @default 'utc'
   */
  timezone?: Timezone;

  /**
   * Enable file logging.
   * ⚠️ Only works in Node.js. Browser will show a warning.
   * ⚠️ Payloads may contain sensitive data — they will be written to disk.
   * @default false
   */
  persist?: boolean;

  /**
   * Path to log file.
   * Directory will be created if it doesn't exist.
   * @default './logs/emitochondria.log'
   */
  path?: string;

  /**
   * Log file format.
   * - 'text': Human-readable plain text
   * - 'json': JSON lines (one JSON object per line)
   * @default 'text'
   */
  format?: LogFormat;

  /**
   * Maximum log file size before rotation.
   * Supports: '10MB', '1GB', '500KB'
   * When exceeded, current file is renamed to .1, .2, etc.
   * @default '10MB'
   */
  maxSize?: string;

  /**
   * Log every emitted event.
   * ⚠️ Can be very verbose in production!
   * @default false
   */
  logEvents?: boolean;

  /**
   * Log handler errors.
   * @default true
   */
  logErrors?: boolean;

  /**
   * Log memory leak warnings.
   * @default true
   */
  logWarnings?: boolean;
}

// ============================================================
// CONFIGURATION TYPES
// ============================================================

export interface EmitochondriaConfig {
  /**
   * Maximum listeners per event before warning.
   * Set to 0 to disable warnings.
   * @default 10
   */
  maxListeners?: number;

  /**
   * Custom error handler for when handlers throw.
   * - 'throw': Re-throw errors
   * - undefined: Default (logs in dev, silent in prod)
   * Note: Function handlers only work in options, not config file.
   */
  onError?: 'throw';

  /**
   * Logging configuration.
   */
  logging?: LoggingOptions;
}

export interface EmitochondriaOptions<T extends EventMap> {
  /**
   * Maximum listeners per event before warning.
   * Set to 0 to disable warnings.
   * @default 10
   */
  maxListeners?: number;

  /**
   * Custom error handler function or 'throw'.
   * - ErrorHandler function: Custom error handling logic
   * - 'throw': Re-throw errors
   * - undefined: Default (logs in dev, silent in prod)
   */
  onError?: ErrorHandler<T> | 'throw';

  /**
   * Custom max listeners exceeded handler.
   * If not provided, logs a warning to console.
   */
  onMaxListenersExceeded?: MaxListenersHandler<T>;

  /**
   * Logging configuration.
   */
  logging?: LoggingOptions;
}

// ============================================================
// EMITTER INTERFACE
// ============================================================

export interface Emitochondria<T extends EventMap> {
  // Core API
  on<K extends EventKey<T>>(event: K, handler: EventHandler<T[K]>): () => void;
  off<K extends EventKey<T>>(event: K, handler: EventHandler<T[K]>): void;
  once<K extends EventKey<T>>(event: K, handler: EventHandler<T[K]>): () => void;
  emit<K extends EventKey<T>>(event: K, ...payload: T[K] extends void ? [] : [T[K]]): void;
  emitAsync<K extends EventKey<T>>(event: K, ...payload: T[K] extends void ? [] : [T[K]]): Promise<void>;
  onAny(handler: WildcardHandler<T>): () => void;
  offAny(handler: WildcardHandler<T>): void;
  clear<K extends EventKey<T>>(event?: K): void;
  listenerCount<K extends EventKey<T>>(event: K): number;

  // Configuration API
  setErrorHandler(handler: ErrorHandler<T> | 'throw'): void;
  setMaxListeners(n: number): void;
  getMaxListeners(): number;

  // Inspection API
  eventNames(): EventKey<T>[];
  listeners<K extends EventKey<T>>(event: K): EventHandler<T[K]>[];
  wildcardListeners(): WildcardHandler<T>[];
  hasListener<K extends EventKey<T>>(event: K, handler: EventHandler<T[K]>): boolean;
}
