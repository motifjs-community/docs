---
slug: virtualization
title: Virtualization
description: The Virtualization component; props reference, the dataRequest contract, templates, autoRefresh, filtering, the rendering model and methods.
category: advanced
order: 5
---

In lists of thousands of items, putting every item into the DOM hurts performance. MotifJS's `Virtualization` component keeps only the visible items (plus a small buffer) in the DOM and shows lists with a fixed or precomputable row height efficiently. It internalises page-based data requests (pagination).

## Basic usage {#basic-usage}

```tsx file=src/TodoList.tsx variant=class
import { Component, reactive, Virtualization } from "@motifx/core";

interface Todo { userId: number; id: number; title: string; completed: boolean; }

export default class TodoList extends Component {
  state = reactive({ todos: [] as Todo[] });

  async onConfig() {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos');
    this.state.todos = await res.json();
  }

  view() {
    return <Virtualization<Todo>
      x-wait={() => this.state.todos.length === 0}
      itemHeight={60}
      pageSize={20}
      dataRequest={async ({ page, pageSize }) => {
        const start = page * pageSize;
        const end = start + pageSize;
        return {
          items: this.state.todos.slice(start, end),
          totalCount: this.state.todos.length,
          hasMore: end < this.state.todos.length,
        };
      }}
      itemTemplate={(todo, index) => (
        <div class="todo-item">
          <input type="checkbox" checked={() => todo.completed}
                 onchange={(e) => todo.completed = e.target.checked} />
          <span>{todo.title}</span>
        </div>
      )}
    />;
  }
}
```
```tsx file=src/TodoList.tsx variant=function
import { reactive, Virtualization } from "@motifx/core";

interface Todo { userId: number; id: number; title: string; completed: boolean; }

export default function TodoList() {
  const state = reactive({ todos: [] as Todo[] });

  return <div onconfig={async () => {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos');
    state.todos = await res.json();
  }}>
    <Virtualization<Todo>
      x-wait={() => state.todos.length === 0}
      itemHeight={60}
      pageSize={20}
      dataRequest={async ({ page, pageSize }) => {
        const start = page * pageSize;
        const end = start + pageSize;
        return {
          items: state.todos.slice(start, end),
          totalCount: state.todos.length,
          hasMore: end < state.todos.length,
        };
      }}
      itemTemplate={(todo, index) => (
        <div class="todo-item">
          <input type="checkbox" checked={() => todo.completed}
                 onchange={(e) => todo.completed = e.target.checked} />
          <span>{todo.title}</span>
        </div>
      )}
    />
  </div>;
}
```
```tsx file=src/TodoList.tsx variant=options
import { reactive, Virtualization } from "@motifx/core";

interface Todo { userId: number; id: number; title: string; completed: boolean; }

export const TodoList = () => ({
  el: 'div',
  data: reactive({ todos: [] as Todo[] }),

  async onConfigured() {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos');
    this.data.todos = await res.json();
  },

  view() {
    return <Virtualization<Todo>
      x-wait={() => this.data.todos.length === 0}
      itemHeight={60}
      pageSize={20}
      dataRequest={async ({ page, pageSize }) => {
        const start = page * pageSize;
        const end = start + pageSize;
        return {
          items: this.data.todos.slice(start, end),
          totalCount: this.data.todos.length,
          hasMore: end < this.data.todos.length,
        };
      }}
      itemTemplate={(todo, index) => (
        <div class="todo-item">
          <input type="checkbox" checked={() => todo.completed}
                 onchange={(e) => todo.completed = e.target.checked} />
          <span>{todo.title}</span>
        </div>
      )}
    />;
  },
});
```

## Props reference (`VirtualizationProps<T>`) {#props}

| Prop | Type | Description |
|------|------|-------------|
| `dataRequest` | `(req) => Promise<VirtualizationDataResponse<T>>` | **Required.** The function fetching a page of data. |
| `itemTemplate` | `(item: T, index: number) => any` | **Required.** The template of each item. |
| `itemHeight` | `number \| (item: T, index: number) => number` | **Required.** The pixel height of each item. A number: all rows the same; a function: a known height per row (see below). |
| `pageSize` | `number` | How many items to request per request (default 50). |
| `mainTemplate` | `(content, state) => any` | A custom layout wrapping the main container. |
| `loadingTemplate` | `(state) => any` | The loading view. |
| `emptyTemplate` | `() => any` | The empty-data view. |
| `errorTemplate` | `(error) => any` | The view shown when the first load, `refresh()` or an `autoRefresh` request fails; without it the error is reported as `MJX207`. The error of a later page request (`autoLoad`) is reported as `MJX207` and written to `getState().error`; the loaded rows stay on screen, the error view is not shown, the request is made again on the next scroll and `error` is cleared on a successful load. |
| `filter` | `(items: T[]) => T[]` | Applied to the loaded data; spacers and indices are computed from the filtered length. |
| `overscan` | `number` | The number of extra rows drawn **above and below** the visible area (default: the number of visible rows). |
| `cacheSize` | `number` | The upper bound of row components kept alive for reuse after leaving the screen (LRU; default `max(200, 3 × window)`). |
| `autoRefresh` | `boolean` | When reactive data read inside `dataRequest` changes, refetches the loaded range (from page 0 to the current page) in a single request (on by default); the row components are rebuilt. Tracking is set up on the first load and on `refresh()`, `setData()` stops it. With `false` it refreshes only through `refresh()`. |
| `watch` | `() => unknown` | An extra dependency for `autoRefresh`: reactive fields read here also trigger a reload (a fallback path for reads after `await`). |
| `overscanPages`, `renderMode`, `pageBuffer` | | Reserved; the `'page'` mode is not implemented. |
| `autoLoad` | `boolean` | Automatic loading at the bottom (on by default). The next page is also requested when the drawn window comes within `overscan` of the end of the loaded data (e.g. when the first page does not fill the visible area). |
| `autoLoadThreshold` | `number` | How many pixels before the bottom of the **loaded** data (`data.length × itemHeight`) the next page should be requested (default 100). |
| `className` | `string` | An extra class on the main `div`. |
| `style` | `Partial<CSSStyleDeclaration>` | Inline style. |

## The `dataRequest` contract {#data-request}

The request object (`VirtualizationDataRequest`):

```ts
{ page: number;      // 0-based page index
  pageSize: number;  // the number of items requested
  scrollTop: number; // the scroll position at request time
}
```

The response object (`VirtualizationDataResponse<T>`):

```ts
{ items: T[];          // the items on this page
  totalCount: number;  // the total item count of the whole data set
  hasMore: boolean;    // whether there is more data
}
```

`totalCount` is written only to `state.totalCount` (e.g. to show the total in a header); the scrollbar and the spacers are computed from the **loaded** data. `hasMore` decides whether the next page is requested: when it returns `false` automatic loading stops.

### Automatic refresh — `autoRefresh` {#auto-refresh}

`autoRefresh` (on by default) tracks the reactive fields read inside `dataRequest`; when one changes, the loaded range (page 0 to the current page) is refetched in a single request and the row components are rebuilt. Tracking is set up on the first load and on `refresh()`; `setData()` stops the tracking. Since `dataRequest` is `async`, the compiler wraps the `await`s inside it: reactive fields read after an `await` become dependencies too (elsewhere reads after `await` are not tracked; see [Reads after `await`](./reactivity.md#await-reads)). If you defined `dataRequest` outside JSX (the wrapping is done only on the arrow function written on the tag) or the dependency comes from elsewhere, give an extra dependency with `watch={() => state.filter}`: `watch` is called once inside the same effect as `dataRequest` while tracking is set up, and the fields it reads are added to the dependencies (an error it throws is `MJX205`). The reload happens in the microtask after the change; the content stays in place until the response arrives. If more than 30 reloads are triggered in one second (loop protection), tracking is stopped and a `MJX206` warning is written in development mode; `refresh()` sets tracking up again.

## Template stages and `state` {#templates-and-state}

Templates such as `mainTemplate` and `loadingTemplate` receive a `VirtualizationState<T>`:

```ts
{ isLoading: boolean;
  isInitialized: boolean;
  currentPage: number;
  totalCount: number;
  hasMore: boolean;
  error?: Error;
  data: T[];
}
```

### A custom container — `mainTemplate` and `<content>` {#main-template}

`mainTemplate` defines the layout wrapping the list. You mark where the virtual content goes with the `<content></content>` placeholder:

```tsx
mainTemplate={(content, state) => (
  <div class="list-container">
    <div class="list-header">
      <h2>Todo List</h2>
      {state.isInitialized && (
        <span class="count">{() => state.data.length} items</span>
      )}
    </div>
    <div class="scroll-container">
      <content></content>   {/* the virtual items go here */}
    </div>
  </div>
)}
```

### The other templates {#other-templates}

```tsx
loadingTemplate={(state) => <div class="spinner">Loading...</div>}
emptyTemplate={() => <div class="empty">No records</div>}
errorTemplate={(error) => <div class="error">Error: {error.message}</div>}
```

## Holding the first data with `x-wait` {#x-wait}

Use `x-wait` to hold the virtual list until the data arrives:

```tsx
<Virtualization<Todo>
  x-wait={() => this.state.todos.length === 0}
  /* ... */
/>
```

## Filtering {#filtering}

Works with the `filter` prop or by filtering your slice inside `dataRequest`:

```tsx
<Virtualization<Todo>
  filter={(items) => items.filter(x => x.completed)}
  dataRequest={async ({ page, pageSize }) => {
    const done = this.state.todos.filter(x => x.completed);
    const start = page * pageSize;
    return {
      items: done.slice(start, start + pageSize),
      totalCount: done.length,
      hasMore: start + pageSize < done.length,
    };
  }}
  /* ... */
/>
```

## The rendering model and methods {#rendering-and-methods}

- Only a window's worth of rows is in the DOM: `[anchor − overscan, anchor + visible + overscan)`,
  `anchor = floor(scrollTop / itemHeight)`. Rows are plain siblings between two spacer `div`s;
  spacer heights are never negative and `top + rows + bottom = filtered length × itemHeight`.
- A row leaving the window is **not disposed; it is taken out of the DOM**; when it comes back the same component (its bindings,
  input state, `reactive(row)` proxy) is attached at its ordered position. Placeholder comments do not pile up.
  A removed row receives `onDeactivated`, a re-attached row `onActivated`.
  When `cacheSize` is exceeded the rows unseen for the longest are disposed.
- Rows are cached by the item object's identity (by position for primitive items). The same object may appear in the data
  more than once; each occurrence gets its own row.
- The window is recomputed on every scroll event (also while `hasMore === false`); only the difference between the old and
  new window is processed (O(window)).
- The first draw waits for layout: if `clientHeight` is 0 (the element is not in `document` yet) it is retried in `onMounted`.
- In paged mode the scrollbar represents only the **loaded** pages (the infinite-scroll feel).

| Method | Effect |
|---|---|
| `refresh()` | Resets the data, requests page 0 again with `dataRequest`; every cached row is disposed. Returns a `Promise`. |
| `setData(items)` | Replaces the data without a request; `hasMore=false`, page 0. |
| `scrollToIndex(i)` | Scrolls to the `i × itemHeight` position and draws at once. |
| `getState()` | A shallow copy of the state. |

## When to use it? {#when-to-use}

| Situation | Recommendation |
|-----------|----------------|
| Few items (< ~100), variable height | The normal `.map` list binding ([Conditional Rendering and Lists](./conditionals-and-lists.md)). |
| Many items, **fixed** or **precomputable** row height | `Virtualization` (`itemHeight` a number or a function). |
| Infinite scroll / a paged API | `Virtualization` + `autoLoad`. |

### Variable height and resizing {#variable-height}

If the rows have different heights that can be computed in advance (header rows, two kinds of card, height by message type), give `itemHeight` a function:

```tsx
<Virtualization<Message>
  itemHeight={(m) => m.kind === 'image' ? 220 : 64}
  dataRequest={...}
  itemTemplate={(m) => <MessageRow message={m} />}
/>
```

The heights are summed once every time the data changes (load, `setData`, `filter`); the visible range is found by binary search, and `scrollToIndex` uses these sums too. Invalid values (`NaN`, negative) count as 0. If the height can only be known by measuring after drawing (free-text flow), this method is not suitable.

When the list container's size changes (screen rotation, the mobile keyboard opening, the window size) the visible rows are recomputed without waiting for a scroll. `ResizeObserver` is used for this; if it does not exist in the environment this step is skipped, and the observer is released when the list is disposed.

## Next step {#next}

Continue with [Memory Management and Dispose](./memory-and-dispose.md) to learn memory management and the dispose pattern.
