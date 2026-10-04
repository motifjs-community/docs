---
slug: jsx
title: JSX and Templates
description: JSX rules, reactive text and attributes, spread, class/style, x- directives, compile-time diagnostics and explain.
category: core
order: 2
---

In MotifJS, JSX does not produce a virtual tree at runtime. The `@motifx/compiler` compiler turns JSX directly into calls that create DOM elements and set up **reactive bindings**. This section describes what you can write inside JSX and how each form behaves.

## Elements and nesting {#elements}

Standard HTML tags are written directly:

```tsx
<div class="card">
  <h2>Heading</h2>
  <p>Paragraph</p>
</div>
```

Components start with a capital letter and are used like tags:

```tsx
<UserCard userId={1} />
<Greeting name="Ada" />
```

### Fragment {#fragment}

Use a fragment to return more than one root element:

```tsx
<>
  <Header />
  <Main />
  <Footer />
</>
```

## Text and reactive expressions {#text-and-expressions}

Expressions go inside curly braces `{...}`. **The form of the expression decides whether it is reactive:**

### Static text {#static-text}

```tsx
<span>{"Hello"}</span>
<span>{someLocalVariable}</span>
```

Evaluated once. `someLocalVariable` is not updated unless it belongs to a reactive model.

### A reactive model field {#reactive-field}

If you write a reactive model's field directly, a **one-way binding** to that field is set up. When the field changes only that text node is updated:

```tsx
const state = reactive({ name: "Ada" });

<span>{state.name}</span>   // reactive: the text updates when state.name changes
```

The compiler turns this into `sender.bindings.add("textContent", state, "name")`.

### A reactive expression through a getter function {#reactive-getter}

To keep a computed/derived value reactive, put the expression inside an **arrow function**:

```tsx
<span>{() => state.firstName + " " + state.lastName}</span>
<span>{() => state.count > 0 ? "Yes" : "No"}</span>
```

Reactive reads inside the function are tracked; when one of the dependencies changes the text is recomputed. This is the most flexible form of reactive text.

> **Rule:** if you want an expression's value to change over time and reach the DOM, write either a reactive field directly (`state.x`) or a getter (`() => ...`). A plain local variable stays static.

## Attributes {#attributes}

Attributes take a value or a function returning a value:

```tsx
<input type="text" placeholder="Search..." />        {/* static */}
<a href={state.url}>Link</a>                         {/* reactive field */}
<img src={() => state.avatarUrl} alt="Avatar" />     {/* reactive getter */}
<button disabled={() => state.isBusy}>Send</button>
```

When an attribute value is a function, MotifJS sets it up as a reactive attribute binding.

On a plain DOM tag, literal values are passed to `attr.add` as they are: numbers, negative numbers, `true`/`false` and `null` (arrays and `new X()` are passed as values too; on [element methods](#element-methods) they become arguments). `false`, `null` and `undefined` do not write the attribute (and remove it if present); `true` and the bare form write the attribute with an empty value (`""`); numbers are converted to strings:

```tsx
<button disabled={false} />   {/* no disabled */}
<button disabled />           {/* disabled="" */}
<div tabindex={0} />          {/* tabindex="0" */}
<div title={null} />          {/* no title */}
<div hidden={true} />         {/* hidden="" */}
```

On `aria-*` and `data-*` attributes a boolean is written as text: `aria-expanded={false}` → `aria-expanded="false"`, `data-on={true}` → `data-on="true"`; `null`/`undefined` still remove the attribute.

An expression that reads a variable (`a + b`, `!state.open`, `state.url`) is wrapped in a getter and stays live: `aria-busy={!state.open}` updates when `state.open` changes. A lone variable (`attr={v}`) is passed as it is; it is live only if it holds a function. A plain function call (`data-n={fmt(x)}`) is evaluated once; write `() => fmt(x)` to keep it live.

> Security: attributes written on a tag and `attr.add` values are written without filtering. If a user-supplied value is bound to a URL attribute such as `href`, `src`, `action` or `formaction`, a value starting with `javascript:` runs code on click. Check such values against the allowed schemes before binding them:
>
> ```tsx
> const safeUrl = (url: string) => /^(https?:|mailto:|\/|#|\.)/i.test(url.trim()) ? url : '#';
> <a href={() => safeUrl(state.profile.website)}>Website</a>
> ```
>
> `attr.add({ innerHTML })` writes HTML as it is, like `x-html`. Only [spread](#spread) skips an `innerHTML` and `javascript:` URLs coming from outside by itself.

### Element methods {#element-methods}

On a plain DOM tag, a prop whose name matches an element method does not write an attribute; it calls that method. If the value is a getter (or a reactive field) it is applied again on every change:

```tsx
<dialog showModal={() => state.open}>…</dialog>              {/* true → showModal(), false → close() */}
<input focus={() => state.editing} />                         {/* true → focus(), false → blur() */}
<div popover="manual" showPopover={() => state.tip}>…</div>   {/* true → showPopover(), false → hidePopover() */}
<input setSelectionRange={() => [0, 5]} />                    {/* an array spreads into arguments */}
<dialog showModal={true} />                                   {/* a literal value calls too: showModal() */}
<dialog show />                                               {/* the bare form counts as true: show() */}
```

| Prop | `true` | `false` | Other value |
| --- | --- | --- | --- |
| `focus` | `focus()` | `blur()` | `focus(value)` |
| `show`, `showModal` | calls | `close()` | truthy value calls with no argument |
| `showPopover` | calls | `hidePopover()` | truthy value calls with no argument |
| `togglePopover` | `togglePopover(true)` | `togglePopover(false)` | truthy value → `togglePopover()` |
| `play` | `play()` | `pause()` | truthy → `play()`, falsy → `pause()` |
| `select` | `select()` | clears the selection | truthy → `select()`, falsy → clears the selection |
| `requestFullscreen`, `requestPointerLock` | calls | exits | truthy → calls, falsy → exits |
| `close`, `hidePopover`, `requestSubmit`, `checkValidity`, `reportValidity`, `showPicker`, `load` | calls | — | truthy value → `method(value)` — e.g. `close('cancel')`, `requestSubmit(button)` |
| `blur`, `click`, `pause`, `submit`, `reset`, `exitFullscreen`, `exitPointerLock`, `requestPictureInPicture`, `exitPictureInPicture` | calls | — | truthy value calls with no argument |
| `scrollIntoView` | `scrollIntoView()` | `scrollIntoView(false)` | `null`/`undefined` → `scrollIntoView()`, otherwise `scrollIntoView(value)` |
| `scrollTo`, `scrollBy` | — | — | object or array only: `method(value)` |
| `setSelectionRange`, `setRangeText`, `setPointerCapture`, `releasePointerCapture`, `fastSeek` | `method(true)` | — | `method(value)` unless `null`/`undefined` |

An array value spreads into arguments (`setSelectionRange={[0, 5]}` → `setSelectionRange(0, 5)`), an object value is passed as a single argument (`scrollTo={{ top: 0 }}`, `focus={{ preventScroll: true }}`); in neither case is an attribute written. The call happens one microtask later. If the element does not have that method, the value is written as a plain attribute. On a component tag (`<Comp focus={…}/>`) these names are ordinary props.

## Spread — `{...props}` {#spread}

An object spread onto a **plain DOM element** is applied as if the attributes had been written directly:

```tsx file=src/Field.tsx variant=function
export function Field(props) {
  return <input {...props} />;
}
```
```tsx file=src/Field.tsx variant=class
import { Component } from '@motifx/core';

export class Field extends Component {
  view() {
    return <input {...this.props} />;
  }
}
```
```tsx file=src/Field.tsx variant=options
export const Field = () => ({
  el: 'input',   // props on the tag are applied to this input, like {...props}
});
```

```tsx
<Field class="mf-input" id="email" aria-label="E-mail" value={() => state.email} oninput={(e) => state.email = e.target.value} />
```

| Key | Applied as |
|---|---|
| `class` / `className` | `class.add` — **merged** with a directly written `class` |
| `style` | `style()` — string, object or getter |
| `value` / `checked` / `selected` | property binding (`bindings.add`) |
| `on*` (`onclick`, `onClick`, `oninput:once`) | DOM event |
| every other key (`id`, `title`, `aria-*`, `data-*`, `viewBox`…) | attribute (`attr.add`) |
| `innerHTML` | not written (`MJX124` warning in development mode) |
| `href` / `src` / `action` / `formaction` / `xlink:href` whose value starts with `javascript:` | not written; in a getter the current value is removed (`MJX125` warning in development mode) |

Since a spread object usually carries data from outside, these two paths are closed. For HTML you trust use `x-html`; for a deliberately written `javascript:` link write the attribute directly on the tag (`<a href="javascript:void 0">`); those are not filtered.

Getter (`() => …`) values are live. Functions expecting parameters (`renderItem: (x) => …`) do not count as attributes and are skipped. `ref`, `key`, `options`, `transition`, `initializeComponent`, `childs`, `x-*` and lifecycle props go to the framework.

Order: the spread is applied in the constructor, attributes written directly on the tag in the compiler-generated `initializeComponent` — on the same attribute **the directly written one wins** (`<div {...p} id="fixed"/>`), while `class` is merged.

> Do not spread plain values that do not belong to the element (`items: [...]`) onto a **DOM element**; they are written as attributes.

### On a component tag: common attributes fall through to the root {#attribute-fallthrough}

When you write `<Card class="x" id="y" aria-label="…" {...props}/>`, **only the common attributes** — `class`/`className` (merged with the component's own class), `style`, `id`, `tabindex`, `role`, `aria-*`, `data-*` — are applied automatically to the component's **root element**; getters are live. The same attribute written by the component itself in `onConfigured`/`initializeComponent`/`view` wins (the application happens in the constructor, before those). Data and callback props (`items`, `label`, `title`, `onSave`, `disabled`…) are not written to the root — `title` is deliberately not on the list; it is a common data prop name in components. All props, including the ones that fell through, stay readable in `this.props`.

```tsx file=src/Card.tsx variant=class
import { Component } from '@motifx/core';

export class Card extends Component<HTMLDivElement, { title: string }> {
  onConfigured() { this.class.add('mf-card'); }     // <Card class="wide"/> → "mf-card wide"
  view() { return <h3>{this.props.title}</h3>; }
}
```
```tsx file=src/Card.tsx variant=function
export function Card(props: { title: string }) {
  // <Card class="wide"/> → root div: "mf-card wide"
  return <div class="mf-card">
    <h3>{props.title}</h3>
  </div>;
}
```
```tsx file=src/Card.tsx variant=options
export const Card = () => ({
  el: 'div',
  onConfigured() { this.class.add('mf-card'); },    // <Card class="wide"/> → "mf-card wide"
  view() { return <h3>{this.props.title}</h3>; },
});
```

The same holds for function components: the common attributes on the `<Fn class="x"/>` tag fall through to the root the function returns; if the root is `<div {...props}/>`, the same value is not applied a second time. On components whose root is a fragment (a comment node) they are silently ignored.

## `class` and `className` {#class}

Both are supported. The value can be a string, an array, an object or a getter function:

```tsx
<div class="card active" />                              {/* string */}
<div class={state.theme} />                              {/* reactive field */}
<div class={() => `todo ${state.done ? 'done' : ''}`} /> {/* reactive getter */}
```

Using a reactive field inside a template literal is common:

```tsx
<p class={`todo-title ${todo.completed ? 'completed' : ''}`}>{todo.title}</p>
```

### Imperative class management {#imperative-class}

The `class` helper manages classes programmatically through the component:

```ts
this.class.add('active');           // add a class
this.class.add('a', 'b', 'c');      // several
this.class.add(() => cond ? 'on' : 'off'); // reactive contribution
this.class.remove('active');        // remove
this.class.remove('**');            // clear every class and reactive watcher
```

## `style` {#style}

`style` takes a string, an object or a getter:

```tsx
<div style="color: red; font-weight: bold;" />
<div style={{ verticalAlign: 'top', width: '33%' }} />
<div style={() => ({ opacity: state.visible ? 1 : 0 })} />
```

A getter is **live**: it is reapplied when its dependencies change; keys missing from the getter's new result are cleared (`color` is removed in a `{color}` → `{opacity}` transition). If the getter returns a string, `cssText` is replaced entirely (other inline styles on that element go too). `x-style={...}` is exactly the same as `style`.

It can also be applied through the component; `style(fn)` keeps a single watcher, calling it again stops the previous one:

```ts
this.style({ color: 'red' });                 // one-off
this.style('color: red;');                    // one-off
this.style(() => ({ opacity: state.o }));     // reactive
```

## Placing ready components as children {#component-children}

You can collect JSX pieces in a variable and put them in a child position; if the value is a component or an array of components, it is placed into `controls` without being converted to text:

```tsx
const parts = [<span>a</span>, <span>b</span>];
const one = <em>single</em>;
return <div>{parts}{one}{this.childs}</div>;
```

If the value is not a component (a string, a number…), the usual reactive text binding is set up. So you do not have to declare separately whether a prop is **a component or data**:

```tsx file=src/Card.tsx variant=function
export function Card(props) {
  return (
    <div class="card">
      {props.headerTemplate}   {/* component → placed */}
      {props.title}            {/* string    → reactive text */}
    </div>
  );
}
```
```tsx file=src/Card.tsx variant=class
import { Component } from '@motifx/core';

export class Card extends Component {
  view() {
    return (
      <div class="card">
        {this.props.headerTemplate}   {/* component → placed */}
        {this.props.title}            {/* string    → reactive text */}
      </div>
    );
  }
}
```
```tsx file=src/Card.tsx variant=options
export const Card = () => ({
  el: 'div',
  view() {
    return (
      <div class="card">
        {this.props.headerTemplate}   {/* component → placed */}
        {this.props.title}            {/* string    → reactive text */}
      </div>
    );
  },
});
```

```tsx
<Card headerTemplate={<h1>Heading</h1>} title="Subtitle" />
```

### Write a getter if the template will change later {#template-getter}

The placement decision is made **at setup time** and is **one-off**: if the prop holds a component while it is set up, it is placed; even if it changes later the DOM is not updated (the placed component's own bindings stay live as usual).

If the template is `null` at first and arrives later, or is swapped at runtime, write a **getter** — this sets up a slot (`Frame`) and refreshes the content on every change:

```tsx
<div class="card">{() => props.headerTemplate}</div>
```

If a component lands in a text binding later without a getter, the framework writes nothing to the DOM and, in development mode, suggests the getter form with the `MJX204` warning.

## Raw HTML — `x-html` {#x-html}

Use `x-html` to set an element's `innerHTML` reactively:

```tsx
<h1 x-html={() => state.heroTitle}></h1>
```

> Security: `x-html` injects unescaped HTML. Use it only with content you trust.

## Events {#events}

`on...` props bind to DOM events. The handler can be written with the `(sender, event)` signature or just `(event)`:

```tsx
<button onclick={() => console.log("click")}>A</button>
<button onclick={(s, e) => s.context.navigate('/home')}>B</button>
<input onchange={(e) => console.log(e.target.value)} />
```

An error thrown by the handler (including a rejected promise in an async handler) is reported to `errorHandler` with code `MJX123`.

Event names are written in lowercase (`onclick`, `onchange`, `oninput`). Modifiers (`:once`, `:prevent`, `:stop` etc.) are supported; since a JSX attribute name can hold a single `:`, one modifier per attribute is written on the tag — see [Events](./events.md) for details.

The `on:name` / `on-name` / `on_name` spelling binds the handler as it is to the tag's component with `motif.on("name", fn)` (only the prefix is dropped: `on-my-event` → `my-event`, `on_my_event` → `my_event`); it is also used for custom events (`motif.trigger`), with the same parameter-count rule:

```tsx
<Editor on:save={(e) => console.log(e)} />            {/* one parameter: the event data */}
<button on:click={(s, e) => s.motif.hide()}>C</button> {/* two parameters: sender + event */}
```

## Special `x-` attributes {#x-directives}

Helper props the compiler recognises that are not DOM attributes:

| Attribute | Function |
|-----------|----------|
| `x-ref={(s) => ...}` / `x-ref={this.field}` | Captures the tag's component instance; the same as the short `ref`, and both forms work on every tag. If `ref` and `x-ref` are both written on the same tag, both run in source order — see [Components](./components.md#element-and-ref). |
| `x-key={...}` | The same as `key` (`indexkey` is accepted too); see [Item identity with `key`](#key). |
| `x-text={() => text}` | Sets the element's `textContent` reactively (`bindings.text`); does the same job as `{() => text}` in a child position. |
| `x-html={() => html}` | Sets `innerHTML` reactively (`bindings.html`). |
| `x-value={() => value}` | Sets the element's `value` property one-way, reactively (`bindings.value`); for two-way use `x-model`. |
| `x-model={() => state.field}` | Two-way binding; compiled to `bindings.model(getter, setter)` — see [Forms](./forms.md). |
| `x-watch={() => ...}` | Sets up a watcher tied to the tag's component (`bindings.watch`): reactive reads inside the function are tracked, it runs again on change, and stops when the component is disposed. Writes nothing to the DOM. |
| `x-wait={() => bool}` | Holds/hides the component while the condition is `true`. **The primary way of conditional rendering.** |
| `x-display={() => bool}` | The inverse of `x-wait`: shows while the condition is `true`, hides while `false`. |
| `x-style={...}` | The same as `style` (getter is live). |
| `x-building`, `x-built`, `x-config`, `x-configured`, `x-mounted`, `x-activated`, `x-deactivated`, `x-disposing`, `x-disposed`, `x-initializing`, `x-initialized`, `x-visibilitychanged` | Lifecycle hooks in prop form (the `x:` spelling is valid too). Several spellings on the same tag, such as `onbuilt` with `x-built`, are merged and all run in source order. |

`x-text`, `x-html`, `x-value`, `x-model` and `x-watch` expect a getter, a method reference or an object; a plain string/boolean stops compilation with `MJX011`.

An `x-` name the compiler does not recognise produces the `MJX007` warning; `x-reload`, `x-bind`, `x-effect`,
`x-focus`, `x-interrupt`, `x-to`, `x-list` and `x-loop` are unsupported and stop compilation with
`MJX006` (see [Compile errors](#compile-errors)).

An `x-wait` and `x-display` example:

```tsx
<div x-wait={() => state.items.length === 0}>List ready</div>
<div x-display={() => state.isOpen}>Open panel</div>
```

If the condition is `true` on the first evaluation (`false` for `x-display`), the component is **never built** — its
subtree does not enter the DOM either. When it opens later it is built once; when it closes again the instance is kept.
`{cond && <X/>}`, on the other hand, builds a new instance on every open and disposes it on every close; see
[Conditional Rendering and Lists](./conditionals-and-lists.md) for a detailed comparison.

## Ternaries in attributes {#attribute-ternary}

A ternary written on an attribute or a component prop is **always wrapped lazily**:

```tsx
<Comp mode={state.open ? 'overlay' : 'inline'} />
//   → mode: () => state.open ? 'overlay' : 'inline'
```

This is a deliberate design decision: without the wrap the expression would be evaluated once during `view()` and
freeze. The counterpart is that the component receiving the prop declares and reads it as `Bind<T>`:

```tsx
import { Bind, toGetter, read } from "@motifx/core";

interface Props { mode: Bind<'overlay' | 'inline'>; }
const mode = toGetter(props.mode);      // live
const current = read(props.mode);       // instant read
```

A component that uses a plainly typed prop directly breaks this contract and receives a function at
runtime. Other expressions (`{p.a}`, `{f()}`, `{a && b}`) are not wrapped; they are passed as values.

## Compile-time diagnostics {#compile-time-diagnostics}

`@motifx/compiler` reports a few JSX forms that silently misbehave to the terminal during compilation.
Warnings do **not** stop compilation; they appear next to the code with file, line and a code frame.

| Code | What it catches | The fix |
|------|-----------------|---------|
| `MJX001` | Declaring a local variable inside a block-bodied arrow function in a JSX child position and returning a condition. The compiler hoists the condition out of the closure, the variable is not visible in the branches and you get a `ReferenceError`. | Use an expression-bodied arrow or move the logic into a named method. |
| `MJX002` | A **camelCase** DOM event name on a component tag (`onChange`, `onClick`). It looks like a callback prop but becomes a DOM listener on the root; `this.props.onChange` stays undefined. | Pick a non-colliding name (`onValueChange`, `onConfirm`). For a deliberate DOM listener write lowercase: `<Button onclick={…}>` — that produces no warning. |
| `MJX003` | No `key` on a list item built with `.map()` / `.forEach()`. Rows are matched by the item object (by value for primitive items), so `key` does not change DOM reuse. | Give the item root a stable key: `key={item.id}`; it identifies the item and is checked for duplicates (`MJX202`). See [`key` and item identity](./conditionals-and-lists.md#key-and-identity) for how rows are matched. |
| `MJX004` | `some`/`every`/`find` on a `this.`-rooted array inside a reactive getter. The predicate stops at the first match, so the rest of the array is not recorded as a dependency. | Keep the result in a field or walk the whole array (`filter(...).length > 0`). |
| `MJX007` | An `x-` name the compiler does not recognise (`x-checked`). The value is passed as an `on<name>` prop (`onchecked`) and usually does nothing. | Use one of the supported directives or a plain prop/attribute. |

To turn the warnings off give `diagnostics: false` to the Vite plugin:

```ts file=vite.config.ts
compiler({ diagnostics: false })
```

### Compile errors {#compile-errors}

The following forms cannot be lowered to working code; the compiler stops and reports the error with file,
line and a code frame. The error object's `code` field holds the code.

| Code | What it catches | The fix |
|------|-----------------|---------|
| `MJX006` | An unsupported directive: `x-reload`, `x-bind`, `x-effect`, `x-focus`, `x-interrupt`, `x-to`, `x-list`, `x-loop`. | `x-wait`/`x-display` for conditions, `{items.map(i => <X key={i.id}/>)}` for lists, `effect(...)` or `x-watch` for effects, the `focus={() => …}` element method or `ref` for focus. |
| `MJX008` | A `function () { … }` expression in a child position. | Write an arrow function: `{() => …}`. |
| `MJX009` | A string or boolean value on a DOM event (`onclick="go()"`). | Give a handler function: `onclick={() => go()}`. |
| `MJX010` | A non-function value on a lifecycle hook (`onbuilt="x"`). | Give a function or a reference to one. |
| `MJX011` | A value that cannot be turned into a getter on the `x-text`, `x-html`, `x-value`, `x-model`, `x-watch` directives (`x-text="plain"`). | Give a getter or a reference: `x-text={() => state.name}`. |
| `MJX012` | An object literal on the `x-wait`/`x-display` directive. | Give an expression or getter returning a boolean. |
| `MJX013` | A JSX tag name or child node type the compiler does not recognise. | Write the tag as a component or an HTML tag. |

### Type-aware check: `motif-lint` (MJX005) {#motif-lint}

The compiler cannot see prop **types**. Since a ternary in an attribute is always wrapped in `() => …`
(see [Ternaries in attributes](#attribute-ternary)), in `<Icon name={ok ? 'a' : 'b'}/>` the component
receives a function at runtime if `name` is declared as a plain `IconName`; TypeScript sees no problem either,
because the ternary's type is `IconName`. A separate check running over the TypeScript program closes this gap:

```sh
npx motif-lint                      # ./tsconfig.json
npx motif-lint -p tsconfig.app.json src/pages/Home.tsx   # one project / one file
npx motif-lint --json --no-fail     # machine output for CI, exit code 0
```

| Code | What it catches | The fix |
|------|-----------------|---------|
| `MJX005` | A ternary written on a component prop whose **declared** type does not accept a function (`name: IconName`). | Declare the prop as `Bind<T>` in the component and read it with `read()`/`toGetter()`. If the value really is static, compute the ternary outside JSX and pass the variable. |

The rule is silent on DOM tags, on props typed `Bind<T>`/`any`/`unknown`/function, on `key`/`x-*`/`on:*`
names and on generic (`value: T`) props. The exit code is 1 when there are findings; you can put
`"lint:jsx": "motif-lint"` in `package.json` and wire it into CI. If `tsconfig` cannot be read the command
stops with the `MJX014` error.

## What did this expression compile to? — `explain` {#explain}

In MotifJS, JSX is not a view language but shorthand for the binding API (`bindings.add`, `bindings.when`,
`controls.add`…); the compiler is not a transformer but a **lowering** pass in the classic sense.
Looking for resemblance between source and output is pointless; but "what happens when this runs" is not
left to guesswork. `explain`, which works like a compiler's `-S` flag, writes for every JSX expression
**the actual call it lowers to** (taken from the generated code, not guessed), its reactivity class and its
dependency surface:

```sh
npx motif-explain src/pages/Home.tsx            # readable dump
npx motif-explain src/pages/Home.tsx --site prop   # component props only
npx motif-explain src/pages/Home.tsx --json --code # machine output + generated code
```

```text
[motifjs explain] src/pages/Home.tsx — 9 expressions
  9:21     child/text.field         {this.state.name}
           => sender.bindings.add("textContent", this.state, "name")
           LIVE · deps: this.state.name — this field only (exact)
  10:20    child/method             {() => this.state.name + '!'}
           => sender.bindings.method(() => this.state.name + '!')
           LIVE · deps: ALL reactive fields read inside the getter; collected again on every run
           note: reactive text if the result is text, a Frame if it is a component (the instance is rebuilt on every change)
  8:50     attr/attr.call           data-n={fmt(this.state.count)}
           => sender.attr.add({ "data-n": fmt(this.state.count) })
           ONCE · deps: none — evaluated once during setup, then frozen
           note: a plain function call is passed as a VALUE; write `() => f(x)` to keep it live
  17:23    prop/prop.ternary        name={this.state.open ? 'check' : 'error'}
           => name: () => this.state.open ? 'check' : 'error'
           RECEIVER · deps: wherever the receiving component reads the getter; nowhere if it does not
           note: ternary wrapped lazily (by design): the receiving component should declare the prop as Bind<T> and read it with read()/toGetter()
```

Reactivity classes:

| Class | Meaning |
|-------|---------|
| `LIVE` | An effect is set up; the DOM updates when the dependencies change. |
| `STATIC` | A literal (string, number, negative number, boolean, `null`); no binding is set up. |
| `ONCE` | The expression is evaluated once at setup, then frozen (`attr={f(x)}`, `prop={object}`). |
| `RECEIVER` | The expression is passed as a function; liveness depends on the receiving component's `Bind<T>` contract. |
| `RUNTIME` | The value's kind is known at runtime: live if it is a function, once otherwise (`attr={variable}`). |

To see the same dump on the dev server give `explain` to the Vite plugin; a string or RegExp dumps only
matching files, the output code is unchanged:

```ts file=vite.config.ts
compiler({ explain: 'pages/Home' })
```

Programmatic use: `import { explain } from '@motifx/compiler'` → `explain(source, fileName)` returns a
`MotifExplanation[]` (`site`, `shape`, `source`, `lowered`, `reactive`, `deps`, `note`).

## Item identity with `key` {#key}

Give list items a `key`. `key` identifies the item and is checked for duplicates in development mode (`MJX202`); rows are matched by the item object, not by `key`. See [Conditional Rendering and Lists](./conditionals-and-lists.md#key-and-identity) for details:

```tsx
{state.items.map(item => <li key={item.id}>{item.text}</li>)}
```

## Transitions — the `transition` prop {#transition}

The `transition` prop gives a component an enter/leave animation. A string gives a Vue-style CSS class transition; an object lets you specify custom class names:

```tsx
<div transition="fade">Content</div>
```

This applies the `fade-enter-from/active/to` and `fade-leave-from/active/to` CSS classes. For details and WAAPI (keyframe) based animation see [Styling and Transitions](./styling-and-transitions.md).

On a plain DOM tag `transition` writes no attribute; it goes to the transition engine. The `options` prop is the same: in `<div options={{ hideStrategy: 'detach', disableDisposal: true }}/>` the `hideStrategy` and `disableDisposal` are copied into that tag's `motif.options`, and no attribute is written to the DOM.

## The non-reactive local variable trap {#local-variable-trap}

The following code **does not update**, because `label` is a plain local variable:

```tsx
let label = state.count + " items";
<span>{label}</span>   // the text does not change even when count does
```

The right way is a getter:

```tsx
<span>{() => state.count + " items"}</span>
```

## Next step {#next}

Continue with [Reactivity](./reactivity.md) to learn reactive state in detail.
