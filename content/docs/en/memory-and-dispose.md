---
slug: memory-and-dispose
title: Memory Management and Dispose
description: What is cleaned automatically, motif.register/setDisposable, dispose methods, detach/silentDetach/silentUnlink, DisposableStore, using/doWork, leak monitoring and live component counting.
category: app
order: 4
---

MotifJS is designed for long-lived, state-heavy applications; **resource cleanup** is therefore a first-class concern. Since there is no virtual DOM, components hold on directly to real DOM nodes, event listeners and reactive subscriptions. Disposing these correctly prevents memory leaks.

## What is cleaned automatically {#auto-cleanup}

When a component is disposed MotifJS does the following **automatically**:

- Removes every DOM event listener added with `motif.on(...)`.
- Deactivates all bindings (`bindings`).
- Stops effects such as `bindings.watch` / `bindings.method`.
- Disposes child components recursively.
- Takes the DOM nodes out (after the leave animation, if any).
- Releases internal references (`element`, `props`, `class`, `attr`).

So **no manual cleanup is needed for the events, bindings and children you set up in JSX.**

## Resources you register by hand {#manual-resources}

If you create external resources tied to a component's lifetime (timers, subscriptions, observers), **register** them on the component so that they are cleaned automatically on dispose.

### `motif.register(disposable)` and `motif.setDisposable(fn)` {#register}

```tsx file=src/Clock.tsx variant=class
import { Component, disposableCore } from "@motifx/core";

export class Clock extends Component<HTMLDivElement> {
  onConfig() {
    const id = setInterval(() => this.tick(), 1000);

    // Way 1: register a cleanup function
    this.motif.setDisposable(() => clearInterval(id));

    // Way 2: register an IDisposable
    this.motif.register(disposableCore.toDisposable(() => clearInterval(id)));
  }
  tick() { /* ... */ }
}
```
```tsx file=src/Clock.tsx variant=function
export function Clock() {
  const tick = () => { /* ... */ };
  return <div onconfig={(s) => {
    const id = setInterval(tick, 1000);
    s.motif.setDisposable(() => clearInterval(id));
  }} />;
}
```
```tsx file=src/Clock.tsx variant=options
export const Clock = () => ({
  el: 'div',
  onConfigured() {
    const id = setInterval(() => this.tick(), 1000);
    this.motif.setDisposable(() => clearInterval(id));
  },
  tick() { /* ... */ },
});
```

- `this.motif.setDisposable(() => void)` — registers a cleanup function.
- `this.motif.register(IDisposable)` — registers an `IDisposable` object.
- Registered cleanups are called while the component is disposed.

### Unsubscribing from application events {#app-event-unsubscribe}

A subscription opened with `this.context.on(...)` is tied to the component's lifetime **by itself**; it is removed when the component is disposed, you do not have to register it. To release it early, call the function it returns:

```tsx
onConfig(s: Component) {
  const off = s.context.on('data-updated', () => this.refresh());
  // ... if needed: off();
}
```

Subscriptions opened outside a component (`app.on(...)` / `Application.main.on(...)`) are not tied automatically; register their cancel function on a component with `motif.setDisposable` or call it by hand.

## `effect` cleanup {#effect-cleanup}

If you use `effect(...)` directly, register the stop function it returns. Inside a component prefer `bindings.watch` instead — it is cleaned automatically:

```tsx
// Recommended: cleaned automatically
this.bindings.watch(() => console.log(state.x));

// By hand: the stop function must be registered
const stop = effect(() => console.log(state.x));
this.motif.setDisposable(stop);
```

## Dispose methods {#dispose-methods}

```ts
await this.dispose();                                 // deep + leave animation (default)
await this.dispose({ skipLeaveTransition: true });    // without animation
await this.dispose({ deep: false });                  // skip reference cleanup in the children
await this.disposeAsync();                            // no leave transition, running animations are stopped
```

For the details of the options see [Disposal](./lifecycle.md#dispose).

Indirect disposal through `controls`:

```ts
this.controls.remove(child);   // removes child and DISPOSES it (full cleanup)
this.controls.clear();         // DISPOSES all children
await this.motif.clear();      // clear the content (Promise)
```

**Destroying vs. moving:** `remove()`/`clear()` **dispose** the child (bindings, effects, event listeners and the DOM are cleaned). If you want to **move/reuse** a component elsewhere without destroying it, use one of the three non-disposing methods:

| Method | Collection | Leave animation | DOM | Notification |
|---|---|---|---|---|
| `detach(child)` | removes | **plays**: if the root is an element its own leave; if the root is a fragment the leaves of the visible element children (nested fragments included) together | takes it out when the leave ends (for a fragment root the whole open..close range; the placeholder if hidden); synchronous if no transition is defined | `controlremoved` on the parent after the leave ends and the DOM is taken out |
| `silentDetach(child)` | removes | does not play | takes it out synchronously | none |
| `silentUnlink(child)` | removes | does not play | does not touch | none |

All three leave the component and its children alive. `detach` and `silentDetach` send `onDeactivated` to the component and its visible subtree when the DOM is taken out, and `onActivated` when the component is placed again with `controls.add`; `silentUnlink` sends no notification since it does not touch the DOM ([Lifecycle](./lifecycle.md)). `detach` returns a `Promise`; with a transition it resolves when the removal finishes, otherwise it comes resolved:

```ts
await this.controls.detach(child);   // the leave played, the DOM was taken out
other.controls.add(child);           // move to the new place
```

Writing `other.controls.add(child)` without waiting is safe too: the `detach` from the old parent happens by itself, the collection and `parent` are updated at once, and the DOM is attached to the new parent when the leave ends. The other ways of animated removal are `motif.hide()` and `dispose()`.

Check the state with `isDisposed`; after dispose most methods are safe no-ops.

## `DisposableStore` — group cleanup {#disposable-store}

Use `DisposableStore` to collect several resources in one group:

```tsx
import { DisposableStore, disposableCore } from "@motifx/core";

const store = new DisposableStore();
const timer = store.add(disposableCore.toDisposable(() => clearInterval(id)));  // add returns what it added
store.add(someOtherDisposable);

store.delete(timer);   // remove one and dispose it
store.detach(timer);   // remove one, do NOT dispose
store.clear();         // dispose all, the store stays open

// Clean everything at once and close the store
store.dispose();
store.isDisposed;   // true
```

If `add` is called on a closed store, the added object is not disposed (it leaks) and a `MJX504` warning is written in development mode. If several items throw during `clear`/`dispose`, all are collected in an `AggregateError` in the `cause` of a single `MJX503` error; a single error is thrown as it is.

To tie it to a component call `this.motif.register(store)`.

## Safety after dispose: `using` and `doWork` {#using-dowork}

By the time an asynchronous operation completes the component may have been disposed. `using` and `doWork` process the result only if the component is still alive:

```ts
// onfulfilled runs only if the component is not disposed
this.using(fetchData(), (data) => this.state.items = data);

// if the component was disposed meanwhile the Promise does not reject; it resolves with an Error instance (MotifError, code 'MJX108'); otherwise it passes the value through
const value = await this.doWork(fetchData());
if (value instanceof Error) return;
```

This prevents "updating state on a disposed component" errors.

## Leak monitoring {#leak-monitor}

To watch for abnormal growth of reactive dependencies during development:

```ts
app.useReactiveMonitor({ enabled: true, threshold: 200, name: 'app' });
```

When a dependency set exceeds the threshold MotifJS produces a warning — this usually points to an effect/binding that was not cleaned. Keep it off in production (it is off by default).

## Live component counting — `disposableCore.disposableTracker` {#disposable-tracker}

Every component is a `Disposable`: its constructor calls `trackDisposable`, its disposal chain calls `markAsDisposed`. By attaching a tracker to `disposableCore.disposableTracker` you can measure the number of live components; it is used in round-trip tests ("did the counter return to its starting value after N build/teardown cycles"):

```ts
import { disposableCore, ComponentBase, IDisposable } from "@motifx/core";

let alive = 0;
const disposedOnce = new WeakSet<IDisposable>();
disposableCore.disposableTracker = {
  trackDisposable(x) { if (x instanceof ComponentBase) alive++; },
  markAsDisposed(x) {
    if (!(x instanceof ComponentBase) || disposedOnce.has(x)) return;
    disposedOnce.add(x);
    alive--;
  },
  setParent() { },
  markAsSingleton() { },
};
```

`markAsDisposed` may come more than once in the disposal chain; that is why the `WeakSet` is needed. To inspect the dependency maps of reactive objects use `debugGetDeps(target)` and `debugGetDepMap()` from the `@motifx/core/devtools` subpath (`import { debugGetDeps } from "@motifx/core/devtools"`).

## Best practices {#best-practices}

- Everything you set up with JSX (events, bindings, children) is cleaned automatically — leave it alone.
- If you create an external resource (timer, observer, WebSocket, external subscription) **always** register it with `motif.register`/`motif.setDisposable`.
- For reactive watchers inside a component use `bindings.watch` rather than `effect`.
- Protect asynchronous results with `using`/`doWork`.
- Manage components you add by hand with `controls.add` knowing they are cleaned automatically when the container is disposed; use `controls.remove` to remove them early.

## Next step {#next}

Continue with [API Reference](./api-reference.md) for a summary of the whole exported API.
