---
slug: frame
title: Frame
description: A container holding one changing content; content changes with navigate, timing, leave transitions and the places where the framework sets up a Frame.
category: advanced
order: 1
---

Conditional branches (`&&`, the ternary operator, `switch`), getter children in the `{() => expression}` form and route pages all work on the same structure: **a container that holds and replaces a single content**. That container is `Frame`. `Frame` is a component whose root is a comment node (it adds no element to the DOM); it holds at most one content (a component or an array of components) at any time, the content is replaced with `navigate`, and the old one is disposed.

## Usage {#usage}

```tsx file=src/Panel.tsx variant=class
import { Component, Frame } from "@motifx/core";

export class Panel extends Component<HTMLDivElement> {
  frame = new Frame();

  view() {
    return <div>
      <button onclick={() => this.frame.navigate(<Settings />)}>Settings</button>
      <button onclick={() => this.frame.navigate(<Profile />)}>Profile</button>
      {this.frame}
    </div>;
  }
}
```
```tsx file=src/Panel.tsx variant=function
import { Frame } from "@motifx/core";

export function Panel() {
  const frame = new Frame();
  return <div>
    <button onclick={() => frame.navigate(<Settings />)}>Settings</button>
    <button onclick={() => frame.navigate(<Profile />)}>Profile</button>
    {frame}
  </div>;
}
```
```tsx file=src/Panel.tsx variant=options
import { Frame } from "@motifx/core";

export const Panel = () => ({
  el: 'div',
  frame: new Frame(),
  view() {
    return <div>
      <button onclick={() => this.frame.navigate(<Settings />)}>Settings</button>
      <button onclick={() => this.frame.navigate(<Profile />)}>Profile</button>
      {this.frame}
    </div>;
  },
});
```

Writing `<Frame>…</Frame>` in JSX makes the children the first content; a `navigate` call with a `Promise` loads the content through [Lazy](./lazy.md).

## API {#api}

| Member | Description |
|--------|-------------|
| `new Frame(props?)` | An empty container. If `props.childs` is given (`<Frame>…</Frame>` in JSX) the children are added as the first content. |
| `navigate(page, keepOldControl?)` | `page` can be a component, an array of components, a component class/factory or a `Promise`. The old content is disposed (kept in place if `keepOldControl: true` is given), the new one is added. With a `Promise` the content is loaded through `Lazy`; the next `navigate` cancels the previous load. A second call with the same content does nothing. The returned `Promise` resolves when the content is placed. |
| `navigateLazy(caller, options?, keepOldControl?)` | Shorthand for `navigate(Lazy({ caller, options }))`. |
| `flush()` | Disposes the current content; the container stays empty. `motif.clear()` does the same job. |
| `current` | The shown content (`ComponentBase`, an array or `null`). |
| `isBusy` | `true` while a `navigate` is in progress. |
| `dispose(options?)` | Disposes first the content, then the container; `options` is passed to the content too. |

## Timing {#timing}

- **The first content is synchronous.** While the container is empty and `page` is not a `Promise`, the content is placed by the time `navigate` returns; the first branch is on screen when `build()` completes (see [Conditional rendering - Synchronous first paint](./conditionals-and-lists.md#why-x-wait)).
- **Later changes are serialised.** Consecutive `navigate` calls queue up behind a lock; each waits for the previous one to finish. A new call arriving in between drops the result of an old call that has not been placed yet (only the content requested last is placed).
- **Old content without a leave transition** is disposed (`onDisposed`) before the new content is added.
- If the content cannot be placed `MJX114` is reported, if the old content cannot be disposed `MJX115`; the container keeps working.

## Leave and enter transitions {#transitions}

The old content plays its leave transition: its running animations are cancelled first, then it is disposed with `dispose({ deep: true })`; if a leave transition is defined (the `transition` prop or `motif.options.transition.out(...)`) it plays. The new content does **not** wait for the old one to finish: while the old content leaves, the new one is added at once and the order of the two is decided by the `mode` of the nearest **element** ancestor (see [Styling and transitions - Enter and leave order](./styling-and-transitions.md#transition-mode)):

| `mode` | Behaviour |
|--------|-----------|
| `'concurrent'` (default) | The new content enters while the old one leaves. |
| `'out-in'` | The new content is not placed in the DOM until the old one's leave has finished. |
| `'in-out'` | The old one's leave is deferred until the new one's enter has finished. |

Since `Frame` is a comment node it carries no mode itself; it uses the nearest element ancestor's. The `<div transition={{ mode: 'out-in' }}>{cond && <A/>}</div>` form is applied through nested `Frame`s.

`dispose()`, `flush()` and `motif.clear()` also play the content's leave transition and wait for it to finish; `dispose({ skipLeaveTransition: true })` is passed to the content with the same option.

## Where the framework sets up a Frame {#where-used}

The framework sets up a `Frame` itself in these places: `{cond && <X/>}` (`bindings.when`), the ternary operator (`bindings.ternary`), `switch` (`bindings.switchCase`), `{() => …}` children returning a component (`bindings.method`) and [Lazy](./lazy.md). `RouterView` is a separate component but uses the same navigation logic on a page change (the serialised lock, disposal of the old page, `Lazy` for a `Promise`). The rules above hold for all of them.

## Next step {#next}

For content through dynamic `import()` see [Lazy](./lazy.md); for the usage side of branch changes see [Conditional Rendering and Lists](./conditionals-and-lists.md).
