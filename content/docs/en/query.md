---
slug: query
title: Collection Queries (Query)
description: LINQ-style where/select/orderBy/groupBy chains with Query.from, the result-producing methods and use with reactivity.
category: reference
order: 2
---

`Query<T>` is a small wrapper for querying an array, or any iterable source, LINQ-style. It lets you write steps such as filtering, transformation, sorting and grouping readably in a single chain.

```tsx
import { Query } from "@motifx/core";

const adults = Query.from(people)
  .where(p => p.age >= 18)
  .orderBy(p => p.name)
  .select(p => p.name)
  .toArray();
```

`Query` is optional: it enters the bundle only when you import it, and it changes no global object, `Array.prototype` included. A query always starts with `Query.from(...)`.

## Creating a query {#creating}

| Form | Description |
|------|-------------|
| `Query.from(source)` | Produces a query from the source. |
| `new Query(source)` | The same as `Query.from`. |

`source` may be an array or any `Iterable<T>`: `Set`, `Map.keys()`, `Map.values()`, generator functions, reactive arrays.

```tsx
Query.from(new Set(["a", "b"]));
Query.from(map.values());
Query.from(state.items);          // a reactive array
```

If the source is an array it is not copied; it is read directly. Other iterables are copied into an array at the moment of `Query.from`. The source array is not changed in any step.

## Chained steps {#chaining}

These methods return a new `Query`; another step can be appended after them.

| Method | Description |
|--------|-------------|
| `where(predicate)` | Keeps the items satisfying the condition. `predicate(item, index)`. |
| `select(selector)` | Transforms every item. `selector(item, index)`. |
| `orderBy(keySelector)` | Sorts ascending by key. |
| `orderByDescending(keySelector)` | Sorts descending by key. |
| `distinctBy(keySelector)` | Keeps only the first of the items sharing a key. |
| `groupBy(keySelector)` | Splits the items into `{ key, items }` groups; the result is `Query<Group<TKey, T>>`. |

## Result-producing methods {#terminal}

These methods end the chain and return a value.

| Method | Returns | Description |
|--------|---------|-------------|
| `toArray()` | `T[]` | Copies the result into a new array. |
| `first()` | `T` | The first item; throws a `MotifError` (`MJX601`) if the query is empty. |
| `firstOrDefault()` | `T \| undefined` | The first item; `undefined` if the query is empty. |
| `any(predicate?)` | `boolean` | Without a predicate "is there at least one item", with one "is there an item satisfying the condition". |
| `all(predicate)` | `boolean` | Do all items satisfy the condition. |
| `aggregate(seed, func)` | `TResult` | Reduces the items to a single value starting from `seed`. |

Since `Query` is iterable it can be walked directly without calling `toArray()`:

```tsx
for (const name of Query.from(people).select(p => p.name)) {
  console.log(name);
}

const names = [...Query.from(people).select(p => p.name)];
```

## Examples {#examples}

### Sorting {#sorting}

```tsx
const byAge = Query.from(people)
  .orderByDescending(p => p.age)
  .toArray();
```

The sort is stable: items with equal keys keep their order from the source. Keys are compared with `<` and `>`; number, string and `Date` keys work as expected. Strings are sorted by character code; if a locale-aware order is needed, sort the result yourself:

```tsx
const byName = Query.from(people).toArray().sort((a, b) => a.name.localeCompare(b.name, "tr"));
```

### Grouping {#grouping}

```tsx
const byCity = Query.from(people)
  .groupBy(p => p.city)
  .select(g => ({ city: g.key, count: g.items.length }))
  .toArray();
```

Groups come in the order the key first appears in the source. Key equality is decided by `Map` rules; object keys are grouped by reference, not by value.

### Aggregation {#aggregation}

```tsx
const total = Query.from(order.lines).aggregate(0, (sum, line) => sum + line.price * line.qty);
const hasOverdue = Query.from(invoices).any(i => i.dueDate < today);
```

## Use with reactivity {#reactivity}

`Query` reads reactive arrays with ordinary array methods; so when it is used inside a getter, a `createComputed` or an `effect`, a dependency on the source is set up and the result is recomputed when the source changes.

In lists, put the query in a getter and do the rendering with the usual `.map` form. The compiler turns the `this.visible.map(...)` expression (`visible().map(...)` in a function) into `bindings.list`; rows are matched by the item object and the same object's DOM nodes are reused (`key` does not take part in that matching; it identifies the item) ([Conditional Rendering and Lists](./conditionals-and-lists.md)).

```tsx file=src/PeopleList.tsx variant=class
import { Component, Query, reactive } from "@motifx/core";

export class PeopleList extends Component {
  state = reactive({ people: [] as Person[], filter: "" });

  get visible() {
    return Query.from(this.state.people)
      .where(p => p.name.includes(this.state.filter))
      .orderBy(p => p.name)
      .toArray();
  }

  view() {
    return (
      <ul>
        {this.visible.map(p => <li key={p.id}>{p.name}</li>)}
      </ul>
    );
  }
}
```
```tsx file=src/PeopleList.tsx variant=function
import { Query, reactive } from "@motifx/core";

export function PeopleList() {
  const state = reactive({ people: [] as Person[], filter: "" });
  const visible = () => Query.from(state.people)
    .where(p => p.name.includes(state.filter))
    .orderBy(p => p.name)
    .toArray();

  return (
    <ul>
      {visible().map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}
```
```tsx file=src/PeopleList.tsx variant=options
import { Query, reactive } from "@motifx/core";

export const PeopleList = () => ({
  el: 'div',
  data: reactive({ people: [] as Person[], filter: "" }),

  visible() {
    return Query.from(this.data.people)
      .where(p => p.name.includes(this.data.filter))
      .orderBy(p => p.name)
      .toArray();
  },

  view() {
    return (
      <ul>
        {this.visible().map(p => <li key={p.id}>{p.name}</li>)}
      </ul>
    );
  },
});
```

Do not write `get visible()` on an Options object: while the object's fields are copied onto the component the getter is evaluated once and its result is copied as a plain array; a method (`visible()`) runs again on every read.

When the `people` array or `filter` changes the chain runs from the start and the list applies only the difference to the DOM. For very large lists use the `Virtualization` component in [Virtualization](./virtualization.md).

## Things to know {#notes}

- **Evaluation is immediate.** Every chain step produces its own intermediate array; there is no lazy evaluation as in LINQ. Up to a few thousand items the cost is negligible.
- **The source does not change.** `orderBy` and `orderByDescending` sort a copy of the source; `toArray()` returns a new array on every call.
- **The result is a snapshot.** Every step runs the moment it is called; items added to the source later are not reflected in previously computed step results. (`Query.from(array)` with no step applied does not copy the array, so it reads the array's current state; a non-array source is copied at the moment of `from`.) For an up-to-date result build the chain inside a getter and rerun it on every read.
- **The chain returns a `Query`.** The result of steps such as `where`, `select` and `groupBy` is a `Query`, not an array (`groupBy` → `Query<Group<TKey, T>>`); add `toArray()` at the end where an array is needed.

See: [Reactivity](./reactivity.md), [API Reference](./api-reference.md).
