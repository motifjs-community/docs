---
slug: wrapping-libraries
title: Wrapping Third-Party Libraries
description: The rules for turning libraries that manage their own DOM into components; onMounted setup, setDisposable cleanup, untracked writes, DOM ownership conflicts, the root element and the single-copy rule.
category: guides
order: 1
---

In real applications not everything is written with MotifJS. Charts, rich text editors, maps and drag-and-drop are left to mature libraries that manage their own DOM. This section describes the rules for turning those libraries into MotifJS components.

Ready wrappers for Chart.js and SortableJS are published as community packages: `@motifjs-community/chartjs` and `@motifjs-community/sortablejs`.

## First decision: does it need wrapping? {#should-you-wrap}

Wrap:

- If the library produces its own DOM (draws a `canvas`, builds a tree, moves nodes).
- If it has an imperative lifecycle (`new X()` / `x.destroy()`).
- If doing the job with MotifJS's fine-grained bindings makes no sense (chart drawing, a text editor).

Do not wrap:

- Libraries doing pure computation (dates, money, validation). Call them directly.
- Packages tied to React. They do not work in MotifJS; look for a headless alternative.
- Things MotifJS already does (list rendering, conditional rendering, virtualisation).

## The four rules {#four-rules}

### 1. Set up inside `onMounted` {#setup-in-on-mounted}

`onBuilt` may fire while the element is still inside a detached fragment (ternary and list branches are built in a detached fragment). Libraries that take measurements or want a live DOM produce wrong results there. `onMounted` runs **once**, when the element is attached to `document`.

```tsx file=src/LibHost.tsx variant=class
import { Component } from '@motifx/core';
import { SomeLib } from 'some-lib';

export class LibHost extends Component<HTMLDivElement> {
  private lib: SomeLib | null = null;

  override onMounted() {
    this.lib = new SomeLib(this.element, { /* ... */ });
  }
}
```
```tsx file=src/LibHost.tsx variant=function
import { SomeLib } from 'some-lib';

export function LibHost() {
  return <div onmounted={(s) => {
    const lib = new SomeLib(s.element, { /* ... */ });
    s.motif.setDisposable(() => lib.destroy());
  }} />;
}
```
```tsx file=src/LibHost.tsx variant=options
import { SomeLib } from 'some-lib';

export const LibHost = () => ({
  el: 'div',
  lib: null as SomeLib | null,
  onMounted() {
    this.lib = new SomeLib(this.element, { /* ... */ });
  },
});
```

The examples in the rest of the section are in the class form; in the function and Options forms the same hooks are written as a prop on the root tag (`onmounted`) or as an object method (`onMounted`), and `element`, `motif` and `bindings` are used the same way through `this`/`s`.

### 2. Clean up with `motif.setDisposable` {#cleanup-set-disposable}

The library's `destroy()`/`disconnect()` call is tied to the component's lifetime. When the component goes the library goes; you call nothing extra.

```tsx
override onMounted() {
  const lib = new SomeLib(this.element);
  this.lib = lib;
  this.motif.setDisposable(() => {
    this.lib = null;
    lib.destroy();
  });
}
```

Side resources such as timers, `ResizeObserver` and `WebSocket` are registered in the same place. For details see [Memory Management and Dispose](./memory-and-dispose.md).

### 3. Reads are tracked, writes happen inside `untracked` {#tracked-read-untracked-write}

There are two traps when passing reactive data to a library:

- If you give the data to the library directly, the library **reads** that object during its own update. If that read happens in a tracked region, the effect triggers itself and a loop forms.
- If you put the read entirely inside `untracked`, the inner fields are never tracked and there is no update when the data changes.

The right form: take **a plain copy** in the tracked region, and do the write to the library inside `untracked`.

```tsx
import { untracked } from '@motifx/core';

override onMounted() {
  // ... setup
  this.bindings.watch(() => {
    // Tracked region: every read becomes a dependency.
    const snapshot = store.points.map((p) => ({ ...p }));

    // Untracked region: the library's reads do not leak into the effect.
    untracked(() => this.lib?.setData(snapshot));
  });
}
```

The copy catches deep changes too: when `store.points[3].value = 7` is written, the effect runs again because `map` read that field.

### 4. Setup errors are reported {#setup-errors}

An exception thrown from inside `onMounted` (or the rejected promise of an `async` `onMounted`) is not swallowed: MotifJS reports it to `errorHandler` as a `MotifError` with code `MJX122` (`The component onMounted hook threw.`), with the original error in the `cause` field. The report is written to the console in production too (`app.useLogging(false)` turns it off) and reaches `errorHandler.addListener(fn)` listeners. The wrapper does not have to write `console.error` as well.

Leaving the component in a consistent state on a setup error (tearing down a half-built instance, showing fallback content) is the wrapper's job; for that catch the error, handle it and rethrow — the report is still produced:

```tsx
override onMounted() {
  try {
    this.lib = new SomeLib(this.element);
  } catch (error) {
    this.lib = null;
    this.element.textContent = 'Could not load';
    throw error;
  }
}
```

## DOM ownership conflicts {#dom-ownership}

The hardest case is when the library **moves** the nodes MotifJS drew. Drag-and-drop libraries do exactly this: at drop time they reorder the DOM themselves. But the owner of those nodes is the list binding; if two owners clash, the binding can never compute correctly again.

The solution template:

1. **Undo** the library's DOM change.
2. Apply the same change to the **model**.
3. Let MotifJS redraw the DOM.

Since the effect queue drains in a microtask, the undo and the redraw complete in the same frame; there is no flicker on screen.

Below is the plainest single-list form with SortableJS:

```tsx
import { Component, read, type Bind } from '@motifx/core';
import Sortable from 'sortablejs';

interface SortableListProps<T> {
  list: Bind<T[]>;
}

export class SortableList<T> extends Component<HTMLDivElement, SortableListProps<T>> {
  override onMounted() {
    const sortable = Sortable.create(this.element, {
      animation: 150,
      onEnd: (evt) => this.handleEnd(evt),
    });
    this.motif.setDisposable(() => sortable.destroy());
  }

  private handleEnd(evt: Sortable.SortableEvent) {
    const { item, from, oldIndex, newIndex } = evt;
    if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;

    // 1. Undo SortableJS's move
    item.remove();
    const last = from.lastElementChild;
    const ref = from.children[oldIndex] ?? (last ? last.nextSibling : from.lastChild);
    from.insertBefore(item, ref);

    // 2. Apply the same move to the model
    const list = read(this.props.list);
    const [moved] = list.splice(oldIndex, 1);
    list.splice(newIndex, 0, moved);

    // 3. The list binding reorders the DOM; nothing else to do here
  }
}
```

Usage: the `list` prop receives the reactive array **itself** that is `.map`-ed in JSX, and every item carries a `key`.

```tsx
import { reactive } from '@motifx/core';

const state = reactive({
  tasks: [
    { id: 1, text: 'Design' },
    { id: 2, text: 'Coding' },
    { id: 3, text: 'Testing' },
  ],
});

<SortableList list={state.tasks}>
  {state.tasks.map((t) => <div key={t.id}>{t.text}</div>)}
</SortableList>
```

The `ref` computation in the undo is deliberately not `from.children[oldIndex] ?? null`. MotifJS draws the list inside a fragment; the container's last child is usually a comment node that is the list's **closing marker**. If the item was dragged from the end, `insertBefore(item, null)` puts it outside that marker, i.e. outside the list, and the list binding cannot find the item on the next update. The last element's `nextSibling`, on the other hand, gives the position in front of the marker; the item stays inside the list.

This plain form is for a single list. For moves between lists, cloning and sorting filtered with the `draggable` selector, `@motifjs-community/sortablejs` is the full implementation of this template.

If the library manages the inside of its own container entirely (chart, editor) there is no conflict: JSX only provides an empty container, and MotifJS draws nothing inside it.

## The root element {#root-element}

Most libraries want a real element (`canvas`, `div`). The component's root element is decided by the class itself, not by `view()`. There are two ways:

**With the generic.** When you write `Component<HTMLCanvasElement>`, `@motifx/compiler` derives the element type from the generic and the root is created as `<canvas>` by itself:

```tsx
import { Component } from '@motifx/core';
import { Chart } from 'chart.js';

export class ChartHost extends Component<HTMLCanvasElement> {
  override onMounted() {
    const chart = new Chart(this.element, { /* ... */ });
    this.motif.setDisposable(() => chart.destroy());
  }
}
```

**With `super`.** You give the tag name as a string, or a ready element, as the first parameter of the `super` call in the constructor:

```ts
export class ChartHost extends Component<HTMLCanvasElement> {
  constructor(props?: ChartHostProps) {
    super('canvas', props);
  }
}
```

```ts
export class ChartHost extends Component<HTMLCanvasElement> {
  constructor(props?: ChartHostProps) {
    super(document.createElement('canvas'), props);
  }
}
```

Since the `super` form does not depend on the generic, it also works in a package not compiled with `@motifx/compiler`. If both are given, the value given to `super` applies.

If neither is given the root is a **fragment** (a comment node), and the content `view()` returns or the JSX children settle in that fragment's place. Since a fragment is not a real element, `this.element` cannot be given to a library as a container; always declare the root element in a wrapper.

In a component with a declared root element, if no `view()` is written the JSX children are added inside that element; that is why the `<SortableList>{items.map(...)}</SortableList>` form works.

## Care with prop names {#prop-names}

The `options` prop belongs to the framework: it is the component's **own** settings object, read in the constructor, and the recognised keys are copied into `motif.options` — `hideStrategy`, `disableDisposal` (see [Hide strategy](./lifecycle.md#hide-strategy)) and `isSvg`, which creates the root element in the SVG namespace. Do not pass library options through this prop; pick an explicit name such as `chartOptions` or `sortableOptions`.

```tsx
<ChartHost data={salesData} chartOptions={{ responsive: true, animation: false }} />
```

```ts
override onMounted() {
  const { data, chartOptions } = this.props;
  const chart = new Chart(this.element, { type: 'line', data, options: chartOptions });
  this.motif.setDisposable(() => chart.destroy());
}
```

Props starting with `on` stay in `this.props` and can be used as callbacks; those carrying a DOM event name are the exception. A prop such as `onChange`, `onCopy`, `onResize`, `onSelect`, `onReset` or `onContextMenu` is attached to the root element as a DOM listener on a component tag and never reaches `this.props`; the compiler gives the `MJX002` warning for the camelCase spelling. Make the field name distinctive (`onChartUpdate`, `onCodeCopy`).

## The single-copy rule {#single-copy}

If the wrapper is a separate package, the wrapped library and `@motifx/core` must be **single copies** in the application. With two copies:

- The library's global registry (for example `Chart.registry`) splits in two; your registration does not reach the copy the package sees.
- Two separate reactivity engines form; `untracked` does not recognise the other side's effect.

Both failures are **silent**. In Vite the fix is one line:

```ts
resolve: { dedupe: ['@motifx/core', 'chart.js', 'sortablejs'] }
```

## Prove the cleanup {#prove-cleanup}

A wrapper's correctness is not measured by "it seems to work". Write a round-trip test that builds and tears the component down many times: at the end of the round the live component count and the live external instance count must return to where they started. For the measurement hooks see the `disposableTracker` section in [Memory Management and Dispose](./memory-and-dispose.md).

## Next step {#next}

For implemented examples look at the `@motifjs-community/chartjs` and `@motifjs-community/sortablejs` community packages. To publish the wrapper or a component set on npm, see [Publishing an npm Library for MotifJS](./publishing-libraries.md).
