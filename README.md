
# 🔋 Emitochondria

> *The powerhouse of your events*

[![npm version](https://img.shields.io/npm/v/emitochondria.svg)](https://www.npmjs.com/package/emitochondria)
[![CI](https://github.com/Exudev/emitochondria/actions/workflows/ci.yml/badge.svg)](https://github.com/Exudev/emitochondria/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/emitochondria)](https://bundlephobia.com/package/emitochondria)

A tiny, fully-typed event emitter for TypeScript. Zero dependencies, under 1KB.

## Features

- ✅ **Full type safety** — Event names and payloads checked at compile time
- ✅ **Tiny** — Under 1KB minified
- ✅ **Zero dependencies**
- ✅ **Universal** — Works in browser and Node.js
- ✅ **Async support** — `emitAsync` awaits all handlers
- ✅ **Wildcard listeners** — `onAny` for debugging/logging

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

### `createEmitochondria<T>()`

Create a new typed emitter.

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