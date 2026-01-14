/**
 * Basic usage example for Emitochondria
 * Run with: npx tsx examples/basic-usage.ts
 */

import { createEmitochondria } from '../src/index.js';

// Define your application events
type AppEvents = {
  'user:login': { userId: string; username: string; timestamp: Date };
  'user:logout': { userId: string };
  'notification': { message: string; level: 'info' | 'warn' | 'error' };
  'app:ready': void;
};

// Create the emitter
const events = createEmitochondria<AppEvents>();

console.log('🔋 Emitochondria Basic Usage Example\n');

// Example 1: Simple event subscription
console.log('--- Example 1: Basic on/emit ---');
events.on('user:login', (data) => {
  console.log(`✅ User ${data.username} logged in at ${data.timestamp.toISOString()}`);
});

events.emit('user:login', {
  userId: '123',
  username: 'pablo',
  timestamp: new Date(),
});

// Example 2: Multiple handlers for same event
console.log('\n--- Example 2: Multiple handlers ---');
events.on('notification', (data) => {
  console.log(`📢 [${data.level.toUpperCase()}] ${data.message}`);
});

events.on('notification', (data) => {
  if (data.level === 'error') {
    console.log('🚨 Error notification logged to monitoring system');
  }
});

events.emit('notification', { message: 'System online', level: 'info' });
events.emit('notification', { message: 'Disk space low', level: 'warn' });
events.emit('notification', { message: 'Database connection failed', level: 'error' });

// Example 3: One-time subscription with once()
console.log('\n--- Example 3: Once subscription ---');
events.once('app:ready', () => {
  console.log('🚀 App is ready! (This only runs once)');
});

events.emit('app:ready');
events.emit('app:ready'); // Won't trigger the handler
events.emit('app:ready'); // Won't trigger the handler

// Example 4: Unsubscribe with returned function
console.log('\n--- Example 4: Unsubscribe ---');
const unsubscribe = events.on('user:logout', (data) => {
  console.log(`👋 User ${data.userId} logged out`);
});

events.emit('user:logout', { userId: '123' });
unsubscribe(); // Remove the handler
events.emit('user:logout', { userId: '456' }); // Won't print anything

// Example 5: Wildcard listener with onAny()
console.log('\n--- Example 5: Wildcard listener ---');
const removeWildcard = events.onAny((eventName, payload) => {
  console.log(`🔍 Event fired: "${eventName}"`, payload);
});

events.emit('user:login', {
  userId: '789',
  username: 'alex',
  timestamp: new Date(),
});
events.emit('notification', { message: 'Wildcard example', level: 'info' });

removeWildcard(); // Stop listening to all events

// Example 6: Listener inspection
console.log('\n--- Example 6: Listener Inspection ---');
const mito = createEmitochondria<AppEvents>();

mito.on('user:login', (data) => {
  console.log(`⚡ Handler activated: ${data.username}`);
});

mito.emit('user:login', {
  userId: '999',
  username: 'inspected-user',
  timestamp: new Date(),
});

console.log(`\n📊 Active listeners for 'user:login': ${mito.listenerCount('user:login')}`);

// Example 7: Async handlers with emitAsync
console.log('\n--- Example 7: Async handlers ---');

type AsyncEvents = {
  'save:user': { userId: string; data: Record<string, unknown> };
};

const asyncEmitter = createEmitochondria<AsyncEvents>();

asyncEmitter.on('save:user', async (data) => {
  console.log('💾 Saving to database...');
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log(`✅ User ${data.userId} saved to database`);
});

asyncEmitter.on('save:user', async (data) => {
  console.log('📧 Sending welcome email...');
  await new Promise((resolve) => setTimeout(resolve, 50));
  console.log(`✅ Email sent to user ${data.userId}`);
});

(async () => {
  await asyncEmitter.emitAsync('save:user', {
    userId: '555',
    data: { name: 'Test User', email: 'test@example.com' },
  });
  console.log('🎉 All async operations completed!');
})();
