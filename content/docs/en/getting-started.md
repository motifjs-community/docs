---
slug: getting-started
title: Getting Started
description: Set up the build, create a component and mount the application.
category: start
order: 1
---

This section walks through setting up the MotifJS build chain, preparing a project skeleton and getting the first working application on screen.

## Requirements {#requirements}

- **Vite** (the recommended bundler) or Rollup
- **JavaScript (`.jsx`) or TypeScript (`.tsx`)** — if you use TypeScript, your project's own version. `@motifx/compiler` brings its own TypeScript dependency (5.x/6.x) for the type-aware check (`motif-lint`); it works independently of the project's TypeScript version.
- **`@motifx/core`** — the core library
- **`@motifx/compiler`** — the build plugin that compiles JSX into MotifJS runtime calls

The two packages are used at the same major version (`@motifx/compiler` 1.x with `@motifx/core` 1.x). The surface that compiled code relies on in the runtime (the compiler contract) changes only with a major version; if the versions do not match, a `MJX121` warning appears in development mode (the mismatch is seen while modules load, but the warning is shown when `app.useDevelopment(true)` is called).

## Build setup {#build-setup}

MotifJS JSX is not processed through a standard `jsxFactory` but through its own compiler (`@motifx/compiler`). The compiler analyses the reactive expressions inside JSX (text, conditions, lists) and turns them into the appropriate `bindings.*` calls. Two settings are therefore critical:

1. Adding the `@motifx/compiler` plugin to the bundler.
2. Making TypeScript/esbuild **leave JSX untouched** (`jsx: "preserve"`) so that `@motifx/compiler` does the transformation.

```ts file=vite.config.ts
import { defineConfig } from 'vite';
import compiler from '@motifx/compiler';

export default defineConfig({
  plugins: [compiler()],
  resolve: {
    extensions: ['.jsx', '.tsx', '.ts', '.js'],
  },
  esbuild: { jsx: 'preserve' },
  server: { port: 3000 },
});
```

```jsonc file=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "useDefineForClassFields": true,
    "lib": ["ESNext", "DOM", "DOM.Iterable"]
  },
  "include": ["./src/**/*"]
}
```

> **Why `jsx: "preserve"`?** In MotifJS, JSX does not become a "render function call"; it becomes compiled output that sets up reactive bindings. For example, the expression `{model.count}` is turned by the compiler into `sender.bindings.add("textContent", model, "count")`. Only `@motifx/compiler` knows this transformation, which is why esbuild/tsc must not touch JSX.

The plugin compiles `.jsx` and `.tsx` files; in `.ts`/`.js` files it only transforms decorators (`@Injectable`) (see [Dependency Injection](./dependency-injection.md#injectable-decorator)). Plugin options: `diagnostics` (`false` to turn off compile warnings) and `explain` (see [Compile-time diagnostics](./jsx.md#compile-time-diagnostics)).

## HTML host {#html-host}

The application needs a root element to attach to:

```html file=index.html
<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>MotifJS App</title></head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## Create a component {#first-component}

A component can hold reactive state and return a view. The class, function and Options forms share the same core; you can build the view declaratively with `view()`/the return value, or imperatively with `controls` (see [Components](./components.md)).

```tsx file=src/Counter.tsx variant=declarative/class
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
```tsx file=src/Counter.tsx variant=declarative/function
import { reactive } from '@motifx/core';

export function Counter() {
  const state = reactive({ count: 0 });

  return <button onclick={() => state.count++}>
    Count: {state.count}
  </button>;
}
```
```tsx file=src/Counter.tsx variant=declarative/options
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
```tsx file=src/Counter.tsx variant=imperative/class
import { Component } from '@motifx/core';

export class Counter extends Component<HTMLDivElement> {
  initializeComponent() {
    this.controls.add(
      <button onclick={() => this.controls.add('New control')}>
        Add control
      </button>
    );
  }
}
```
```tsx file=src/Counter.tsx variant=imperative/function
export function Counter() {
  return <div initializeComponent={(component) => {
    component.controls.add(
      <button onclick={() => component.controls.add('New control')}>
        Add control
      </button>
    );
  }} />;
}
```
```tsx file=src/Counter.tsx variant=imperative/options
export const Counter = () => ({
  el: 'div',

  initializeComponent() {
    this.controls.add(
      <button onclick={() => this.controls.add('New control')}>
        Add control
      </button>
    );
  },
});
```

`{this.state.count}` is a reactive text binding: when `count` changes only that text node is updated. `initializeComponent` is called once while the component is being set up (before `view()`); `controls.add` puts the element into the DOM at once, with no render loop to wait for. A plain value such as `controls.add('New control')` is wrapped in a text node.

## Mount the application {#mount-app}

The `Application` class is the entry point. The typical flow:

1. Create a **builder** with `Application.CreateBuilder()`.
2. Register services on `builder.services` if needed (see [Dependency Injection](./dependency-injection.md)).
3. Produce the `Application` instance with `builder.build()`.
4. Optionally define routing with `app.useRouter(...)`.
5. Attach the application to a DOM element with `app.run(host, rootComponent)`.

A class component is passed as an instance; function and Options components are passed as JSX tags:

```tsx file=src/main.tsx variant=class
import { Application } from '@motifx/core';
import { Counter } from './Counter';

const app = Application.CreateBuilder().build();
app.run('#app', new Counter());
```
```tsx file=src/main.tsx variant=function
import { Application } from '@motifx/core';
import { Counter } from './Counter';

const app = Application.CreateBuilder().build();
app.run('#app', <Counter />);
```
```tsx file=src/main.tsx variant=options
import { Application } from '@motifx/core';
import { Counter } from './Counter';

const app = Application.CreateBuilder().build();
app.run('#app', <Counter />);
```

`app.run` accepts a CSS selector (`"#app"`), an `HTMLElement` or a `Node` as its first argument; if the selector matches nothing, a `MJX406` error is thrown. The second argument is the **root component**. If it is omitted, MotifJS places a `RouterView` at the root automatically (for router-based applications — see below). `Application.CreateBuilder()` is called once per application; a second call throws `MJX405` (it can be called again after `app.dispose()`).

### Router-based start {#router-start}

In multi-page applications use routing instead of a root component. In that case do not pass a second argument to `run`; MotifJS adds the root `RouterView` itself:

```tsx file=src/main.tsx
import { Application } from '@motifx/core';
import { routes } from './config/routes';

const app = Application.CreateBuilder().build();

app.useDevelopment(true);  // development mode: MJX warnings and route validation (before useRouter)
app.useLogging(true);      // console error logging (on by default)

app.useRouter({
  routes,
  mode: 'history',                    // 'history' | 'hash' | 'file' | 'shell'
  fallbacks: {
    notFound: () => import('./pages/NotFound'),
  },
});

app.run(document.getElementById('app')!);
```

Route definitions and `RouterView` placement are covered in detail in [Routing](./routing.md).

## Development helpers {#dev-helpers}

`Application` has chainable configuration methods:

| Method | Description |
|--------|-------------|
| `app.useDevelopment(true)` | Turns on development mode: `MJX` warnings are written to the console (`console.warn`), and errors the framework catches and passes over silently are written too; if called before `useRouter`, route definitions are validated. Read back with `app.isDevelopmentModeEnabled`. |
| `app.useLogging(true)` | Turns console error logging on/off (on by default). |
| `app.useReactiveMonitor({ enabled: true, threshold: 200, name: 'app' })` | Turns on reactive dependency leak monitoring (recommended for development; see [Leak monitoring](./memory-and-dispose.md#leak-monitor)). |
| `app.useTransitions({ mode: 'out-in' })` | Chooses the default mode for enter/leave transitions (see [Enter/leave mode](./styling-and-transitions.md#transition-mode)). |

Errors thrown in hooks (`MJX122`), event handlers (`MJX123`) and effect/binding functions (`MJX208`) are reported regardless of development mode, in production too: they are written to `console.error` (unless `useLogging(false)`) and passed to `errorHandler.addListener(fn)` listeners as a `MotifError` (`error.code`, `error.cause`). The application keeps running.

## Next step {#next}

Continue with [Components](./components.md) to build the parts of the application.
