import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmitochondria } from '../src/index.js';

// Define test event types
type TestEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': { userId: string };
  'save': void;
  'temp:event': void;
};

describe('v1.1 Features', () => {
  describe('Error Handling (Issue #3)', () => {
    it('should continue emitting to other handlers after error', () => {
      const emitter = createEmitochondria<TestEvents>();
      const handler1 = vi.fn(() => { throw new Error('oops'); });
      const handler2 = vi.fn();

      emitter.on('user:login', handler1);
      emitter.on('user:login', handler2);

      emitter.emit('user:login', { userId: '123', email: 'test@test.com' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled(); // Should still run
    });

    it('should call custom error handler', () => {
      const errorHandler = vi.fn();
      const emitter = createEmitochondria<TestEvents>({
        onError: errorHandler
      });

      emitter.on('user:login', () => { throw new Error('fail'); });
      emitter.emit('user:login', { userId: '123', email: 'test@test.com' });

      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        'user:login',
        expect.any(Function)
      );
    });

    it('should throw when errorHandler is "throw"', () => {
      const emitter = createEmitochondria<TestEvents>({
        onError: 'throw'
      });

      emitter.on('user:login', () => { throw new Error('boom'); });

      expect(() => {
        emitter.emit('user:login', { userId: '123', email: 'test@test.com' });
      }).toThrow('boom');
    });

    it('should handle async errors', async () => {
      const errorHandler = vi.fn();
      const emitter = createEmitochondria<TestEvents>({
        onError: errorHandler
      });

      emitter.on('user:login', async () => {
        throw new Error('async fail');
      });

      await emitter.emitAsync('user:login', { userId: '123', email: 'test@test.com' });

      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        'user:login',
        expect.any(Function)
      );
    });

    it('should allow changing error handler at runtime', () => {
      const emitter = createEmitochondria<TestEvents>();
      const newHandler = vi.fn();

      emitter.setErrorHandler(newHandler);
      emitter.on('user:login', () => { throw new Error('test'); });
      emitter.emit('user:login', { userId: '123', email: 'test@test.com' });

      expect(newHandler).toHaveBeenCalled();
    });

    it('should handle errors in wildcard handlers', () => {
      const errorHandler = vi.fn();
      const emitter = createEmitochondria<TestEvents>({
        onError: errorHandler
      });

      emitter.onAny(() => { throw new Error('wildcard error'); });
      emitter.emit('user:login', { userId: '123', email: 'test@test.com' });

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('Once Handler Unsubscription (Issue #2)', () => {
    it('should allow manual removal of once handlers', () => {
      const emitter = createEmitochondria<TestEvents>();
      const handler = vi.fn();

      emitter.once('save', handler);

      // Should be able to remove by original reference
      emitter.off('save', handler);

      emitter.emit('save');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should still auto-remove after first emit if not manually removed', () => {
      const emitter = createEmitochondria<TestEvents>();
      const handler = vi.fn();

      emitter.once('save', handler);

      emitter.emit('save');
      expect(handler).toHaveBeenCalledTimes(1);

      emitter.emit('save');
      expect(handler).toHaveBeenCalledTimes(1); // Still only once
    });
  });

  describe('Memory Management (Issue #4)', () => {
    it('should remove event key when last handler is removed', () => {
      const emitter = createEmitochondria<TestEvents>();
      const handler = vi.fn();

      emitter.on('temp:event', handler);

      // Event should exist
      expect(emitter.listenerCount('temp:event')).toBe(1);

      emitter.off('temp:event', handler);

      // Event key should be cleaned up
      expect(emitter.listenerCount('temp:event')).toBe(0);
      expect(emitter.eventNames()).not.toContain('temp:event');
    });

    it('should clean up after once handlers fire', () => {
      const emitter = createEmitochondria<TestEvents>();
      const handler = vi.fn();

      emitter.once('temp:event', handler);

      emitter.emit('temp:event');

      // Should auto-cleanup
      expect(emitter.eventNames()).not.toContain('temp:event');
    });

    it('should not leak memory with dynamic event names', () => {
      type DynamicEvents = Record<string, void>;
      const emitter = createEmitochondria<DynamicEvents>();

      // Simulate dynamic event creation
      for (let i = 0; i < 1000; i++) {
        const handler = () => {};
        emitter.on(`user:${i}:update`, handler);
        emitter.off(`user:${i}:update`, handler);
      }

      // All should be cleaned up
      expect(emitter.eventNames().length).toBe(0);
    });
  });

  describe('Max Listeners Warning (Enhancement #1)', () => {
    it('should warn when exceeding max listeners', () => {
      const warn = vi.fn();
      const emitter = createEmitochondria<TestEvents>({
        maxListeners: 2,
        onMaxListenersExceeded: warn
      });

      emitter.on('user:login', () => {});
      emitter.on('user:login', () => {});
      expect(warn).not.toHaveBeenCalled();

      emitter.on('user:login', () => {}); // 3rd one
      expect(warn).toHaveBeenCalledWith('user:login', 3, 2);
    });

    it('should not warn when under limit', () => {
      const warn = vi.fn();
      const emitter = createEmitochondria<TestEvents>({
        maxListeners: 10,
        onMaxListenersExceeded: warn
      });

      for (let i = 0; i < 10; i++) {
        emitter.on('user:login', () => {});
      }

      expect(warn).not.toHaveBeenCalled();
    });

    it('should not warn when maxListeners is 0', () => {
      const warn = vi.fn();
      const emitter = createEmitochondria<TestEvents>({
        maxListeners: 0,
        onMaxListenersExceeded: warn
      });

      for (let i = 0; i < 100; i++) {
        emitter.on('user:login', () => {});
      }

      expect(warn).not.toHaveBeenCalled();
    });

    it('should allow changing max listeners at runtime', () => {
      const warn = vi.fn();
      const emitter = createEmitochondria<TestEvents>({
        maxListeners: 2,
        onMaxListenersExceeded: warn
      });

      emitter.on('user:login', () => {});
      emitter.on('user:login', () => {});
      emitter.on('user:login', () => {});
      expect(warn).toHaveBeenCalledTimes(1);

      emitter.setMaxListeners(5);
      emitter.on('user:login', () => {});
      expect(warn).toHaveBeenCalledTimes(1); // No new warning

      expect(emitter.getMaxListeners()).toBe(5);
    });
  });

  describe('Inspection Methods (Enhancement #2)', () => {
    let emitter: ReturnType<typeof createEmitochondria<TestEvents>>;

    beforeEach(() => {
      emitter = createEmitochondria<TestEvents>();
    });

    describe('eventNames', () => {
      it('should return all events with listeners', () => {
        emitter.on('user:login', () => {});
        emitter.on('user:logout', () => {});

        const names = emitter.eventNames();
        expect(names).toContain('user:login');
        expect(names).toContain('user:logout');
        expect(names).toHaveLength(2);
      });

      it('should not include events with no listeners', () => {
        const handler = vi.fn();
        emitter.on('user:login', handler);
        emitter.off('user:login', handler);

        expect(emitter.eventNames()).not.toContain('user:login');
      });

      it('should return empty array when no events', () => {
        expect(emitter.eventNames()).toEqual([]);
      });
    });

    describe('listeners', () => {
      it('should return all handlers for an event', () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        emitter.on('user:login', handler1);
        emitter.on('user:login', handler2);

        const listeners = emitter.listeners('user:login');
        expect(listeners).toContain(handler1);
        expect(listeners).toContain(handler2);
        expect(listeners).toHaveLength(2);
      });

      it('should return empty array for event with no listeners', () => {
        expect(emitter.listeners('user:login')).toEqual([]);
      });

      it('should return original handler for once handlers', () => {
        const handler = vi.fn();
        emitter.once('user:login', handler);

        const listeners = emitter.listeners('user:login');
        expect(listeners).toContain(handler);
      });

      it('should return read-only array', () => {
        emitter.on('user:login', () => {});

        const listeners = emitter.listeners('user:login');

        // Modifying returned array shouldn't affect internal state
        (listeners as any).push(() => {});
        expect(emitter.listenerCount('user:login')).toBe(1);
      });
    });

    describe('wildcardListeners', () => {
      it('should return all wildcard handlers', () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        emitter.onAny(handler1);
        emitter.onAny(handler2);

        const listeners = emitter.wildcardListeners();
        expect(listeners).toContain(handler1);
        expect(listeners).toContain(handler2);
        expect(listeners).toHaveLength(2);
      });

      it('should return empty array when no wildcard handlers', () => {
        expect(emitter.wildcardListeners()).toEqual([]);
      });
    });

    describe('hasListener', () => {
      it('should return true for registered handler', () => {
        const handler = vi.fn();
        emitter.on('user:login', handler);

        expect(emitter.hasListener('user:login', handler)).toBe(true);
      });

      it('should return false for unregistered handler', () => {
        const handler = vi.fn();
        expect(emitter.hasListener('user:login', handler)).toBe(false);
      });

      it('should work with once handlers', () => {
        const handler = vi.fn();
        emitter.once('user:login', handler);

        expect(emitter.hasListener('user:login', handler)).toBe(true);
      });

      it('should return false after handler is removed', () => {
        const handler = vi.fn();
        emitter.on('user:login', handler);
        emitter.off('user:login', handler);

        expect(emitter.hasListener('user:login', handler)).toBe(false);
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain default behavior without options', () => {
      const emitter = createEmitochondria<TestEvents>();
      const handler = vi.fn();

      emitter.on('user:login', handler);
      emitter.emit('user:login', { userId: '123', email: 'test@test.com' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should work with all existing APIs', () => {
      const emitter = createEmitochondria<TestEvents>();
      const handler = vi.fn();

      const unsub = emitter.on('user:login', handler);
      emitter.once('user:logout', handler);
      emitter.onAny(handler);

      emitter.emit('user:login', { userId: '123', email: 'test@test.com' });
      expect(handler).toHaveBeenCalledTimes(2); // on + onAny

      unsub();
      emitter.emit('user:login', { userId: '123', email: 'test@test.com' });
      expect(handler).toHaveBeenCalledTimes(3); // only onAny

      emitter.clear();
      expect(emitter.listenerCount('user:login')).toBe(0);
    });
  });
});
