---
slug: publishing-libraries
title: Publishing an npm Library for MotifJS
description: Preparing an npm package containing MotifJS components, services or wrappers; package shape, build, types, CSS, the prop contract, testing and the release checklist.
category: guides
order: 2
---

If you write a UI library, a wrapper or a set of services and want others to use it through `npm install`, this section is for you. The package must bind to the same `@motifx/core` instance the application uses, ship its JSX **pre-compiled**, and impose nothing on the consumer's build setup. The setup below provides that.

## The package boundary {#boundary}

There are two kinds of package; the difference in setup is small:

| Package | Content | Is the compiler needed? |
|---------|---------|-------------------------|
| **Imperative wrapper** | `.ts` components without JSX (`super('canvas')`, `controls.add`, `bindings.*`) | No; `tsc` or any bundler is enough. |
| **JSX library** (UI kit) | `.tsx` components | Yes; the package is compiled with `@motifx/compiler` before publishing. |

In both cases `@motifx/core` is a **peer dependency**: the package does not bundle it, it uses the copy the consumer installed. Two copies mean two reactivity engines, and that failure is silent (see [The single-copy rule](./wrapping-libraries.md#single-copy)).

## package.json {#package-json}

```jsonc file=package.json
{
  "name": "@company/motif-ui",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./style.css": "./dist/style.css",
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "dev": "vite",
    "build": "vite build && tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "prepublishOnly": "npm run build"
  },
  "peerDependencies": {
    "@motifx/core": "^1.0.0"
  },
  "devDependencies": {
    "@motifx/core": "^1.0.0",
    "@motifx/compiler": "^1.0.0",
    "jsdom": "^26.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.4.0",
    "vitest": "^3.0.0"
  },
  "keywords": ["motifjs", "motifx"],
  "publishConfig": { "access": "public" }
}
```

- The same `@motifx/core` major in `peerDependencies` and `devDependencies`: one is a condition on the consumer, the other is for your build and tests.
- `@motifx/compiler` is only in `devDependencies`; the consumer does not have to install it because the package ships compiled code.
- `sideEffects: false` turns on tree-shaking; so do **not** keep a module that does work when imported (global CSS injection, global registration). If such a thing is needed, export it as an explicit function (`registerX(app)`).
- The third-party library you wrap (such as `chart.js`) becomes a peer dependency too; add it to the `external` list as well.

## Build {#build}

```ts file=vite.config.ts
/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import compiler from '@motifx/compiler';

export default defineConfig({
  plugins: [compiler()],
  esbuild: { jsx: 'preserve' },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['@motifx/core'],
    },
    sourcemap: true,
    minify: false,
    target: 'es2020',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
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
    "noImplicitOverride": true,
    "declaration": true,
    "declarationMap": true,
    "noEmit": true,
    "skipLibCheck": true,
    "lib": ["ESNext", "DOM", "DOM.Iterable"]
  },
  "include": ["./src/**/*", "./vite.config.ts"]
}
```

```jsonc file=tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "emitDeclarationOnly": true,
    "outDir": "./dist/types",
    "rootDir": "./src"
  },
  "include": ["./src/**/*"],
  "exclude": ["./src/**/*.test.ts", "./src/**/*.test.tsx"]
}
```

What happens:

- `vite build` runs in library mode; `@motifx/compiler` lowers the JSX in every `.tsx` file to `bindings.*` calls. The output is plain JavaScript, no JSX remains; the `@motifx/core` imports (`motifComponent`, `motifCompiled` …) stay outside the package because they are `external`, and bind to the consumer's copy.
- Without `esbuild: { jsx: 'preserve' }` esbuild turns JSX into `React.createElement` and the compiler never sees it; this line is mandatory (see [Build setup](./getting-started.md#build-setup)).
- `tsc -p tsconfig.build.json` only produces `.d.ts`; the compiler does not touch types. The `static elementTag` produced from the `Component<HTMLDivElement>` generic is in the compiled JS; it is not visible on the type side, and need not be.
- The compiled code depends on a **compiler contract**: a package compiled with `@motifx/compiler` 1.x wants `@motifx/core` 1.x. The contract changes only with a major version; on a mismatch the consumer sees a `MJX121` warning in development mode. Set the `peerDependencies` range accordingly (`^1.0.0`), and recompile and republish the package when the major rises.
- `noImplicitOverride`: if your component classes accidentally shadow a `ComponentBase` member (`dispose`, `controls`, `props`, `element` …) you get a compile error.

In a wrapper without JSX the `plugins: [compiler()]` and `jsx` lines are unnecessary; the rest is the same.

## The entry point and exports {#entry}

```ts file=src/index.ts
export { Button } from './Button';
export { Dialog } from './Dialog';
export type { ButtonProps } from './Button';
export { registerUiServices } from './services';
```

- Export components and prop types by **name**; a `default export` makes sense only for single components suited to `Lazy`/route lazy loading.
- Heavy components (editor, chart, map) can be offered from separate subpaths: `exports["./editor"]` + a `build.lib.entry` object. The consumer loads only what is needed with `Lazy({ caller: () => import('@company/motif-ui/editor') })` (see [Lazy](./lazy.md)).

## The prop contract {#prop-contract}

Your package's components will be used in other people's JSX; define a prop surface that follows the compiler's rules:

```tsx file=src/Button.tsx variant=class
import { Bind, Component, IBaseProp, read } from '@motifx/core';

export interface ButtonProps {
  label: Bind<string>;
  tone?: Bind<'default' | 'accent' | 'danger'>;
  disabled?: Bind<boolean>;
  onPress?: (e: MouseEvent) => void;
}

export class Button extends Component<HTMLButtonElement, ButtonProps> {
  constructor(props: IBaseProp<ButtonProps>) {
    super(props);   // root: the <button> produced from the generic
  }

  onConfigured() {
    this.class.add('mf-button', () => `mf-button--${read(this.props.tone) ?? 'default'}`);
    this.attr.add({ disabled: () => read(this.props.disabled) ?? false });
    this.motif.on('click', (_s, e) => this.props.onPress?.(e));
  }

  view() {
    return <>{() => read(this.props.label)}</>;
  }
}
```
```tsx file=src/Button.tsx variant=function
import { Bind, read } from '@motifx/core';

export interface ButtonProps {
  label: Bind<string>;
  tone?: Bind<'default' | 'accent' | 'danger'>;
  disabled?: Bind<boolean>;
  onPress?: (e: MouseEvent) => void;
}

export function Button(props: ButtonProps) {
  return (
    <button
      class={() => ['mf-button', `mf-button--${read(props.tone) ?? 'default'}`]}
      disabled={() => read(props.disabled) ?? false}
      onclick={(e) => props.onPress?.(e)}
    >
      {() => read(props.label)}
    </button>
  );
}
```
```tsx file=src/Button.tsx variant=options
import { Bind, read } from '@motifx/core';

export interface ButtonProps {
  label: Bind<string>;
  tone?: Bind<'default' | 'accent' | 'danger'>;
  disabled?: Bind<boolean>;
  onPress?: (e: MouseEvent) => void;
}

export const Button = (props: ButtonProps) => ({
  el: 'button',
  view() {
    return (
      <button
        class={() => ['mf-button', `mf-button--${read(props.tone) ?? 'default'}`]}
        disabled={() => read(props.disabled) ?? false}
        onclick={(e) => props.onPress?.(e)}
      >
        {() => read(props.label)}
      </button>
    );
  },
});
```

Rules:

- **In a class component `view()` returns the content, not the root.** Take the root element from the generic (`Component<HTMLButtonElement>`) or with `super('button')`, bind the root's class/attributes/events in `onConfigured`; writing `<button>` again inside `view()` produces two nested elements. In the function and Options forms the returned element / the element in `view()` is already the root.
- **Every prop that can change is a `Bind<T>`** and is read with `read()`. The consumer may write `label="Save"` as well as `label={() => state.text}`; the compiler already wraps a ternary in an attribute in a getter (see [Ternaries in attributes](./jsx.md#attribute-ternary)). If you read the prop directly as `this.props.label`, the getter form does not work.
- **Common attributes fall through to the root.** `class`, `style`, `id`, `tabindex`, `role`, `aria-*`, `data-*` are applied automatically from the component tag to the root element; do not define them as props and copy them by hand (see [Attribute fallthrough](./jsx.md#attribute-fallthrough)). The root's own `class` is merged with the consumer's.
- **Do not use the reserved names:** `options`, `ref`, `key`, `transition`, `childs`, `initializeComponent`, `runover` and the names of the lifecycle hooks (`onBuilt`, `onMounted` …) go to the framework (see [Care with prop names](./wrapping-libraries.md#prop-names)).
- **Do not give a callback a name that collides with a DOM event name.** A prop such as `onChange`, `onSelect`, `onResize`, `onReset`, `onCopy` or `onContextMenu` is attached to the root element as a DOM listener on a component tag and never reaches `props`; the compiler warns with `MJX002`. Names such as `onPress`, `onValueChange`, `onCommit` are safe.
- **Child content** arrives through `childs`; on a root element the `<Card>…</Card>` form works directly without writing `view()` (see [Child components](./components.md#childs)).
- Assume the consumer will reach the component instance with `ref`; expose the behaviour you want to make public as public methods (`dialog.open()`), make the internal fields `private`.

## Style and CSS {#css}

Ship the package CSS as **a single file** and let the consumer import it deliberately:

```ts
// consumer
import '@company/motif-ui/style.css';
```

- In library mode, CSS imported from inside `src/index.ts` is written as `dist/style.css` in Vite 5 (in Vite 6 give the name with `build.lib.cssFileName: 'style'`); `exports["./style.css"]` makes it addressable. Importing from the entry does not conflict with `sideEffects: false`: CSS files are treated as side-effectful by the bundler.
- Put the rules inside an `@layer` (`@layer mf.base, mf.components;`). Since unlayered rules override every layer regardless of specificity, a one-line override by the consumer always wins; give theme values as prefixed CSS variables such as `--mf-*`.
- A `<style>` tag inside a component (see [Inline style](./styling-and-transitions.md#inline-style-tag)) works for small, self-contained components, but it produces a `<style>` node per instance and is not scoped; at library scale prefer a file.
- Document the class names for transitions: a consumer writing `transition="mf-fade"` expects the `mf-fade-enter-from/active/to` rules from you (see [The transition prop](./styling-and-transitions.md#transition-prop)).

## Services {#services}

If the package carries a service (theme, notification queue, language), mark it with `@Injectable`; the class is marked the moment its module loads and registered on the first resolution (see [Automatic registration with decorators](./dependency-injection.md#injectable-decorator)). The compiler plugin compiles decorators in `.ts` files too; in a wrapper without the plugin TypeScript compiles the standard decorator itself.

If the consumer needs to choose the lifetime, an explicit registration function is clearer:

```ts file=src/services.ts
import { ServiceCollection } from '@motifx/core';
import { ThemeService } from './ThemeService';

export function registerUiServices(services: ServiceCollection) {
  services.addSingleton(ThemeService, ThemeService);
}
```

```ts
// consumer
const builder = Application.CreateBuilder();
registerUiServices(builder.services);
const app = builder.build();
```

An explicit registration overrides the decorator; providing both is safe.

## Testing and development {#testing}

- `vitest` + `jsdom` work with the same plugin in `vite.config.ts`; no extra setting is needed for JSX in tests. Append to `document` and test the `onMounted` behaviour too.
- Write a **round-trip test** for every component: build, add to the DOM, `dispose()`, verify the live component count returns to the start (see [Prove the cleanup](./wrapping-libraries.md#prove-cleanup)). A leak is only seen this way.
- For development put an `index.html` and `src/showcase/` at the package root; see the components in a real browser with `vite`. The showcase does not enter the package since it is outside `exports`.
- `motif-lint` (ships with `@motifx/compiler`) checks JSX against the prop types; add `"lint:jsx": "motif-lint"` to `package.json` (see [motif-lint](./jsx.md#motif-lint)).

## Pre-release checklist {#release-checklist}

1. `npm run build` → did `dist/index.js`, `dist/index.cjs`, `dist/types/index.d.ts`, `dist/style.css` appear?
2. No `jsx(`/`createElement(` inside `dist/index.js`, and `from "@motifx/core"` present? (The compiler ran and the core stayed outside.)
3. `npx publint` and `npx @arethetypeswrong/cli --pack`: are `exports`/`types` consistent, does a CJS consumer see the types?
4. Install the `npm pack` output in an empty Vite application and use a component; see with `app.useDevelopment(true)` that no `MJX121` or `MJX002` warning appears.
5. While testing linked with `file:`/`link:` in a monorepo, give `resolve: { dedupe: ['@motifx/core'] }` in the consumer; the published package does not need this.
6. Write the peer dependencies, the `style.css` import, the prop table and the transition class names in the `README`.

## Next step {#next}

For the rules of turning a third-party library into a component see [Wrapping Third-Party Libraries](./wrapping-libraries.md); for the lifecycle of the components inside the package see [Lifecycle](./lifecycle.md).
