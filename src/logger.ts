import { LoggingOptions, TimestampFormat, Timezone } from './types.js';
import { getProjectRoot } from './config.js';

// ============================================================
// ENVIRONMENT DETECTION
// ============================================================

const isNode = typeof (globalThis as any).process !== 'undefined'
  && (globalThis as any).process?.versions?.node != null;

const isBrowser = typeof (globalThis as any).window !== 'undefined';

// ============================================================
// TIMESTAMP FORMATTING
// ============================================================

function formatTimestamp(format: TimestampFormat, timezone: Timezone): string {
  const date = new Date();

  switch (format) {
    case 'unix':
      return String(date.getTime());

    case 'human':
      return date.toLocaleString('en-US', {
        timeZone: timezone === 'utc' ? 'UTC' : undefined,
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

    case 'iso':
    default:
      return timezone === 'utc'
        ? date.toISOString()
        : new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, -1); // Remove 'Z' for local
  }
}

// ============================================================
// SIZE PARSING
// ============================================================

function parseSize(size: string): number {
  const match = size.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)$/i);
  if (!match) return 10 * 1024 * 1024; // Default 10MB

  const value = parseFloat(match[1]!);
  const unit = match[2]!.toUpperCase();

  const multipliers: Record<string, number> = {
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
  };

  return value * (multipliers[unit] ?? 10 * 1024 * 1024);
}

// ============================================================
// LOG ENTRY TYPES
// ============================================================

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  type: 'event' | 'error' | 'warning';
  event?: string;
  message: string;
  payload?: unknown;
  error?: unknown;
}

// ============================================================
// LOGGER CLASS
// ============================================================

export class Logger {
  private options: Required<LoggingOptions>;
  private maxSizeBytes: number;
  private browserWarned = false;
  private fs: any = null;
  private path: any = null;

  constructor(options: LoggingOptions = {}) {
    this.options = {
      timestamps: options.timestamps ?? false,
      timestampFormat: options.timestampFormat ?? 'iso',
      timezone: options.timezone ?? 'utc',
      persist: options.persist ?? false,
      path: options.path ?? './logs/emitochondria.log',
      format: options.format ?? 'text',
      maxSize: options.maxSize ?? '10MB',
      logEvents: options.logEvents ?? false,
      logErrors: options.logErrors ?? true,
      logWarnings: options.logWarnings ?? true,
    };

    this.maxSizeBytes = parseSize(this.options.maxSize);

    if (this.options.persist) {
      this.initFileLogging();
    }
  }

  private initFileLogging(): void {
    if (isBrowser) {
      if (!this.browserWarned) {
        console.warn(
          '[Emitochondria] File logging is not available in browser environments. ' +
          'Logs will only be written to console.'
        );
        this.browserWarned = true;
      }
      return;
    }

    if (!isNode) return;

    try {
      // Require fs and path synchronously
      const req = (globalThis as any).require;
      if (req) {
        this.fs = req('fs');
        this.path = req('path');

        // Resolve path relative to project root (where package.json is)
        const projectRoot = getProjectRoot();
        const resolvedPath = this.path.isAbsolute(this.options.path)
          ? this.options.path
          : this.path.join(projectRoot, this.options.path);

        // Update options with resolved path
        this.options.path = resolvedPath;

        // Create directory if needed
        const dir = this.path.dirname(resolvedPath);
        if (!this.fs.existsSync(dir)) {
          this.fs.mkdirSync(dir, { recursive: true });
        }

        // Log where logs are being written (helpful for debugging)
        const proc = (globalThis as any).process;
        if (proc?.env?.NODE_ENV !== 'production') {
          console.log(`[Emitochondria] Logs will be written to: ${resolvedPath}`);
        }
      }
    } catch (err) {
      console.error('[Emitochondria] Failed to initialize file logging:', err);
    }
  }

  private getTimestamp(): string | undefined {
    if (!this.options.timestamps) return undefined;
    return formatTimestamp(this.options.timestampFormat, this.options.timezone);
  }

  private formatEntry(entry: LogEntry): string {
    const timestamp = this.getTimestamp();

    if (this.options.format === 'json') {
      const obj: any = {
        level: entry.level,
        type: entry.type,
        message: entry.message,
      };
      if (timestamp) obj.timestamp = timestamp;
      if (entry.event) obj.event = entry.event;
      if (entry.payload !== undefined) obj.payload = entry.payload;
      if (entry.error) obj.error = String(entry.error);
      return JSON.stringify(obj);
    }

    // Text format
    const parts: string[] = [];
    if (timestamp) parts.push(`[${timestamp}]`);
    parts.push(`[${entry.level.toUpperCase()}]`);
    if (entry.event) parts.push(`[${entry.event}]`);
    parts.push(entry.message);
    if (entry.payload !== undefined) {
      parts.push(`| Payload: ${JSON.stringify(entry.payload)}`);
    }
    if (entry.error) {
      parts.push(`| Error: ${entry.error}`);
    }

    return parts.join(' ');
  }

  private writeToFile(content: string): void {
    if (!this.fs || !this.path || !isNode) return;

    try {
      const line = content + '\n';

      // Check if rotation needed
      if (this.fs.existsSync(this.options.path)) {
        const stats = this.fs.statSync(this.options.path);
        if (stats.size >= this.maxSizeBytes) {
          this.rotateLog();
        }
      }

      // Sync write — simple, ordered, reliable
      this.fs.appendFileSync(this.options.path, line, 'utf8');
    } catch (err) {
      console.error('[Emitochondria] Failed to write to log file:', err);
    }
  }

  private rotateLog(): void {
    if (!this.fs || !this.path) return;

    try {
      // Find next rotation number
      let rotationNum = 1;
      while (this.fs.existsSync(`${this.options.path}.${rotationNum}`)) {
        rotationNum++;
      }

      // Rename current file
      this.fs.renameSync(this.options.path, `${this.options.path}.${rotationNum}`);
    } catch (err) {
      console.error('[Emitochondria] Failed to rotate log file:', err);
    }
  }

  // ============================================================
  // PUBLIC LOGGING METHODS
  // ============================================================

  logEvent(event: string, payload: unknown): void {
    if (!this.options.logEvents) return;

    const entry: LogEntry = {
      level: 'info',
      type: 'event',
      event,
      message: 'Event emitted',
      payload,
    };

    const formatted = this.formatEntry(entry);
    console.log(formatted);

    if (this.options.persist) {
      this.writeToFile(formatted);
    }
  }

  logError(event: string, error: unknown, _handler?: unknown): void {
    if (!this.options.logErrors) return;

    const entry: LogEntry = {
      level: 'error',
      type: 'error',
      event,
      message: 'Handler threw an error',
      error,
    };

    const formatted = this.formatEntry(entry);
    console.error(formatted);

    if (this.options.persist) {
      this.writeToFile(formatted);
    }
  }

  logWarning(event: string, message: string, details?: Record<string, unknown>): void {
    if (!this.options.logWarnings) return;

    const entry: LogEntry = {
      level: 'warn',
      type: 'warning',
      event,
      message,
      payload: details,
    };

    const formatted = this.formatEntry(entry);
    console.warn(formatted);

    if (this.options.persist) {
      this.writeToFile(formatted);
    }
  }
}
