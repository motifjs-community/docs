---
slug: index
title: MotifJS Documentation
description: What MotifJS does, the index of sections, and a quick look through a counter component.
category: start
order: 0
---

MotifJS is a UI framework for JavaScript and TypeScript that brings speed, reactivity and architecture under one roof, built for modern web applications. JSX is compiled at build time straight into DOM bindings. There is no virtual DOM and no diffing; components bind **directly to the real DOM**, and updates are applied only where something changed, through fine-grained reactivity.

## What does MotifJS do differently? {#what-is-different}

- **There is no render loop.** `this.controls.add(<div/>)` puts the element into the DOM at once. No re-render, no diffing, no invisible layers.
- **Fine-grained reactivity.** When a state field changes, only the DOM node or attribute bound to that field is updated, not the whole component.
- **Real element access.** Every component's `element` reference is available even before mount.
- **Integrated infrastructure.** Router, dependency injection, lifecycle, animation and memory management ship with the core.
- **JavaScript, TypeScript and JSX/TSX are supported.** Components can be written in the class, function or Options API style.

> MotifJS is designed for long-lived, state-heavy interfaces. SSR (server-side rendering) is deliberately out of scope.

## Contents {#contents}

| Category | Section | Topic |
|----------|---------|-------|
| Start | [Getting Started](./getting-started.md) | Installation, build setup, the first component and application |
| Core | [Components](./components.md) | Class / function / Options API components, root element, `props`, `childs`, `controls`, `ref` |
| Core | [JSX and Templates](./jsx.md) | JSX rules, class/style/attributes, spread, `x-` directives, fragments, compile-time diagnostics, `explain` |
| Core | [Reactivity](./reactivity.md) | `reactive`, `createSignal`, `createComputed`, `createLazyComputed`, `effect`, `untracked` |
| Core | [Conditional Rendering and Lists](./conditionals-and-lists.md) | `x-wait`, `&&`, the ternary operator, `.map`, `switch`, the binding API |
| Core | [Events](./events.md) | DOM events, modifiers, component and application events |
| Core | [Forms and Two-Way Binding](./forms.md) | `bindings.model`, `x-model`, `checked`, `value` |
| Core | [Lifecycle](./lifecycle.md) | Lifecycle hooks and their order, visibility, disposal, application lifecycle |
| App | [Routing](./routing.md) | Route definition, `RouterView`, `RouterLink`, navigation, guards, stack navigation |
| App | [Dependency Injection](./dependency-injection.md) | Service registration, `@Injectable`, `inject`, service disposal |
| App | [Styling and Transitions](./styling-and-transitions.md) | `class`/`style` helpers, the transition system |
| App | [Memory Management and Dispose](./memory-and-dispose.md) | `IDisposable`, automatic cleanup, leak monitoring |
| App | [Error Handling](./error-handling.md) | Throw/report/warn paths, `MotifError`, `errorHandler`, `safeCall*`, `Emitter` |
| App | [Resilience](./resilience.md) | `retry`, `timeout`, `circuitBreaker`, `bulkhead`, `rateLimiter`, `fallback` |
| Advanced Components | [Frame](./frame.md) | A container that holds one changing content; timing and transitions |
| Advanced Components | [Lazy](./lazy.md) | Content loaded through dynamic `import()`; loading flow, retry |
| Advanced Components | [Transport and TransportTo](./transport.md) | Showing content in a slot elsewhere; `Transporter` |
| Advanced Components | [ContentBody and ContentBlock](./content-body.md) | A body filled by several blocks together |
| Advanced Components | [Virtualization](./virtualization.md) | Virtual scrolling for large data |
| Guides | [Wrapping Third-Party Libraries](./wrapping-libraries.md) | Turning libraries that manage their own DOM into components |
| Guides | [Publishing an npm Library for MotifJS](./publishing-libraries.md) | Preparing a component/service package: build, types, CSS, prop contract, release checklist |
| Reference | [API Reference](./api-reference.md) | Summary of every exported symbol, MJX codes |
| Reference | [Collection Queries (Query)](./query.md) | LINQ-style filtering, sorting and grouping with `Query.from(...)` |
| Reference | [Collections](./collections.md) | `List`, `Dictionary`, `NameValuePair`, `LinkedList` |

## Quick look {#quick-look}

```tsx file=src/Counter.tsx variant=class
import { Component, reactive } from "@motifx/core";

export class Counter extends Component<HTMLDivElement> {
  state = reactive({ count: 0 });

  view() {
    return (
      <div class="counter">
        <p>Count: {this.state.count}</p>
        <button onclick={() => this.state.count++}>Increment</button>
      </div>
    );
  }
}
```
```tsx file=src/Counter.tsx variant=function
import { reactive } from "@motifx/core";

export function Counter() {
  const state = reactive({ count: 0 });

  return (
    <div class="counter">
      <p>Count: {state.count}</p>
      <button onclick={() => state.count++}>Increment</button>
    </div>
  );
}
```
```tsx file=src/Counter.tsx variant=options
import { reactive } from "@motifx/core";

export const Counter = () => ({
  el: 'div',
  data: reactive({ count: 0 }),

  view() {
    return (
      <div class="counter">
        <p>Count: {this.data.count}</p>
        <button onclick={() => this.data.count++}>Increment</button>
      </div>
    );
  },
});
```

```tsx file=src/main.tsx variant=class
import { Application } from "@motifx/core";
import { Counter } from "./Counter";

const app = Application.CreateBuilder().build();
app.run("#app", new Counter());
```
```tsx file=src/main.tsx variant=function
import { Application } from "@motifx/core";
import { Counter } from "./Counter";

const app = Application.CreateBuilder().build();
app.run("#app", <Counter />);
```
```tsx file=src/main.tsx variant=options
import { Application } from "@motifx/core";
import { Counter } from "./Counter";

const app = Application.CreateBuilder().build();
app.run("#app", <Counter />);
```

In the example above, `{this.state.count}` is a reactive text binding: when `count` changes only that text node is updated; the `<div>` is not recreated.

Continue with [Getting Started](./getting-started.md).
