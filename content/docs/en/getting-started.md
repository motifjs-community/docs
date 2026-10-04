---
title: Getting started
description: Set up the build, create a component, and mount an application.
category: start
order: 1
---

## Requirements {#requirements}

Use Vite or Rollup with the MotifJS runtime and JSX compiler. Keep both MotifJS packages on the same major version.

## Build setup {#build-setup}

The MotifJS compiler processes JSX during the build. Configure Vite to preserve JSX so the compiler can transform it.

```ts file=vite.config.ts
import { defineConfig } from 'vite';
import compiler from '@motifx/compiler';

export default defineConfig({
  plugins: [compiler()],
  esbuild: { jsx: 'preserve' },
});
```

## Create a component {#first-component}

A component can own reactive state and return a view. The example follows your code preference; Class, Function, and Options forms use the same runtime.

```tsx file=counter.tsx variant=declarative/class
import { Component, reactive } from '@motifx/core';

export class Counter extends Component<HTMLDivElement> {
  state = reactive({ count: 0 });

  view() {
    return <button onclick={() => this.state.count++}>
      Count: {this.state.count}
    </button>;
  }
}
```
```tsx file=counter.tsx variant=declarative/function
import { reactive } from '@motifx/core';

export function Counter() {
  const state = reactive({ count: 0 });

  return <button onclick={() => state.count++}>
    Count: {state.count}
  </button>;
}
```
```tsx file=counter.tsx variant=declarative/options
import { reactive } from '@motifx/core';

export const Counter = () => ({
  el: 'div',
  data: reactive({ count: 0 }),

  view() {
    return <button onclick={() => this.data.count++}>
      Count: {this.data.count}
    </button>;
  },
});
```
```tsx file=counter.tsx variant=imperative/class
import { Component } from '@motifx/core';

export class Counter extends Component<HTMLDivElement> {
  initializeComponent() {
    this.controls.add(
      <button onclick={() => this.controls.add('Another control')}>
        Add a control
      </button>
    );
  }
}
```
```tsx file=counter.tsx variant=imperative/function
export function Counter() {
  return <div initializeComponent={(component) => {
    component.controls.add(
      <button>Add a control</button>
    );
  }} />;
}
```
```tsx file=counter.tsx variant=imperative/options
export const Counter = () => ({
  el: 'div',

  initializeComponent() {
    this.controls.add(
      <button>Add a control</button>
    );
  },
});
```

## Mount the application {#mount-app}

Build an Application and mount the root component into an element in the document. A Class component is passed as an instance; Function and Options components are passed as a JSX tag. Add a router when the application has multiple views.

```tsx file=main.tsx variant=class
import { Application } from '@motifx/core';
import { Counter } from './counter';

const app = Application.CreateBuilder().build();
app.run('#app', new Counter());
```
```tsx file=main.tsx variant=function
import { Application } from '@motifx/core';
import { Counter } from './counter';

const app = Application.CreateBuilder().build();
app.run('#app', <Counter />);
```
```tsx file=main.tsx variant=options
import { Application } from '@motifx/core';
import { Counter } from './counter';

const app = Application.CreateBuilder().build();
app.run('#app', <Counter />);
```
