---
slug: reactivity
title: Reactivity
description: reactive, createSignal, createComputed, createLazyComputed, effect, untracked and how bindings meet the DOM.
category: core
order: 3
---

The MotifJS reactivity system is **fine-grained**. When one field of a model changes, only the bindings and effects that read that field run again. The whole component is not re-rendered.

There are two main reactive primitives:

1. **Reactive objects** — proxies created with `reactive(model)` / `useModel(model)`. You read and write the object's fields directly.
2. **Signal / Computed** — fine-grained primitives wrapping a single value.

## `reactive(model)` {#reactive}

Turns an object (or array) into a reactive proxy. You read/write its fields like a normal object; reads are tracked, writes trigger dependents.

```tsx
import { reactive } from "@motifx/core";

const state = reactive({
  count: 0,
  user: { name: "Ada", age: 30 },
  items: [] as string[],
});

state.count++;                 // triggers the bindings on this field
state.user.name = "Grace";     // nested objects are reactive too
state.items.push("new");       // array methods are tracked
state.items[state.items.length] = "last";   // appending by index triggers the index and length too
state.items.length = 0;        // truncation wakes the readers of the dropped indices
```

The proxy is built over the original object; no copy is taken. The same object always yields the same proxy (`reactive(a) === reactive(a)`). Plain objects, arrays and class instances (`[object Object]`) become reactive; objects such as `Map`, `Set`, `WeakMap`, `WeakSet`, `Date`, `RegExp` and non-extensible (`Object.freeze`) objects are returned **as they are**, and changes inside them do not trigger bindings. When such a value changes, write the field with a new reference (`state.tags = new Set(state.tags).add(x)`) or use a plain array/object.

The most common use in a component:

```tsx file=src/Counter.tsx variant=class
import { Component, reactive } from "@motifx/core";

export class Counter extends Component<HTMLButtonElement> {
  state = reactive({ count: 0 });
  view() {
    return <button onclick={() => this.state.count++}>
      {this.state.count}
    </button>;
  }
}
```
```tsx file=src/Counter.tsx variant=function
import { reactive } from "@motifx/core";

export function Counter() {
  const state = reactive({ count: 0 });
  return <button onclick={() => state.count++}>
    {state.count}
  </button>;
}
```
```tsx file=src/Counter.tsx variant=options
import { reactive } from "@motifx/core";

export const Counter = () => ({
  el: 'div',
  data: reactive({ count: 0 }),
  view() {
    return <button onclick={() => this.data.count++}>
      {this.data.count}
    </button>;
  },
});
```

### `useModel(model)` {#use-model}

An alias that does the same as `reactive`. Preferred in function components/hook style. There is also a `this.useModel(model)` method on `ComponentBase`.

```tsx
const state = useModel({ open: false });
```

### Derived (computed) fields — a function inside the object {#derived-fields}

If you define a function field inside a reactive object, it behaves like a derived reactive value:

```tsx
const state = reactive({
  theme: "light",
  lang: "en",
  full: () => state.theme + state.lang,   // derived
});

// in JSX:
<span>{() => state.full()}</span>
```

## Signal and Computed {#signals}

The finest-grained primitives, wrapping a single value. Ideal for reactive state that is independent of the component tree.

### `createSignal(initialValue)` {#create-signal}

```tsx
import { createSignal } from "@motifx/core";

const count = createSignal(0);

count.value;                 // read (tracked)
count.value = 5;             // write (triggers dependents)
count.peek();                // read without tracking
count.update(n => n + 1);    // update with a function
count.mutate(v => { /* mutate while keeping the reference */ });
count.notify();              // notify listeners even if the reference did not change
count.asReadonly();          // read-only view
count.dispose();             // dispose
```

A summary of the `Signal` class:

| Member | Description |
|--------|-------------|
| `get value` / `set value` | Tracked read / triggering write. |
| `peek()` | Read without tracking. |
| `update(fn)` | Update based on the previous value. |
| `mutate(fn)` | Notify after an in-place mutation (when the reference stays the same). |
| `notify()` | Manual notification. |
| `asReadonly()` | A `ReadonlySignal<T>` view (`value`, `peek()`). |
| `dispose()` | Makes further operations no-ops. |

The equality comparer can be customised (the default is `Object.is`); construct the `Signal` class directly for that:

```tsx
import { Signal } from "@motifx/core";

const s = new Signal(0, (a, b) => Math.abs(a - b) < 0.001);
```

### `createComputed(getter)` {#create-computed}

A cached value derived automatically from its dependencies. It is computed **at once** on setup; when one of its dependencies changes it is recomputed **in the next microtask** even if nobody reads it, and triggers the effects depending on it if the value changed. `.value` returns the cached value and does not compute during the read; a synchronous read right after a write may therefore return the previous value:

```tsx
import { createSignal, createComputed } from "@motifx/core";

const first = createSignal("Ada");
const last = createSignal("Lovelace");
const full = createComputed(() => first.value + " " + last.value);

full.value;   // "Ada Lovelace" — recomputed when the dependencies change
full.peek();  // read without tracking
full.dispose();
```

### `createLazyComputed(getter)` — compute only when read {#create-lazy-computed}

The lazy counterpart of `createComputed`. It does not compute on setup; when a dependency changes it is only marked **dirty** and the effects depending on it are woken. The computation happens when `.value` is first read and on every dirty read; a value nobody reads is never computed. The marking is synchronous at write time: right after the `a.value = 2` line, `lazy.value` returns the fresh value.

```tsx
import { createSignal, createLazyComputed } from "@motifx/core";

const rows = createSignal<Row[]>([]);
const report = createLazyComputed(() => buildExpensiveReport(rows.value));

rows.value = load();      // no computation, only the dirty mark
report.isDirty;           // true
report.value;             // computed now and cached
report.value;             // from the cache
report.peek();            // read without tracking (still computes if dirty)
report.dispose();         // stops tracking; later reads return the last value
```

Which one when: if the value is read on screen all the time, `createComputed` (ready on every change); if it is expensive and read rarely, or many writes come in a row, `createLazyComputed` (N writes → 1 computation). The trade-off: the dependent effects wake even when the lazy value did not change, because no computation happens while marking dirty and equality cannot be known.

Synchronous freshness holds when the whole chain consists of `reactive`/`Signal`/`LazyComputed`. If there is a `createComputed` in the chain, its refresh happens in a microtask, so a lazy value fed by it is fresh after the flush, not right after the write.

## `effect(fn)` — side effects and watchers {#effect}

An effect runs once synchronously when it is set up, subscribes to the reactive values it reads and runs again as they change. `effect` returns a **stop function**:

```tsx
import { effect } from "@motifx/core";

const stop = effect(() => {
  console.log("count is now:", count.value);
});

// end the subscription
stop();
```

The second argument is an optional **result callback**: `effect(getter, onValue)` passes `getter`'s return value to `onValue` after each run, and reads inside `onValue` are **not tracked**. It is used to limit the dependency surface to `getter` alone; the framework's `when`/`ternary`/`switchCase` bindings are built this way:

```tsx
const stop = effect(() => state.filter, (filter) => {
  // runs only when state.filter changes; state.rows read here is not tracked
  render(filter, state.rows);
});
```

When setting up an effect inside a component, `bindings.watch` is safer because cleanup is automatic (see below) — the effect stops when the component is disposed.

### Reads after `await` {#await-reads}

Tracking is limited to the **synchronous** part of the effect: in an `async` getter/effect, reactive fields read after the first `await` are not recorded as dependencies. For state that has to update according to the result of an asynchronous job, write the result to a reactive field and show it through a separate binding that reads that field. The one exception is `Virtualization`'s `dataRequest` prop: the compiler wraps the `await`s there and reads after `await` are tracked too (see [Virtualization](./virtualization.md#auto-refresh)). The runtime half of that wrapping is the `asyncTracking` export; it is not called by hand.

### Reading without tracking — `untracked` {#untracked}

When you want to read a value inside an effect but **not subscribe** to it, use `untracked(fn)`; it returns `fn`'s return value. `effect`s set up inside track their own dependencies normally.

```tsx
import { effect, untracked } from "@motifx/core";

effect(() => {
  const q = state.query;                       // tracked
  const limit = untracked(() => state.limit);  // not tracked: this effect does not run when limit changes
  search(q, limit);
});
```

The core uses this in `ListBinding`: row components are produced inside the list effect, but store reads in the row template are recorded on the row's own bindings, not on the list. So the list diff does not run needlessly when the store changes.

> **Rule: an effect must not write the value it reads.** `state.n++` is both a read and a write; the effect re-triggers itself and loops. Put side records such as counters/logs inside `untracked`:
>
> ```tsx
> effect(() => {
>   const t = total.value;                    // tracked read
>   untracked(() => {                         // writes are not tracked → does not trigger itself
>     state.effectRuns++;
>     state.log.unshift(`total ${t}`);
>   });
> });
> ```
>
> The framework catches this: if an effect runs 50 times in one flush it is skipped for the rest of that flush and a `MJX203` warning is given in development mode. The other effects in the queue are not affected.
>
> Array mutators (`push`, `pop`, `shift`, `unshift`, `splice`, `reverse`) are outside this rule: the call's own internal reads (`length`, indices) are not tracked, so writing `state.items.push(x)` inside an effect does not subscribe the effect to the array. If the effect reads the array separately (such as `state.items.length`), the subscription is still made.

### Chained (derived) state {#chained-state}

An effect may read state written by another effect. The whole chain settles **in the same microtask**; order does not matter and there is no need to wait for intermediate steps:

```tsx
effect(() => { b.n = a.n + 1; });   // writes
effect(() => { c.n = b.n + 1; });   // reads and writes

a.n = 10;
// in the next microtask c.n === 12
```

If an effect (or a binding's getter) throws, only that effect is affected; the others in the same flush keep running. The error is reported to the central error handler as a `MotifError` with code `MJX208` carrying the original error in `cause`: it is written to the console and reaches `errorHandler.addListener(fn)` listeners.

### A watcher tied to the component — `bindings.watch` / `x-watch` {#watch}

The watcher is registered on the component; it stops by itself when the component is disposed. The first run happens while the component is being set up (before build).

```tsx file=src/Logger.tsx variant=class
import { Component, reactive } from "@motifx/core";

export class Logger extends Component<HTMLDivElement> {
  state = reactive({ q: "" });
  onConfig() {
    this.bindings.watch(() => {
      console.log("search:", this.state.q);
    });
  }
}
```
```tsx file=src/Logger.tsx variant=function
import { reactive } from "@motifx/core";

export function Logger() {
  const state = reactive({ q: "" });
  return <div x-watch={() => console.log("search:", state.q)} />;
}
```
```tsx file=src/Logger.tsx variant=options
import { reactive } from "@motifx/core";

export const Logger = () => ({
  el: 'div',
  data: reactive({ q: "" }),
  onConfigured() {
    this.bindings.watch(() => {
      console.log("search:", this.data.q);
    });
  },
});
```

## Consecutive writes are batched by themselves {#batching}

Writes made in the same synchronous block need no separate batching call. Writes add effects to a queue; the queue is drained in the next microtask and each effect runs **once**. No effect sees the intermediate states:

```tsx
state.a = 1;
state.b = 2;
state.c = 3;
// an effect reading all three runs only once, in the microtask
```

## Helpers {#helpers}

| Function | Description |
|----------|-------------|
| `deepClone(value)` | Produces a deep copy of a reactive value. |
| `clearModel(model)` | Clears a model's reactive registration. |

## Where reactivity meets the DOM {#bindings}

Reactive fields reach the DOM through **bindings**. When you write JSX these are set up automatically:

```tsx
<span>{state.name}</span>          // → bindings.add("textContent", state, "name")
<div class={() => state.cls} />    // → reactive class binding
<input value={() => state.q} />    // → reactive value binding
```

In the imperative case you can re-activate the subtree's bindings (text, attribute, class and style getters, `model`; lists rebuild their rows) with `setState()` / `reState()`. Both re-evaluate the bindings of the component and all of its children; only the order differs: `setState()` handles the children first and then the component itself, `reState()` the component itself first and then the children.

```tsx
this.setState();   // re-evaluate the bindings of this component and its children
```

With `reactive` you usually do not need `setState`; fine-grained reactivity does the updating itself. `setState` is for the cases where you update plain, non-reactive data by hand (for example re-reading every text binding when a language dictionary changes).

## Next step {#next}

Continue with [Conditional Rendering and Lists](./conditionals-and-lists.md) to learn conditional and list-based rendering.
