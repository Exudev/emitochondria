
# 🔋 Emitochondria

> *The powerhouse of your events*

[![npm version](https://img.shields.io/npm/v/emitochondria.svg)](https://www.npmjs.com/package/emitochondria)
[![CI](https://github.com/Exudev/emitochondria/actions/workflows/ci.yml/badge.svg)](https://github.com/Exudev/emitochondria/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/emitochondria)](https://bundlephobia.com/package/emitochondria)

A tiny, fully-typed event emitter for TypeScript with built-in error handling and memory leak detection. Zero dependencies, under 2KB.

## Features

- ✅ **Full type safety** — Event names and payloads checked at compile time
- ✅ **Tiny** — Under 2KB minified
- ✅ **Zero dependencies**
- ✅ **Universal** — Works in browser and Node.js
- ✅ **Async support** — `emitAsync` awaits all handlers
- ✅ **Wildcard listeners** — `onAny` for debugging/logging
- ✅ **Error handling** — Configurable error handling for resilient apps
- ✅ **Memory leak detection** — Warns when too many listeners are added
- ✅ **Inspection tools** — Debug your emitter with introspection methods

## Installation

```bash
npm install emitochondria
```

## Quick Start

```typescript
import { createEmitochondria } from 'emitochondria';

// Define your events
type MyEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': { userId: string };
  'app:ready': void;
};

// Create emitter
const events = createEmitochondria<MyEvents>();

// Subscribe (with full autocomplete!)
events.on('user:login', (data) => {
  console.log(`${data.email} logged in`);
});

// Emit
events.emit('user:login', { userId: '123', email: 'pablo@example.com' });

// Void events need no payload
events.emit('app:ready');
```

## API

### `createEmitochondria<T>(options?)`

Create a new typed emitter with optional configuration.

```typescript
const events = createEmitochondria<MyEvents>({
  // Custom error handler (default: logs in dev, silent in production)
  onError: (error, event, handler) => {
    console.error(`Error in ${event}:`, error);
  },
  // Or preserve throwing behavior
  // onError: 'throw',

  // Max listeners before warning (default: 10, 0 to disable)
  maxListeners: 20,

  // Custom warning handler
  onMaxListenersExceeded: (event, count, max) => {
    console.warn(`Too many listeners on ${event}: ${count}/${max}`);
  }
});
```

### `.on(event, handler)`

Subscribe to an event. Returns an unsubscribe function.

```typescript
const unsubscribe = events.on('user:login', (data) => {
  console.log(data);
});

// Later...
unsubscribe();
```

### `.off(event, handler)`

Remove a specific handler.

### `.once(event, handler)`

Subscribe for a single emission only.

```typescript
events.once('app:ready', () => {
  console.log('This only runs once');
});
```

### `.emit(event, payload?)`

Emit an event synchronously.

### `.emitAsync(event, payload?)`

Emit and await all handlers (parallel execution).

```typescript
events.on('save', async (data) => {
  await saveToDatabase(data);
});

await events.emitAsync('save', { id: '123' });
console.log('All handlers complete');
```

### `.onAny(handler)`

Subscribe to all events. Great for logging.

```typescript
events.onAny((event, payload) => {
  console.log(`[${event}]`, payload);
});
```

### `.offAny(handler)`

Remove a wildcard handler.

### `.clear(event?)`

Clear handlers for an event, or all handlers if no event specified.

### `.listenerCount(event)`

Get the number of listeners for an event.

### `.setErrorHandler(handler)`

Change the error handler at runtime.

```typescript
events.setErrorHandler((error, event) => {
  logger.error(`Event ${event} failed:`, error);
});
```

### `.setMaxListeners(n)` / `.getMaxListeners()`

Adjust or check the max listener warning threshold.

```typescript
events.setMaxListeners(50); // Increase limit
console.log(events.getMaxListeners()); // 50
```

### `.eventNames()`

Get all event names that currently have registered listeners.

```typescript
events.on('user:login', handler1);
events.on('user:logout', handler2);
console.log(events.eventNames()); // ['user:login', 'user:logout']
```

### `.listeners(event)`

Get all handlers registered for a specific event.

```typescript
const handlers = events.listeners('user:login');
console.log(handlers.length); // Number of handlers
```

### `.wildcardListeners()`

Get all wildcard handlers.

```typescript
const wildcards = events.wildcardListeners();
console.log(wildcards.length);
```

### `.hasListener(event, handler)`

Check if a specific handler is registered for an event.

```typescript
if (events.hasListener('user:login', myHandler)) {
  console.log('Handler is registered');
}
```

## Error Handling

By default, errors thrown by event handlers are caught and logged in development (silent in production). This prevents one failing handler from breaking others:

```typescript
events.on('save', () => { throw new Error('DB error'); });
events.on('save', () => console.log('This still runs!')); // ✅ Executes

events.emit('save');
// Console (dev): [Emitochondria] Error in handler for event "save": Error: DB error
// Output: "This still runs!"
```

**Custom error handling:**

```typescript
const events = createEmitochondria<MyEvents>({
  onError: (error, event, handler) => {
    // Send to your error tracking service
    Sentry.captureException(error, { tags: { event } });
  }
});
```

**Preserve throwing behavior (v1.0 compatibility):**

```typescript
const events = createEmitochondria<MyEvents>({
  onError: 'throw' // Errors will throw like before
});
```

## Memory Leak Detection

Emitochondria warns you when adding too many listeners to a single event (default: 10), which often indicates a bug:

```typescript
// This might indicate a leak (handler not cleaned up in a loop)
for (let i = 0; i < 15; i++) {
  events.on('tick', handler); // Warning after 10th iteration
}
// Console: [Emitochondria] Possible memory leak detected: 11 listeners...
```

Disable or customize:

```typescript
const events = createEmitochondria<MyEvents>({
  maxListeners: 0 // Disable warnings
});
```

## ⚡ Biological API (Alternative Naming)

Emitochondria offers biologically-themed aliases for all methods. Use whichever style fits your project:

| Standard API | Biological Alias | Description |
|--------------|------------------|-------------|
| `.on()` | `.bind()` | Bind a receptor to a signal |
| `.off()` | `.release()` | Release a receptor |
| `.emit()` | `.pulse()` | Pulse energy through the system |
| `.emitAsync()` | `.cascade()` | Trigger a signal cascade |
| `.once()` | `.spike()` | Single spike of energy |
| `.onAny()` | `.membrane()` | Membrane catches all signals |
| `.clear()` | `.apoptosis()` | Programmed cell death |
| `.listenerCount()` | `.receptors()` | Count of receptors |

```typescript
// Standard API
events.on('user:login', handler);
events.emit('user:login', data);

// Biological API - same functionality, different style
events.bind('user:login', handler);
events.pulse('user:login', data);

// Mix and match freely
events.bind('save', async (data) => await saveToDatabase(data));
await events.cascade('save', { id: '123' });
```

## TypeScript Magic

The type system prevents mistakes at compile time:

```typescript
// ❌ Compile error: event doesn't exist
events.emit('user:logni', {});

// ❌ Compile error: missing required fields
events.emit('user:login', {});

// ❌ Compile error: wrong payload type
events.emit('user:login', { userId: 123 }); // should be string

// ✅ All good
events.emit('user:login', { userId: '123', email: 'test@example.com' });
```

## Examples

Check out the [`examples/`](./examples) folder for more comprehensive usage examples including:
- Basic event subscription and emission
- Async event handlers
- Wildcard listeners
- Biological API usage

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © Pablo Díaz