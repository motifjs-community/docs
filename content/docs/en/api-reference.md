---
slug: api-reference
title: API Reference
description: "A quick reference of the symbols exported from the @motifx/core package and the table of MJX error/warning codes."
category: reference
order: 1
---

This section is a quick reference of the main symbols exported from the `@motifx/core` package. Every row links to the detailed section.

## Application {#application}

| Symbol | Kind | Description |
|--------|------|-------------|
| `Application` | class | The application instance. Reached globally through `Application.main`, from a component through `this.context`. |
| `Application.CreateBuilder()` | static | Produces an `ApplicationBuilder`. |
| `ApplicationBuilder` | class | Carries the `services` collection; produces an `Application` with `build()`. |
| `app.run(host, root?)` | method | Attaches the application to a DOM element. |
| `app.useRouter(opts)` | method | Defines routing. |
| `app.restartRouter()` | method | Sets the router up from scratch and restarts it at the current address: uses a new `useRouter` configuration if one was given while running, otherwise the current one. The route list, the keepAlive cache, the stack and the scroll memory are reset, the page is rebuilt (`onRouterChanged` runs with `initial: true`). In `shell` mode it stays on the page the router shows. No effect before `run`. |
| `app.navigate(uri, options?)` / `app.navigateByName(name, params?, options?)` | method | Programmatic navigation; the options are passed to the router (`NavigationOptions`). Returns the navigation result (e.g. `{ ok: false, cancelled: true, reason: 'guard' }` on a guard cancellation). |
| `app.router.navigate(uri, options?)` | method | Navigation with options: `{ replace?, state?, force?, scroll? }` (`NavigationOptions`). |
| `app.router` | property | A single object for the whole application (`Router`); reactive, read-only route fields: `params`, `route`, `uri`, `ok`, `meta`, `extend`, `fullPath`, `aliasOf`, `chain`, `direction`, `state`, `stack` (only while `stack` is on). See: [Routing](./routing.md#live-route-state). |
| `app.useGuard(guard)` / `app.use(mw)` | method | Navigation guard / middleware. For after navigation, `app.onRouterChanged(fn)`. |
| `app.on/fire/off` | method | The application event bus. `on` returns an unsubscribe function. |
| `app.onRouterChanged(fn)` | method | Runs on every navigation (startup and 404 included) with `{ uri, params, meta, route, ok, initial, redirectedFrom?, direction, state }`. |
| `app.onLifecycle(fn)` | method | The application lifecycle: `{ state, visible, online }`; `state`: `'visible' \| 'hidden' \| 'frozen' \| 'resumed' \| 'restored' \| 'online' \| 'offline'`. Returns an unsubscribe function. See: [Lifecycle](./lifecycle.md). |
| `app.isVisible` / `app.isOnline` | property | The current visibility and connectivity state. |
| `app.router.evict(name \| route?)` | method | Disposes the instances in the `keepAlive` cache (no argument: all). |
| `app.router.resolve(uri)` / `app.router.href(name, params?)` / `app.router.routes` | method / property | A match without navigating (`ResolveResult`), the path of a named route, the route list in definition order (`RouteInfo[]`). See: [Routing](./routing.md). |
| `app.useDevelopment(b)` / `app.useLogging(b)` / `app.useReactiveMonitor(o)` | method | Development configuration. |
| `app.dispose()` | method | Disposes the router, the lifecycle listeners and the service provider; sets the address to `/` with `history.replaceState`. |
| `useApplication()` | fn | `{ application, services, router, attach }`. |
| `useNavigation()` | fn | The same object as `app.router` (`Router`). |

See: [Getting Started](./getting-started.md), [Routing](./routing.md).

## Components {#components}

| Symbol | Kind | Description |
|--------|------|-------------|
| `Component` | class | The concrete component class. `super('div')` or `super()`. |
| `ComponentBase` | class | The base of all components. |
| `ComponentMotif` | class | The type of the `ComponentBase.motif` namespace; the user does not create it with `new`. |
| `FNComponent(view)` | fn | Wraps a function view in a component. |
| `motifComponent(el, props?)` / `motifFragment(props?)` / `motifCompiled(contract)` | fn | The calls in compiler-generated code (`_mc`, `_mf`, `_mv`); `motifCompiled` gives the `MJX121` warning in development mode if the compiler contract does not match. |
| `Frame` | class | A fragment container that holds/replaces a single dynamic content: `navigate(page, keepOldControl?)` disposes the previous content and places the new one (takes an array too), `navigateLazy(() => import(...), options?)` loads through `Lazy`, `flush()` disposes the content, `current` is the shown content, `isBusy` whether a navigation is in progress. `{() => expression}` children and `when`/`ternary`/`switchCase` branches are built on it. See: [Frame](./frame.md). |
| `ContentBody` / `ContentBlock` | class | A multi-piece body: `<ContentBody name="x"/>` is the body, `<ContentBlock target="x">…</ContentBlock>` a piece; several blocks accumulate in the same body, each block removes only its own pieces when disposed. See: [ContentBody and ContentBlock](./content-body.md). |
| `Transport` / `TransportTo` | class | Showing a component's content in a named slot outside its tree (e.g. moving page commands to the layout header). See: [Transport and TransportTo](./transport.md). |
| `Transporter` | class | Programmatic moves: `Transporter.transport(child, newParent, { index?, keepState?, owner? })`, `transportMany(children, newParent, options?)`. See: [Transport and TransportTo](./transport.md#transporter). |
| `FragmentNode` | class | A component rooted in a fragment (comment node); `motifFragment()` and `<>…</>` produce it. `childs` and `props.nodes` are added to the content. |
| `ControlCollection` | class | The type of `component.controls`; not created with `new`. |
| `Lazy({ caller, options? })` | fn | Lazy content through a dynamic import (`<Lazy caller={() => import('./X')} />`; `LazyOptions`: `Loaderview`, `Placeholderview`, `Fallbackview`, `minDelayMs`, `timeoutMs`, `signal`, `onError`, `mapResult`, `retry`, `onRetry`). See: [Lazy](./lazy.md). |
| `Virtualization<T>` | class | A virtually scrolled list. |

### Main `ComponentBase` members {#component-base-members}

| Member | Description |
|--------|-------------|
| `element` | The real DOM node. |
| `props` | The component props. |
| `controls` | The child control collection (`add(...c)`/`add(index, ...c)`/`insert(index, ...c)`/`remove`/`clear`/`clearAsync`/`detach`/`silentDetach`/`silentUnlink`/`move`/`moveToIndex`/`forEach`/`map`/`items`/`length`). See: [Components](./components.md#controls). |
| `context` | The running `Application`; `on`/`onRouterChanged` subscriptions opened through it are removed when the component is disposed. |
| `class` / `attr` | The class and attribute helpers. |
| `bindings` | The binding collection. |
| `state` (user-defined) | Usually `reactive({...})`. |
| `view()` | The method returning the template. |
| `motif` | The namespace of framework operations (`ComponentMotif`). A subclass may define names such as `show`, `on`, `clear`, `options` for its own purposes; the framework uses only the `this.motif.*` path. |
| `motif.on/off/trigger/addHandler` | Event management; `x:`-prefixed names are lifecycle events (`x:built`, `x:mounted`, `x:disposed`…). |
| `motif.show/hide/toggle` | Visibility. |
| `motif.options` | The component settings object (`transition`, `hideStrategy`, `disableDisposal`). |
| `motif.stopAnimations()` | Cuts running WAAPI and CSS transitions. |
| `isWait` | Waiting (the counterpart of `x-wait`; writable). |
| `isBuilt` / `isInitialized` / `isConfigured` / `isVisible` / `isDisposed` | State flags. |
| `parent` / `childs` | The parent component / the JSX children written between the tags. |
| `using(promise, onfulfilled?, onrejected?)` / `doWork(promise)` | Dispose-safe handling of asynchronous results. See: [Memory Management and Dispose](./memory-and-dispose.md#using-dowork). |
| `dispose/disposeAsync` | Disposal. |
| `motif.clear()` | Disposes the content (the children). |
| `motif.register/setDisposable` | Resource registration. |
| `getService(token)` | DI resolution. |
| `useModel(model)` | Produces a reactive model. |
| `style(...)` / `setText(...)` | Helpers. |
| `siblings` | `all/next/prev/nextAll/prevAll`. |
| `$(selector)` | `fromDom()` / `fromComponent()` queries. |

### Lifecycle hooks {#lifecycle-hooks}

`onInitializing`, `onInitialized`, `onConfig`, `onConfigured`, `onBuilding`, `initializeComponent`, `oninitializeComponent`, `onBuilt`, `onMounted`, `onVisibilityChanged`, `onActivated`, `onDeactivated`, `onDisposing`, `onDisposed`.

`onRefCreated(sender)`: called after every `ref={this.x}` / `ref={name}` in the class's `view()` has been applied (`sender` is the component that received the ref); not called for the callback form of `ref`. See: [Components](./components.md#on-ref-created).

See: [Components](./components.md), [Lifecycle](./lifecycle.md).

## Reactivity (store) {#reactivity}

| Symbol | Signature | Description |
|--------|-----------|-------------|
| `reactive(model)` | `<T>(m: T) => T` | A reactive proxy. |
| `useModel(model)` | `<T>(m: T) => T` | An alias of `reactive`. |
| `createSignal(v)` | `<T>(v: T) => Signal<T>` | A single-value signal. |
| `createComputed(fn)` | `<T>(fn) => Computed<T>` | A derived value; computed on setup and on every change. |
| `createLazyComputed(fn)` | `<T>(fn) => LazyComputed<T>` | A lazy derived value; marked dirty on change, computed when read (`value`, `peek`, `isDirty`, `dispose`). |
| `effect(fn, onValue?)` | `(fn, cb?) => () => void` | A side effect; returns a stop function. `onValue` receives `fn`'s return value after each run; reads inside it are not tracked. |
| `asyncTracking` | object | The runtime helper the compiler uses to wrap the `await`s inside `Virtualization dataRequest` (`capture`/`suspend`/`resume`/`end`); not called by hand. See: [Reactivity](./reactivity.md#await-reads). |
| `untracked(fn)` | `<T>(fn: () => T) => T` | An untracked region; returns `fn`'s return value. `effect` calls inside track normally. |
| `deepClone(v)` | `(v) => v` | A deep copy. |
| `clearModel(m)` | `(m) => void` | Clears the reactive registration. |
| `Signal<T>` / `Computed<T>` / `LazyComputed<T>` | class | The fine-grained primitives. |

See: [Reactivity](./reactivity.md).

## Bindings — `component.bindings` {#bindings}

| Method | Description |
|--------|-------------|
| `add(prop, source, member?, format?, formatInfo?)` | A one-way binding. `formatInfo`: `{ locale?, currency? }`. |
| `model(source, member?, format?, formatInfo?)` | A two-way binding (by element type). |
| `model(getter, setter)` | A two-way binding with functions; `x-model` compiles to this. |
| `text(fn)` / `value(fn)` | A `textContent` / `value` binding. |
| `when(condFn, renderFn)` | Conditional content; the branch is rebuilt when the condition's value changes (`Object.is`, two falsy values count as the same). |
| `ternary(condFn, trueFn, falseFn)` | A two-branch condition; the branch is rebuilt when the condition's value changes (`Object.is`). |
| `list(itemsFn, renderFn)` / `loop(...)` | A list; rows are matched by the item object. |
| `switchCase(discFn, cases, defaultFn?)` | Multiple branches. |
| `method(fn)` | Reactive text / single content. |
| `watch(fn)` | An automatically cleaned watcher. |
| `wait(fn)` / `display(fn)` / `html(fn)` | Waiting / visibility / innerHTML. |
| `remove(binding)` | Removes the binding from the collection and deactivates it. |

See: [Conditional Rendering and Lists](./conditionals-and-lists.md), [Forms and Two-Way Binding](./forms.md).

## Dependency Injection {#dependency-injection}

| Symbol | Description |
|--------|-------------|
| `ServiceCollection` | The registration collection (`addSingleton/addScoped/addTransient`, `tryAdd*`, `replace`, `remove`, `has`). |
| `ServiceProvider` | The resolver: `get(token)` synchronous, `getAsync(token)` for async factory/Promise registrations, `createScope(name?)` a child scope, `enableAutoDisposeTransients()` disposes the transients in a child scope with the scope, `getAllServices()` the collection, `dispose()`. See: [Dependency Injection](./dependency-injection.md#service-disposal). |
| `@Injectable(opts?)` | Marks a class for automatic registration; `deps` gives the constructor parameters in order. A standard (TC39) class decorator. |
| `inject(token)` | Resolves a dependency in the field initialiser or constructor of a class the provider constructs; the return type comes from the token. |
| `FromService(token)` | Quick resolution from the application's provider; returns `null` if it cannot resolve and gives the `MJX414` warning in development mode. |
| `ServiceLifetime` | `'transient' \| 'singleton' \| 'scoped'`. |

See: [Dependency Injection](./dependency-injection.md).

## Routing {#routing}

| Symbol | Description |
|--------|-------------|
| `RouteItem` | The route definition type (one of `control` or `redirect` is required). |
| `RouteRedirect` / `RedirectTarget` | The `redirect` value (`string \| (to) => string`) and the `{ path, params, meta }` passed to the function. |
| `RouterView` | The route output slot (`name?`). |
| `RouterLink` | A link component with active/match classes (default element `<a>`). Props: `to`, `el`, `activeClass`, `exactClass`, `onActive`/`offActive`, `onExact`/`offExact`, `showHref`, `target`, `text`, `bypass` (leaves the click to the browser). See: [Routing](./routing.md#router-link). |
| `NavigationDirection` | `'initial' \| 'push' \| 'replace' \| 'back' \| 'forward' \| 'traverse'`. |
| `StackOptions` | The `useRouter({ stack })` settings: `retain`, `depth`, `persist`, `animation`, `duration`, `swipeBack`. |
| `StackEntryInfo` | An `app.router.stack` item: `{ index, uri, current, retained }`. |
| `RouteInfo` | An `app.router.routes` item: `{ fullPath, name, meta, route, chain }`. |
| `StackTransitionContext` | The `{ direction, entering, leaving }` given to a custom stack animation. |
| `ScrollMemoryOptions` | The `scrollMemory` settings; container scrolling with `container`. |

Standard `<a>` links are also included in routing with the `rel="router"` attribute.

See: [Routing](./routing.md).

## Disposable {#disposable}

| Symbol | Description |
|--------|-------------|
| `IDisposable` | `{ dispose(): void }`. |
| `Disposable` | The base class of disposable objects (`ComponentBase` derives from it); `dispose()`. |
| `DisposableStore` | Group cleanup (`add`, `delete`, `detach`, `clear`, `dispose`, `isDisposed`). |
| `disposableCore.toDisposable(fn)` / `toDisposable(fn)` | Wraps a function in an `IDisposable`. |
| `disposableCore.disposableTracker` | The tracker hook for live component counting (`IDisposableTracker`). |

See: [Memory Management and Dispose](./memory-and-dispose.md).

## Common helpers {#common}

| Symbol | Description |
|--------|-------------|
| `dom` | DOM creation helpers: `createElement(tag, options?)` (a template element per tag is cached and cloned; `options` applies only on the first creation; `'text'` gives a text node; `MJX101` if there is no `document`), `createElementNS(ns, tag, options?)` (error `MJX103`), `createDocumentFragment()`, `createComment(text)`, `createTextNode(text)`, `querySelectorAll(selector)`, `convertToSvgElement(el)` (recreates the element in the SVG namespace and puts it in place), `window`, `document`, `body`. |
| `List`, `Dictionary`, `LinkedList` | Collection structures. See: [Collections](./collections.md). |
| `Query<T>` / `Query.from(source)` / `Group<TKey, T>` | The LINQ-style query wrapper (`where`, `select`, `orderBy`, `groupBy`, `first`, `any`, `aggregate`, `toArray` …). See: [Collection Queries (Query)](./query.md). |
| `NameValuePair<K, V>` | A `{ Key, value }` pair (a `Dictionary` item). See: [Collections](./collections.md#dictionary). |
| `NodeTypes` | Node type constants (enum). |
| `Emitter<T>` | A typed event emitter: `emitter.event(listener, thisArgs?, disposables?)` subscribes and returns an `IDisposable`, `fire(value)` publishes, `dispose()` closes. A listener error goes to `setUnexpectedErrorHandler`. See: [Error Handling](./error-handling.md#emitter). |
| `JSX` | The JSX type namespace (`JSX.Element`, `JSX.IntrinsicElements`); the compiler uses it for the `jsx-runtime`. |
| `preProcessing(fn)` | Adds the callback to a persistent list and runs every callback in the list at once; for one-off setups such as style injection. |
| `safeCall`, `safeCallAsync`, `safeCallSilent` | Error-safe call helpers. |
| `errorHandler` / `setUnexpectedErrorHandler(fn)` | The central error handler. `errorHandler.addListener(fn)` receives every error the framework reports as a `MotifError`. `setUnexpectedErrorHandler(fn)` receives only code-less unexpected errors (those caught inside `safeCall`/`safeCallAsync` and in `Emitter` listeners; these also reach `addListener` listeners as they are); its default rethrows the error with `setTimeout`. Coded reports (`MJX122`, `MJX123`, `MJX208` …) do not go to it. See: [Error Handling](./error-handling.md), [Error and warning codes](#error-codes). |
| `MotifError` / `MotifErrorCode` | The class of the errors the framework throws and reports; carries `code` (such as `"MJX302"`) and an English message in the `[motifjs] MJX302: …` form, with the original error in `cause` where present. |
| `TransitionProps` | The transition configuration interface (type). |
| `Bind<T>` / `toGetter(v)` / `read(v)` | The prop contract: `T \| (() => T)`; `toGetter` converts to a getter for live reading, `read` gives the instant value. |
| `Resilience` | Resilience helpers: `Resilience.create.retry(...).timeout(...).execute(fn)` (also `circuitBreaker`, `bulkhead`, `rateLimiter`, `fallback`). Its errors `MJX602`–`MJX605`. See: [Resilience](./resilience.md). |
| `decorate(policy, fn)` | Wraps a resilience policy around a function: `(ctx?) => policy.execute(fn, ctx)`. |
| `ErrorHandler` | The class of the `errorHandler` instance: `report(err)`, `addListener(fn)`, `setDevelopmentMode(b)`, `setConsoleLogging(b)`, `isDevelopment()`, `safeCall`/`safeCallSilent`/`wrapSafe`/`wrapSafeAsync`. |

## Types {#types}

Exports that carry no value and are taken only with `import type`. Their behaviour is described in the related section; their names and shapes are collected here.

| Type | Shape / description | See |
|------|---------------------|-----|
| `IBaseProp<TProps>` | The common props every component constructor accepts: `TProps` + `childs`, `options`, `onElementCreating`, `initializeComponent`, the lifecycle hooks (`onConfig`, `onBuilt`, `onMounted`, `onActivated` …), `runover: { initializeComponent? }`; other keys are free (`ref`, `key`, `transition` are not typed separately here). | [Components](./components.md#props), [Lifecycle](./lifecycle.md) |
| `MotifBaseProps` / `MotifBindable<T>` / `MotifValue<T>` / `MotifClass` / `MotifStyle` | The JSX attribute types: `class`/`style`/attribute forms accepting a value or a getter. | [JSX and Templates](./jsx.md) |
| `Bind<T>` | `T \| (() => T)`; the prop contract. | [JSX and Templates](./jsx.md#attribute-ternary) |
| `ComponentBaseOptions<TProps>` | The type of the `motif.options` object: `transition` (API), `enableRouterClassing` (setter), `hideStrategy`, `disableDisposal`, `props`, `getInstance()`, `hasEvent(name)`. | [Lifecycle](./lifecycle.md#hide-strategy), [Styling and Transitions](./styling-and-transitions.md) |
| `RouterClassingSettings` | `{ to, path, activeClass?, exactClass?, onActive?, offActive?, onExact?, offExact? }`. | [Routing](./routing.md#router-classing) |
| `TransitionProps` / `TransitionMode` / `CSSTransitionInfo` | Transition class names and duration / `'concurrent' \| 'out-in' \| 'in-out'` / the element's computed transition information. | [Styling and Transitions](./styling-and-transitions.md) |
| `IDisposeOptions` | `{ deep?, skipLeaveTransition? }` — the `dispose()` options. | [Lifecycle](./lifecycle.md#dispose) |
| `IDisposable` / `IDisposableTracker` | `{ dispose() }` / the `disposableCore.disposableTracker` hook. | [Memory Management and Dispose](./memory-and-dispose.md) |
| `EventArgs` | `{ cancel: boolean }` — the event object of hooks and `motif.trigger`. | [Lifecycle](./lifecycle.md#class-hooks) |
| `HtmlElementEvents` / `AnyEvents` | The type of `motif.on` event names: DOM event names with modifiers (`'click:once:prevent'`) and the `x:` lifecycle names. | [Events](./events.md#modifiers) |
| `ElementType` / `IElement` / `IHtmlElement` | The element types the `Component<TElement>` generic accepts. | [Components](./components.md#root-element) |
| `MotifComponentType` / `MotifComponentConstructor` / `MotifFunctionalComponent` / `MotifFunctionalComponentBasic` / `AnyFunctionalComponent` | Class, constructor and function component types (for JSX tag types). | [Components](./components.md) |
| `EffectFn` / `AsyncTrackingToken` | The `effect` function type / the `asyncTracking` token. | [Reactivity](./reactivity.md) |
| `ReadonlySignal<T>` | The `asReadonly()` view: `value`, `peek()`. | [Reactivity](./reactivity.md#create-signal) |
| `AppLifecycleState` / `AppLifecycleEventArgs` | `'visible' \| 'hidden' \| 'frozen' \| 'resumed' \| 'restored' \| 'online' \| 'offline'` / `{ state, visible, online }`. | [Lifecycle](./lifecycle.md#app-lifecycle) |
| `RouteItem` / `RouteItemBase` / `RouteControl` / `RouteRedirect` / `RedirectTarget` | The route definition and its parts. | [Routing](./routing.md#route-item) |
| `RouterOptions` / `RouterEvents` | The `useRouter({...})` object / the global hooks `{ onEntering?, onEnter?, onLeave?, onUpdate? }`. | [Routing](./routing.md#use-router) |
| `Router` / `RouteInfo` / `ResolveResult` / `RouterViewProps` | The `app.router` object / a `routes` item / the `resolve()` result / the `RouterView` props (`name?`). | [Routing](./routing.md#live-route-state) |
| `NavigationOptions` / `NavigationDirection` / `NavigationGuard` / `NavigationGuardContext` | Navigation options / direction / the guard signature `(ctx, next) => void` / `{ to, from }`. | [Routing](./routing.md#guards) |
| `RouterNavigatedEventArgs` | The `onRouterChanged` payload: `{ uri, params, meta, route, ok, initial, redirectedFrom?, direction?, state? }`. | [Routing](./routing.md#guards) |
| `RouterValidateEventArgs` | The `validate(e)` argument: `{ uri, key, routes, params }`. | [Routing](./routing.md#route-item-fields) |
| `RouteResolveContext` | The middleware context: `{ uri, context, rewritePath(uri) }`. | [Routing](./routing.md#middleware) |
| `ScrollMemoryOptions` / `StackOptions` / `StackSwipeBackOptions` / `StackEntryInfo` / `StackTransitionContext` | Scroll memory and stack navigation settings. | [Routing](./routing.md#scroll-memory), [Routing](./routing.md#stack) |
| `ServiceLifetime` / `ServiceDescriptor` | `'transient' \| 'singleton' \| 'scoped'` / the registration definition (`token`, `lifetime`, `useClass`/`useValue`/`useFactory`, `deps`). | [Dependency Injection](./dependency-injection.md#registration-forms) |
| `LazyOptions<T>` / `LazyRetryOptions` | The `Lazy` options / `{ count, delayMs?, whenOnline? }`. | [Lazy](./lazy.md#options) |
| `RetryOptions` / `TimeoutOptions` / `CircuitBreakerOptions` / `BulkheadOptions` / `RateLimiterOptions` / `FallbackOptions<T>` | The `Resilience` policy options. | [Resilience](./resilience.md#policies) |
| `ResiliencePolicy` / `ResilienceAction<T>` / `ResilienceContext` / `CircuitState` | The `{ execute(action, ctx?) }` interface (`Resilience` implements it, `decorate` accepts it) / `(ctx?) => T \| Promise<T>` / the free context object / `'CLOSED' \| 'OPEN' \| 'HALF_OPEN'`. | [Resilience](./resilience.md#chain) |
| `TransportOptions` | The `Transporter.transport` options `{ index?, keepState?, owner? }`. | [Transport and TransportTo](./transport.md#transporter) |
| `VirtualizationProps<T>` / `VirtualizationDataRequest` / `VirtualizationDataResponse<T>` / `VirtualizationState<T>` | The virtual list props, request/response and state objects. | [Virtualization](./virtualization.md#props) |
| `MotifErrorCode` | The union of all `MJX` codes. | [Error Handling](./error-handling.md#motif-error) |
| `Group<TKey, T>` | A `Query.groupBy` item `{ key, items }`. | [Collection Queries (Query)](./query.md#chaining) |
| `JSX` | The JSX type namespace. | [JSX and Templates](./jsx.md) |
| `__attr`, `CustomParameters`, `IsOptional`, `OptionalParams`, `IAttribute`, `IClass` | Type helpers and the interfaces of the `attr`/`class` helpers; not used directly. | — |

## Developer tools {#devtools}

| Symbol | Description |
|--------|-------------|
| `app.useReactiveMonitor(o)` / `configureReactivityLeakMonitor(o)` | Reactive dependency leak warnings (`{ enabled, threshold, name }`). |
| `debugGetDeps(target)` / `debugGetDepMap()` | Reactive dependency maps; from the `@motifx/core/devtools` subpath: `import { debugGetDeps } from "@motifx/core/devtools"`. |

## Special JSX attributes {#jsx-attributes}

| Attribute | Description |
|-----------|-------------|
| `class` / `className` | Class (string/array/object/getter). |
| `style` / `x-style` | Style. |
| `on<event>` | A DOM event (`:once`, `:prevent`, `:stop`, `:capture`, `:passive`, `:self`, `:trusted`). |
| `on:name` / `on-name` / `on_name` | Binds the handler as it is with `motif.on("name", fn)` (DOM and custom events; only the prefix is dropped, `on-my-event` → `my-event`); parameter count ≤ 1 → `fn(event)`, 2+ → `fn(sender, event)`. |
| `ref` / `x-ref` | Capture the tag's component instance: `ref={(c) => …}` or `ref={this.field}`, on every tag, exactly once; if both are written on the same tag they run in source order. Works only on the component it is given to (the returned root on a function component); not in `props` or `this.props`. Use a separate prop name for an inner element (e.g. `inputRef`). |
| `initializeComponent` | Called once during setup with the tag's component (the same on plain DOM, class and function component tags; the returned root on a function). Runs together with the compiler-generated setup code. |
| `oninitializeComponent` | Called right after all `initializeComponent` code (class method, value on the tag, compiler-generated), before `view()`. Written as a class method or a tag prop; applied to the returned root on a function component. |
| `x-html` | Reactive `innerHTML`. |
| `x-wait` / `x-display` | Waiting / visibility. |
| `key` | Identifies a list item; checked for duplicates in development mode (`MJX202`). Rows are matched by the item object; `key` does not change DOM reuse. |
| `transition` | The enter/leave transition (a string or `TransitionProps`). |
| `on<lifecycle>` / `x-<lifecycle>` / `x:<lifecycle>` | Lifecycle hooks; several spellings on the same tag are merged and all run in source order. |
| `options={{ hideStrategy, disableDisposal }}` | Component settings; copied into `motif.options` (on a plain DOM tag too; no attribute is written). See: [Lifecycle](./lifecycle.md). |
| Method-named attributes | `focus`, `blur`, `click`, `select`, `scrollTo`/`scrollBy`/`scrollIntoView`, `show`, `showModal`, `close`, `showPopover`, `hidePopover`, `togglePopover`, `requestSubmit`, `checkValidity`, `reportValidity`, `showPicker`, `load`, `setSelectionRange`, `setRangeText`, `setPointerCapture`, `releasePointerCapture`, `fastSeek` … call the element's method of the same name, no attribute is written; with a getter it is called again on every change. `show`/`showModal`/`showPopover` open with `true` and close with `false` (`close()`/`hidePopover()`); `togglePopover` passes the boolean; methods such as `close`, `requestSubmit` and `load` are called on a truthy value; methods with arguments such as `setSelectionRange` take the value as the argument (array → argument list). |

See: [JSX and Templates](./jsx.md).

## Error and warning codes {#error-codes}

Every message the framework produces carries a `MJX` code and appears in the console in the `[motifjs] MJX302: …` form.
`MJX001`–`MJX099` belong to the compiler (`@motifx/compiler`), see [JSX and Templates](./jsx.md#compile-time-diagnostics);
`MJX1xx` and above to the runtime.

- **Thrown errors** are `MotifError`s; told apart by the `code` field (`catch (e) { if (e.code === 'MJX302') … }`).
- **Reported errors** (those that do not stop the flow, such as component and route hooks, guards, event handlers, effects, disposal and data loading errors) go to `errorHandler`:
  written to the console (`app.useLogging(false)` turns it off), reaching `errorHandler.addListener(fn)` listeners as a `MotifError`
  with the original error in the `cause` field.
- **Warnings** are written to the console only in development mode (`app.useDevelopment(true)`) and added to the devtools warning list.

| Code | Kind | Meaning |
|------|------|---------|
| `MJX101` | error | No `document` while creating an element (no DOM environment). |
| `MJX102` | error | An invalid element selector. |
| `MJX103` | report | `createElementNS` failed. |
| `MJX104` | warning | A component containing its own parent was not added to the DOM. |
| `MJX105` | report | Router link classes could not be applied. |
| `MJX106` | warning | The placeholder's parent changed; the component is being rebuilt. |
| `MJX107` | report | A child component could not be disposed. |
| `MJX108` | value | The `doWork` result was discarded because the component was disposed. |
| `MJX109` | warning | A `ContentBlock`'s own piece in the body was removed while the block was being disposed (one warning per piece). |
| `MJX110` / `MJX111` | error | `Lazy` timeout / cancellation. |
| `MJX112` | report | The `resolveComponent` factory chain is too deep (100 levels); a factory may be returning itself. |
| `MJX113` | error | The transport slot has no parent. |
| `MJX114` / `MJX115` | report | The navigation target could not be placed / the previous target could not be disposed. |
| `MJX116` | error | The listener guard timed out. |
| `MJX117` / `MJX118` | report | A control could not be detached / the `onRemove` callback failed. |
| `MJX119` / `MJX120` | report | The closing marker of a fragment's DOM range was not found. |
| `MJX121` | warning (dev) | The code was compiled for another compiler contract; bring `@motifx/compiler` and `@motifx/core` to the same major version and recompile packages shipping compiled JSX. |
| `MJX122` | report | A component hook (`onConfig`, `onConfigured`, `onBuilding`, `onBuilt`, `onMounted`, `onActivated`, `onDeactivated`, `onDisposing`, `onDisposed`, `initializeComponent`, `ref` …; a class method or an `on<lifecycle>`/`x-<lifecycle>`/`x:<lifecycle>` prop on the tag) threw or the promise it returned rejected; the component keeps being set up. A throwing `ref` callback on a plain tag and on a class component tag is reported too, and the component is still created. Lifecycle listeners added in code as `motif.on('x:built', fn)` (`x:configured`, `x:disposed`, `x:mounted` …) are reported with this code as well (`The component x:built hook threw.`). |
| `MJX123` | report | An event handler (`onClick` …, `motif.on`) or an application event listener (`app.on` / `app.fire`, `onRouterChanged` included: `The 'motifjs-router-navigated' event handler threw.`) threw or the promise it returned rejected. |
| `MJX124` | warning (dev) | An object spread onto a plain DOM tag has an `innerHTML` key; it was not written. Use `x-html` for HTML you trust. |
| `MJX125` | warning (dev) | An object spread onto a plain DOM tag has a `javascript:` URL for `href`/`src`/`action`/`formaction`/`xlink:href`; the value was not written. Write a deliberate link directly on the tag. |
| `MJX126` | report | A `Lazy` load failed and there is no `Fallbackview`; the container was emptied. The original error is in `cause`. |
| `MJX201` | error | `ListBinding` `renderFn` did not return a component. |
| `MJX202` | warning | A duplicate `key` in a list. Rendering is not affected because rows are matched by the item object, not by `key`; keys should be kept unique so that they identify the items. |
| `MJX203` | warning | A self-retriggering effect was skipped in this flush. |
| `MJX204` | warning | A component landed in a text binding. |
| `MJX205` / `MJX207` | report | The `Virtualization` `watch` callback / data loading failed (a later page request included). |
| `MJX206` | warning | `Virtualization` `autoRefresh` was stopped. |
| `MJX208` | report | An effect or binding function threw; the other effects in the same flush keep running. |
| `MJX301` | warning | The `RouterView` outlet was not set up in time. |
| `MJX302` | error | A named route was not found. |
| `MJX303` | warning | A redirect loop or too many redirects; not thrown, the error page receives this `MotifError` in `params.error`. |
| `MJX304` / `MJX305` | report | A route could not be executed / the error route failed. |
| `MJX306` | report | A route hook (`onLeave`, `onEnter`, `onEntering`, `onUpdate`, `onShow`) or a `useGuard` guard threw; a guard error cancels the navigation. |
| `MJX307` / `MJX308` | report | A route component could not be disposed / the stack transition failed. |
| `MJX309` | error | Navigation before the router was set up (`useRouter()` was not called). |
| `MJX310`–`MJX316` | warning | Route definition validation: an empty path, a child path or alias not starting with `/`, the same path as the parent, a duplicate path or alias. |
| `MJX401` | error | The service is not registered. |
| `MJX402` | error | An async factory was requested with `get()`; use `getAsync()`. |
| `MJX403` / `MJX404` | error | An invalid service descriptor / a cyclic dependency. |
| `MJX405` / `MJX406` | error | A second `ApplicationBuilder` / the `run()` target was not found. |
| `MJX407` / `MJX408` | warning | `getService` found no provider / resolution failed. |
| `MJX409` | error | `inject()` was called outside service construction. |
| `MJX410` / `MJX411` | warning | Several sources in a registration / `deps` is not an array. |
| `MJX413` | error | A function that cannot be constructed (arrow, `async`, method) was registered directly; use `{ useValue: fn }` or `{ useFactory: fn }`. |
| `MJX414` | warning | `FromService` could not resolve; returns `null`. |
| `MJX501` | warning | An already disposed object was disposed again. |
| `MJX502` / `MJX505` | error | A disposable was registered on itself / a store tried to delete itself from inside. |
| `MJX503` | error | Several errors occurred while disposing a store; all of them are in the `errors` array of the `AggregateError` in the `cause` field (a single error is thrown as it is). |
| `MJX504` | warning | Something was added to a disposed `DisposableStore` (the added object leaks). |
| `MJX507` | warning | A possible listener leak. |
| `MJX601` | error | `Query.first()` on an empty array. |
| `MJX602`–`MJX605` | error | `Resilience`: the circuit is open, the bulkhead queue is full, rate limit, timeout. |
| `MJX607` / `MJX608` | error | An empty history / an unsupported operation. |
| `MJX609` / `MJX610` | report | The `OperationRunner` operation / request path matching failed. |
| `MJX611` | warning | The devtools panel could not be loaded. |

---

Back to the start of the documentation: [Overview](./index.md).
