---
title: Başlarken
description: Build yapılandırmasını yapın, component oluşturun ve uygulamayı bağlayın.
category: start
order: 1
---

## Gereksinimler {#requirements}

MotifJS runtime ve JSX compiler ile Vite veya Rollup kullanın. İki MotifJS paketini aynı major sürümde tutun.

## Build yapılandırması {#build-setup}

MotifJS compiler JSX’i build sırasında işler. Compiler’ın dönüştürebilmesi için Vite’ta JSX dönüşümünü koruyun.

```ts file=vite.config.ts
import { defineConfig } from 'vite';
import compiler from '@motifx/compiler';

export default defineConfig({
  plugins: [compiler()],
  esbuild: { jsx: 'preserve' },
});
```

## Bir component oluşturun {#first-component}

Bir component reaktif state tutabilir ve görünüm döndürebilir. Örnek, seçtiğiniz kod tercihini izler; Class, Function ve Options biçimleri aynı runtime’ı kullanır.

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

## Uygulamayı bağlayın {#mount-app}

Bir Application oluşturup kök component’i belgedeki bir elemente bağlayın. Class component örnek (instance) olarak, Function ve Options component’leri JSX etiketi olarak verilir. Uygulama birden fazla görünüm içeriyorsa router ekleyin.

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
