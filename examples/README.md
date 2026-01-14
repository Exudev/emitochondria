# Emitochondria Examples

This folder contains practical examples demonstrating how to use Emitochondria.

## Running the Examples

You can run the examples using `tsx` (TypeScript executor):

```bash
# Install tsx globally (if you haven't already)
npm install -g tsx

# Run the basic usage example
npx tsx examples/basic-usage.ts
```

## Available Examples

### `basic-usage.ts`
Comprehensive example covering:
- Basic event subscription and emission
- Multiple handlers for the same event
- One-time subscriptions with `once()`
- Unsubscribing from events
- Wildcard listeners with `onAny()`
- Listener inspection
- Async event handlers with `emitAsync()`

## Creating Your Own Examples

Feel free to create additional examples! Here's a template:

```typescript
import { createEmitochondria } from '../src/index.js';

type MyEvents = {
  'my:event': { data: string };
};

const events = createEmitochondria<MyEvents>();

events.on('my:event', (payload) => {
  console.log(payload.data);
});

events.emit('my:event', { data: 'Hello!' });
```
