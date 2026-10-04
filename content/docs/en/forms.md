---
slug: forms
title: Forms and Two-Way Binding
description: One-way value+oninput, two-way binding with bindings.model and x-model, select, form submission and a validation pattern.
category: core
order: 6
---

MotifJS manages form inputs in two ways:

1. **Reactive read + event write** (one-way, explicit): `value={() => state.x}` + `oninput`.
2. **Two-way binding** (`bindings.model`): the input and the model stay in sync automatically. For a one-way binding to a specific DOM property use `bindings.add`.

## The one-way (explicit) approach {#one-way}

The most transparent method. You read the value reactively and write the change to the model through an event:

```tsx
const state = reactive({ name: "", agree: false });

<form>
  <input
    type="text"
    value={() => state.name}
    oninput={(e) => state.name = e.target.value}
  />

  <input
    type="checkbox"
    checked={() => state.agree}
    onchange={(e) => state.agree = e.target.checked}
  />
</form>
```

This approach is also used on list items in real demo code:

```tsx
<input
  type="checkbox"
  checked={() => todo.completed}
  onchange={(e) => todo.completed = e.target.checked}
/>
```

## Two-way binding — `bindings.model` {#model}

`bindings.model` picks the right DOM property automatically according to the element's type and binds it two-way to the model:

| Element | Bound property |
|---------|----------------|
| `<input type="checkbox">`, `<input type="radio">` | `checked` (boolean) |
| `<input>` (other) | `value` |
| `<select>` | `value` |
| `<textarea>` | `value` |
| `<img>`, `<audio>`, `<video>` | `src` (one-way: model → element only) |

On inputs the `checked`/`value` choice is made **on every read/write** according to the element's current
`type`, not when the binding is set up: when `onconfig` sets up the binding, the `type` attribute may not have been applied yet.

The type of the value written to the model is also decided by the element:
>
> | Input | Written to the model |
> |---|---|
> | `checkbox`, `radio` | `boolean` |
> | `number`, `range` | `number` (`null` if the input is cleared) |
> | everything else (`text`, `date`, `select`, `textarea`…) | `string` |
>
> Date types deliberately stay strings: their natural model is the `'2024-01-31'` form.

```tsx
<input
  type="text"
  onconfig={(s) => s.bindings.model(state, 'name')}
/>

<input
  type="checkbox"
  onconfig={(s) => s.bindings.model(todo, 'completed')}
/>
```

Setting up the binding inside `onconfig` is the common pattern: the binding is added while the component is configured.

Signatures:

```ts
model(dataSource: any, dataMember: string): IBaseBinding;
model(dataSource: any, dataMember: string, formatString: string): IBaseBinding;
model(dataSource: any, dataMember: string, formatString: string, formatInfo: { locale?: string | string[]; currency?: string }): IBaseBinding;
model(getter: () => any, setter: (value: any) => void): IBaseBinding;
model(binding: IBaseBinding): IBaseBinding;
```

`dataMember` may also be a dotted path (`'address.city'`). In the single-argument call the object is interpreted as an `IBaseBinding`; a data source is always given together with `dataMember`. `model(dataSource, dataMember)` holds the `dataSource` object as it was at the time of the call; if that object can be replaced as a whole, use `x-model` or the getter/setter form.

### The `x-model` shorthand {#x-model}

```tsx
<input type="text" x-model={() => state.name} />
<input type="checkbox" x-model={() => todo.completed} />
```

`x-model` compiles to `bindings.model(getter, setter)` and is two-way. The write side re-reads the object that owns the member on every write (`state` for `state.name`, `row` for `row.name`, `state.form` for `state.form.name`). So the binding does not break when the object is replaced as a whole (`state.form = {...}`) or when list rows move:

```tsx
{state.rows.map(row => <input key={row.id} x-model={() => row.name} />)}
```

While the owner is `null`/`undefined` (`x-model={() => state.selected?.name}`) and while the member holds a function (a getter prop), the write is skipped. An expression without member access (`() => a + b`, `() => fn(x)`) is only read and stays one-way; `motif-explain` shows which case applies.

## Binding to a specific property with `bindings.add` {#bindings-add}

Use `bindings.add` when you want to specify the DOM property yourself. This binding is **one-way** (model → DOM); add an event handler to write the user's change to the model:

```tsx
<input
  type="checkbox"
  onconfig={(s) => s.bindings.add('checked', todo, 'completed')}
  onchange={(e) => todo.completed = e.target.checked}
/>
```

## Text input and `value` {#text-value}

For `<input>` and `<textarea>` the `value` prop is recognised specially; it takes a reactive value or a getter:

```tsx
<input value={() => state.query} oninput={(e) => state.query = e.target.value} />
<textarea value={() => state.note} oninput={(e) => state.note = e.target.value} />
```

## A `<select>` example {#select}

```tsx
const state = reactive({ lang: "en" });

<select value={() => state.lang} onchange={(e) => state.lang = e.target.value}>
  <option value="tr">Türkçe</option>
  <option value="en">English</option>
</select>
```

## Form submission {#submit}

```tsx
<form onsubmit={(s, e) => {
  e.preventDefault();
  submit(state);
}}>
  <input value={() => state.email} oninput={(e) => state.email = e.target.value} />
  <button type="submit">Send</button>
</form>
```

In `onsubmit`, the handler returning `false` also triggers `preventDefault`.

When element methods are written as JSX props no attribute is written; the method is called: `<form requestSubmit={() => state.send}>`, `<input focus={() => state.editing} />` (`false` → `blur()`), `<input setSelectionRange={[0, 5]} />`. `reportValidity`, `checkValidity`, `select`, `reset`, `submit` are in this group too; for the full list and value rules see [JSX and Templates](./jsx.md).

## A validation pattern {#validation}

MotifJS imposes no special validation API; you build it easily with reactive fields:

```tsx
const state = reactive({
  email: "",
  get emailValid() { return /.+@.+\..+/.test(state.email); }
});

<div>
  <input value={() => state.email} oninput={(e) => state.email = e.target.value} />
  <small class="error" x-wait={() => state.emailValid}>Invalid e-mail</small>
  <button disabled={() => !state.emailValid}>Save</button>
</div>
```

## Comparing the methods {#comparison}

| Method | When |
|--------|------|
| One-way (`value` + `oninput`) | When you run extra logic on change (conversion, validation, side effects). |
| `bindings.model` | When simple two-way synchronisation is enough; the least code. |
| `bindings.add('checked'/'value', ...)` + event | When you want to pick the bound property by hand (one-way; write-back through the event). |

## Next step {#next}

Continue with [Lifecycle](./lifecycle.md) to learn the component lifecycle in detail.
