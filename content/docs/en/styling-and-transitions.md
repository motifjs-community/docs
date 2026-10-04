---
slug: styling-and-transitions
title: Styling and Transitions
description: class/style/attr helpers, inline <style>, the CSS class based transition prop, WAAPI keyframe transitions, visibility and the enter/leave mode.
category: app
order: 3
---

## Ways of styling {#styling}

### `class` / `className` in JSX {#class}

Both are accepted; they take a string, an array, an object or a getter:

```tsx
<div class="card active" />
<div class={state.theme} />
<div class={() => `todo ${state.done ? 'done' : ''}`} />
```

### `style` in JSX {#style}

A string, an object or a getter:

```tsx
<div style="color: red;" />
<div style={{ verticalAlign: 'top', width: '33%' }} />
<div style={() => ({ opacity: state.visible ? 1 : 0 })} />
```

### Inline `<style>` {#inline-style-tag}

You can give CSS directly with a `<style>` block inside `view()`. The rules are not scoped to the component; they apply to the whole document:

```tsx file=src/Panel.tsx variant=class
import { Component } from "@motifx/core";

export class Panel extends Component {
  view() {
    return <div class="panel">
      <style>{`
        .panel { padding: 20px; border-radius: 8px; }
        .panel h2 { margin: 0; }
      `}</style>
      <h2>Heading</h2>
    </div>;
  }
}
```
```tsx file=src/Panel.tsx variant=function
export function Panel() {
  return <div class="panel">
    <style>{`
      .panel { padding: 20px; border-radius: 8px; }
      .panel h2 { margin: 0; }
    `}</style>
    <h2>Heading</h2>
  </div>;
}
```
```tsx file=src/Panel.tsx variant=options
export const Panel = () => ({
  el: 'div',
  view() {
    return <div class="panel">
      <style>{`
        .panel { padding: 20px; border-radius: 8px; }
        .panel h2 { margin: 0; }
      `}</style>
      <h2>Heading</h2>
    </div>;
  },
});
```

### Imperative class and style {#imperative-class-style}

Through the component:

```ts
this.class.add('active');
this.class.add('a', 'b');
this.class.add(() => state.on ? 'on' : 'off');  // reactive contribution
this.class.remove('active');
this.class.remove('**');                          // clear everything

this.style({ color: 'red' });
this.style('color: red; font-weight: bold;');
this.style(() => ({ opacity: state.o }));
```

`class.add` keeps reference counts: if the same class is added from several sources, the class stays until all of them are removed.

### The attribute helper — `attr` {#attr}

`this.attr` manages DOM attributes programmatically:

```ts
this.attr.add({ href: '/docs', title: 'Docs' });
```

The `RouterLink` component also adds `href` this way (unless `showHref: false` is given).

`attr.add` values: `false`, `null` and `undefined` remove the attribute, `true` writes it with an empty value (`""`), strings and numbers are written as they are. On `aria-*` and `data-*` attributes `true`/`false` are written as text (`"true"`/`"false"`). If a key in the object is `null` only that attribute is removed, the other keys are written (`this.attr.add({ title: null, role: 'tab' })`).

Attribute names are only the object's own keys given to `attr.add`; the value is not descended into. An object or array value is converted to text and written as a single attribute value: `{ title: { a: 1 } }` → `title="[object Object]"`, `{ 'data-ids': [1, 2] }` → `data-ids="1,2"`. An object or array returned by a getter is written the same way. For a key whose name matches an element method the value is that method's argument (see [Element methods](./jsx.md#element-methods)).

## Tailwind, Bootstrap and external CSS {#external-css}

MotifJS is not tied to any CSS solution. The demo application uses Tailwind and Bootstrap classes directly through `class`:

```tsx
<a rel="router" href="/docs" class="btn btn-primary btn-lg me-3">Start</a>
```

For Tailwind add the `@tailwindcss/vite` plugin to `vite.config.ts`.

## The transition system {#transitions}

MotifJS supports two kinds of enter/leave animation:

1. **CSS class based transition** — Vue style; with the `transition` prop.
2. **WAAPI (Web Animations API) keyframes** — programmatic, with `motif.options.transition.in/out`.

Transitions play automatically when a component is **added** to the DOM (enter) and **removed/hidden** (leave).

### CSS class based transition — the `transition` prop {#transition-prop}

The simplest form is giving a name:

```tsx
<div transition="fade">Content</div>
```

This applies the following CSS classes at the matching stages (the same naming as Vue):

| Stage | Applied classes |
|-------|-----------------|
| Enter | `fade-enter-from` → `fade-enter-active` → `fade-enter-to` |
| Leave | `fade-leave-from` → `fade-leave-active` → `fade-leave-to` |

You write the matching CSS:

```css
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,   .fade-leave-to     { opacity: 0; }
.fade-enter-to,     .fade-leave-from   { opacity: 1; }
```

`transition` works the same on plain tags, class component tags and function component tags; on a function component it is applied to the returned root, and the value written on the tag takes precedence over the value the function writes on its own root. A ternary written on the tag is compiled to a getter and tracked as long as the component lives; if the getter returns `null` or an empty string the transition is turned off:

```tsx
<Badge transition={state.fast ? 'fast' : 'slow'} />
```

### Custom class names and duration — the object form {#transition-props}

Give the `transition` prop a `TransitionProps` object to customise the class names and the duration:

```tsx
<div transition={{
  name: 'slide',
  duration: { enter: 300, leave: 200 },
  enterFromClass: 'slide-in-start',
  enterActiveClass: 'slide-in-active',
  enterToClass: 'slide-in-end',
  leaveFromClass: 'slide-out-start',
  leaveActiveClass: 'slide-out-active',
  leaveToClass: 'slide-out-end',
}}>
  Content
</div>
```

`TransitionProps` fields (`import type { TransitionProps } from "@motifx/core"`): `name`, `type` (`'transition'` or `'animation'`: which end event to wait for), `css`, `duration` (`number` or `{ enter, leave }`), and `enter*Class` / `leave*Class` / `appear*Class`. `css: false` turns the class based transition off: no transition classes are added, enter and leave finish at once. Without `name` the class prefix is `motif` (`motif-enter-from` …).

Without `duration` the duration is read from the element's computed CSS `transition`/`animation` duration; when given, that duration (or the first end event) is waited for. A duration of 0 ends the transition at once.

`appear*Class` is used only on the component's **first** enter (when it first enters the DOM visibly; on a component hidden at the start this is the first `motif.show()`); if not given, it falls back to the `enter*Class` values. Later enters always use `enter*Class`.

### WAAPI keyframe animation — `motif.options.transition.in/out` {#waapi}

For more powerful, code based animations, define the enter/leave keyframes in the component's `onconfig`/`initializeComponent` stage:

```tsx
function setFx(s) {
  s.motif.options.transition.in({
    keyframes: [
      { opacity: '0', transform: 'translateX(-50px)' },
      { opacity: '1', transform: 'translateX(0)' }
    ],
    options: { duration: 1000, easing: 'ease-in-out', fill: 'forwards' }
  });
  s.motif.options.transition.out({
    keyframes: [
      { opacity: '1', transform: 'translateX(0)' },
      { opacity: '0', transform: 'translateX(-50px)' }
    ],
    options: { duration: 500, easing: 'ease-in-out', fill: 'forwards' }
  });
}

// Usage
<div onconfig={(s) => setFx(s)}>Animated content</div>
```

`in`/`out` use the standard WAAPI `element.animate(keyframes, options)` signature:
- `keyframes`: `Keyframe[]` or `PropertyIndexedKeyframes`
- `options`: a duration (number) or `KeyframeAnimationOptions`

The `in`/`out` definition belongs to the component and is used on every later enter/leave; calling it again replaces the previous one. Running animations are kept in the `motif.options.transition.activeAnimations` array.

> **Precedence:** if a component has both WAAPI (`motif.options.transition.in/out`) and a CSS class transition defined, the WAAPI keyframes take precedence.

### Transitions and visibility {#transition-visibility}

When `motif.hide()`/`motif.show()` is called the matching leave/enter transition plays automatically. On leave, the removal from the DOM happens after the leave animation ends. To skip the animation:

```ts
this.motif.options.transition.skipNextLeave = true;
await this.motif.hide();
```

The flag affects only the next leave and is reset once used. If the root is a fragment, the visible children are hidden without animation too.

A route page's transitions play on navigation as well: the leaving page finishes its leave transition, then the entering page enters. While the router is in stack mode (`useRouter({ stack })`) and `stack.animation` is not given (or is `'none'`), these transitions are used as the stack transition and the page element carries `data-nav-direction` during the enter transition. When `stack.animation` is given, the stack animation plays instead of the page's own enter transition on `push`, `back` and `forward` navigations; see [Routing](./routing.md).

### Enter and leave order — `mode` {#transition-mode}

When one child leaves a container while another enters, there are two modes beyond the default:

| Mode | Behaviour |
|---|---|
| `'concurrent'` (default) | The entering child is placed at once and plays its enter; the leaving child's leave runs at the same time. |
| `'out-in'` | The entering child is not placed in the DOM until the leaves running in that container finish; when the leave ends it is placed and plays its enter. |
| `'in-out'` | The entering child is placed at once and plays its enter; the leaving child stays in place meanwhile and plays its leave once the enter has finished. |

The mode is given in three places; the narrower overrides the wider:

```ts
app.useTransitions({ mode: 'out-in' });                 // application-wide, no router needed
<div transition={{ mode: 'out-in' }}>{...}</div>        // per container
this.motif.options.transition.mode = 'concurrent';      // per container, in code
```

`transition={{ mode }}` only sets the mode; it adds no animation to the container itself, and can be given together with `name` and class names. The mode applies to every child that arrives at the container through `controls.add`: `when`/ternary/`switch` branches, `Frame` and `Lazy` contents, list rows, components added by hand. The mode is read from the nearest **element** container: comment-node containers such as `Frame` and fragments use their parent's mode when they have none of their own, so `<div transition={{ mode: 'out-in' }}>{cond ? <A/> : <B/>}</div>` works on a branch change too (see [Frame timing](./frame.md)). On a transition between siblings with `motif.hide()` / `motif.show()`, `show` also waits for the sibling's leave. If the entering child is removed or hidden again while waiting, it is never placed. Without a running leave `out-in` does not wait. A cancelled leave (`Animation.cancel`) releases the waiting child.

In `in-out` mode the leaving child's leave waits one microtask to see the enters starting in the same operation; if a child without an enter transition is coming, or nothing is coming at all, the leave plays at once. If the leaving child is being disposed, the `dispose()` Promise resolves when the leave ends; the same holds for `motif.hide()`. A cancelled enter releases the waiting leave.

### Stopping active animations {#stop-animations}

```ts
await this.motif.stopAnimations();  // cuts both WAAPI and CSS transitions
```

## Next step {#next}

Continue with [Virtualization](./virtualization.md) to show large lists efficiently.
