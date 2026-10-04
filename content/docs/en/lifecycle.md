---
slug: lifecycle
title: Lifecycle
description: Hook order, hooks as class methods and JSX props, initializeComponent, visibility, waiting, disposal and the application lifecycle.
category: core
order: 7
---

Every MotifJS component goes through a defined lifecycle from creation to attaching to the DOM and disposal. The hooks that run at these stages can be defined both as **class methods** and as **JSX props**.

## Hooks and their order {#hooks}

| Order | Hook | When it runs |
|-------|------|--------------|
| 1 | `onInitializing` | In the constructor, after the element is assigned and props are processed (`this.props` is ready; the subclass's fields such as `state = reactive(...)` are not initialised yet). |
| 2 | `onInitialized` | In the constructor, right after `onInitializing`. |
| 3 | `onConfig` | The configuration stage; **props ready, not attached to the DOM yet**. Ideal for fetching data. In subclasses it runs at the start of `build()` (after the class fields are initialised). |
| 4 | `onConfigured` | When configuration completes (start of build). |
| 5 | `onBuilding` | As the DOM construction starts. |
| 6 | `initializeComponent` | Right before `view()` is called; the component's setup code (the compiler generates it from JSX). |
| 7 | `oninitializeComponent` | Right after all `initializeComponent` code (class method, value on the tag, compiler-generated) has run, before `view()`. |
| 8 | `onBuilt` | After the component and its children are built. The element may still be inside a **detached** fragment at this moment (ternary/list branches). |
| 9 | `onMounted` | When the element is attached to the live DOM (`document`), **once**. The right place for `focus()`, measurements, third-party widgets. |
| — | `onActivated` / `onDeactivated` | When the component is taken out of the DOM (without being disposed) and placed again: a `keepAlive` route return, `controls.add` after `controls.detach`/`silentDetach` (moving included), `motif.hide()`/`motif.show()` (`x-wait`/`x-display` included), a `Virtualization` row leaving and re-entering the window. `onDeactivated` on leaving, `onActivated` on coming back. Does not run on the first show. Propagated to the visible subtree as well (parent first); a hidden child is not activated with its parent, it is activated on its own `motif.show()`. |
| — | `onVisibilityChanged` | While `motif.show()`/`motif.hide()`/`motif.toggle()` (`x-wait`/`x-display` included) change visibility; runs before `isVisible` is updated (on hide, after the leave animation ends), so `isVisible` shows the previous value inside the hook. |
| — | `onDisposing` | As disposal starts. |
| — | `onDisposed` | When disposal completes. |

> `onInitializing` and `onInitialized` run while the component is **being created** (in the constructor flow). `onConfig` runs in the constructor on plain `new Component(tag, { onconfig })` instances; in **subclasses** (`class X extends Component`) it runs after class fields such as `state = reactive(...)` are initialised, at the start of `build()` right before `onConfigured` (a subclass instance that is never built does not receive `onConfig`). `onConfigured`, `onBuilding`, `initializeComponent`, `oninitializeComponent` and `onBuilt` run during `build()`; `onMounted` runs when the element is attached to `document` (at once if already attached). `isInitialized` is `false` during `onInitializing` and `true` from `onInitialized` on (it is set when the initialisation in the constructor finishes).

State flags: `isInitialized`, `isConfigured`, `isBuilt`, `isVisible`, `isWait`, `isDisposed` are updated as the matching stage passes and are read on the component.

`onInitializing`, `onInitialized` and `onConfig` written on an Options API object do not run (those stages finish before the fields are copied from the object); use `ctor` or `onConfigured` for setup (see [Options API](./components.md#options-components)).

## Defining as class methods {#class-hooks}

```tsx file=src/TodoList.tsx variant=class
import { Component, ComponentBase, EventArgs, reactive } from "@motifx/core";

export default class TodoList extends Component {
  state = reactive({ todos: [] as any[] });

  constructor() { super('div'); }

  // The best hook for fetching data: props ready, before attaching to the DOM
  public async onConfig(sender: ComponentBase, e: EventArgs) {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos');
    this.state.todos = (await res.json()).slice(0, 200);
  }

  public onBuilt(sender: ComponentBase, e: EventArgs) {
    console.log("built (may not be in document yet)", this.element);
  }

  public onMounted(sender: ComponentBase, e: EventArgs) {
    console.log("attached to the live DOM", document.contains(this.element)); // true
  }

  view() {
    return <ul>{this.state.todos.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
  }
}
```
```tsx file=src/TodoList.tsx variant=function
import { reactive } from "@motifx/core";

export default function TodoList() {
  const state = reactive({ todos: [] as any[] });

  return (
    <div
      onconfig={async () => {
        const res = await fetch('https://jsonplaceholder.typicode.com/todos');
        state.todos = (await res.json()).slice(0, 200);
      }}
      onbuilt={(s) => console.log("built (may not be in document yet)", s.element)}
      onmounted={(s) => console.log("attached to the live DOM", document.contains(s.element))}
    >
      <ul>{state.todos.map(t => <li key={t.id}>{t.title}</li>)}</ul>
    </div>
  );
}
```
```tsx file=src/TodoList.tsx variant=options
import { reactive } from "@motifx/core";

export const TodoList = () => ({
  el: 'div',
  data: reactive({ todos: [] as any[] }),

  // onConfig does not run in the Options API; the earliest hook is onConfigured
  async onConfigured() {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos');
    this.data.todos = (await res.json()).slice(0, 200);
  },

  onBuilt() {
    console.log("built (may not be in document yet)", this.element);
  },

  onMounted() {
    console.log("attached to the live DOM", document.contains(this.element)); // true
  },

  view() {
    return <ul>{this.data.todos.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
  },
});
```

Every hook is called with the `(sender, e)` signature:
- `sender` — the component itself.
- `e` — `EventArgs` (`{ cancel: boolean }`).

An error thrown in a hook, or the rejection of the Promise a hook returns (`async` hooks included), is reported as `MotifError` `MJX122`: it is written to `console.error` (unless `app.useLogging(false)`) and passed to `errorHandler.addListener(fn)` listeners; development mode is not required, it works in production too. The component keeps being set up. This rule also applies to `initializeComponent`, `oninitializeComponent`, the Options API object's `ctor`, the `ref` callback (on a plain tag and on a class component tag; the component is still created) and lifecycle listeners added in code as `this.motif.on('x:built', fn)` (`x:mounted` included).

## Defining as JSX props {#prop-hooks}

In function components and inline elements attach the hooks as props:

```tsx
<div
  onconfig={(s) => console.log("configuring")}
  onbuilt={(s) => console.log("built")}
  ondisposing={(s) => console.log("cleaning up")}
>
  Content
</div>
```

The `x-` and `x:` forms are accepted too:

```tsx
<div x-config={(s) => ...} x:built={(s) => ...}>...</div>
```

> **Important:** lifecycle handlers given as props do **not replace** the class methods; both run (the prop handlers are collected and called in addition to the class method).

Several spellings of one hook on the same tag (`on<hook>`, `x-<hook>`, `x:<hook>`; case differences included, e.g. `onBuilt`) are merged: all run once, in source order. This is the same on a plain DOM tag and on a component tag; on a function component tag the hooks, in a single spelling or merged, are applied to the root the function returns. The `initializing`/`initialized` hooks on a function component tag run as soon as the root is set up, in the same order as on a class component tag: `ref` → `initializing` → `initialized` → `config` → … → `building` → `initializeComponent` → `built`. This rule holds for all of the `built`, `building`, `mounted`, `config`, `configured`, `initializing`, `initialized`, `disposing`, `disposed`, `visibilitychanged`, `activated`, `deactivated` hooks:

```tsx
<div onbuilt={() => log('first')} x-built={() => log('second')} />
```

## `initializeComponent` — the component's setup code {#initialize-component}

`initializeComponent` runs once per component, right before `view()`. The compiler emits the setup code it generates from JSX (attributes written on the tag, events, directives, placement of children) under this name; in a component using JSX you do not have to write it. Without JSX, while setting up the component by hand, it is used optionally; it is a good place to add bindings or prepare children programmatically:

```tsx file=src/Panel.tsx variant=class
import { Component, ComponentBase } from "@motifx/core";

export class Panel extends Component<HTMLDivElement> {
  initializeComponent(sender: ComponentBase) {
    sender.bindings.watch(() => console.log("state changed"));
  }
}
```
```tsx file=src/Panel.tsx variant=function
export function Panel() {
  return <div initializeComponent={(s) => s.bindings.watch(() => console.log("state changed"))} />;
}
```
```tsx file=src/Panel.tsx variant=options
export const Panel = () => ({
  el: 'div',
  initializeComponent() {
    this.bindings.watch(() => console.log("state changed"));
  },
});
```

As a prop on a component set up by hand without JSX:

```ts
const list = new Component("ul", {
  initializeComponent: (s: ComponentBase) => s.bindings.list(() => state.items, renderItem),
});
```

`initializeComponent` can also be written as a prop on a tag; the tag's component is given as `sender` and it is called once during setup. Its meaning and timing are the same on a plain DOM tag, on a class component tag and on a function component tag (on the root the function returns):

```tsx
<ul initializeComponent={(s) => s.bindings.watch(() => console.log(state.items.length))}>...</ul>
<Panel initializeComponent={(s) => console.log("panel being set up", s)} />
```

The compiler passes `initializeComponent` on component tags inside `runover`. Both the one the user gives and the one the compiler generates run; order: the component's `initializeComponent` method, the one given on the tag, the compiler-generated one.

### `oninitializeComponent` — right after the setup code {#on-initialize-component}

In a component using JSX, the `initializeComponent` stage is filled by the compiler's setup code. `oninitializeComponent` is the hook that runs in the same stage right after that code has finished. Attributes, events, bindings and children are defined at this moment; `view()` has not been called yet. This is the place for code that wants to add its own setup on top of the compiler-generated one.

The order inside `build()`:

1. The class's `initializeComponent` method.
2. The `initializeComponent` values from the tag or the compiler.
3. The class's `oninitializeComponent` method.
4. The `oninitializeComponent` values from the tag.
5. `view()`.

As a class method:

```tsx file=src/Card.tsx
import { Component, ComponentBase, EventArgs } from "@motifx/core";

export class Card extends Component {
  oninitializeComponent(sender: ComponentBase, e: EventArgs) {
    sender.bindings.watch(() => console.log("setup completed", sender.controls.items.length));
  }
}
```

As a prop on a tag (plain DOM tag, class component tag and function component tag; on a function component it is applied to the root the function returns):

```tsx
<ul oninitializeComponent={(s) => console.log("children ready", s.controls.items.length)}>
  <li>One</li>
</ul>
<Card oninitializeComponent={(s) => console.log("card set up", s)} />
```

On a plain tag, when this hook runs the tag's JSX children have been added to `controls`; the example above prints `1`.

## Visibility — `motif.show` / `motif.hide` / `motif.toggle` {#visibility}

You can hide and show a component without disposing it:

```ts
await this.motif.hide();     // hide (the leave animation plays if there is one)
await this.motif.show();     // show (the enter animation if there is one)
this.motif.toggle();         // flip
this.isVisible;              // the current visibility
```

When visibility changes `onVisibilityChanged` runs; the hook is called before `isVisible` is updated. The bindings in a hidden component's subtree are suspended (`onDeactivated`) and re-activated when shown (`onActivated`). On a fragment-rooted component hide/show is applied to the children one by one.

### Hide strategy — `hideStrategy` {#hide-strategy}

`hideStrategy` decides how a hidden component is handled in the DOM:

| Value | Behaviour |
|-------|-----------|
| `'placeholder'` | The element leaves the DOM and a comment placeholder is put in its place; when showing, it swaps back with the placeholder. |
| `'detach'` | Removed from the DOM without a trace; when shown it is reinserted according to its order among the parent's children. |
| `'auto'` (default) | `detach` in a list context (a `.map` row, an item with `key`), `placeholder` otherwise. |

The strategy is given in JSX with the `options` prop; programmatically it is written to the `motif.options.hideStrategy` field:

```tsx
<div options={{ hideStrategy: 'detach' }} x-display={() => state.open}>Heavy panel</div>
```

```ts
this.motif.options.hideStrategy = 'detach';
```

The `options` prop is the component's own settings object; the keys the framework recognises are read: `hideStrategy` and `disableDisposal` are copied into `motif.options`, `isSvg` decides the root element's namespace (see [Root element](./components.md#root-element)); other keys are ignored. Do not use this name as a data prop. `options` written on a function component tag is applied to the returned root.

## Waiting — `isWait` / `x-wait` {#wait}

The `x-wait` directive ties a component's addition to the DOM to a condition; the programmatic counterpart is the `isWait` property (`isWait` is not a JSX prop). While the condition is `true` the component is held (hidden/not added); when it becomes `false` it is added. This is the primary method of conditional rendering — see [Conditional Rendering and Lists](./conditionals-and-lists.md):

```tsx
<Virtualization
  x-wait={() => state.items.length === 0}
  /* ... */
/>
```

Programmatic:

```ts
this.isWait = true;   // hold
this.isWait = false;  // continue (added to the DOM if needed)
```

Two points that matter for the lifecycle:

- If the condition is `true` **initially**, `build()` does not run until the condition becomes `false`. `onconfig`/`onconfigured`
  run; the `onbuilding`/`onbuilt`/`onmounted` hooks are not triggered until then, the component's subtree
  is not built and does not enter the DOM.
- Going back to the waiting state **does not dispose**. `ondisposing`/`ondisposed` do not run, the internal state
  is kept; the component is hidden and receives `ondeactivated`. If you really want disposal use `{cond && <X/>}` or call `dispose()`.

## Disposal (dispose) {#dispose}

A component that is no longer needed is disposed. This removes event listeners, deactivates bindings, disposes the children recursively and takes the component out of the DOM:

```ts
await this.dispose();                               // default: { deep: true } + leave animation
await this.dispose({ skipLeaveTransition: true });  // without animation
await this.dispose({ deep: false });                // skip reference cleanup in the children
await this.disposeAsync();                          // child disposal: no leave transition, running animations are stopped
```

`deep` (default `true`) also does reference cleanup (`element`, `props`, `childs`, event maps) in child components; the root component is always cleaned. `disposeAsync` is the path the framework uses for the children while a parent is disposed; called from outside, the component goes without waiting for a leave transition. While a disposal is in progress, a second `dispose`/`disposeAsync` call does not start a new one; it returns the same Promise.

`controls.remove(child)` or `controls.clear()` dispose the children in question too. For disposal details and memory management see [Memory Management and Dispose](./memory-and-dispose.md).

## A full example: a data lifecycle {#full-example}

```tsx file=src/UserProfile.tsx variant=class
import { Component, reactive } from "@motifx/core";

export class UserProfile extends Component<HTMLDivElement, { id: number }> {
  state = reactive({ user: null as any, loading: true });

  constructor(props: { id: number }) { super('div', props); }

  async onConfig() {
    this.state.loading = true;
    this.state.user = await fetchUser(this.props.id);
    this.state.loading = false;
  }

  onDisposing() {
    // manual cleanup if needed (subscriptions, timers)
  }

  view() {
    return <div>
      {() => this.state.loading
        ? <Spinner />
        : <div>{this.state.user.name}</div>}
    </div>;
  }
}
```
```tsx file=src/UserProfile.tsx variant=function
import { reactive } from "@motifx/core";

export function UserProfile(props: { id: number }) {
  const state = reactive({ user: null as any, loading: true });

  return (
    <div
      onconfig={async () => {
        state.loading = true;
        state.user = await fetchUser(props.id);
        state.loading = false;
      }}
      ondisposing={() => { /* manual cleanup if needed */ }}
    >
      {() => state.loading
        ? <Spinner />
        : <div>{state.user.name}</div>}
    </div>
  );
}
```
```tsx file=src/UserProfile.tsx variant=options
import { reactive } from "@motifx/core";

export const UserProfile = () => ({
  el: 'div',
  data: reactive({ user: null as any, loading: true }),

  async onConfigured() {
    this.data.loading = true;
    this.data.user = await fetchUser(this.props.id);
    this.data.loading = false;
  },

  onDisposing() {
    // manual cleanup if needed (subscriptions, timers)
  },

  view() {
    return <div>
      {() => this.data.loading
        ? <Spinner />
        : <div>{this.data.user.name}</div>}
    </div>;
  },
});
```

## Application lifecycle — `app.onLifecycle` {#app-lifecycle}

Apart from component hooks, there is a lifecycle for the application as a whole: the tab goes to the background, the mobile operating system freezes the page, the connection drops. To pause and resume polling, websockets and timers, and to refresh stale data on return:

```tsx
const off = app.onLifecycle(({ state, visible, online }) => {
  switch (state) {
    case 'hidden':   poller.pause(); break;          // tab/application in the background
    case 'visible':  poller.resume(); break;
    case 'frozen':   socket.close(); break;          // the browser froze the page
    case 'resumed':  socket.open(); break;
    case 'restored': store.refresh(); break;         // returned from the back/forward cache (bfcache)
    case 'offline':  banner.show(); break;
    case 'online':   banner.hide(); queue.flush(); break;
  }
});
off(); // unsubscribe
```

`app.isVisible` and `app.isOnline` give the current state. The browser listeners are set up only on the first subscription (zero cost when unused) and removed with `app.dispose()`. The subscription is not tied to a component's lifetime; if you open it from inside a component, register `off` with `this.motif.setDisposable(off)`.

## Next step {#next}

Continue with [Routing](./routing.md) to learn navigation between pages.
