// Core
export { createEmitochondria, createEmitochondriaAsync } from './emitter.js';

// Types
export type {
  EventMap,
  EventKey,
  EventHandler,
  WildcardHandler,
  ErrorHandler,
  MaxListenersHandler,
  EmitochondriaConfig,
  EmitochondriaOptions,
  Emitochondria,
  LoggingOptions,
  TimestampFormat,
  Timezone,
  LogFormat,
} from './types.js';

// Utilities (for testing/advanced use)
export { clearConfigCache } from './config.js';

// Default export
export { createEmitochondria as default } from './emitter.js';
