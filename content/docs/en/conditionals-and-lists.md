---
slug: conditionals-and-lists
title: Conditional Rendering and Lists
description: x-wait/x-display, && and the ternary operator, .map lists, key and item identity, switch and the binding API.
category: core
order: 4
---

In MotifJS the primary way of conditional rendering is the `x-wait` directive; lists are written with `.map` inside JSX. The `@motifx/compiler` compiler turns these into the appropriate reactive bindings (`bindings.wait`, `bindings.display`, `bindings.when`, `bindings.ternary`, `bindings.list`, `bindings.switchCase`, `bindings.method`). This section covers both the JSX forms and the binding API underneath.

## Conditional rendering {#conditional}

### `x-wait` — the primary method {#x-wait}

The natural MotifJS way of showing an element conditionally is the `x-wait` directive. As long as the function
returns `true` the element **waits**; when it becomes `false` the element appears:

```tsx
const state = reactive({ loggedIn: false });

<p x-wait={() => !state.loggedIn}>Welcome!</p>
```

Read it as "wait until this condition holds". If you want to write the inverse, `x-display` is the same
mechanism flipped — it shows while `true`:

```tsx
<p x-display={() => state.loggedIn}>Welcome!</p>
```

Both work on every kind of tag: plain DOM elements, class components, function components.

### Why `x-wait`? {#why-x-wait}

- **Lazy setup.** If the condition is `true` on the first evaluation, the element is never `build()`-ed. Neither
  it nor its subtree enters the DOM; a placeholder is left instead. A heavy panel that is closed at startup
  costs nothing.
- **The instance is kept.** Once built, opening and closing it only shows/hides. The component is not
  disposed; its internal state (scroll position, form input, third-party plugin) stays as it is.
- **Synchronous first paint.** Both are written by the time `build()` returns. The same holds for `&&`, the
  ternary and `{this.part()}` returning JSX: the first content lands synchronously in an empty `Frame`.
  Later branch changes are asynchronous.

In both modes the hidden element leaves the DOM and the bindings of its subtree are suspended; `hideStrategy` decides the difference: the default `'placeholder'` leaves a comment node in the element's place and swaps it back when showing; `'detach'` removes it without a trace and reinserts it according to its order among the parent's children when showing (the default for list rows). See [Visibility](./lifecycle.md#visibility).

### `&&` — build and dispose {#logical-and}

`{cond && <X/>}` is supported too and compiles to `sender.bindings.when(condFn, renderFn)`.
The difference is in behaviour: every time the condition becomes true **a new instance is built**, every
time it becomes false that instance is **disposed**.

The branch is rebuilt only when the condition's **value** changes (`Object.is`; two falsy values count as
the same). As long as the value stays the same the branch keeps the component instance and its state:
`{state.n > 0 && <X/>}` keeps the same `X` while `n` goes 1 → 2 → 3. If the condition's value is an
object (`{state.user && <X/>}`), the branch is rebuilt when `state.user` is replaced with another object.

```tsx
<div>
  {state.loggedIn && <p>Welcome!</p>}
</div>
```

So choose `&&` only when you want the build/dispose itself: when a third-party plugin really has to be
destroyed, or the content is so heavy it must not stay in memory. In every other case `x-wait` is cheaper
and more predictable.

The condition is evaluated by **JS truthiness**: for `false`, `null`, `undefined`, `0`, `''` and `NaN`
nothing is drawn. So `{user && <Profile/>}` (object or `null`) and `{items.length && <List/>}`
(number) behave as expected. This rule holds both inside a real element and as a direct child of a
**fragment** (`<>…</>`) root.

### Which one to choose? {#which-one}

| Situation | Method |
|-----------|--------|
| Show/hide, state must be kept | `x-wait` / `x-display` |
| Closed at startup, heavy content | `x-wait` (never built) |
| Must really be disposed on every close | `{cond && <X/>}` |
| One of two branches | the ternary operator |
| Only text changes | a getter |

### The ternary operator — one of two branches {#ternary}

```tsx
<div>
  {state.loading
    ? <Spinner />
    : <Content data={state.data} />}
</div>
```

This compiles to `sender.bindings.ternary(...)`. As the condition changes the matching branch is shown and the
other is disposed. If both branches are light this is the most readable form; if they are heavy, placing two
elements side by side with `x-wait` / `x-display` keeps the instances.

The branch is rebuilt only when the condition's value changes (`Object.is`); in a nested ternary the inner
branch is also kept as long as the outer condition's value stays the same. `{state.n > 0 ? <X/> : <Y/>}` does
not rebuild `X` while `n` goes 1 → 2.

### Component props inside a branch {#branch-props}

A prop given to a component inside a branch with a plain expression is, just as outside the condition, **the
value at the moment the branch was built**. `<Badge count={state.n} />` does not see a value written to
`state.n` later, `<Content data={state.data} />` does not see a new object assigned to `state.data` later; the
branch is not rebuilt unless the condition's value changes. To keep the prop live, pass a getter and read it in
the receiver through the `Bind<T>` contract (see [Ternaries in attributes](./jsx.md#attribute-ternary)):

```tsx
<Badge count={() => state.n} />

interface BadgeProps { count: Bind<number>; }
// inside Badge: <span>{() => read(this.props.count)}</span>
```

### Conditional text inside a getter {#conditional-text}

For simple text a getter is enough; not even the element changes:

```tsx
<span>{() => state.completed ? '✅' : '❌'}</span>
```

## Lists — `.map` {#lists}

Mapping an array into items with `.map` sets up a reactive **list binding**:

```tsx
const state = reactive({
  todos: [
    { id: 1, title: "Groceries", done: false },
    { id: 2, title: "Workout", done: true },
  ],
});

<ul>
  {state.todos.map(todo => (
    <li key={todo.id}>
      {todo.title}
    </li>
  ))}
</ul>
```

This compiles to `sender.bindings.list(itemsFn, renderFn)`. When the array changes (add, remove, reorder), MotifJS applies **only the difference** to the DOM — it does not rebuild the whole list.

### `key` and item identity {#key-and-identity}

Rows are matched by **the identity of the item object**: if the same object (the raw object behind the reactive proxy) is still present in the new array, its row is reused and moved in the DOM if necessary; the row of an object missing from the array is disposed. If new objects are put into the array (e.g. a fresh list from the server), the rows are rebuilt even if they carry the same `id`. The same object may appear in the array more than once (`push(items[0])`, `splice(i, 0, items[j])`); each occurrence gets its own row, all show the same object and a change to the object is reflected in all of them. Array methods do not copy the item; if an independent copy is needed, copy explicitly: `items.splice(i, 0, { ...items[j] })`. In arrays of primitives (`string[]`) the same value at the same position keeps its row; if the template function does not take the second argument (`index`), the same value keeps its row even when it moves.

`key` takes no part in this matching and does not change DOM reuse; it identifies the item. Still give a stable, unique value (usually `item.id`): if the same `key` is seen on two items a `MJX202` warning is given in development mode, and for a `.map` without `key` the compiler warns with `MJX003`. The names `x-key` and `indexkey` are the same as `key`.

### Reactivity inside items {#item-reactivity}

List items are reactive too. When an item field changes only that item's relevant node is updated:

```tsx
{state.todos.map(todo => (
  <li key={todo.id}>
    <input
      type="checkbox"
      checked={() => todo.done}
      onchange={(e) => todo.done = e.target.checked}
    />
    <span class={() => todo.done ? 'done' : ''}>{todo.title}</span>
  </li>
))}
```

The second argument of `.map` works as in JS: inside `items.map(function (i) { … }, ctx)`, `this` is `ctx`. An arrow function keeps its own `this`.

### Filtering {#filtering}

The `.filter().map()` chain is supported; if the condition depends on reactive sources the filter is reactive too:

```tsx
<ul>
  {state.todos.filter(t => !t.done).map(t => <li key={t.id}>{t.title}</li>)}
</ul>
```

## `switch`-like multiple branches {#switch}

To show different content according to a discriminator value there is the `switchCase` binding (the compiler turns a `switch` construct into it):

```ts
this.bindings.switchCase(
  () => state.status,               // discriminator
  {
    loading: (frame) => frame.navigate(<Spinner />),
    ready:   (frame) => frame.navigate(<Content />),
    error:   (frame) => frame.navigate(<ErrorView />),
  },
  (frame) => frame.navigate(<Empty />) // default (optional)
);
```

Each branch receives a `Frame`; you place that branch's content with `frame.navigate(...)`. The discriminator's value is turned into a key with `String(...)`; if the same value comes again in a row the branch is not rebuilt.

In JSX this is written as a `switch` inside a block-bodied getter; the compiler turns the branch each `case` `return`s into `switchCase`:

```tsx
<div>
  {() => {
    switch (state.status) {
      case 'loading': return <Spinner />;
      case 'ready':   return <Content />;
      case 'error':   return <ErrorView />;
      default:        return <Empty />;
    }
  }}
</div>
```

`case` labels must be string, number or boolean **literals**; `case`s that are variables or expressions are skipped in the transformation. A branch without `return` places empty content.

## Using the binding API directly {#binding-api}

If you prefer imperative code to JSX, you can call the methods on `this.bindings` directly. The JSX compiler produces these anyway: JSX is **shorthand** for these calls, and the same API can be written in plain TS. Instead of guessing which JSX form lowers to which call, print it: `npx motif-explain file.tsx` (see [What did this expression compile to?](./jsx.md#explain)).

| Method | Function |
|--------|----------|
| `bindings.add(prop, source, member?, format?, formatInfo?)` | Sets up a one-way binding to a DOM property/attribute. |
| `bindings.text(fn)` | Binds `textContent` reactively (`x-text`). |
| `bindings.value(fn)` | Binds `value` reactively (`x-value`). |
| `bindings.html(fn)` | Binds `innerHTML` reactively (`x-html`). |
| `bindings.when(condFn, renderFn)` | Conditional content (`&&`) — a new instance when the condition's value changes and is truthy. |
| `bindings.ternary(condFn, trueFn, falseFn)` | A two-branch condition; the branch is rebuilt when the condition's value changes. |
| `bindings.list(itemsFn, renderFn)` | List rendering (`.map`); rows are matched by the item object. |
| `bindings.loop(itemsFn, renderFn)` | The same as `list`; an alternative name. |
| `bindings.switchCase(discFn, cases, defaultFn?)` | Multiple branches. |
| `bindings.method(fn)` | Reactive text or reactive single content; `fn` is called once per run. Strings, numbers, booleans and bigints are written as text; a component is placed in a `Frame`. The result may switch between text and a component; the new content is drawn in the same place. If `null`/`undefined` comes instead of a component, the place is emptied and the previous component is disposed; a component coming later fills the place again. |
| `bindings.watch(fn)` | A side-effect watcher (`x-watch`; stops automatically on dispose). |
| `bindings.model(source, member?, format?, formatInfo?)` / `bindings.model(getter, setter)` | Two-way binding (see [Forms](./forms.md)). |
| `bindings.wait(fn)` / `bindings.display(fn)` | Waiting / visibility (`x-wait` / `x-display`) — the instance is kept. |
| `bindings.remove(binding)` | Removes a binding from the collection and deactivates it; with the `IBaseBinding` returned by `add`/`list`/`wait`… calls. |

### A `bindings.add` example {#bindings-add}

```tsx
<input
  type="checkbox"
  onconfig={(s) => {
    // bind the 'checked' DOM property to the todo.completed field
    s.bindings.add('checked', todo, 'completed');
  }}
/>
```

The `bindings.add` signatures:

```ts
add(propertyName: string, dataSource: any): IBaseBinding;
add(propertyName: string, dataSource: any, dataMember: string): IBaseBinding;
add(propertyName: string, dataSource: any, dataMember: string, formatString: string): IBaseBinding;
add(propertyName: string, dataSource: any, dataMember: string, formatString: string, formatInfo: { locale?: string | string[]; currency?: string }): IBaseBinding;
add(binding: IBaseBinding): IBaseBinding;
```

`dataSource` alone may also be a getter (`add('textContent', () => state.name)`); when `dataMember` is given, that field is read. The `formatString` codes: for numbers `C` currency, `P` percent, `N`/`N2` fixed decimals (default 2); for `Date` values `d` date, `t` time. Locale and currency come from `formatInfo`: `bindings.add('textContent', state, 'price', 'C', { locale: 'en-US', currency: 'USD' })` → `$1,234.50`. Without `locale` the runtime's default locale is used; without `currency`, `C` writes the amount with two decimals and no symbol.

### A `bindings.list` example {#bindings-list}

```ts
this.bindings.list(
  () => state.items,                  // item source (a function returning an array or iterable)
  (item, index) => <li>{item.name}</li> // item template
);
```

## Large lists {#large-lists}

For lists of thousands of items use **virtual scrolling** instead of putting every item into the DOM. MotifJS provides the `Virtualization` component for this — see [Virtualization](./virtualization.md).

## Next step {#next}

Continue with [Events](./events.md) to learn event handling.
