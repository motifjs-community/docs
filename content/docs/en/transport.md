---
slug: transport
title: Transport and TransportTo
description: Showing content in a slot outside its own tree; the Transport slot, the TransportTo sender, the replace/merge modes and Transporter for programmatic moves.
category: advanced
order: 3
---

Used to show a component's content somewhere outside its own tree. The typical example: page-specific command buttons appearing in the layout's title bar. It consists of two parts:

- **`Transport`** — the target **slot**. Placed in the layout (or wherever the content should appear).
- **`TransportTo`** — the **sender**. The content written between its tags is moved to the slot with the same name.

## Usage {#usage}

```tsx file=src/ShellLayout.tsx variant=class
import { Component, RouterView, Transport } from '@motifx/core';

export class ShellLayout extends Component {
  view() {
    return (
      <div class="shell">
        <header class="titlebar">
          <h1>Admin</h1>
          <Transport name="commands" />
        </header>
        <main><RouterView /></main>
      </div>
    );
  }
}
```
```tsx file=src/ShellLayout.tsx variant=function
import { RouterView, Transport } from '@motifx/core';

export function ShellLayout() {
  return (
    <div class="shell">
      <header class="titlebar">
        <h1>Admin</h1>
        <Transport name="commands" />
      </header>
      <main><RouterView /></main>
    </div>
  );
}
```
```tsx file=src/ShellLayout.tsx variant=options
import { RouterView, Transport } from '@motifx/core';

export const ShellLayout = () => ({
  el: 'div',
  view() {
    return (
      <div class="shell">
        <header class="titlebar">
          <h1>Admin</h1>
          <Transport name="commands" />
        </header>
        <main><RouterView /></main>
      </div>
    );
  },
});
```

```tsx file=src/pages/OrdersPage.tsx variant=class
import { Component, TransportTo, reactive } from '@motifx/core';

export class OrdersPage extends Component {
  state = reactive({ count: 0 });

  view() {
    return (
      <section>
        <TransportTo name="commands">
          <button onclick={() => this.state.count++}>Refresh ({this.state.count})</button>
        </TransportTo>
        {/* the rest of the page */}
      </section>
    );
  }
}
```
```tsx file=src/pages/OrdersPage.tsx variant=function
import { TransportTo, reactive } from '@motifx/core';

export function OrdersPage() {
  const state = reactive({ count: 0 });

  return (
    <section>
      <TransportTo name="commands">
        <button onclick={() => state.count++}>Refresh ({state.count})</button>
      </TransportTo>
      {/* the rest of the page */}
    </section>
  );
}
```
```tsx file=src/pages/OrdersPage.tsx variant=options
import { TransportTo, reactive } from '@motifx/core';

export const OrdersPage = () => ({
  el: 'section',
  data: reactive({ count: 0 }),

  view() {
    return (
      <section>
        <TransportTo name="commands">
          <button onclick={() => this.data.count++}>Refresh ({this.data.count})</button>
        </TransportTo>
        {/* the rest of the page */}
      </section>
    );
  },
});
```

## Props {#props}

| Component | Prop | Description |
|-----------|------|-------------|
| `Transport` | `name` | The slot's name (required). |
| `Transport` | `mode` | `'replace'` (default) or `'merge'`; see [Several senders in one slot](#mode). |
| `TransportTo` | `name` | The name of the slot the content is sent to. |

## Behaviour {#behavior}

- **Order does not matter.** The slot may be created before or after; if `TransportTo` is set up while the slot does not exist yet, the content is moved the moment the slot registers.
- **The content stays bound to the sending component.** The bindings and event handlers in the moved elements keep working with the state of the component they were written in; in the example above the button in the slot updates when `count` changes.
- **The lifetime is tied to the sender.** When `TransportTo` is disposed (for example on leaving the page) the content it moved is removed from the slot and disposed. Since the router disposes the old page before the new one is placed, in uses such as a command bar the content swaps itself.
- **If the slot is removed the content goes too.** When the slot is disposed the moved content inside it is disposed as well; even if a slot with the same name is created again the content does not come back.
- **Children added later are moved too.** A component added later to `TransportTo`'s `controls` collection goes straight to the slot if it exists; it stays live like the first children and goes with them when the sender is disposed. The sender's `controladded` event is triggered for every child.
- The `Transport` slot is itself a fragment (it adds no element to the DOM; the content settles where the slot is). `TransportTo` leaves an empty `<div>` where it stands; the content appears in the slot, not there.
- Both communicate through application events; they must be used inside a running `Application`.
- If a second `Transport` with the same name is set up, the registration moves to the new one; the senders move their content to the new slot.

## Several senders in one slot — `mode` {#mode}

When several `TransportTo`s send content to the same slot, `mode` decides. Whether the slot is set up before or after the senders does not change the result:

- `'replace'` (default): only the content of the most recently set up sender stays in the slot. The previous content in the slot is removed and disposed; it does not come back even when that sender closes.
- `'merge'`: the content of all senders is added to the slot in setup order; when each sender closes only its own content goes.

If what you want is an area filled **together** by several blocks, accumulating in a body, [ContentBody and ContentBlock](./content-body.md) is designed for that.

## Programmatic moves — `Transporter` {#transporter}

The helper underneath the `Transport`/`TransportTo` pair is exported; it is used to move a component to another parent without JSX:

```ts
import { Transporter } from '@motifx/core';

Transporter.transport(child, newParent);                 // append
Transporter.transport(child, newParent, { index: 0 });   // insert at the given index
Transporter.transportMany([a, b], newParent);
```

`transport` detaches the child from its old parent without playing a leave transition, adds it to the new parent's `controls` and re-activates its bindings (`reState`). `TransportOptions`: `index` (insertion index), `keepState: true` (do not re-activate the bindings), `owner` (writes the mover to `motif.options.ownerTransporter`). If the child is already in that parent nothing happens.

## Next step {#next}

For a body filled from several sources see [ContentBody and ContentBlock](./content-body.md); for the rest of the `controls` collection see [Components - controls](./components.md#controls).
