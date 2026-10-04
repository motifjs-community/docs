---
slug: collections
title: Collections
description: "The API and behaviour of the List, Dictionary, NameValuePair and LinkedList structures that ship with @motifx/core."
category: reference
order: 3
---

The core exports three small collection classes. They are not reactive; for a reactive list use `reactive([])` ([Reactivity](./reactivity.md)). For querying see [Collection Queries](./query.md).

## `List<T>` {#list}

An array wrapper that raises add/remove events and does `Set`-backed membership checks.

```ts
import { List } from "@motifx/core";

const list = new List<string>();
list.ItemAdded = (x) => console.log('added', x);
list.Add('a');            // 0 — the index of the added item
list.AddBefore('z');      // prepends
list.Insert(1, 'm');      // inserts at the index
list.has('a');            // true
list.item(0);             // 'z'
list.count;               // 3
list.items;               // the internal array (not a copy)
```

| Member | Description |
|--------|-------------|
| `Add(item)` | Appends, returns the index; `ItemAdded(item)` is called. |
| `AddBefore(item)` | Prepends; `ItemAddedBefore(item)` is called. The return value is `newLength − 1` (not the index of the added item). |
| `Insert(index, item)` | Inserts at the given index; `ItemSplice(index, item)` is called. Returns the empty array `splice` returns. |
| `remove(item)` | Removes the item and returns the removed one as a single-element array; if the item is not in the list it does nothing and returns an empty array. |
| `removeIndex(index)` | Removes the item at the index; returns the removed ones as an array. |
| `clear()` | Removes everything; returns the new empty internal array. |
| `has(item)` / `indexOf(item)` / `item(index)` | Membership (`Set`, O(1)) / index / item by index. |
| `FindFromKey(key, value)` | The items where `item[key] === value`. |
| `forEach(fn)` / `filter(fn)` | The array counterparts; `filter` returns a new array. |
| `ReverseClone()` | Returns a reverse-ordered **copy** of the items; the list's order does not change. |
| `items` / `count` | The internal array / the length. |
| `Dispose()` | Empties the internal array (the `Set` is kept). |
| `ItemAdded`, `ItemAddedBefore`, `ItemSplice` | Assignable callbacks; called after the matching addition. |

Removals raise no events. `items` gives the internal array; if it is modified from outside it becomes inconsistent with `has`.

## `Dictionary<K, V>` and `NameValuePair<K, V>` {#dictionary}

A key-value dictionary keeping `NameValuePair` pairs in a `List`. Key comparison is with `==`, lookup is linear.

```ts
import { Dictionary } from "@motifx/core";

const d = new Dictionary<string, number>();
d.OnItemAdded = (k, v) => console.log(k, v);
d.Add('a', 1);
d.has('a');              // true
d.item('a');             // NameValuePair { Key: 'a', value: 1 }
d.item('a')?.value;      // 1
d.remove('a');
```

| Member | Description |
|--------|-------------|
| `Add(key, value)` | Adds a pair (the same key may repeat; no check), returns the index from `List.Add`; `OnItemAdded(key, value)` is called. |
| `has(key)` | Does the key exist (`==`). |
| `item(key)` | The first matching `NameValuePair` or `undefined`. |
| `remove(key)` | Removes **all** pairs whose key matches. |
| `removeIndex(index)` | Removes the pair at the index (0-based); returns the removed ones as an array. |
| `clear()` | Removes everything. |
| `forEach(fn)` / `filter(fn)` / `find(fn)` | Iterating, filtering, finding over `NameValuePair`s. |
| `values` | The underlying `List<NameValuePair<K, V>>`. |
| `OnItemAdded` | An assignable callback. |

`NameValuePair<K, V>` is a plain two-field class: `Key` (capital K) and `value`.

## `LinkedList<T>` {#linked-list}

A doubly linked, circular list. Insertions return **a function that unlinks** the node; this is designed for "add, then remove with the handle you hold" patterns such as listener lists.

```ts
import { LinkedList } from "@motifx/core";

const l = new LinkedList<() => void>();
const unlinkA = l.push(a);     // to the end
const unlinkB = l.unshift(b);  // to the front
for (const fn of l) fn();      // b, a
unlinkA();                     // a is removed; a second call has no effect
l.size;                        // 1
```

| Member | Description |
|--------|-------------|
| `push(value)` / `unshift(value)` | Appends / prepends; returns a function that removes that node (a repeated call has no effect). |
| `pop()` / `shift()` | Removes from the end / the front and returns the value; `undefined` if empty. |
| `clear()` | Removes everything; previously obtained removal functions become no-ops. |
| `size` / `isEmpty()` | The element count / whether empty. |
| `[Symbol.iterator]` | Walks from front to back (`for…of`, spread). Removing while walking is safe; an added item may be seen in that walk. |

There is no index access; if access by index is needed use `List` or a plain array.

## See also {#see-also}

[API Reference](./api-reference.md#common), [Collection Queries](./query.md).
