---
slug: error-handling
title: Error Handling
description: The distinction between thrown, reported and warned errors; MotifError, errorHandler, setUnexpectedErrorHandler, the safeCall helpers and Emitter.
category: app
order: 5
---

MotifJS does not swallow errors coming from user code, but it does not bring the application down either. Every error carries a **`MJX` code** and takes one of three paths. This section describes those paths, the points where errors can be listened to, and the framework's own error-safe call helpers. The full list of codes is in the [Error and warning codes](./api-reference.md#error-codes) table.

## The three paths {#three-paths}

| Path | When | Where it goes |
|------|------|---------------|
| **Throw** | Misuse the caller has to fix at once: a named route does not exist (`MJX302`), a service is not registered (`MJX401`), a second `ApplicationBuilder` (`MJX405`), `Query.first()` on an empty array (`MJX601`) … | A `MotifError` is thrown; caught with `try/catch`. |
| **Report** | A user-code error that must not stop the flow: a component hook (`MJX122`), an event handler (`MJX123`), an effect/binding (`MJX208`), a route hook or guard (`MJX306`), disposal and data loading errors … | `errorHandler.report(MotifError)`: `console.error` to the console (`app.useLogging(false)` turns it off), to `errorHandler.addListener(fn)` listeners, to the devtools bus if present. The original error is in `cause`. Works in production too. |
| **Warn** | A situation that keeps running but is most likely unintended: a duplicate `key` (`MJX202`), a self-triggering effect (`MJX203`), route definition validation (`MJX310`–`MJX316`) … | Only in development mode (`app.useDevelopment(true)`): `console.warn` and the devtools warning list. Does not reach listeners. |

## `MotifError` {#motif-error}

Every error the framework throws or reports is a `MotifError`:

```ts
import { MotifError } from "@motifx/core";

try {
  await app.navigateByName('missing');
} catch (e) {
  if (e instanceof MotifError && e.code === 'MJX302') { /* named route not found */ }
}
```

| Field | Description |
|-------|-------------|
| `code` | `MotifErrorCode` (such as `'MJX302'`). Branch on this, not on the message text; the texts are English and may change. |
| `message` | An English message in the `[motifjs] MJX302: …` form. |
| `cause` | On reported errors, the original error (the value user code threw). |
| `name` | `'MotifError'` (`'TimeoutError'` on a `Resilience` timeout). |

The `MotifErrorCode` type is the union of all codes; it provides completion when writing `switch (e.code)`.

## Listening to reports — `errorHandler` {#error-handler}

```ts
import { errorHandler } from "@motifx/core";

const off = errorHandler.addListener((error) => {
  telemetry.capture({ code: error.code, message: error.message, cause: error.cause });
});
// ...
off();
```

- The listener receives every **reported** `MotifError` (`MJX122`, `MJX123`, `MJX208`, `MJX306` …). Code-less errors going to `setUnexpectedErrorHandler` (below) reach the listeners as they are too.
- Thrown errors do not reach the listener (they return to the caller anyway); nor do warnings.
- The listener is tied to no component; remove it with the returned function.
- With `errorHandler.report(err)` you can send your own error down the same path; `err` must be an `Error`, it need not be a `MotifError`.

Other members of the `ErrorHandler` class: `setDevelopmentMode(b)` / `isDevelopment()` (`app.useDevelopment` uses these), `setConsoleLogging(b)` (`app.useLogging`), `reportSuppressed(context, err)` (writes to the console only in development mode, does not reach listeners — the framework uses it for errors it swallows internally).

## Unexpected errors — `setUnexpectedErrorHandler` {#unexpected-errors}

Errors caught inside `safeCall`/`safeCallAsync` and errors thrown by `Emitter` listeners are **code-less**; they take the `errorHandler.onUnexpectedError(err)` path:

1. The handler given with `setUnexpectedErrorHandler(fn)` is called. The default handler **rethrows** the error with `setTimeout(…, 0)`: it shows up at the `window.onerror`/`unhandledrejection` level in the browser, the calling flow is not cut.
2. Then the `addListener` listeners receive the error as it is.

```ts
import { setUnexpectedErrorHandler } from "@motifx/core";

setUnexpectedErrorHandler((e) => telemetry.capture(e));   // record instead of rethrowing
```

Coded reports (`MJX122` …) do **not** go to this handler; use `addListener` for them.

## Error-safe call helpers {#safe-call}

The helpers the framework uses to wrap its own code are exported:

| Function | Behaviour |
|----------|-----------|
| `safeCall(fn, context, fallback?)` | Calls `fn()`; if it throws, writes `[motifjs Error - context]` in development mode, hands the error to `onUnexpectedError` and returns `fallback` (`undefined` if none). |
| `safeCallAsync(fn, context, fallback?)` | The same; `fn` returns a `Promise`, the rejection is caught. |
| `safeCallSilent(fn, context)` | If it throws, writes to the console only in development mode; does **not** go to `onUnexpectedError` or the listeners. |
| `errorHandler.safeCallSilentAsync`, `errorHandler.wrapSafe(fn, context)`, `errorHandler.wrapSafeAsync(fn, context)` | Asynchronous silent call; return a new function wrapping `fn` with the same behaviour (report like `safeCall`). |

`context` is a free label that appears only in the log.

## Where do errors in user code land? {#where-errors-land}

| Place | Result |
|-------|--------|
| A lifecycle hook (`onConfig`, `onBuilt`, `onMounted` …), `initializeComponent`, a `ref` callback, the Options API `ctor`, a `motif.on('x:…')` listener | `MJX122` report; the component keeps being set up. The rejected promise of an `async` hook is the same. |
| A DOM/component event handler (`onclick`, `motif.on`, `on:name`) | `MJX123` report; the other handlers of the same event run. |
| An application event listener (`app.on`, `onRouterChanged`) | `MJX123` report; the other listeners run, the navigation completes. |
| `effect`, `bindings.watch`, a binding getter, a `createComputed` getter | `MJX208` report; the other effects in the same flush run, the failing effect keeps tracking. |
| A route hook (`onEntering`, `onEnter`, `onLeave`, `onUpdate`, `onShow`) | `MJX306` report; the navigation continues. |
| A `useGuard` guard | `MJX306` report and the navigation is **cancelled** (`{ ok: false, cancelled: true, reason: 'guard' }`). |
| A route component constructor / `import()` failure | `MJX304` report and the `fallbacks.error` page (`params.error`). |
| `Virtualization dataRequest` | First load/refresh: `errorTemplate` or `MJX207`; a later page: `MJX207` + `getState().error`. |
| `Lazy caller` | `onError`, then `Fallbackview`; without a `Fallbackview`, `MJX126` is reported (`cause` = the original error). A cancellation (`signal`) is not reported. |
| Several errors inside `DisposableStore.clear/dispose` | `MJX503` is thrown; the `cause.errors` array. |
| An `Emitter` listener | `onUnexpectedError` (default: rethrow) + listeners. |

## `Emitter<T>` — a typed event emitter {#emitter}

A small emitter carrying a single type, independent of components. Suits notifications between services:

```ts
import { Emitter, DisposableStore } from "@motifx/core";

class AuthService {
  private _changed = new Emitter<{ user: User | null }>();
  readonly onChanged = this._changed.event;        // Event<T>: (listener, thisArgs?, disposables?) => IDisposable

  login(user: User) { this._changed.fire({ user }); }
  dispose() { this._changed.dispose(); }
}

const store = new DisposableStore();
auth.onChanged((e) => render(e.user), undefined, store);   // the subscription is added to the store
store.dispose();                                            // the subscription is removed
```

- `event(listener, thisArgs?, disposables?)` subscribes and returns an `IDisposable`; if `disposables` is a `DisposableStore` or an `IDisposable[]`, the subscription is added there too. To tie it to a component: `this.motif.register(auth.onChanged(fn))`.
- `fire(value)` calls the listeners synchronously in the order they were added. A listener added during a dispatch does not receive that dispatch; a removed listener is never called again.
- An error thrown by a listener does not stop the others; it goes to `onUnexpectedError`.
- `dispose()` invalidates every subscription; later `event(...)` calls return an empty `IDisposable`.

## Development and production {#dev-vs-prod}

| | Development (`app.useDevelopment(true)`) | Production |
|---|---|---|
| Reports (`MJX122` …) | console + listeners | console + listeners |
| Warnings (`MJX2xx`, `MJX3xx` checks …) | `console.warn` | none |
| `safeCallSilent` / `reportSuppressed` | console | none |
| Compiler contract mismatch (`MJX121`) | `console.warn` | none |

`app.useLogging(false)` turns off only the console output; the listeners keep working.

## Next step {#next}

To wrap network and external resource calls with retry, timeout and a circuit breaker, see [Resilience](./resilience.md).
