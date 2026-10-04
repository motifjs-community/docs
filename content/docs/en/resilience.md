---
slug: resilience
title: Resilience
description: Retry, timeout, circuit breaker, bulkhead, rate limiter and fallback policies through the Resilience.create chain; ordering, state and error codes.
category: app
order: 6
---

Network requests and external resources fail, lag and get overloaded. `Resilience` offers six **policies** for these situations and combines them in a single chain. It is independent of the rest of the framework; it can be used in services, in the data layer or inside a `dataRequest`.

```ts
import { Resilience } from "@motifx/core";

const policy = Resilience.create
  .retry({ retries: 3, delay: 200 })
  .timeout({ timeoutMs: 5000 })
  .fallback({ fallback: () => [] });

const rows = await policy.execute(() => fetch('/api/rows').then(r => r.json()));
```

## The chain and its order {#chain}

`Resilience.create` gives a new, empty chain; every policy method adds to the chain and returns the same object. `execute(action, ctx?)` wraps the added policies **outermost-first in the order they were added** and runs `action`:

```ts
Resilience.create.retry().timeout().execute(fn)
// retry( timeout( fn ) ): every attempt has its own timeout
Resilience.create.timeout().retry().execute(fn)
// timeout( retry( fn ) ): all attempts inside a single timeout
```

`action` may be synchronous or return a `Promise`; `execute` always returns a `Promise`. `ctx` is a free object (`ResilienceContext`), passed as it is to `action(ctx)` and the callbacks.

The types are exported: `RetryOptions`, `TimeoutOptions`, `CircuitBreakerOptions`, `BulkheadOptions`, `RateLimiterOptions`, `FallbackOptions<T>` for the options; `CircuitState` for the circuit state; `ResiliencePolicy` for the `execute` signature and `ResilienceAction<T>` for the `action`. The `Resilience` class implements `ResiliencePolicy`; type a function receiving a chain as `(policy: ResiliencePolicy) => …`.

**State lives in the chain.** `circuitBreaker`, `bulkhead` and `rateLimiter` keep counters between calls; every `Resilience.create` opens new counters. For these policies to be useful, build the chain once (a service field, a module constant) and use the **same** object's `execute` on every call. `retry`, `timeout` and `fallback` are stateless.

```ts
@Injectable({ lifetime: 'singleton' })
export class ApiClient {
  private policy = Resilience.create
    .circuitBreaker({ failureThreshold: 5, durationOfBreakMs: 30000 })
    .retry({ retries: 2 })
    .timeout({ timeoutMs: 8000 });

  get<T>(url: string): Promise<T> {
    return this.policy.execute(() => fetch(url).then(r => r.json()));
  }
}
```

## Policies {#policies}

### `retry(options?)` {#retry}

Waits and retries a failed `action`.

| Option | Default | Description |
|--------|---------|-------------|
| `retries` | `3` | The number of retries; total attempts `retries + 1`. |
| `backoff` | `'exponential'` | `'exponential'`: `delay × 2^(attempt−1)`; `'fixed'`: `delay` every time; `'none'`: no wait. |
| `delay` | `100` | The base wait (ms). |
| `jitter` | `0.1` | The random share added to the wait (0–1): the wait deviates within `± jitter × wait`. |
| `shouldHandle` | every error except a timeout | `(error) => boolean`; if it returns `false` there is no retry, the error is thrown at once. The default does **not retry** a `TimeoutError` (the `timeout` policy's error). |
| `onRetry` | — | `(attempt, error, waitMs, ctx)`; called before every wait, awaited if it returns a `Promise`. |

If the last attempt fails too, the last error is thrown. To retry a timed-out request as well, give `shouldHandle: () => true`.

### `timeout({ timeoutMs })` {#timeout}

If `action` does not finish within `timeoutMs`, a `MotifError` with code `MJX605` and `name` `'TimeoutError'` is thrown. The running operation is not cancelled (wire your own `AbortController` for `fetch`); only its result is no longer awaited. The timer is cleared in both cases.

### `circuitBreaker(options?)` {#circuit-breaker}

On consecutive failures it rejects calls for a while without making them at all; it gives the resource room to recover.

| Option | Default | Description |
|--------|---------|-------------|
| `failureThreshold` | `5` | In the `CLOSED` state this many consecutive failures open the circuit. A success in between resets the counter. |
| `successThreshold` | `2` | In the `HALF_OPEN` state this many consecutive successes close the circuit. |
| `durationOfBreakMs` | `60000` | The duration of the `OPEN` state; when it runs out the first call moves to `HALF_OPEN`. |
| `shouldHandle` | every error except a timeout | Which errors count as failures. |
| `onStateChange` | — | `(old, new)`; `'CLOSED' \| 'OPEN' \| 'HALF_OPEN'`. |

In the `OPEN` state `execute` throws `MJX602` without calling `action`. In `HALF_OPEN` a single failure reopens the circuit. Watch the circuit state with `onStateChange`; the chain has no "read state" method.

### `bulkhead(options?)` {#bulkhead}

Limits the number of `action`s running at the same time; the rest queue up.

| Option | Default | Description |
|--------|---------|-------------|
| `maxConcurrent` | `10` | The concurrency upper bound. |
| `maxQueue` | `50` | The waiting queue upper bound; when full, `MJX603` is thrown. |

The queue is FIFO; when a call finishes the next one starts.

### `rateLimiter(options?)` {#rate-limiter}

A token bucket: every call spends a token, tokens refill at intervals.

| Option | Default | Description |
|--------|---------|-------------|
| `tokensPerInterval` | `1` | Tokens added per interval. |
| `intervalMs` | `1000` | The interval. |
| `capacity` | `tokensPerInterval` | The bucket capacity; the bucket starts full. Give a larger value if a burst allowance is wanted. |

Without a token `execute` does not wait; it throws `MJX604`. The default values mean "at most 1 per second"; for "at most N per second" `tokensPerInterval: N` is enough. With `capacity: 10, tokensPerInterval: 1` the first 10 calls pass at once, then 1 per second.

### `fallback({ fallback, shouldHandle? })` {#fallback}

If `action` fails, the value `fallback(error, ctx)` returns (synchronous or a `Promise`) becomes the result. If `shouldHandle` (default: every error) returns `false`, the error is thrown. Placed **first** in the chain it catches the final error of all inner policies.

## `decorate(policy, fn)` {#decorate}

Binds a chain to a function and makes it reusable:

```ts
import { Resilience, decorate } from "@motifx/core";

const loadRows = decorate(
  Resilience.create.retry({ retries: 2 }).timeout({ timeoutMs: 5000 }),
  () => fetch('/api/rows').then(r => r.json()),
);

const rows = await loadRows();        // the same as policy.execute(fn, ctx)
```

`decorate(policy: ResiliencePolicy, fn: ResilienceAction<T>)` accepts as its first argument any object with an `execute(action, ctx?)` method; the `Resilience` chain implements this interface.

## Error codes {#errors}

| Code | Policy | Meaning |
|------|--------|---------|
| `MJX602` | `circuitBreaker` | The circuit is open; `action` was not called. |
| `MJX603` | `bulkhead` | The queue is full. |
| `MJX604` | `rateLimiter` | No token. |
| `MJX605` | `timeout` | Timed out (`name: 'TimeoutError'`). |

All four are `MotifError`s thrown from `execute`; they can be caught with `fallback`. With the default `shouldHandle`, `retry` and `circuitBreaker` do not count the timeout but do count the other three.

## Next step {#next}

For the exported collection structures see [Collections](./collections.md).
