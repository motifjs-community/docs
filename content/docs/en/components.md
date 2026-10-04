---
slug: components
title: Components
description: Class, function and Options API components; root element, props, childs, controls, content transport and ref.
category: core
order: 1
---

In MotifJS a component is an object that manages a DOM element and its child controls (`controls`). Every component derives from `ComponentBase`; in day-to-day use you work with the concrete `Component` class or with JSX.

There are **three styles** of writing a component: class, function and Options API. All three compile to the same core; which one you pick is a matter of preference.

## 1. Class components {#class-components}

The most explicit and most capable style. Derive from `Component` and return the template from `view()`.

```tsx file=src/Counter.tsx
import { Component, reactive } from '@motifx/core';

export default class Counter extends Component {
  state = reactive({ count: 0 });

  constructor() {
    super('div');           // root element tag
  }

  increment = () => this.state.count++;

  view() {
    return (
      <div class="counter">
        <span>Value: {this.state.count}</span>
        <button onclick={this.increment}>Increment</button>
      </div>
    );
  }
}
```

### Root element {#root-element}

The value you pass to `super(...)` decides the component's **root element**:

- `super('div')` → creates a `<div>` root. For an SVG element write `super('svg', { options: { isSvg: true } })`; the element is created in the SVG namespace.
- `super(node)` → a DOM node you already have (`document.createElement('canvas')`, an element already on the page) becomes the root; the component does not create it, it adopts it (see [Wrapping third-party libraries](./wrapping-libraries.md)).
- With no argument (`super()`) the root is a **fragment** (a comment node); the content returned by `view()` is placed under that fragment. On a fragment root `props` can also be given as the first argument: `super(props)` and `super(undefined, props)` are the same.
- If you gave an element generic such as `Component<HTMLDivElement>`, `@motifx/compiler` adds `static elementTag = 'div'` to the class; `super()` then creates a real element of that type instead of a fragment (see [Root element](./wrapping-libraries.md#root-element)). For SVG generics such as `Component<SVGSVGElement>` the compiler also adds `static elementNamespace = 'http://www.w3.org/2000/svg'`; the element is created in the SVG namespace. Both static fields can be written by hand; the compiler leaves them alone when present.

If a ready component instance is passed to the constructor (`new Component(instance)`), no new component is created; that instance is returned.

If `view()` returns a wrapper such as `<div class="counter">...</div>`, the root element is usually irrelevant; `super()` (a fragment) is enough. Give a concrete tag (`super('div')`) when you want to bind attributes/events to the root itself.

### `view()`, or `controls` directly? {#view-or-controls}

There are two ways:

- **Return from `view()`:** declarative. `view()` is called once while the component is built and its result is added as child controls. The most common approach.
- **Call `controls.add(...)`:** imperative. Adds elements to the DOM at any time. Since there is no render loop, the addition happens at once.

```tsx file=src/Live.tsx variant=class
import { Component } from '@motifx/core';

export class Live extends Component<HTMLDivElement> {
  onBuilt() {
    // Add to the DOM whenever you like — no re-render
    this.controls.add(<div>Added later</div>);
  }
}
```
```tsx file=src/Live.tsx variant=function
export function Live() {
  return <div onbuilt={(component) => {
    component.controls.add(<div>Added later</div>);
  }} />;
}
```
```tsx file=src/Live.tsx variant=options
export const Live = () => ({
  el: 'div',

  onBuilt() {
    this.controls.add(<div>Added later</div>);
  },
});
```

## 2. Function components {#function-components}

A function returns JSX. State and event handlers live in the closure.

```tsx file=src/Greeting.tsx
import { reactive } from '@motifx/core';

export default function Greeting(props: { name: string }) {
  const state = reactive({ likes: 0 });

  return (
    <div class="greeting">
      <h2>Hello {props.name}</h2>
      <button onclick={() => state.likes++}>
        Like ({state.likes})
      </button>
    </div>
  );
}
```

Function components are used in JSX exactly like classes:

```tsx
<Greeting name="Ada" />
```

### Hooking into the lifecycle {#function-lifecycle}

In function components you attach lifecycle hooks as **props** on the returned root element (see [Lifecycle](./lifecycle.md)):

```tsx file=src/Panel.tsx
export default function Panel() {
  return (
    <div
      onconfig={(s) => console.log('configuring')}
      onbuilt={(s) => console.log('built')}
    >
      Content
    </div>
  );
}
```

### Directives and hooks written on the tag {#function-tag-directives}

Framework props written on a function component's **tag** — directives such as `x-display` and `x-wait`,
lifecycle hooks such as `onconfig`/`onbuilt`/`x-mounted`/`x-initializing` (in every spelling),
`initializeComponent` and `ref` — are applied to the root the function returns (`ref` is not part of the `props` the function receives):

```tsx
<InfoBar x-display={() => this.state.status === 'error'} title="Server error" />
```

The function does not have to do anything for this: neither declare `runover` in its prop type nor
forward props to its root. (If the function already forwards props to its root — `motifComponent('div', props)`
— the framework props are not applied a second time.) In class components the same props go to the constructor.

## 3. Options API components {#options-components}

You return an object reminiscent of Vue's Options API: `el`, `data`, `view` and an optional `ctor`. The object can be used in JSX like a component.

```tsx file=src/MessageBox.tsx
import { reactive } from '@motifx/core';

export const MessageBox = () => ({
  el: 'div',
  data: reactive({ message: 'Hello' }),
  view() {
    return (
      <div class="msg" onclick={() => { this.data.message = 'Clicked!'; }}>
        {this.data.message}
      </div>
    );
  },
  ctor(props) {
    if (props?.greeting) this.data.message = props.greeting;
  },
});
```

```tsx
<MessageBox greeting="Hi" />
```

Every field of the object except `el` is copied onto the component; `ctor` is not copied but called **once** right after the component is created (before `build()`/`view()`): `this` is the component, its single argument is the `props` written on the tag. An error thrown inside it does not break component creation; it is reported to the central error handler as `MJX122`. The `props` written on the tag are also reachable as `this.props`. `el` can be a tag name (`'div'`), a DOM node or another component (class, function, Options object); if a component is given, its root is used.

`get` accessors on the object are evaluated once while copying and the result is copied as a plain value; for a derived value write a method (`visible() { … }`). Of the lifecycle methods written on the object, `onConfigured`, `onBuilding`, `initializeComponent`, `onBuilt`, `onMounted`, `onVisibilityChanged`, `onActivated`, `onDeactivated`, `onDisposing` and `onDisposed` run. `onInitializing`, `onInitialized` and `onConfig` do not: those three phases finish while the `el` element is created, before the fields are copied from the object. Put setup code in `ctor` or `onConfigured`; the `onconfig={…}` prop written on the tag reaches the constructor and therefore works.

## `props` and data flow between components {#props}

The attributes you give a component in JSX become `props`:

```tsx
<UserCard userId={42} highlighted />
```

In a class component `props` is reached through `this.props`; the type parameter describes its shape. In a function it is the single argument, in the Options API `this.props`/`ctor(props)`:

```tsx file=src/UserCard.tsx variant=class
import { Component } from '@motifx/core';

interface UserCardProps { userId: number; highlighted?: boolean; }

export class UserCard extends Component<HTMLDivElement, UserCardProps> {
  constructor(props: UserCardProps) {
    super('div', props);
  }
  view() {
    return <div class={this.props.highlighted ? 'card active' : 'card'}>
      User #{this.props.userId}
    </div>;
  }
}
```
```tsx file=src/UserCard.tsx variant=function
interface UserCardProps { userId: number; highlighted?: boolean; }

export function UserCard(props: UserCardProps) {
  return <div class={props.highlighted ? 'card active' : 'card'}>
    User #{props.userId}
  </div>;
}
```
```tsx file=src/UserCard.tsx variant=options
interface UserCardProps { userId: number; highlighted?: boolean; }

export const UserCard = () => ({
  el: 'div',
  view() {
    const props = this.props as UserCardProps;
    return <div class={props.highlighted ? 'card active' : 'card'}>
      User #{props.userId}
    </div>;
  },
});
```

> Note: lifecycle props (`onconfig`, `onbuilt`, `onmounted`… and their `x-` forms) and `initializeComponent` are registered as hooks and removed from the `props` dictionary. `ref` is applied to the component as well and is not in `this.props`. A known DOM event name on a component tag (`onclick`, `onChange`, `oninput:once`) is attached to the root element as a listener and never reaches `props`. Other `on...` props (`onSave`, `onValueChange`) are ordinary callback props and stay in `this.props`.

## Child components (`childs`) {#childs}

The JSX content you write between a component's opening and closing tags reaches that component as `childs`
(`ComponentBase[]`). You place it wherever you like in the template with `{this.childs}` / `{props.childs}` —
the counterpart of React's `props.children` projection:

```tsx file=src/Panel.tsx variant=class
import { Component } from '@motifx/core';

export class Panel extends Component<HTMLDivElement, { heading: string }> {
  view() {
    return <div class="panel">
      <h3>{this.props.heading}</h3>
      <div class="body">{this.childs}</div>
    </div>;
  }
}
```
```tsx file=src/Panel.tsx variant=function
export function Panel(props: { heading: string }) {
  return <div class="panel">
    <h3>{props.heading}</h3>
    <div class="body">{props.childs}</div>
  </div>;
}
```
```tsx file=src/Panel.tsx variant=options
export const Panel = () => ({
  el: 'div',
  view() {
    return <div class="panel">
      <h3>{this.props.heading}</h3>
      <div class="body">{this.childs}</div>
    </div>;
  },
});
```

```tsx
<Panel heading="Settings">
  <p>Content goes here.</p>
</Panel>
```

`childs` is a reserved name for the compiler: `{this.childs}`, `{props.childs}` and `{childs}`
are all compiled as **content placement** (`controls.add`), not as text. The same holds for an
array of components you hold: `{[cardA, cardB]}`.

A few details:

- Placement is **static**: `childs` arrives once during setup. If the content has to change later,
  write `{() => this.childs}`; this produces a `Frame` that refreshes when the content changes.
- When the constructor receives no element (a fragment root, or an element declared through `Component<HTMLDivElement>` / `static elementTag`),
  `childs` is added to the root automatically; if you place it with `{this.childs}` inside `view()`, it moves there. In classes given a concrete
  tag such as `super('div', props)` you do the placement yourself.
- The imperative counterpart: `this.controls.add(...this.childs)`.
- Only the exact name `childs` is special; names such as `this.childsCount` are ordinary text bindings.

## `controls` — the child control collection {#controls}

Every component has a `controls` collection: a live list managing the component's children:

```ts
this.controls.add(child, other);       // append (reflected in the DOM at once); returns the added ones as an array
this.controls.add(2, child);           // insert at the given index
this.controls.insert(2, child, other); // same as add(index, ...)
this.controls.remove(child);           // remove the child and dispose it
await this.controls.detach(child);     // play the leave transition, take it out of the DOM; do NOT dispose
this.controls.clear();                 // dispose all children
await this.controls.clearAsync();      // same; resolves when every disposal has finished
this.controls.move(child, before);     // move the child in front of `before` (to the end if before is missing)
this.controls.moveToIndex(child, 0);   // move the child to the given index
this.controls.forEach(fn);             // iterate the children
this.controls.map(fn);                 // map and return an array
this.controls.items;                   // the child array
this.controls.length;                  // the child count
```

- `add`/`insert` also accept plain values: strings, numbers, booleans and bigints are wrapped in text nodes. A child that already has a parent is detached from it first (`detach`), then added. A disposed child is not added.
- If the component is already attached to the DOM when `add` is called, the child is placed at the right position at once. No render/flush to wait for. If the component is held by `isWait`, the child is recorded and built when the wait is lifted.
- `detach` takes the child out of the tree and the DOM without disposing it; it can be added elsewhere again with `add`. `remove` and `clear` dispose.
- `move` works only among the children of the same parent; it moves them in the DOM too (fragment-rooted children with their whole range). If the position does not change, nothing happens.
- The `onAdd`/`onRemove`/`onAddBeforeBuild` callbacks belong to the framework; do not assign them. To listen for children being added or removed use `motif.on('controladded', fn)` / `motif.on('controlremoved', fn)` (`e.control` is the added/removed component).

## Showing content elsewhere {#transport}

There are two pairs of built-in components for showing a component's content outside its own tree; each has its own page:

- [Transport and TransportTo](./transport.md) — shows one sender's content in a named slot (`mode: 'replace' | 'merge'`); the `Transporter` helper for programmatic moves lives there too.
- [ContentBody and ContentBlock](./content-body.md) — accumulates the pieces of several blocks in one body.

## Element access inside a component (`element` and `ref`) {#element-and-ref}

Every component's real DOM node is reachable through `this.element`. In JSX you can also capture a tag's component instance into a variable with `ref` (or `x-ref`):

```tsx file=src/Form.tsx variant=class
import { Component } from '@motifx/core';

export class Form extends Component {
  input!: Component;
  label!: Component;

  view() {
    return (
      <div>
        <input ref={this.input} type="text" />
        <label ref={(s) => this.label = s}>Name</label>
        <button onclick={() => (this.input.element as HTMLInputElement).focus()}>
          Focus
        </button>
      </div>
    );
  }
}
```
```tsx file=src/Form.tsx variant=function
import { Component } from '@motifx/core';

export function Form() {
  let input: Component;
  let label: Component;

  return (
    <div>
      <input ref={input} type="text" />
      <label ref={(s) => label = s}>Name</label>
      <button onclick={() => (input.element as HTMLInputElement).focus()}>
        Focus
      </button>
    </div>
  );
}
```
```tsx file=src/Form.tsx variant=options
import { Component } from '@motifx/core';

export const Form = () => ({
  el: 'div',
  input: null as Component | null,
  label: null as Component | null,

  view() {
    return (
      <div>
        <input ref={this.input} type="text" />
        <label ref={(s) => this.label = s}>Name</label>
        <button onclick={() => (this.input!.element as HTMLInputElement).focus()}>
          Focus
        </button>
      </div>
    );
  },
});
```

- `ref={(s) => ...}` — the callback form; `s` is the tag's component (on a plain DOM tag the `Component` wrapping the element, on a component tag the component instance, on a function component the returned root).
- `ref={this.x}` / `ref={name}` — the compiler resolves the target. If the target is a method, a function-valued field or a local function, it is **called** with the tag's component. If it is a declared field (without a value or with a plain value) or a variable without an initial value, the component is **assigned** to it. For targets that cannot be decided at compile time (an undeclared or inherited member, an import, a parameter, `props.x`, a function-typed field, a getter) the decision is made at runtime: a function value is called, anything else is assigned.
- Both forms mean the same on plain DOM tags and on component tags; `x-ref` (and `x:ref`) is the same as `ref`.
- `ref` is called exactly once while the tag's component is being set up (before `build()`), and is not written to the DOM as an attribute.
- If `ref` and `x-ref` are both written on the same tag, both run once, in source order.
- `ref` is not a prop; it works only on the component it is given to: on a class component it is applied to the component itself, on a function component to the returned root. It is not in the `props` passed to the function nor in `this.props`; spreading with `{...props}` / `{...this.props}` therefore does not carry it to an inner component.
- The same holds without JSX: `new Card({ ref: (c) => ... })` is applied to the component itself and does not stay in `this.props`. `ref` can be given in the prop object or inside `runover` (`{ runover: { ref } }`); both apply only to that component.
- The rule is simple: if `ref` is a function it is **called** with the component and removed from the props; if it is an object, the component is **assigned** to that field (`props.ref` or `runover.ref`). After `const p = { ref: {} }; const k = new Card(p);`, `p.ref === k`.
- `element` exists even before mount.

To expose an inner element to the outside, use a separate prop name (e.g. `inputRef`) and call it from the inner tag's `ref`:

```tsx file=src/SearchBox.tsx
import { Component } from '@motifx/core';

export function SearchBox(props: { inputRef?: (c: Component) => void; placeholder?: string }) {
  return (
    <div class="search">
      <input ref={(c) => props.inputRef?.(c)} placeholder={props.placeholder} />
    </div>
  );
}
```

```tsx file=src/Toolbar.tsx
import { Component } from '@motifx/core';
import { SearchBox } from './SearchBox';

export class Toolbar extends Component {
  search!: Component;
  box!: Component;

  view() {
    return <SearchBox ref={this.box} inputRef={(c) => this.search = c} placeholder="Search" />;
  }
}
```

Here `this.box` receives the root `div` the function returns and `this.search` the inner `input`. Writing `ref={props.inputRef}` works too: if the value is a function it is called with the inner component.

### `onRefCreated` — the shared hook for refs {#on-ref-created}

If a class component defines `onRefCreated(sender)`, the method is called right after each `ref={this.x}` / `ref={name}` inside `view()` has been applied to its target. `sender` is the component of the tag that carries the ref; the target field has been assigned or the target method called by then. It is not called for the callback form `ref={(s) => ...}`.

```tsx file=src/Form.tsx
import { Component } from '@motifx/core';

export class Form extends Component {
  name!: Component;
  email!: Component;
  fields: Component[] = [];

  view() {
    return (
      <div>
        <input ref={this.name} />
        <input ref={this.email} />
      </div>
    );
  }

  onRefCreated(sender: Component) {
    this.fields.push(sender);
  }
}
```

Refs are applied in source order while the tags' components are built; `onRefCreated` runs once after each. The hook belongs to the class that writes the JSX (the `this` of `view()`), not to the component that received the ref. It is called for JSX in the class's methods and fields (arrow functions included); it is not called in function components, in module-level JSX or in `function` expressions inside a class method.

## Context (`context`) — access to the application {#context}

Every component reaches the application through `this.context` by climbing the parent chain. `context` is the running `Application` instance:

```tsx
// programmatic navigation
this.context.navigate('/docs');

// listening to / firing application-wide events
this.context.on('languageChanged', () => this.setState());
this.context.fire('languageChanged');
```

`on`/`onRouterChanged` subscriptions opened through `this.context` are tied to the component's lifetime; they are removed by themselves when the component is disposed. This does not hold for `onLifecycle`; bind the returned cancel function to the component with `this.motif.setDisposable(off)`.

For details on application events see [Events](./events.md).

## Accessing services {#services}

Use `getService` to reach DI-registered services from a component:

```tsx
const logger = this.getService(LoggerService);
```

Details: [Dependency Injection](./dependency-injection.md).

## Next step {#next}

Continue with [JSX and Templates](./jsx.md) to learn the rules of the template language.
