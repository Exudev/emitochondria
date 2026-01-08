
# 🔋 Emitochondria

> *The powerhouse of your events*

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