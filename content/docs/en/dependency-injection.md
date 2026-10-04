---
slug: dependency-injection
title: Dependency Injection
description: Lifetimes, scoped handles, ServiceCollection registration forms, ServiceProvider resolution, @Injectable, inject, deps and service disposal.
category: app
order: 2
---

MotifJS includes an integrated dependency injection (DI) system resembling .NET's service collection model. You register services while the application starts, then resolve them from components or other services.

## Lifetimes {#lifetimes}

| Lifetime | Behaviour |
|----------|-----------|
| `singleton` | A single instance for the whole application. |
| `scoped` | One instance per navigation. Everything on screen in the same navigation (layout, page, child components, `FromService`, singleton dependencies) sees the same instance; details below. Without a router it is a single instance in the root provider. |
| `transient` | A new instance on every resolution (the default). |

### `scoped`: one instance per navigation {#scoped}

The router opens a scope on every navigation. Everyone who asks for a `scoped` service (`getService`, `inject`, `deps`, `FromService`) receives not the service itself but a **handle** to it. The handle is used like the service (fields, methods, `#private` fields, `instanceof`) and goes to the right navigation's instance on every access:

```tsx
@Injectable({ lifetime: 'scoped' })
export class CartService {
  items = reactive<string[]>([]);
  add(x: string) { this.items.push(x); }
}

class ShellLayout extends Component {
  cart = this.getService(CartService)!;
  view() { return <span>{() => this.cart.items.length}</span>; }
}

class ProductsPage extends Component {
  cart = this.getService(CartService)!;
  view() { return <button onclick={() => this.cart.add('apple')}>Add</button>; }
}
```

- The layout sees the product the page added at once; both are on the same navigation's instance.
- When another page is entered, the layout's `cart` switches by itself to the new navigation's instance and the binding (`{() => this.cart.items.length}`) refreshes. The previous navigation's instance is disposed (`dispose()`).
- The leaving page stays bound to the previous navigation's instance. A job that completes after the page has left (after an `await`) writes to its own navigation's instance, not to the new page's service. A parameter change within the same route (`/product/1` → `/product/2`) is a new navigation too.
- A `keepAlive` page keeps its own navigation's instance alive while waiting in the cache; when shown again it switches to the current navigation's instance. Pages waiting in the mobile stack follow the same rule. If state in a service must survive across navigations, the service must be a `singleton`.
- Back and forward navigation is a new navigation too; it opens a new instance.
- If the navigation does not happen (guard cancellation, page setup error) the current instance does not change; the opened scope is disposed.
- While a page is being set up (in the constructor or in work the constructor starts) the new navigation's instance is used.
- A scope opened from code with `app.provider.createScope()` is outside this arrangement: it gives the service itself, which lives only in that scope.
- The handle is a separate object per component: the handles two components receive are not `===` equal even though they go to the same instance; compare services by their contents.

Since a disposed component's fields are cleaned, checking the component itself in long-running work (`if (this.isDisposed) return;`) is still a good habit.

## Service registration {#registration}

Services are registered on `ApplicationBuilder.services` (a `ServiceCollection`):

```tsx
import { Application } from "@motifx/core";
import { LoggerService } from "./services/LoggerService";
import { AuthService } from "./services/AuthService";

const builder = Application.CreateBuilder();

builder.services.addSingleton(LoggerService, LoggerService);
builder.services.addScoped(AuthService, AuthService);
builder.services.addTransient(RequestId, RequestId);

const app = builder.build();
```

### Registration forms {#registration-forms}

In the `add*(token, impl)` methods `impl` can be one of:

```ts
// 1) A class (useClass)
builder.services.addSingleton(LoggerService, LoggerService);

// 2) A ready value (useValue)
builder.services.addSingleton(Config, { apiUrl: "/api" });

// 3) A factory / descriptor object — with `deps` the factory is called with (…dependencies, provider)
builder.services.addSingleton(Db, {
  useFactory: (config: Config) => new Db(config),
  deps: [Config]
});

// a factory without deps receives only the provider
builder.services.addSingleton(Cache, { useFactory: (sp) => new Cache(sp.get(Config)) });

// 4) An async value (Promise) — wrapped in an async factory; resolved with `getAsync`, not `get`
builder.services.addSingleton(Remote, import('./remote').then(m => new m.Remote()));
const remote = await app.provider.getAsync(Remote);
```

The `deps` array applies to both class and factory registrations: they are resolved in order and passed to the constructor/factory in the same order; in a factory the last parameter is always the `ServiceProvider`.

The provider constructs only a class registration (`useClass`) with `new`. A value given with `useValue` and the value a factory returns are handed over as they are; `get` and `getAsync` return the same value. To provide a function or the class itself as a service use `{ useValue: fn }` or a factory returning it; a factory wanting an instance writes the `new` itself.

A function given directly to `add*(token, impl)` is constructed as a class. A function that cannot be constructed (an arrow function, an `async` function, an object method) is a compile error in TypeScript and throws `MJX413` at the registration line at runtime:

```ts
builder.services.addSingleton('formatter', (x: number) => x.toFixed(2));             // error: MJX413
builder.services.addSingleton('formatter', { useValue: (x: number) => x.toFixed(2) }); // the function itself
builder.services.addSingleton(Logger, { useFactory: (sp) => new Logger(sp.get(Config)) }); // a factory
```

`ServiceCollection` methods:

| Method | Description |
|--------|-------------|
| `addSingleton/addScoped/addTransient(token, impl)` | Register. |
| `tryAddSingleton/tryAddScoped/tryAddTransient(token, impl)` | Adds only if not registered; returns a `boolean`. |
| `replace(token, impl, lifetime?)` | Replaces an existing registration. |
| `remove(token)` / `has(token)` | Remove / check. |
| `reset()` | Clear everything. |
| `buildServiceProvider()` | Produces a `ServiceProvider` (`build()` does this automatically). |

## Service resolution {#resolution}

### `ServiceProvider.get` {#service-provider-get}

```tsx
const provider = app.provider;
const logger = provider.get(LoggerService);
```

The router resolves a route component from the provider if it is registered there (`add*` or `@Injectable`), and constructs it directly otherwise. If a registered component cannot be resolved (missing dependency, cycle, constructor error) the navigation fails with `MJX304`, the original error is carried in `cause` and `fallbacks.error` is shown.

`get` is synchronous and throws (`MJX402`) for a service registered with an async factory or a Promise; resolve those with `await provider.getAsync(token)`. `provider.createScope(name?)` produces a new child scope; `scoped` services are one instance per scope.

Reaching the application's provider from inside a component:

```tsx
// as in the MainLayout example
const logger = Application.main.provider.get(LoggerService);
```

### `getService` from a component {#get-service}

`ComponentBase.getService` finds the nearest provider and resolves the token; it returns `null` if none is found or the resolution fails (a `MJX407`/`MJX408` warning is written in development mode):

```tsx
class Dashboard extends Component {
  onConfig() {
    const auth = this.getService(AuthService);
    if (auth?.isLoggedIn) { /* ... */ }
  }
}
```

### The `FromService` helper {#from-service}

For quick resolution anywhere (outside components too):

```tsx
import { FromService } from "@motifx/core";
const logger = FromService(LoggerService);   // null if it cannot be resolved
```

It returns `null` if the service is not registered, there is a cyclic dependency or the constructor throws; in development mode a `MJX414` warning is written together with the original error. For a `scoped` service it gives the handle to the current navigation's instance.

## Automatic registration with decorators {#injectable-decorator}

`@Injectable` marks a class for automatic registration. While the application is built (`autoRegisterInjectables` is called inside `builder.build()`) these classes are registered automatically.

Classes whose module loads **after** `build()` (services imported only by a lazy page) are registered too: when no descriptor is found, the registration happens at the first resolution. An explicit registration (`addSingleton`/`addScoped`/`addTransient`) always overrides the decorator; the decorator cannot override an explicit registration.

```tsx
import { Injectable, inject } from "@motifx/core";

@Injectable({ lifetime: 'singleton' })
export class LoggerService {
  log(msg: string) { console.log("[LOG]", msg); }
}

@Injectable()   // default lifetime: 'transient'
export class UserService {
  private logger = inject(LoggerService);

  save(user: any) {
    this.logger.log("user saved");
  }
}
```

`@Injectable` is a standard (TC39) class decorator; it needs no extra setting in `tsconfig.json` or in Vite's `esbuild` configuration. `@motifx/compiler` compiles decorators in `.ts` and `.js` files just as in `.tsx` files; `vite dev` and `vite build` give the same result. Files whose nearest `tsconfig.json` has `experimentalDecorators: true` are left to TypeScript's legacy decorator transform; `@Injectable` works in that form too.

### `@Injectable` options {#injectable-options}

```ts
@Injectable({
  lifetime: 'singleton' | 'scoped' | 'transient',   // default: 'transient'
  deps: [DepA, DepB]                                 // constructor parameters, in order
})
```

### `inject(token)` — taking a dependency {#inject}

`inject` is called in a class's field initialisers and constructor while the provider constructs that class, or inside a `useFactory` factory while the provider calls it. It resolves the dependency from the provider constructing the class: a `scoped` service is the instance of the route scope that asked for it. The return type comes from the token.

```tsx
@Injectable()
export class OrderService {
  private db = inject(Db);
  private log = inject(LoggerService);
  private readonly total: number;

  constructor() {
    this.total = this.db.count();   // usable in the constructor too
  }
}
```

`inject` works only at construction time. Inside a method, in a `setTimeout` callback, or when the class is constructed by hand with `new OrderService()`, it throws `MJX409`. An unregistered token gives `MJX401`, a cyclic dependency `MJX404`. `inject` is synchronous; take async registrations that need `getAsync` through `deps` or `getAsync`.

In components use `this.getService(token)` for dependencies.

### `deps` — constructor parameters {#deps}

Dependencies can also be given to the constructor as parameters. The tokens in the `deps` array are resolved in order and passed to the constructor in the same order:

```tsx
@Injectable({ deps: [Db, LoggerService] })
export class OrderService {
  constructor(private db: Db, private log: LoggerService) {}
}
```

The order is not checked by TypeScript; `deps` and the constructor parameters must be written in the same order. In this form the class can be constructed by hand in tests with fake dependencies: `new OrderService(fakeDb, fakeLog)`.

## A component using a service — full example {#full-example}

```ts file=src/CounterStore.ts
import { Injectable, reactive } from "@motifx/core";

@Injectable({ lifetime: 'singleton' })
export class CounterStore {
  state = reactive({ value: 0 });
  increment() { this.state.value++; }
}
```

```tsx file=src/main.tsx
import { Application } from "@motifx/core";
import { CounterStore } from "./CounterStore";

const builder = Application.CreateBuilder();
// registered automatically because it is marked with @Injectable;
// or by hand: builder.services.addSingleton(CounterStore, CounterStore);
const app = builder.build();
```

```tsx file=src/CounterView.tsx variant=class
import { Component } from "@motifx/core";
import { CounterStore } from "./CounterStore";

export class CounterView extends Component<HTMLDivElement> {
  store = this.getService(CounterStore)!;
  view() {
    return <button onclick={() => this.store.increment()}>
      {() => this.store.state.value}
    </button>;
  }
}
```
```tsx file=src/CounterView.tsx variant=function
import { FromService } from "@motifx/core";
import { CounterStore } from "./CounterStore";

export function CounterView() {
  const store = FromService(CounterStore)!;
  return <button onclick={() => store.increment()}>
    {() => store.state.value}
  </button>;
}
```
```tsx file=src/CounterView.tsx variant=options
import { CounterStore } from "./CounterStore";

export const CounterView = () => ({
  el: 'div',
  store: null as CounterStore | null,
  ctor() {
    this.store = this.getService(CounterStore);
  },
  view() {
    return <button onclick={() => this.store!.increment()}>
      {() => this.store!.state.value}
    </button>;
  },
});
```

Since a function component has no `this`, the service is taken from the application's provider with `FromService`; for a `scoped` service this also gives the current navigation's handle.

## Disposing services {#service-disposal}

`app.dispose()` and `provider.dispose()` dispose the instances the provider constructed: the singleton cache, the scopes' `scoped` instances and the navigation scopes. On every instance `dispose()`, `close()`, `[Symbol.dispose]()` and `[Symbol.asyncDispose]()` are called in order where present; an error thrown by one does not stop the others. When a navigation scope closes (a new navigation, cancellation) that scope's `scoped` instances are disposed the same way. A value given with `useValue` goes through the same treatment if it is registered.

`transient` instances are not tracked by default; when `provider.enableAutoDisposeTransients()` is turned on, transient instances produced in a child scope (`createScope`, a navigation scope) are disposed together with that scope. Transients resolved from the root provider are still not tracked.

`provider.getAllServices()` gives the `ServiceCollection` the provider uses.

## The `useApplication` hook {#use-application}

Collective access to the application, the provider and the router:

```tsx
import { useApplication } from "@motifx/core";

const { application, services, router, attach } = useApplication();
const logger = services.get(LoggerService);
```

## Next step {#next}

Continue with [Styling and Transitions](./styling-and-transitions.md) to learn the styling and animation system.
