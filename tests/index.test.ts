
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmitochondria } from '../src/index.js';

// Define test event types
type TestEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': { userId: string };
  'count': number;
  'app:ready': void;
};

describe('emitochondria', () => {
  let emitter: ReturnType<typeof createEmitochondria<TestEvents>>;

  beforeEach(() => {
    emitter = createEmitochondria<TestEvents>();
  });

  describe('on / emit', () => {
    it('should call handler when event is emitted', () => {
      const handler = vi.fn();
      emitter.on('user:login', handler);

      emitter.emit('user:login', { userId: '123', email: 'test@example.com' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ userId: '123', email: 'test@example.com' });
    });

    it('should support multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('user:login', handler1);
      emitter.on('user:login', handler2);
      emitter.emit('user:login', { userId: '123', email: 'test@example.com' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should handle void payload events', () => {
      const handler = vi.fn();
      emitter.on('app:ready', handler);

      emitter.emit('app:ready');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle primitive payloads', () => {
      const handler = vi.fn();
      emitter.on('count', handler);

      emitter.emit('count', 42);

      expect(handler).toHaveBeenCalledWith(42);
    });
  });

  describe('off', () => {
    it('should remove handler', () => {
      const handler = vi.fn();
      emitter.on('user:login', handler);
      emitter.off('user:login', handler);

      emitter.emit('user:login', { userId: '123', email: 'test@example.com' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should only remove specified handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('user:login', handler1);
      emitter.on('user:login', handler2);
      emitter.off('user:login', handler1);

      emitter.emit('user:login', { userId: '123', email: 'test@example.com' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe function', () => {
    it('should return working unsubscribe function from on()', () => {
      const handler = vi.fn();
      const unsubscribe = emitter.on('user:login', handler);

      unsubscribe();
      emitter.emit('user:login', { userId: '123', email: 'test@example.com' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only fire handler once', () => {
      const handler = vi.fn();
      emitter.once('user:login', handler);

      emitter.emit('user:login', { userId: '1', email: 'a@a.com' });
      emitter.emit('user:login', { userId: '2', email: 'b@b.com' });
      emitter.emit('user:login', { userId: '3', email: 'c@c.com' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ userId: '1', email: 'a@a.com' });
    });

    it('should return unsubscribe that works before first emit', () => {
      const handler = vi.fn();
      const unsubscribe = emitter.once('user:login', handler);

      unsubscribe();
      emitter.emit('user:login', { userId: '123', email: 'test@example.com' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('emitAsync', () => {
    it('should await all async handlers', async () => {
      const order: number[] = [];

      emitter.on('user:login', async () => {
        await new Promise((r) => setTimeout(r, 30));
        order.push(1);
      });

      emitter.on('user:login', async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push(2);
      });

      await emitter.emitAsync('user:login', { userId: '123', email: 'test@example.com' });

      // Both should complete (order depends on timing, but both should be there)
      expect(order).toContain(1);
      expect(order).toContain(2);
      expect(order.length).toBe(2);
    });

    it('should handle mix of sync and async handlers', async () => {
      const results: string[] = [];

      emitter.on('user:login', () => {
        results.push('sync');
      });

      emitter.on('user:login', async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push('async');
      });

      await emitter.emitAsync('user:login', { userId: '123', email: 'test@example.com' });

      expect(results).toContain('sync');
      expect(results).toContain('async');
    });
  });

  describe('onAny / offAny', () => {
    it('should call wildcard handler for all events', () => {
      const handler = vi.fn();
      emitter.onAny(handler);

      emitter.emit('user:login', { userId: '123', email: 'test@example.com' });
      emitter.emit('user:logout', { userId: '123' });
      emitter.emit('app:ready');

      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler).toHaveBeenNthCalledWith(1, 'user:login', { userId: '123', email: 'test@example.com' });
      expect(handler).toHaveBeenNthCalledWith(2, 'user:logout', { userId: '123' });
      expect(handler).toHaveBeenNthCalledWith(3, 'app:ready', undefined);
    });

    it('should remove wildcard handler with offAny', () => {
      const handler = vi.fn();
      emitter.onAny(handler);
      emitter.offAny(handler);

      emitter.emit('user:login', { userId: '123', email: 'test@example.com' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return unsubscribe function from onAny', () => {
      const handler = vi.fn();
      const unsubscribe = emitter.onAny(handler);

      unsubscribe();
      emitter.emit('user:login', { userId: '123', email: 'test@example.com' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear handlers for specific event', () => {
      const loginHandler = vi.fn();
      const logoutHandler = vi.fn();

      emitter.on('user:login', loginHandler);
      emitter.on('user:logout', logoutHandler);

      emitter.clear('user:login');

      emitter.emit('user:login', { userId: '123', email: 'test@example.com' });
      emitter.emit('user:logout', { userId: '123' });

      expect(loginHandler).not.toHaveBeenCalled();
      expect(logoutHandler).toHaveBeenCalledTimes(1);
    });

    it('should clear all handlers when called without argument', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const wildcardHandler = vi.fn();

      emitter.on('user:login', handler1);
      emitter.on('user:logout', handler2);
      emitter.onAny(wildcardHandler);

      emitter.clear();

      emitter.emit('user:login', { userId: '123', email: 'test@example.com' });
      emitter.emit('user:logout', { userId: '123' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(wildcardHandler).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return correct count', () => {
      expect(emitter.listenerCount('user:login')).toBe(0);

      emitter.on('user:login', () => {});
      expect(emitter.listenerCount('user:login')).toBe(1);

      emitter.on('user:login', () => {});
      expect(emitter.listenerCount('user:login')).toBe(2);
    });

    it('should decrease after removal', () => {
      const handler = vi.fn();
      emitter.on('user:login', handler);
      expect(emitter.listenerCount('user:login')).toBe(1);

      emitter.off('user:login', handler);
      expect(emitter.listenerCount('user:login')).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should not throw when emitting event with no handlers', () => {
      expect(() => {
        emitter.emit('user:login', { userId: '123', email: 'test@example.com' });
      }).not.toThrow();
    });

    it('should not throw when removing non-existent handler', () => {
      expect(() => {
        emitter.off('user:login', () => {});
      }).not.toThrow();
    });

    it('should not add same handler twice', () => {
      const handler = vi.fn();
      emitter.on('user:login', handler);
      emitter.on('user:login', handler);

      emitter.emit('user:login', { userId: '123', email: 'test@example.com' });

      // Set behavior: same reference only added once
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('biological aliases', () => {
    it('bind should work as alias for on', () => {
      const handler = vi.fn();
      const unsubscribe = emitter.bind('user:login', handler);

      emitter.pulse('user:login', { userId: '123', email: 'test@example.com' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ userId: '123', email: 'test@example.com' });

      unsubscribe();
      emitter.pulse('user:login', { userId: '456', email: 'test2@example.com' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('release should work as alias for off', () => {
      const handler = vi.fn();
      emitter.bind('user:login', handler);
      emitter.release('user:login', handler);

      emitter.pulse('user:login', { userId: '123', email: 'test@example.com' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('pulse should work as alias for emit', () => {
      const handler = vi.fn();
      emitter.bind('user:login', handler);

      emitter.pulse('user:login', { userId: '123', email: 'test@example.com' });

      expect(handler).toHaveBeenCalledWith({ userId: '123', email: 'test@example.com' });
    });

    it('cascade should work as alias for emitAsync', async () => {
      const order: number[] = [];

      emitter.bind('user:login', async () => {
        await new Promise((r) => setTimeout(r, 20));
        order.push(1);
      });

      emitter.bind('user:login', async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push(2);
      });

      await emitter.cascade('user:login', { userId: '123', email: 'test@example.com' });

      expect(order).toContain(1);
      expect(order).toContain(2);
      expect(order.length).toBe(2);
    });

    it('spike should work as alias for once', () => {
      const handler = vi.fn();
      emitter.spike('user:login', handler);

      emitter.pulse('user:login', { userId: '1', email: 'a@a.com' });
      emitter.pulse('user:login', { userId: '2', email: 'b@b.com' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ userId: '1', email: 'a@a.com' });
    });

    it('membrane should work as alias for onAny', () => {
      const handler = vi.fn();
      const unsubscribe = emitter.membrane(handler);

      emitter.pulse('user:login', { userId: '123', email: 'test@example.com' });
      emitter.pulse('user:logout', { userId: '123' });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, 'user:login', { userId: '123', email: 'test@example.com' });
      expect(handler).toHaveBeenNthCalledWith(2, 'user:logout', { userId: '123' });

      unsubscribe();
      emitter.pulse('app:ready');
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('apoptosis should work as alias for clear', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.bind('user:login', handler1);
      emitter.bind('user:logout', handler2);

      emitter.apoptosis('user:login');

      emitter.pulse('user:login', { userId: '123', email: 'test@example.com' });
      emitter.pulse('user:logout', { userId: '123' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('apoptosis should clear all handlers when called without argument', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const wildcardHandler = vi.fn();

      emitter.bind('user:login', handler1);
      emitter.bind('user:logout', handler2);
      emitter.membrane(wildcardHandler);

      emitter.apoptosis();

      emitter.pulse('user:login', { userId: '123', email: 'test@example.com' });
      emitter.pulse('user:logout', { userId: '123' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(wildcardHandler).not.toHaveBeenCalled();
    });

    it('receptors should work as alias for listenerCount', () => {
      expect(emitter.receptors('user:login')).toBe(0);

      emitter.bind('user:login', () => {});
      expect(emitter.receptors('user:login')).toBe(1);

      emitter.bind('user:login', () => {});
      expect(emitter.receptors('user:login')).toBe(2);
    });

    it('should allow mixing standard and biological APIs', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('user:login', handler1);
      emitter.bind('user:login', handler2);

      emitter.pulse('user:login', { userId: '123', email: 'test@example.com' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      emitter.release('user:login', handler1);
      emitter.off('user:login', handler2);

      emitter.emit('user:login', { userId: '456', email: 'test2@example.com' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });
});
