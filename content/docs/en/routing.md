---
slug: routing
title: Routing
description: RouteItem definition, redirect/alias, route hooks, parameters, useRouter modes, scrollMemory, RouterView, links, programmatic navigation, guards, stack navigation and Lazy.
category: app
order: 1
---

MotifJS routing ships with the core. You define routes with a configuration array, place them on screen with `RouterView` and navigate programmatically through `Application`.

## Route definition (`RouteItem`) {#route-item}

Routes are a `RouteItem[]` array. Each item maps a path (`path`) to a component (`control`):

```tsx
// config/routes.ts
import { RouteItem } from '@motifx/core';

export const routes = [
  {
    path: '/',                                        // layout route
    control: () => import('../layouts/MainLayout'),
    extend: { layoutName: 'MainLayout' },
    childs: [
      { path: '/',        control: () => import('../pages/Home') },   // default child
      { path: '/docs/{page?:}',  control: () => import('../pages/Docs') },
      { path: '/api/{page?:getting-started}', control: () => import('../pages/Api') },
      { path: '/home/{id?:0}',   control: () => import('../pages/Home') },
    ]
  }
] as RouteItem[];
```

### `RouteItem` fields {#route-item-fields}

| Field | Description |
|-------|-------------|
| `path` | The route path. Parameters in the `{name}` form. `'/'` for the layout and the default child; every child path starts with `/` (the linter warns otherwise). At the same depth a static segment comes before a parameter (`/orders` beats `/{slug}`). |
| `control` | The route component. A component directly, `() => Component`, `() => import(...)` (lazy) or a Promise. Optional only on a route that defines `redirect`. |
| `childs` | Child routes. If defined, this route is a **layout** route. |
| `name` | For reaching the route by name (optional). |
| `meta` | Free data that guards and hooks can use (`{ requiresAuth: true, title: '...' }`). The `meta` objects along the matched chain (layout → child) are merged; `requiresAuth` written on the layout is visible in its children too. |
| `extend` | Extra data attached to the route; merged along the chain like `meta`. `extend.targetOutlet` selects the named `RouterView` the route's component is placed in (see [`RouterView`](#router-view)). |
| `keepAlive` | If `true` the component instance is kept: on leaving it is **detached from the outlet and cached** (`onDeactivated`), on return the same instance is re-attached at the same position (`onActivated`); both are propagated to the page's visible child components. The cache is emptied with `app.router.evict(name \| route)` (no argument: all; the instance on screen at that moment is skipped) or `app.dispose()`. |
| `redirect` | Redirects to another path when this route is reached: a path string with `{param}` placeholders or a `(to) => path` function. Details: [Redirect and alias](#redirect-and-alias). |
| `alias` | Additional path(s) opening the same route; the alias stays in the address bar. Details: [Redirect and alias](#redirect-and-alias). |
| `validate(e)` | Called during matching with `{ uri, key, routes, params }`; if it returns `false` this route does not count as matched (another route or `fallbacks.notFound` takes over). The `validate` of every route in the chain runs. |
| `onShow(component)` | Called with the component instance every time the route's component is placed into its `RouterView`: the first show, recreation on a parameter change, return from the `keepAlive` cache. Called for layout routes too; not called again for a layout that stays in place during a navigation. An error thrown by the hook is reported with code `MJX306` and does not stop the navigation. |

### Redirect and alias {#redirect-and-alias}

```tsx
const routes: RouteItem[] = [
  { path: '/old-profile/{id}', redirect: '/users/{id}' },
  { path: '/find/{q}', redirect: (to) => '/search?q=' + encodeURIComponent(to.params.q) },
  {
    path: '/users', control: UsersLayout, alias: '/people', childs: [
      { path: '/', control: UserList },
      { path: '/{id}', control: UserDetail, alias: '/profile/{id}' },
    ]
  },
];
```

**`redirect`**

- In the string form the `{param}` placeholders are filled with the matched parameters. The source address's query string (`?…`) and `#…` are carried to the target if the target does not contain its own query/`#`.
- The function form receives `{ path, params, meta }`; the path it returns is used as it is.
- The redirect is applied right after matching, **before** `onLeave` and the `useGuard` guards; guards and hooks run only for the target route. The source route's component is never created.
- Chains are followed (`/a` → `/b` → `/c`). A redirect that exceeds 10 steps or returns to a path already passed is stopped, the `fallbacks.error` page is shown at the requested address and a warning is written to the console in development mode.
- Only the target enters the browser history. If the address bar already shows the source path (first load, back/forward), the entry is replaced with `replace`; so the "back" button does not get stuck on the redirect.
- Where the target came from is read through `to.redirectedFrom` (guard and `onLeave` context) and the `redirectedFrom` field of the `onRouterChanged` payload.
- Only the matched **leaf** route's `redirect` is applied. If a layout has a `'/'` default child, the leaf matched at the layout path is that child; in that case a `redirect` written on the layout does not run — write the redirect on the default child.

**`alias`**

- An alias is appended to the parent path with the same rule as `path` (`alias: '/people'` under `/admin` → `/admin/people`). Parameters are read from the alias pattern.
- The children also open under a layout's alias: in the example above `/people/5` → `UserDetail`.
- The alias and the real path are the same route: the component is kept when moving between them, `onUpdate` runs only if parameters change; the `keepAlive` cache is shared too.
- If an alias collides with another route's real path, the real path wins. The linter warns when an alias equals its own path, when two routes use the same alias, and when a child alias lacks the `/` prefix.
- `app.router.fullPath` gives the matched pattern (the alias pattern on an alias), `app.router.aliasOf` the real pattern (`null` if not an alias). `navigateByName` always produces the real path.
- `RouterLink` classes look at the URL: while on `/people`, a `to="/users"` link does not count as active.

### Route lifecycle hooks {#route-hooks}

Hooks tied to the navigation lifecycle can be defined on a `RouteItem`:

| Hook | When |
|------|------|
| `onEntering(ctx)` | Before the route component is created (after the guards; the page is not in the DOM yet); after `onUpdate` on a parameter change within the same route. |
| `onEnter(ctx)` | After the route component is mounted and `onShow` has run. |
| `onLeave(ctx)` | On leaving the route (also on a parameter change within the same route), before the `useGuard` guards. Returning `false` or `{ cancel: true, reason }` cancels the navigation. |
| `onUpdate(ctx)` | When only the parameters change within the same route; `onEntering` runs afterwards. |

Order: `onLeave` (leaving route) → `useGuard` → `onUpdate` (only on a parameter change) → `onEntering` → component creation and placement → `onShow` → `onEnter` → `onRouterChanged`.

Context objects: `onEntering`/`onEnter` `{ path, params, meta, to: { path, params, meta } }`; `onLeave` `{ from: { path, params, meta }, to: { path, params, meta, redirectedFrom? } }`; `onUpdate` `{ from: { path, params }, to: { path, params }, meta }`. Hooks may be `async`; the router waits for the result.

An error thrown by these hooks (a rejected promise in an async hook included) and an error thrown by `onShow` (a rejected promise of an async `onShow` included) is reported with code `MJX306`; the navigation continues. If the route component cannot be created (the constructor throws, `import` fails), `MJX304` is reported and the `fallbacks.error` page is shown.

With `useRouter({ hooks })` the same four hooks (`onEntering`, `onEnter`, `onLeave`, `onUpdate`) are defined application-wide; a global hook runs only for routes that have no hook of their own, the route's own hook replaces the global one.

```ts
{
  path: '/orders/{id}',
  control: () => import('../pages/Order'),
  onLeave: ({ from, to }) => {
    if (hasUnsavedChanges()) return { cancel: true, reason: 'Unsaved changes' };
  },
  onUpdate: ({ to }) => reloadOrder(to.params.id),
}
```

## Path parameters {#params}

Parameters are defined with the `{name}` syntax:

| Syntax | Meaning |
|--------|---------|
| `{id}` | Required parameter. |
| `{id:1}` | Required; `1` is used only when `href` / `navigateByName` produce a path and no value is given (the `/h/{id:1}` pattern does not match the `/h` address). |
| `{id?}` | Optional. |
| `{id?:5}` | Optional, default `5`: if missing from the address, `params.id` becomes `'5'`. |

```ts
{ path: '/docs/{page?:overview}', control: () => import('../pages/Docs') }
```

`href`, `navigateByName` and the `redirect` string fill the `{…}` placeholders.

Parameters are reached from the navigation context/router:

```ts
import { useNavigation } from "@motifx/core";
const nav = useNavigation();
console.log(nav.params.page);
```

`params` also contains the query string values. Like path parameters, query values are strings and arrive as written in the address (`/users/5?page=2` → `{ id: '5', page: '2' }`); values such as `true`, `null`, `2025-10-27` or `{"a":1}` stay text too. If you need a number, boolean or date, convert the value yourself (`Number(params.page)`). A repeated key (`?t=a&t=b`) becomes a string array (`['a', 'b']`). A path parameter with the same name overrides the query value. The `#…` part never enters `params`.

The query is read only from the address navigated to: in `history` mode, if there is no `?` in the address, `params` contains no query values (the previous page's query is not carried over). In `hash`/`file` mode the query before `#` (`/?x=1#/a`) is page-level; it comes into `params` on every route without its own query, and if the route has its own query (`#/b?z=3`) that one is used instead.

## Enabling the router {#use-router}

Define the routes and the mode with `useRouter` on `Application`:

```tsx
app.useRouter({
  routes,
  mode: 'history',                       // 'history' | 'hash' | 'file' | 'shell'
  fallbacks: {
    notFound: () => import('./pages/NotFound'),
    error: () => import('./pages/NotFound'),
  },
  hooks: { /* onEntering, onEnter, onLeave, onUpdate — for routes without their own hooks */ },
  scrollMemory: true,                    // remember the scroll position (off by default)
  stack: { retain: true },               // mobile-style stack navigation (off by default)
});
```

You can also pass just an array: `app.useRouter(routes)`.

| Mode | Behaviour |
|------|-----------|
| `'history'` | The path is the address bar's path and query (`/docs?x=1`); navigation is written with `history.pushState` / `replaceState`. The default when `mode` is not given. |
| `'hash'`, `'file'` | Both work the same: the path is the part after `#` (`/index.html#/docs`). When `mode` is not given, this behaviour is chosen if the page is opened from a `file:` address (as in Electron). `'history'` mode is not used under `file:`; the address's path is a file path. |
| `'shell'` | The address bar and the browser history are never touched; the router always starts at `/`, the page's address and query do not enter `params`. `popstate`/`hashchange` are not listened to: the browser's back/forward button or a `popstate` event does not move the router. `stack` has no effect in this mode. |

### Scroll memory — `scrollMemory` {#scroll-memory}

In a single-page application navigation changes the document but not the scroll position; the browser does not manage this for an SPA by itself either. When `scrollMemory` is on, the router keeps the last scroll position of every path and restores it when that path is returned to (back/forward, link, refresh):

```tsx
app.useRouter({ routes, mode: 'history', scrollMemory: true });
```

Rules:

- **A never-seen path** starts at the top of the page (turned off with `top: false`).
- **If the address has an anchor** (`/docs/routing#guards`) the anchor overrides the memory; the matching `id` is scrolled to. If there is a fixed top bar, give `scroll-margin-top` in CSS.
- **A navigation-specific `scroll` option** overrides the memory: `app.router.navigate('/x', { scroll: 'top' })` always goes to the top.
- Positions are kept in `sessionStorage`, so they are remembered **after a refresh** too (turned off with `persist: false`).

Fine-tuning with the settings object:

```tsx
app.useRouter({
  routes,
  scrollMemory: {
    top: true,          // go to the top on a never-seen path (default)
    anchor: true,       // let the anchor override the saved position (default)
    settleMs: 1200,     // upper bound for waiting for the content to settle
    persist: true,      // keep in sessionStorage (default)
    limit: 60,          // how many paths to remember
    // If the same page is reached from two addresses, reduce them to one key:
    key: (path) => (path === '/docs' ? '/docs/intro' : path),
    // Remember a container's scroll instead of the window (selector, element or a function returning an element):
    container: '#content',
  },
});
```

**If the scrolling happens inside a container** (such as mobile shells with a fixed header and tab bar), give `container`. The container is looked up again on every navigation, so it is fine if it is not in the DOM at first startup; if it is not found, the window scroll is used.

**If the content is drawn asynchronously** (remote data, markdown, a virtual list) do not worry: the restore is not one-off; it is retried every frame until the target is reached or `settleMs` runs out. If the user intervenes meanwhile with the wheel, a touch, a key or a mouse click, the attempt is dropped.

**Cost:** zero at rest. The `scroll` event is not listened to; the position is read once per navigation: after the guards pass, right before the address is applied and the content is replaced. The leaving page is still on screen at that moment and its position is real; on a cancelled navigation the position is not read. While on, `history.scrollRestoration` is set to `'manual'` and positions are also saved on `pagehide` / when the page is hidden. While off (the default) no listener is attached and `history.scrollRestoration` is not touched.

**The anchor source depends on the mode.** The `#…` in the address bar is read as an anchor only in `history` mode. In `hash` / `file` (and `shell`) mode only the route's own anchor (`/page#section`) is used; the address's `#` part is the route, so it does not count as an anchor. In those modes the memory works with the default `anchor` setting.

### Not-found route and error page {#fallbacks}

If no route matches, the `fallbacks.notFound` component is placed into the outlet of the **deepest layout** matching as a prefix of the URL (the shell does not disappear), the address bar is updated to the requested URL and `app.router.ok` becomes `false` (`app.router.params.path` carries the requested path). If no fallback is defined, a built-in "404 - Not Found" panel is shown. `fallbacks.error` is used the same way when a route component cannot be loaded/throws (`params.error`).

## `RouterView` — placing the route output {#router-view}

`RouterView` is where route components are shown on screen. Place it inside the layout:

```tsx file=src/layouts/MainLayout.tsx variant=function,options
import { RouterView } from "@motifx/core";

export default function MainLayout() {
  return (
    <div class="layout">
      <nav>...</nav>
      <main>
        <RouterView></RouterView>   {/* child routes go here */}
      </main>
    </div>
  );
}
```
```tsx file=src/layouts/MainLayout.tsx variant=class
import { Component, RouterView } from "@motifx/core";

export default class MainLayout extends Component {
  view() {
    return (
      <div class="layout">
        <nav>...</nav>
        <main>
          <RouterView></RouterView>   {/* child routes go here */}
        </main>
      </div>
    );
  }
}
```
The `default` export of the module loaded with `control: () => import('../layouts/MainLayout')` (the module itself if there is none) is used as the route component. A class is constructed with `new Class(app)`, a function with `fn(app)`: the first argument is the running `Application`; a route component receives no props from a tag. A function producing an Options API object cannot be a route component; `control` must be a component instance or a class/function returning an instance. If the component is registered in DI (an `@Injectable` class), the instance is resolved from the provider.

Named `RouterView`s are supported. A route's component is placed by default in the parent route's `RouterView` named `default`; to place it in another outlet give `extend.targetOutlet` on the route:

```tsx
<RouterView name="sidebar"></RouterView>

// route definition
{ path: '/filters', control: FilterPanel, extend: { targetOutlet: 'sidebar' } }
```

Every route is placed in a single outlet.

If you give no root component to `app.run`, MotifJS automatically places a `RouterView` with `name: 'default'` at the root.

## Links {#links}

### With `rel="router"` {#rel-router}

Add `rel="router"` to a standard `<a>` tag so that MotifJS captures the click and navigates without a full page reload:

```tsx
<a rel="router" href="/docs" class="btn btn-primary">Start</a>
<a rel="router" href="/playground">Documentation</a>
```

The `data-router-link` attribute does the same job. Clicks made with Ctrl/Meta/Shift/Alt, links whose `target` is other than `_self`, and in `history` mode addresses going to another origin are not captured. In `hash`/`file` mode `href="#/docs"` and `href="/docs"` go to the same place.

### The `RouterLink` component {#router-link}

A link component that manages the active/match classes automatically:

```tsx
import { RouterLink } from "@motifx/core";

<RouterLink
  to="/docs"
  activeClass="active"
  exactClass="exact-active"
>Docs</RouterLink>
```

The link is an `<a>` element; give `el` for another tag. Props:

| Prop | Effect |
|---|---|
| `to` | The target path; also written as `href`. |
| `showHref` | If `false`, `href` is not written; a click still navigates. |
| `target` | Written as an attribute. With a value other than `_self` the click is left to the browser; the router does not navigate. |
| `text` | The link's text if it has no children; if it has children, the children are used. |
| `bypass` | If `true` the click does not go to the router; the link opens like a normal browser link. |

A click made with Ctrl/Cmd/Shift/Alt is left to the browser. On other clicks `RouterLink` calls `router.navigate(to)` and applies the classes according to the match with the current URL:

| Class / callback | When |
|---|---|
| `activeClass`, `onActive` / `offActive` | If the current path starts with `to` (segment-wise; exact match included). While on `/users/5`, `to="/users"` is active. |
| `exactClass`, `onExact` / `offExact` | Only when the current path matches `to` exactly (query string and `#` ignored). |

On an exact match both classes are applied together. `to="/"` is active only on the root path; it is not counted as the prefix of every path.

### Route classes on any component — `enableRouterClassing` {#router-classing}

`RouterLink`'s class logic is open to every component: when a `RouterClassingSettings` is written to `motif.options.enableRouterClassing`, the component's root element receives classes as the current address matches `path`. Used for non-`<a>` elements such as a menu item, a tab or a sidebar heading:

```tsx file=src/NavItem.tsx variant=class
import { Component } from "@motifx/core";

export class NavItem extends Component<HTMLLIElement, { path: string }> {
  onConfigured() {
    this.motif.options.enableRouterClassing = {
      to: 'all',
      path: this.props.path,
      activeClass: 'is-active',
      exactClass: 'is-exact',
    };
  }
  view() { return <span>{this.childs}</span>; }
}
```
```tsx file=src/NavItem.tsx variant=function
export function NavItem(props: { path: string }) {
  return <li onconfigured={(s) => {
    s.motif.options.enableRouterClassing = {
      to: 'all',
      path: props.path,
      activeClass: 'is-active',
      exactClass: 'is-exact',
    };
  }}>{props.childs}</li>;
}
```
```tsx file=src/NavItem.tsx variant=options
export const NavItem = () => ({
  el: 'li',
  onConfigured() {
    this.motif.options.enableRouterClassing = {
      to: 'all',
      path: this.props.path,
      activeClass: 'is-active',
      exactClass: 'is-exact',
    };
  },
  view() { return <span>{this.childs}</span>; },
});
```

| Field | Description |
|-------|-------------|
| `path` | The path to compare against. |
| `to` | Which matches to handle: `'all'` (both), `'active'`, `'exact'`, `'none'`. |
| `activeClass` / `exactClass` | Space-separated class names; `classList.toggle`-d according to the match state. |
| `onActive` / `offActive` / `onExact` / `offExact` | Callbacks called according to the match state on every evaluation. |

The matching rules are the same as `RouterLink` (active = segment prefix or exact; exact = exact; query and `#` ignored). It is evaluated once when the setting is written, then again on every navigation (`onRouterChanged`); the subscription goes with the component. An evaluation error is reported as `MJX105`. If the router is not set up (no `useRouter`) it does nothing. A root element is required; on a fragment-rooted component there is no element to write the class to.

## Querying the route table — `resolve`, `href`, `routes` {#resolve-href-routes}

`app.router` carries three members for querying the route table without navigating:

```tsx
// Which route does an address match? (does not navigate, does not touch the address bar)
const hit = app.router.resolve('/users/5');
if (hit.ok) console.log(hit.route?.name, hit.params.id, hit.meta);

// The path of a named route — for RouterLink `to`, menus and breadcrumbs
<RouterLink to={app.router.href('user', { id: 5 })}>Profile</RouterLink>

// Every route in definition order (aliases excluded); to produce a menu or a sitemap
const menu = app.router.routes.filter(r => r.meta.menu);
```

| Member | Returns |
|--------|---------|
| `resolve(uri)` | `ResolveResult`: `{ ok, uri, fullPath, route, chain, params, meta, extend, aliasOf }`. `ok: false` if there is no match. |
| `href(name, params?)` | The named route's path with the parameters filled in (the same computation as `navigateByName`). The values `0` and `false` are written; for a parameter given as `undefined`, `null` or `''`, or not given at all, the pattern's default is used (if there is no default that segment is not written). Throws `MJX302` if the name does not exist. |
| `routes` | `RouteInfo[]`: `{ fullPath, name, meta, route, chain }`. A layout and its default child are separate items; `chain` is the route definitions from the root down to this route. |

## Programmatic navigation {#navigate}

Through `Application` or `useNavigation`:

```tsx
// From inside a component (context = Application)
this.context.navigate('/docs');

// From the Application instance
await app.navigate('/docs/routing');
await app.navigateByName('order', { id: 42 });

// With navigation options (replace, state, force, scroll)
await app.navigate('/docs', { replace: true });
await app.router.navigate('/docs', { replace: true });
```

`app.navigate(uri, options?)` and `app.router.navigate(uri, options?)` take the same `NavigationOptions` type; `app.navigate` passes the options to the router.

| Option | Effect |
|--------|--------|
| `replace` | Replaces the current history entry instead of adding a new one. |
| `state` | The value written to the history entry (see [Navigation direction and entry state](#direction-state)). |
| `force` | A navigation to the address on screen is normally ignored; with `force: true` middleware, guards and `onRouterChanged` still run. The page is not recreated. |
| `scroll` | Scrolling at the end of the navigation: `'top'`, `'smooth'`, `'instant'` or `{ top, left, behavior }`. When given, it overrides `scrollMemory`. |

`app.navigate` returns the result of the navigation: on a completed navigation the shown route's `ResolveResult` (`ok: false` on a not-found address and on the error page), on an ignored navigation `{ ok: true, skipped: true, uri }`, on a guard or `onLeave` cancellation `{ ok: false, cancelled: true, reason }` (`reason`: `'guard'`, `'onLeave'` or the text `onLeave` gave), on a navigation stopped by middleware `{ ok: false, uri, cancelled: true, reason: 'middleware' }`. `app.router.navigate` returns no result.

The `useNavigation()` hook returns the same object as `app.router`:

```tsx
import { useNavigation } from "@motifx/core";

const nav = useNavigation();
await nav.navigate('/home');
await nav.navigateByName('order', { id: 7 });
nav.params;    // the current path parameters
nav.route;     // the current route
nav.uri;       // the current URI
nav.fullPath;  // the full path
nav.meta;      // the route metadata
nav.chain;     // the path of every route in the chain
```

### Live route state {#live-route-state}

`app.router` is a single object throughout the application. A router taken into a field, from `useApplication()` or from `useNavigation()` gives the current route on every read. The route fields (`params`, `route`, `uri`, `ok`, `meta`, `extend`, `fullPath`, `aliasOf`, `chain`, `direction`, `state`, `stack`) are reactive: when read inside a function they run again on navigation.

```tsx file=src/Shell.tsx variant=class
import { Component, useNavigation } from "@motifx/core";

export class Shell extends Component<HTMLDivElement> {
  nav = useNavigation();
  view() {
    return <h1>{() => this.nav.params.id}</h1>;
  }
}
```
```tsx file=src/Shell.tsx variant=function
import { useNavigation } from "@motifx/core";

export function Shell() {
  const nav = useNavigation();
  return <h1>{() => nav.params.id}</h1>;
}
```
```tsx file=src/Shell.tsx variant=options
import { useNavigation } from "@motifx/core";

export const Shell = () => ({
  el: 'div',
  nav: useNavigation(),
  view() {
    return <h1>{() => this.nav.params.id}</h1>;
  },
});
```

- **Live reads go through the object.** `const { params } = useNavigation()` or `const id = nav.params.id` takes the value of that moment and does not change afterwards; read `nav.params.id` each time for the current value.
- **The route changes after the old page is removed and before the new page is attached** (in stack navigation, before the transition animation); `scoped` services switch to the new navigation at the same moment. The leaving page sees its own route inside `onDeactivated` / `onDisposing`. The new page the router sets up sees the route navigated to in its constructor and field initialisers.
- **Guards and route hooks** (`useGuard`, `onEntering`, `onUpdate`) run before the route changes; the route navigated to is in the context object (`to`, `params`). On a cancelled navigation the route does not change.
- **Cached `keepAlive` pages** read the current route while hidden too: their bindings run again with that route's values when another route is entered. Do route-bound work (such as data loading) inside `onActivated`.
- Before `useRouter()` is called the route fields are empty (`params` `{}`, `uri` `''`, `route` `null`, `chain` `[]`) and `navigate` throws `MJX309`.

## Navigation guards and hooks (application level) {#guards}

Global guards and hooks are defined on `Application`:

```tsx
// Runs BEFORE every navigation — continue/redirect/cancel with next()
app.useGuard(({ to, from }, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login');   // redirect
  } else {
    next();            // continue
  }
  // if next() is never called the navigation is blocked
  // next(false) → cancel the navigation
});

// AFTER every navigation (startup and 404 included); use the initial field to tell the startup apart
app.onRouterChanged(({ uri, meta, initial }) => {
  document.title = meta?.title ?? 'Application';
  if (!initial) trackPageView(uri);
});
```

Guards run on every navigation including the startup one, in the order they were added; the first guard that redirects or cancels ends the chain.

A guard's `next('/login')` redirect replaces the history entry with `replace` if the address bar shows the blocked path (first load, back/forward); the "back" button does not return to the blocked path and get stuck on the same guard again. On a programmatic navigation (from another page) the target is added to the history normally.

If a guard throws (or the promise it returns rejects), the navigation is cancelled and the error is reported with code `MJX306` (`The guard hook threw.`); the result of `app.navigate` becomes `{ ok: false, cancelled: true, reason: 'guard' }`. On a back/forward navigation the address is restored, as with other cancellations.

**If back/forward is cancelled, the address is restored.** The browser's back/forward button (the system back gesture on Android too) changes the address before the navigation starts. If a guard, `onLeave` or middleware cancels this navigation, the router returns the address with `history.go` to the entry of the page still on screen; the address and the screen do not diverge and the history is not corrupted. This is how an "unsaved changes" confirmation works correctly on the back button as well. For this the router writes a namespaced sequence stamp (`__motifHistory`) into every history entry's `history.state`; if other code calls `history.pushState` directly, the sequence computation may drift.

### Navigation direction and entry state — `direction`, `state` {#direction-state}

Every navigation's direction comes in the `direction` field: `'initial'` (startup), `'push'`, `'replace'`, `'back'`, `'forward'` or, for a history move whose order cannot be known, `'traverse'`. The direction is reflected in the guards (`to.direction`), the `onRouterChanged` payload and `app.router.direction`. Use it to choose transitions by direction (slide left going forward, right going back).

The value given with `navigate(uri, { state })` is written to that history entry and comes back **when the entry is returned to with back/forward** too; it survives a page refresh. It suits data that has to travel without being written to the address (which filter the list was left with, the open tab, and so on):

```tsx
await app.navigate('/product/7', { state: { from: 'list', page: 3 } });

app.router.state;                // { from: 'list', page: 3 } — also when returned to with back/forward
app.useGuard(({ to }, next) => { console.log(to.direction, to.state); next(); });
app.onRouterChanged(({ direction, state }) => { /* ... */ });
```

Plain objects are stored as they are (the router only adds its own stamp; `app.router.state` strips it); non-plain values such as `Date` and `Map` are not touched at all. On an entry without `state`, `app.router.state` is `undefined`.

### Middleware — `app.use` {#middleware}

To add a layer to the navigation resolution chain:

```tsx
app.use(async (ctx, next) => {
  // ctx: RouteResolveContext — { uri, context (Application), rewritePath(uri) }
  if (ctx.uri === '/old') ctx.rewritePath('/new');   // change the target
  await next();  // continue the chain
});
```

Middleware runs in the order it was added, before redirects (`redirect`), `onLeave` and the guards. Middleware that does not call `next()` cancels the navigation. The address given with `rewritePath` becomes the address navigated to and written to the address bar. On the router's startup navigation (`run()` and `restartRouter()`) middleware does not run; guards do.

### Restarting and disposing the router {#restart-dispose}

`app.restartRouter()` sets up a new router and disposes the old one. If `useRouter` was called again after `run()`, the latest configuration is used, otherwise the current one; a new configuration given after `run()` takes effect only through `restartRouter()`. The router restarts at the current address (in `shell` mode at the page the router shows; `/` if it never navigated). The route table is rebuilt, the `keepAlive` cache and the pages held in the stack are discarded, the page is recreated; no history entry is added. `onRouterChanged` runs with `initial: true` and `direction: 'initial'`. Called before `run()` it does nothing.

`app.dispose()` disposes the router too (listeners, the `keepAlive` cache, the pages in the stack) and sets the address to `/` only with `history.replaceState`; no `#` is written and no history entry is added.

## Stack navigation — `stack` {#stack}

In the default behaviour the old page is discarded on leaving and recreated on return. What mobile applications expect is the **stack** behaviour: going forward, the previous page is kept with its state, scroll and form; coming back, the same instance returns. `stack` turns this on:

```tsx
app.useRouter({
  routes,
  mode: 'history',
  stack: {
    retain: true,        // keep previous pages hidden in the DOM (default false: in memory, detached from the DOM)
    depth: 5,            // how many previous pages to keep at most (default 5; the oldest overflowing page is discarded)
    persist: false,      // write the addresses in the stack to sessionStorage (default false)
    animation: 'slide',  // 'none' (default) | 'slide' | a custom function
    duration: 300,       // 'slide' duration (ms)
    swipeBack: true,     // go back by swiping right from the left edge of the screen (off by default)
  },
});
```

`stack: true` turns it on with the default values. Without the option the behaviour is as described above; nothing changes. It has no effect in `shell` mode since there is no history.

Rules:

- **A kept page is bound to the history entry, not the route.** `/product/1` → `/product/2` → back: `/product/1`'s own instance returns. (With the stack on, going forward to the same route with different parameters creates a new instance; `onUpdate` is still called.)
- **Going forward (push/forward) the leaving page is kept; going back (back) the leaving page is discarded.** The browser's forward button recreates that page. A page replaced with `replace` is not kept. Going back and then somewhere new discards the pages of the forward entries.
- While a kept page is hidden `onDeactivated` runs; when it returns `onActivated` and the route's `onShow` hook run. The position of scrollable elements inside the page is kept.
- With `retain: true` the hidden page stays in the DOM with `display: none`, `inert` and `aria-hidden`; its styles are restored exactly when it returns. If the page's root is not an element (a fragment), it is kept detached from the DOM.
- `keepAlive` routes keep using their own cache.
- When the application or the router is disposed, all kept pages are disposed.

**`app.router.stack`** gives the current list of the stack: `[{ index, uri, current, retained }]`. Use it for things like showing the previous page's name on a back button. With `persist: true` this list comes back after a page refresh too; on refresh the previous pages are not recreated, they are created as you go back.

**The transition animation.** `animation: 'slide'` slides the new page in from the right going forward and slides the current page out to the right going back; the other page stays underneath meanwhile. The animation works independently of the `retain` setting: with `retain: false` the leaving page stays in the DOM until the animation ends, then leaves. If the user chose "reduce motion" in the system, the animation is skipped. Give a function to write your own animation; the two pages come positioned on top of each other, and the styles are restored when the function finishes:

```tsx
stack: {
  retain: true,
  animation: async ({ direction, entering, leaving }) => {
    await Promise.all([
      entering?.animate([{ opacity: 0 }, { opacity: 1 }], 200).finished,
      leaving?.animate([{ opacity: 1 }, { opacity: 0 }], 200).finished,
    ]);
  },
}
```

On a navigation where the stack animation runs, the pages' own transitions (`motif.options.transition`, see [Styling and Transitions](./styling-and-transitions.md)) do not play; only the stack animation does the transition.

**The pages' own transitions.** When `animation` is not given, the stack uses the pages' own enter/leave transitions; there is no need to define a stack animation as well. The order is as with the stack off: first the leaving page's leave finishes, then the entering page enters.

- Going forward the leaving page plays its leave transition and is kept in the stack after it ends (detached or hidden according to the `retain` setting). Going back the leaving page is discarded while playing its leave transition.
- The entering page plays its enter transition; a kept page returning from the stack plays its enter transition again as well, whatever the value of `retain`.
- A page without a transition leaves or enters at once.
- During the transition the page element carries the navigation's direction in the `data-nav-direction` attribute (`initial`, `push`, `back`, `forward`, `replace`, `traverse`); it is removed when the transition ends. Different animations for forward and back can be written with the same CSS:

```css
.page-enter-active { animation: slide-from-right .3s ease; }
.page-leave-active { animation: slide-to-left .3s ease forwards; }
[data-nav-direction="back"].page-enter-active { animation-name: slide-from-left; }
[data-nav-direction="back"].page-leave-active { animation-name: slide-to-right; }
```

**Swipe back.** With `swipeBack: true` a horizontal touch starting from the left edge of the screen (24px by default) slides the page along with the finger. For the previous page to be visible underneath during the drag `retain: true` is required; with `retain: false` the previous page is not in the DOM, so the page's background shows underneath, and going back still works on release. A swipe past 35% of the width (`threshold`) or a quick flick goes back, otherwise the page settles back in place. If a guard cancels the back navigation the page slides back and the address is kept. On a swipe-back the drag itself is the animation; the pages' own transitions do not play. Settings: `swipeBack: { edge: 24, threshold: 0.35 }`. The touch listener becomes active only on a touch starting from the edge; it does not affect the page's vertical scroll or horizontally scrolled content.

## Lazy loading {#lazy}

Using `() => import(...)` in the `control` field loads the route component only when needed and provides automatic code splitting:

```ts
{ path: '/reports', control: () => import('../pages/Reports') }
```

`fallbacks.notFound` and `fallbacks.error` support the same lazy form.

For lazy content inside a component, [Lazy](./lazy.md) is used. Since loading can fail on a mobile network, retrying can be turned on with `retry`; if the device is offline it waits until the connection comes back:

```tsx
<Lazy caller={() => import('./Chart')} options={{
  Loaderview: <Spinner />,
  Fallbackview: <LoadFailedBox />,
  retry: { count: 3, delayMs: 500, whenOnline: true },   // or simply retry: 3
  onRetry: (attempt, error) => console.warn('retrying', attempt),
}} />
```

The wait grows by `delayMs` on every attempt (500, 1000, 1500…); the `retry: 3` shorthand uses `delayMs: 500` and `whenOnline: true`. `onError` and `Fallbackview` kick in only if the last attempt fails too. If the component is disposed or `signal` is aborted during the wait, the attempt stops and the listeners are cleaned up. Without `retry` the behaviour is a single attempt.

## Next step {#next}

Continue with [Dependency Injection](./dependency-injection.md) to learn how services are registered and injected.
