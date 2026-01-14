import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEmitochondria, clearConfigCache } from '../src/index.js';
import type { Emitochondria } from '../src/index.js';

type TestEvents = {
  'test:event': { message: string };
  'error:event': { shouldFail: boolean };
  'void:event': void;
};

describe('v1.2 features', () => {
  let emitter: Emitochondria<TestEvents>;

  beforeEach(() => {
    clearConfigCache();
    emitter = createEmitochondria<TestEvents>();
  });

  afterEach(() => {
    emitter.clear();
  });

  describe('biological aliases removed', () => {
    it('should not have bind method', () => {
      expect((emitter as any).bind).toBeUndefined();
    });

    it('should not have release method', () => {
      expect((emitter as any).release).toBeUndefined();
    });

    it('should not have pulse method', () => {
      expect((emitter as any).pulse).toBeUndefined();
    });

    it('should not have cascade method', () => {
      expect((emitter as any).cascade).toBeUndefined();
    });

    it('should not have spike method', () => {
      expect((emitter as any).spike).toBeUndefined();
    });

    it('should not have membrane method', () => {
      expect((emitter as any).membrane).toBeUndefined();
    });

    it('should not have apoptosis method', () => {
      expect((emitter as any).apoptosis).toBeUndefined();
    });

    it('should not have receptors method', () => {
      expect((emitter as any).receptors).toBeUndefined();
    });
  });

  describe('standard API still works', () => {
    it('should support on/off/emit', () => {
      const handler = vi.fn();
      emitter.on('test:event', handler);
      emitter.emit('test:event', { message: 'hello' });
      expect(handler).toHaveBeenCalledWith({ message: 'hello' });
    });

    it('should support once', () => {
      const handler = vi.fn();
      emitter.once('test:event', handler);
      emitter.emit('test:event', { message: 'first' });
      emitter.emit('test:event', { message: 'second' });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ message: 'first' });
    });

    it('should support onAny/offAny', () => {
      const handler = vi.fn();
      emitter.onAny(handler);
      emitter.emit('test:event', { message: 'hello' });
      expect(handler).toHaveBeenCalledWith('test:event', { message: 'hello' });
    });

    it('should support clear', () => {
      const handler = vi.fn();
      emitter.on('test:event', handler);
      emitter.clear('test:event');
      emitter.emit('test:event', { message: 'hello' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should support listenerCount', () => {
      emitter.on('test:event', () => {});
      emitter.on('test:event', () => {});
      expect(emitter.listenerCount('test:event')).toBe(2);
    });
  });

  describe('configuration', () => {
    it('should accept maxListeners in options', () => {
      const em = createEmitochondria<TestEvents>({ maxListeners: 5 });
      expect(em.getMaxListeners()).toBe(5);
    });

    it('should accept onError as throw', () => {
      const em = createEmitochondria<TestEvents>({ onError: 'throw' });
      const handler = vi.fn(() => {
        throw new Error('test error');
      });
      em.on('test:event', handler);
      expect(() => em.emit('test:event', { message: 'test' })).toThrow('test error');
    });

    it('should accept custom error handler function', () => {
      const errorHandler = vi.fn();
      const em = createEmitochondria<TestEvents>({ onError: errorHandler });
      const handler = vi.fn(() => {
        throw new Error('test error');
      });
      em.on('test:event', handler);
      em.emit('test:event', { message: 'test' });
      expect(errorHandler).toHaveBeenCalled();
    });

    it('should accept custom max listeners exceeded handler', () => {
      const maxHandler = vi.fn();
      const em = createEmitochondria<TestEvents>({
        maxListeners: 2,
        onMaxListenersExceeded: maxHandler,
      });
      em.on('test:event', () => {});
      em.on('test:event', () => {});
      em.on('test:event', () => {}); // Third listener triggers warning
      expect(maxHandler).toHaveBeenCalledWith('test:event', 3, 2);
    });
  });

  describe('logging options', () => {
    it('should accept logging configuration', () => {
      const em = createEmitochondria<TestEvents>({
        logging: {
          timestamps: true,
          timestampFormat: 'iso',
          timezone: 'utc',
          logEvents: false,
          logErrors: true,
          logWarnings: true,
        },
      });
      expect(em).toBeDefined();
    });

    it('should not crash with file logging disabled', () => {
      const em = createEmitochondria<TestEvents>({
        logging: {
          persist: false,
          path: './logs/test.log',
        },
      });
      const handler = vi.fn();
      em.on('test:event', handler);
      em.emit('test:event', { message: 'test' });
      expect(handler).toHaveBeenCalled();
    });

    it('should accept different timestamp formats', () => {
      const formats: Array<'iso' | 'unix' | 'human'> = ['iso', 'unix', 'human'];
      formats.forEach((format) => {
        const em = createEmitochondria<TestEvents>({
          logging: {
            timestamps: true,
            timestampFormat: format,
          },
        });
        expect(em).toBeDefined();
      });
    });

    it('should accept different timezones', () => {
      const timezones: Array<'utc' | 'local'> = ['utc', 'local'];
      timezones.forEach((timezone) => {
        const em = createEmitochondria<TestEvents>({
          logging: {
            timestamps: true,
            timezone,
          },
        });
        expect(em).toBeDefined();
      });
    });

    it('should accept different log formats', () => {
      const formats: Array<'text' | 'json'> = ['text', 'json'];
      formats.forEach((format) => {
        const em = createEmitochondria<TestEvents>({
          logging: {
            persist: false,
            format,
          },
        });
        expect(em).toBeDefined();
      });
    });

    it('should accept maxSize configuration', () => {
      const em = createEmitochondria<TestEvents>({
        logging: {
          persist: false,
          maxSize: '50MB',
        },
      });
      expect(em).toBeDefined();
    });

    it('should accept selective logging flags', () => {
      const em = createEmitochondria<TestEvents>({
        logging: {
          logEvents: true,
          logErrors: false,
          logWarnings: false,
        },
      });
      expect(em).toBeDefined();
    });
  });

  describe('config file support', () => {
    it('should work without config file', () => {
      clearConfigCache();
      const em = createEmitochondria<TestEvents>();
      expect(em).toBeDefined();
      expect(em.getMaxListeners()).toBe(10); // default
    });

    it('should allow options to override defaults', () => {
      clearConfigCache();
      const em = createEmitochondria<TestEvents>({ maxListeners: 20 });
      expect(em.getMaxListeners()).toBe(20);
    });

    it('should export clearConfigCache utility', () => {
      expect(typeof clearConfigCache).toBe('function');
      clearConfigCache();
    });
  });

  describe('runtime configuration', () => {
    it('should allow setErrorHandler', () => {
      const handler1 = vi.fn();
      emitter.setErrorHandler(handler1);
      const errorHandler = vi.fn(() => {
        throw new Error('test');
      });
      emitter.on('test:event', errorHandler);
      emitter.emit('test:event', { message: 'test' });
      expect(handler1).toHaveBeenCalled();
    });

    it('should allow setMaxListeners', () => {
      emitter.setMaxListeners(5);
      expect(emitter.getMaxListeners()).toBe(5);
    });

    it('should allow getMaxListeners', () => {
      expect(emitter.getMaxListeners()).toBe(10); // default
    });
  });

  describe('inspection API', () => {
    it('should support eventNames', () => {
      emitter.on('test:event', () => {});
      emitter.on('void:event', () => {});
      const names = emitter.eventNames();
      expect(names).toContain('test:event');
      expect(names).toContain('void:event');
      expect(names.length).toBe(2);
    });

    it('should support listeners', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      emitter.on('test:event', h1);
      emitter.on('test:event', h2);
      const listeners = emitter.listeners('test:event');
      expect(listeners.length).toBe(2);
      expect(listeners).toContain(h1);
      expect(listeners).toContain(h2);
    });

    it('should support wildcardListeners', () => {
      const wh1 = vi.fn();
      const wh2 = vi.fn();
      emitter.onAny(wh1);
      emitter.onAny(wh2);
      const wildcards = emitter.wildcardListeners();
      expect(wildcards.length).toBe(2);
      expect(wildcards).toContain(wh1);
      expect(wildcards).toContain(wh2);
    });

    it('should support hasListener', () => {
      const handler = vi.fn();
      emitter.on('test:event', handler);
      expect(emitter.hasListener('test:event', handler)).toBe(true);
      expect(emitter.hasListener('test:event', vi.fn())).toBe(false);
    });
  });

  describe('async event handling', () => {
    it('should support emitAsync', async () => {
      const handler = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      emitter.on('test:event', handler);
      await emitter.emitAsync('test:event', { message: 'async' });
      expect(handler).toHaveBeenCalledWith({ message: 'async' });
    });

    it('should wait for all async handlers', async () => {
      let completed = 0;
      const h1 = async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        completed++;
      };
      const h2 = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        completed++;
      };
      emitter.on('test:event', h1);
      emitter.on('test:event', h2);
      await emitter.emitAsync('test:event', { message: 'test' });
      expect(completed).toBe(2);
    });
  });

  describe('type safety', () => {
    it('should enforce correct payload types', () => {
      const handler = vi.fn((payload: { message: string }) => {
        expect(typeof payload.message).toBe('string');
      });
      emitter.on('test:event', handler);
      emitter.emit('test:event', { message: 'typed' });
      expect(handler).toHaveBeenCalled();
    });

    it('should support void events', () => {
      const handler = vi.fn();
      emitter.on('void:event', handler);
      emitter.emit('void:event');
      expect(handler).toHaveBeenCalledWith(undefined);
    });
  });
});
