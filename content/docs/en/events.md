---
slug: events
title: Events
description: DOM events and modifiers, motif.on/off/trigger component events, lifecycle events and the application event bus.
category: core
order: 5
---

MotifJS has three event layers:

1. **DOM events** — attached to an element with props such as `onclick`, `oninput`.
2. **Component events** — communication between components with `component.motif.on/trigger/off`.
3. **Application events** — application-wide broadcast with `context.on/fire`.

## DOM events {#dom-events}

In JSX, `on...` props bind to DOM events. Event names are written in lowercase.

```tsx
<button onclick={() => console.log("click")}>Click</button>
<input oninput={(e) => console.log(e.target.value)} />
<form onsubmit={(s, e) => { e.preventDefault(); /* ... */ }}>...</form>
```

On a plain tag every DOM event is bound with this spelling (`onpointerdown`, `onmouseenter`, `onanimationend` included); a camelCase spelling such as `onClick` binds the same event.

On a component tag, a prop carrying a DOM event name (`onchange`/`onChange`, `onCopy`, `onResize`, `onSelect`, `onReset`, `onContextMenu` …) is attached to the component's root element as a DOM listener and does not reach `this.props`; for the camelCase spelling the compiler gives the `MJX002` warning. For a callback prop pick a name that does not collide with a DOM event (`onValueChange`, `onConfirm`).

### Handler signatures {#handler-signatures}

A handler can be written in one of two forms; MotifJS calls the right one according to the argument count:

```tsx
// Event only
<button onclick={(e) => console.log(e.clientX)} />

// Sender (component) + event
<button onclick={(sender, e) => sender.context.navigate('/home')} />
```

- `sender` — the `ComponentBase` instance that triggered the event; you can reach members such as `sender.element`, `sender.context`, `sender.motif`.
- If the handler returns `false` or `{ cancel: true }`, MotifJS calls `preventDefault()` and `stopPropagation()`. These methods are called only if they exist on the event object; when a plain data object is passed with `motif.trigger('name', { … })` neither is called and no error occurs. The `:prevent` / `:stop` modifiers follow the same rule.
- The parameter count is the function's `length`: if the declared parameter count is ≤ 1, `fn(event)` is called; if 2 or more, `fn(sender, event)`. Parameters with default values or a rest parameter, and anything after them, do not count; so `(...a) => …` counts as 0 and receives only `event`, and `(s = null, e) => …` counts as 0 too.

### Handler errors {#handler-errors}

If the handler throws, or the promise an `async` handler returns rejects, the error is reported to `errorHandler` as a `MotifError` with code `MJX123` (`The '<event>' event handler threw.`); the original error is in the `cause` field. The report is written to the console in production too (`app.useLogging(false)` turns it off) and reaches `errorHandler.addListener(fn)` listeners. The other listeners of the same event keep running.

### The `on:name` / `on-name` / `on_name` spelling {#context-events}

This spelling binds the handler as it is to the tag's component: `<X on:save={fn}/>` means `sender.motif.on("save", fn)`. The event name is everything left after the prefix (`on:`, `on-`, `on_`) is dropped: `on-my-event` → `my-event`, `on_my_event` → `my_event`. It is used both for DOM events and for custom events triggered with `motif.trigger`, and the parameter-count rule above applies as it is:

```tsx
// One parameter: the event (for a custom event, the data given to trigger)
<Editor on:save={(e) => console.log(e.id)} />

// Two parameters: the sending component + the event
<button on-click={(sender, e) => sender.motif.hide()}>Close</button>

// A method reference is passed as it is too
<button on_click={this.handleClick}>Click</button>
```

When `this.motif.trigger('save', { id: 7 })` is called inside `Editor`, the first handler receives `{ id: 7 }`.

## Event modifiers {#modifiers}

Modifiers appended to the event name with a colon adjust the behaviour. They are defined in the `component.motif.on` API and in the type system:

| Modifier | Effect |
|----------|--------|
| `:once` | Runs once, then removes itself. |
| `:passive` | `passive: true` for `addEventListener`. |
| `:capture` | Listens in the capture phase. |
| `:prevent` | `preventDefault()` after the handler. |
| `:stop` | `stopPropagation()` after the handler. |
| `:self` | Runs only if the event target is the element itself. |
| `:trusted` | Runs only on `isTrusted` events. |

Since a JSX attribute name can hold a single `:`, one modifier per attribute is written on a tag (`onclick:once`, `onsubmit:prevent`). A chain (`click:once:prevent`) is set up with the imperative API:

```ts
this.motif.on('click:once:prevent', (s, e) => { /* ... */ });
this.motif.on('scroll:passive', (s, e) => { /* ... */ });
```

## The component event API: `motif.on` / `motif.off` / `motif.trigger` {#component-events}

Programmatic event management on every component lives in the `this.motif` namespace:

```ts
// Listen (a DOM event or a custom event)
await this.motif.on('click', (sender, e) => { /* ... */ });

// Remove the same handler
await this.motif.off('click', handler);

// Trigger a custom event by hand
await this.motif.trigger('myCustomEvent', { data: 123 });
```

- Listeners added with `motif.on` are **cleaned up automatically** when the component is disposed (memory leaks are prevented).
- The third argument of `motif.on` is `domEvent` (default `true`). If you pass `false`, no `addEventListener` is done on the DOM; the event is kept only as an internal (custom) event — it can be triggered with `motif.trigger`.
- `motif.trigger('name', data)` calls only the handlers registered under **exactly that name** (without modifiers, case-insensitive); a handler registered with `'click:once'` is not called by `trigger('click')`. Handlers receive `data` as the event object.
- On DOM events `motif.off(name, fn)` removes **one** registration of the same handler; if the same handler was added several times, call it for each. The event name is given as it was registered (modifiers included).
- `motif.addHandler(name, fn)` is the same as `motif.on(name, fn)` (no return value).

### `x:mounted` — the moment of attaching to the DOM {#x-mounted}

A hook that runs when the element is really added to the DOM:

```ts
this.motif.on('x:mounted', () => {
  // this.element is inside document
});
```

Every subscription runs **once**; if the element is already inside `document` it runs at once. When the component is detached and placed again (moving, `motif.hide`/`motif.show`, keepAlive) `x:mounted` does not fire again; use `x:activated` for that moment ([Lifecycle](./lifecycle.md)). `motif.off('x:mounted', handler)` cancels a subscription that has not run yet. An error thrown by the handler is reported as `MJX122`.

## Lifecycle events {#lifecycle-events}

You can listen to component lifecycle events with `motif.on` as well. The `x:` prefix binds these events to the component's own emitter rather than the DOM; the handler is called with the `(sender, e)` signature (`e`: `{ cancel }`), a single-parameter handler receives only `e`:

```ts
this.motif.on('x:built', (sender, e) => { /* build finished */ });
this.motif.on('x:disposed', () => { /* disposal completed */ });
```

Recognised names: `x:initializing`, `x:initialized`, `x:config`, `x:configured`, `x:building`, `x:built`, `x:mounted`, `x:visibilityChanged`, `x:activated`, `x:deactivated`, `x:disposing`, `x:disposed`. The subscription is cleaned up with the component; it can also be removed by hand with `motif.off`. If the same handler subscribed several times, `motif.off` removes all of them.

If one of these listeners throws, the error is reported to `errorHandler` with code `MJX122` (e.g. `The component x:built hook threw.`), as if the hook had been written as a class method or prop; the component keeps being set up.

> Timing note: on plain `new Component('div', …)` instances `x:config` fires in the constructor; subscribing after the constructor returns is too late. In subclasses (`class X extends Component`) `onConfig` runs at the start of `build()`, so subscribing after the constructor is enough. Details: [Lifecycle](./lifecycle.md).

## Application events — `context.on` / `context.fire` {#app-events}

The application event bus is used for communication between components (without a parent-child relationship). `this.context` is the running `Application`. When the listening component is disposed the subscription is removed by itself:

```tsx file=src/Labels.tsx variant=class
import { Component } from '@motifx/core';

export class Labels extends Component<HTMLDivElement> {
  onConfig() {
    this.context.on('languageChanged', () => this.refreshLabels());
  }
  refreshLabels() { /* ... */ }
}
```
```tsx file=src/Labels.tsx variant=function
export function Labels() {
  const refreshLabels = () => { /* ... */ };
  return <div onconfig={(s) => s.context.on('languageChanged', refreshLabels)} />;
}
```
```tsx file=src/Labels.tsx variant=options
export const Labels = () => ({
  el: 'div',
  onConfigured() {
    this.context.on('languageChanged', () => this.refreshLabels());
  },
  refreshLabels() { /* ... */ },
});
```

```tsx
// Publisher (from another component)
<div onclick={(sender, e) => sender.context.fire('languageChanged')}>English</div>
```

The `Application` event API:

| Method | Description |
|--------|-------------|
| `app.on(event, handler)` | Listens; returns a function to unsubscribe. |
| `app.fire(event, args?)` | Triggers the event. |
| `app.off(event, handler)` | Removes the listener. |
| `app.onRouterChanged(handler)` | A hook that runs on every navigation (startup and 404 included); returns a function to unsubscribe. |
| `app.onLifecycle(handler)` | Tab/application visibility and connectivity changes; see [Application lifecycle](./lifecycle.md#app-lifecycle). |

The event name may be a string or a `Symbol`; `fire` calls the listeners synchronously, in the order they were added.

An error thrown by an application event listener is reported with code `MJX123` (`The '<event>' event handler threw.`) and the event's other listeners run. `onRouterChanged` handlers are the same (`The 'motifjs-router-navigated' event handler threw.`); the navigation still completes.

A component's `this.context` is a component-bound view of the application: the `on` and `onRouterChanged` subscriptions opened through it are removed by themselves when the component is disposed (`onLifecycle` is not covered). Subscriptions opened through `Application.main`, a held `app` instance or `useApplication().application` are bound to no component; call the returned function yourself or register it on a component with `motif.setDisposable` ([Memory Management and Dispose](./memory-and-dispose.md)).

```tsx
const unsubscribe = app.on('data-updated', (payload) => { /* ... */ });
// ...
unsubscribe();  // end the subscription
```

## Example: broadcasting a language change {#example-language}

`MainLayout` changes a language and broadcasts it; the `Home` page listens and updates itself:

```tsx
// inside MainLayout
<div onclick={(sender: Component, e: Event) => {
  mainState.selectedLangText = "English";
  sender.context.fire('languageChanged');
}}>English</div>

// inside Home
<div onconfig={(s: Component) => {
  s.context.on('languageChanged', () => changeLang());
}}>...</div>
```

## Next step {#next}

Continue with [Forms and Two-Way Binding](./forms.md) to learn form inputs and two-way binding.
