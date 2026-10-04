---
slug: content-body
title: ContentBody and ContentBlock
description: A body filled by several blocks together; the ContentBody body, ContentBlock pieces, accumulation, disposal and the difference from Transport.
category: advanced
order: 4
---

[Transport](./transport.md) **shows** one sender's content in a slot; `ContentBody` is a body that several blocks **fill together**. A body is opened in the layout, blocks in different places of the page add their pieces there, and the pieces accumulate in the body.

## Usage {#usage}

```tsx file=src/ShellLayout.tsx variant=class
import { Component, ContentBody, RouterView } from "@motifx/core";

export class ShellLayout extends Component {
  view() {
    return (
      <div class="shell">
        <aside class="tools"><ContentBody name="tools" /></aside>
        <main><RouterView /></main>
      </div>
    );
  }
}
```
```tsx file=src/ShellLayout.tsx variant=function
import { ContentBody, RouterView } from "@motifx/core";

export function ShellLayout() {
  return (
    <div class="shell">
      <aside class="tools"><ContentBody name="tools" /></aside>
      <main><RouterView /></main>
    </div>
  );
}
```
```tsx file=src/ShellLayout.tsx variant=options
import { ContentBody, RouterView } from "@motifx/core";

export const ShellLayout = () => ({
  el: 'div',
  view() {
    return (
      <div class="shell">
        <aside class="tools"><ContentBody name="tools" /></aside>
        <main><RouterView /></main>
      </div>
    );
  },
});
```

```tsx file=src/pages/ReportPage.tsx variant=class
import { Component, ContentBlock } from "@motifx/core";

export class ReportPage extends Component {
  view() {
    return (
      <section>
        <ContentBlock target="tools"><button>Export</button></ContentBlock>
        <ReportTable />
      </section>
    );
  }
}

export class ReportTable extends Component {
  view() {
    return (
      <table>
        <ContentBlock target="tools"><button>Print</button></ContentBlock>
        {/* rows */}
      </table>
    );
  }
}
```
```tsx file=src/pages/ReportPage.tsx variant=function
import { ContentBlock } from "@motifx/core";

export function ReportPage() {
  return (
    <section>
      <ContentBlock target="tools"><button>Export</button></ContentBlock>
      <ReportTable />
    </section>
  );
}

export function ReportTable() {
  return (
    <table>
      <ContentBlock target="tools"><button>Print</button></ContentBlock>
      {/* rows */}
    </table>
  );
}
```
```tsx file=src/pages/ReportPage.tsx variant=options
import { ContentBlock } from "@motifx/core";

export const ReportPage = () => ({
  el: 'section',
  view() {
    return (
      <section>
        <ContentBlock target="tools"><button>Export</button></ContentBlock>
        <ReportTable />
      </section>
    );
  },
});

export const ReportTable = () => ({
  el: 'table',
  view() {
    return (
      <table>
        <ContentBlock target="tools"><button>Print</button></ContentBlock>
        {/* rows */}
      </table>
    );
  },
});
```

Result: the "Export" and "Print" buttons stand side by side inside `aside.tools`; when the page closes both go.

## Props {#props}

| Component | Prop | Description |
|-----------|------|-------------|
| `ContentBody` | `name` | The body's name. If a second body with the same name is set up, new blocks go to it; disposing the old body later does not break the new body's registration. |
| `ContentBlock` | `target` | The name of the body the pieces are added to. |

## Behaviour {#behavior}

- Both are fragment-rooted; they add no element where they stand.
- A block does **not build its children itself**: every added child (JSX children and those coming later through `controls.add`) is moved to the body's `controls` the moment it is added, if the target body exists, and is built there; its parent becomes the body. The move happens in the constructor, before the block is built. The block's `controladded` event is still triggered for every child.
- If the body does not exist yet, the children wait in the block unbuilt; they are moved the moment the body is set up (order does not matter).
- Pieces **accumulate** in the body; every block knows only the pieces it added itself. When a block is disposed it removes and disposes its own pieces in the body (a `MJX109` warning is written for every piece in development mode); the other blocks' pieces stay.
- When the body is disposed every piece inside it is disposed with it; the blocks are not informed, and even if a new body with the same name is set up the pieces do not come back.
- The bindings and event handlers of the moved pieces keep working with the state of the component they were written in.
- Communication is through an application event; they must be used inside a running `Application`.

## Compared with Transport {#vs-transport}

| | `Transport` / `TransportTo` | `ContentBody` / `ContentBlock` |
|---|---|---|
| Purpose | **Show** one sender's content in a slot | **Accumulate** the pieces of many blocks in a body |
| Several sources | `mode: 'replace'` keeps the last one; `'merge'` merges | Always accumulates |
| Sender disposal | Removes its own content | Removes its own pieces (`MJX109`) |
| Placement | The slot is a fragment, the sender leaves an empty `<div>` | Both are fragments |

## Next step {#next}

For a single-sender slot and programmatic moves see [Transport and TransportTo](./transport.md); for the basics of the component tree see [Components](./components.md).
