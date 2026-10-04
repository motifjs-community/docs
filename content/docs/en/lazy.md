---
slug: lazy
title: Lazy
description: Content loaded through a dynamic import or any Promise; the loading flow, options, retry, cancellation and error reporting.
category: advanced
order: 2
---

`Lazy` calls a function producing a `Promise`, turns the result into a component and places it inside a [Frame](./frame.md). It is designed for code splitting (`() => import('./X')`) but works with any `Promise`.

## Usage {#usage}

```tsx
import { Lazy } from "@motifx/core";

<Lazy caller={() => import('./Chart')} options={{
  Loaderview: <Spinner />,
  Fallbackview: <LoadFailedBox />,
  minDelayMs: 300,
  timeoutMs: 10000,
  retry: 3,
}} />
```

`Lazy` is a function; the `Lazy({ caller, options })` call returns the same `Frame` and can be placed with `controls.add`. `frame.navigateLazy(caller, options)` and `frame.navigate(promise)` use the same path.

## The loading flow {#flow}

1. `Placeholderview` (or `Loaderview` if there is none) is shown at once.
2. `caller()` is called **immediately** (it does not wait for the component to enter the DOM). If `timeoutMs` is given, the load counts as failed with `MJX110` when the time runs out; if `signal` is given, `abort()` cuts the load with `MJX111`.
3. A successful result is turned into a component with `mapResult`. The default mapper takes the module's `default` export (for an `import()` result); if another export is needed write `mapResult: (m) => m.Chart`. If the returned value is a class it is constructed with `new`, if a function it is called; a ready instance is used as it is (no props are given).
4. If `minDelayMs` is given and the load finished faster than that, the remaining time is waited (prevents the loading view flickering on short loads). Then the content is placed in the `Frame`; `Loaderview` is disposed while playing its leave transition.
5. On failure `onError(err)` is called first. If there is a `Fallbackview` it is shown and the error stays there (not reported). Otherwise the container is emptied and the error is reported as `MJX126` through `errorHandler.report` — written to `console.error` and passed to `errorHandler.addListener` listeners; the original error is in the `cause` field (see [Error handling - Listening to reports](./error-handling.md#error-handler)). Giving `onError` does not remove the report.

On a cancelled (`signal`) load `onError` is still called, but `Fallbackview` is not shown, the content does not change and nothing is reported. When the container is disposed, running timers and pending retries are cleaned up.

## Options (`LazyOptions<T>`) {#options}

| Option | Type | Description |
|--------|------|-------------|
| `Loaderview` | `ComponentBase` | The content shown while loading. |
| `Placeholderview` | `ComponentBase` | Takes precedence over `Loaderview`; when both are given only this one is shown. |
| `Fallbackview` | `ComponentBase` | The content shown when the last attempt fails too. |
| `minDelayMs` | `number` | The minimum time that must pass before the content is placed. |
| `timeoutMs` | `number` | The upper bound of each attempt; `MJX110` when exceeded. |
| `signal` | `AbortSignal` | Cancelling the load from outside; `MJX111`. `Frame.navigate(promise)` provides this itself. |
| `mapResult` | `(result) => component` | Turns the load result into a component; the default is the `default` export. |
| `onError` | `(error) => void` | On every failure (cancellation included), before `Fallbackview`. |
| `retry` | `number \| LazyRetryOptions` | Retrying (below). |
| `onRetry` | `(attempt, error) => void` | Before every retry; `attempt` starts at 1. |

## Retrying — `retry` {#retry}

```tsx
retry: 3                                              // count: 3, delayMs: 500, whenOnline: true
retry: { count: 3, delayMs: 500, whenOnline: true }   // the explicit form (LazyRetryOptions)
```

- Retried `count` times; total attempts `count + 1`.
- The wait grows on every attempt: `delayMs × attempt` (500, 1000, 1500…).
- With `whenOnline: true`, if the device is offline (`navigator.onLine === false`) the timer does not start; the wait begins when the `online` event arrives.
- If the container is disposed or `signal` is aborted during the wait, the attempt is abandoned and the last error goes to `onError`.
- `timeoutMs` applies to every attempt separately.

## In route pages {#in-routes}

`control: () => import('./pages/X')` in a route definition and `fallbacks.notFound/error` use their own lazy loading path; the `Lazy` options (loading view, retry) do not apply there. Use `Lazy` to lazy-load a heavy part **inside** a page (see [Routing - Lazy loading](./routing.md#lazy)).

## Next step {#next}

For the framework's error reporting model see [Error Handling](./error-handling.md); for the container's timing rules see [Frame](./frame.md#timing).
