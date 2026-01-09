# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-08

### Added
- Initial release of Emitochondria
- Full TypeScript support with complete type safety
- Core event emitter functionality:
  - `on()` - Subscribe to events
  - `off()` - Unsubscribe from events
  - `once()` - One-time event subscription
  - `emit()` - Synchronous event emission
  - `emitAsync()` - Asynchronous event emission with Promise.all
  - `onAny()` - Wildcard event subscription
  - `offAny()` - Remove wildcard subscription
  - `clear()` - Clear event handlers
  - `listenerCount()` - Get subscriber count
- Biological API aliases:
  - `bind()` - Alias for `on()`
  - `release()` - Alias for `off()`
  - `pulse()` - Alias for `emit()`
  - `cascade()` - Alias for `emitAsync()`
  - `spike()` - Alias for `once()`
  - `membrane()` - Alias for `onAny()`
  - `apoptosis()` - Alias for `clear()`
  - `receptors()` - Alias for `listenerCount()`
- Zero dependencies
- Under 1KB minified (979 bytes ESM, 1.44 KB CJS)
- CommonJS and ESM module support
- Comprehensive test suite (31 tests)
- Full documentation with examples
- MIT License

[1.0.0]: https://github.com/Exudev/emitochondria/releases/tag/v1.0.0
