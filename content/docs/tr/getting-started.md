---
slug: getting-started
title: Başlarken
description: Build yapılandırmasını yapın, component oluşturun ve uygulamayı bağlayın.
category: start
order: 1
---

Bu bölüm MotifJS'in build zincirini kurmayı, bir proje iskeleti hazırlamayı ve ilk çalışan uygulamayı ekrana getirmeyi anlatır.

## Gereksinimler {#requirements}

- **Vite** (önerilen paketleyici) veya Rollup
- **JavaScript (`.jsx`,`.js`) veya TypeScript (`.tsx`,`.ts`)** — TypeScript kullanıyorsanız projenizin sürümü. `@motifx/compiler`, tip-bilinçli denetim (`motif-lint`) için kendi TypeScript bağımlılığını (5.x/6.x) getirir; projedeki TypeScript sürümünden bağımsız çalışır.
- **`@motifx/core`** — çekirdek kütüphane
- **`@motifx/compiler`** — JSX'i MotifJS runtime çağrılarına derleyen build eklentisi

İki paket aynı major sürümde kullanılır (`@motifx/compiler` 1.x ile `@motifx/core` 1.x). Derlenmiş kodun runtime'a dayandığı yüzey (derleyici sözleşmesi) yalnızca major sürümde değişir; sürümler uyuşmazsa geliştirme modunda `MJX121` uyarısı çıkar (uyuşmazlık modüller yüklenirken görülse de uyarı `app.useDevelopment(true)` çağrıldığında gösterilir).

## Build yapılandırması {#build-setup}

MotifJS'in JSX'i standart bir `jsxFactory` ile değil, kendi derleyicisi (`@motifx/compiler`) ile işlenir. Derleyici, JSX içindeki reaktif ifadeleri (metin, koşul, liste) çözümleyip uygun `bindings.*` çağrılarına dönüştürür. Bu nedenle iki ayar kritiktir:

1. `@motifx/compiler` eklentisini paketleyiciye eklemek.
2. TypeScript/esbuild'in JSX'i **dönüştürmeyip olduğu gibi bırakması** (`jsx: "preserve"`), böylece dönüştürmeyi `@motifx/compiler` yapar.

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

> **Neden `jsx: "preserve"`?** MotifJS'te JSX bir "render fonksiyonu çağrısı"na değil, reaktif bağların kurulduğu bir derleme çıktısına dönüşür. Örneğin `{model.count}` ifadesi derleyici tarafından `sender.bindings.add("textContent", model, "count")` çağrısına çevrilir. Bu dönüşümü yalnızca `@motifx/compiler` bilir; bu yüzden esbuild/tsc JSX'e dokunmamalıdır.

Eklenti `.jsx` ve `.tsx` dosyalarını derler; `.ts`/`.js` dosyalarında yalnız dekoratörleri (`@Injectable`) dönüştürür (bkz. [Dependency Injection](./dependency-injection.md#injectable-decorator)). Eklentinin seçenekleri: `diagnostics` (derleme uyarılarını kapatmak için `false`) ve `explain` (bkz. [Derleme zamanı uyarıları](./jsx.md#compile-time-diagnostics)).

## HTML barındırıcısı {#html-host}

Uygulamanın ekleneceği bir kök eleman gereklidir:

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

## Bir component oluşturun {#first-component}

Bir component reaktif state tutabilir ve görünüm döndürebilir. Class, Function ve Options biçimleri aynı çekirdeği kullanır; görünümü `view()`/dönüş değeriyle bildirimsel ya da `controls` ile zorunlu (imperative) kurabilirsiniz (bkz. [Bileşenler](./components.md)).

```tsx file=src/Counter.tsx variant=declarative/class
import { Component, reactive } from '@motifx/core';

export class Counter extends Component<HTMLDivElement> {
  state = reactive({ count: 0 });

  view() {
    return <button onclick={() => this.state.count++}>
      Sayaç: {this.state.count}
    </button>;
  }
}
```

```tsx file=src/Counter.tsx variant=declarative/function
import { reactive } from '@motifx/core';

export function Counter() {
  const state = reactive({ count: 0 });

  return <button onclick={() => state.count++}>
    Sayaç: {state.count}
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
      Sayaç: {this.data.count}
    </button>;
  },
});
```

```tsx file=src/Counter.tsx variant=imperative/class
import { Component } from '@motifx/core';

export class Counter extends Component<HTMLDivElement> {
  initializeComponent() {
    this.controls.add(
      <button onclick={() => this.controls.add('Yeni kontrol')}>
        Kontrol ekle
      </button>
    );
  }
}
```

```tsx file=src/Counter.tsx variant=imperative/function
export function Counter() {
  return <div initializeComponent={(component) => {
    component.controls.add(
      <button onclick={() => component.controls.add('Yeni kontrol')}>
        Kontrol ekle
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
      <button onclick={() => this.controls.add('Yeni kontrol')}>
        Kontrol ekle
      </button>
    );
  },
});
```

`{this.state.count}` ifadesi reaktif bir metin bağıdır: `count` değiştiğinde yalnızca o metin düğümü güncellenir. `initializeComponent` bileşen kurulurken (`view()`'den önce) bir kez çağrılır; `controls.add` elemanı anında DOM'a ekler, render döngüsü beklenmez. `controls.add('Yeni kontrol')` gibi düz bir değer metin düğümüne sarılır.

## Uygulamayı bağlayın {#mount-app}

`Application` sınıfı uygulamanın giriş noktasıdır. Tipik akış:

1. `Application.CreateBuilder()` ile bir **builder** oluştur.
2. Gerekiyorsa servisleri `builder.services` üzerine kaydet (bkz. [Dependency Injection](./dependency-injection.md)).
3. `builder.build()` ile `Application` örneğini üret.
4. İsteğe bağlı olarak `app.useRouter(...)` ile yönlendirmeyi tanımla.
5. `app.run(host, rootComponent)` ile uygulamayı bir DOM elemanına bağla.

Class component örnek (instance) olarak, Function ve Options component'leri JSX etiketi olarak verilir:

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

`app.run` ilk argümanı olarak bir CSS seçicisi (`"#app"`), bir `HTMLElement` veya bir `Node` kabul eder; seçici eşleşmezse `MJX406` hatası fırlatılır. İkinci argüman **kök bileşendir**. İkinci argüman verilmezse MotifJS köke otomatik olarak bir `RouterView` yerleştirir (router tabanlı uygulamalar için — bkz. aşağıda). `Application.CreateBuilder()` uygulama başına bir kez çağrılır; ikinci çağrı `MJX405` fırlatır (`app.dispose()` sonrası yeniden çağrılabilir).

### Router tabanlı başlatma {#router-start}

Çok sayfalı uygulamalarda kök bileşen yerine yönlendirmeyi kullanın. Bu durumda `run`'a ikinci argüman vermeyin; MotifJS kök `RouterView`'i kendisi ekler:

```tsx file=src/main.tsx
import { Application } from '@motifx/core';
import { routes } from './config/routes';

const app = Application.CreateBuilder().build();

app.useDevelopment(true);  // geliştirme modu: MJX uyarıları ve rota denetimi (useRouter'dan önce)
app.useLogging(true);      // konsol hata günlüğü (varsayılan açık)

app.useRouter({
  routes,
  mode: 'history',                    // 'history' | 'hash' | 'file' | 'shell'
  fallbacks: {
    notFound: () => import('./pages/NotFound'),
  },
});

app.run(document.getElementById('app')!);
```

Rota tanımı ve `RouterView` yerleşimi [Routing](./routing.md) bölümünde ayrıntılı anlatılır.

## Geliştirme yardımcıları {#dev-helpers}

`Application` üzerinde zincirlenebilir yapılandırma metotları vardır:

| Metot | Açıklama |
| ------- | ---------- |
| `app.useDevelopment(true)` | Geliştirme modunu açar: `MJX` uyarıları konsola yazılır (`console.warn`), çerçevenin kendi içinde yakalayıp sessizce geçtiği hatalar da konsola yazılır; `useRouter`'dan önce çağrılırsa rota tanımları denetlenir. `app.isDevelopmentModeEnabled` ile okunur. |
| `app.useLogging(true)` | Hataların konsola yazılmasını açar/kapatır (varsayılan açık). |
| `app.useReactiveMonitor({ enabled: true, threshold: 200, name: 'app' })` | Reaktif bağımlılık sızıntı izlemeyi açar (geliştirme için önerilir; bkz. [Sızıntı izleme](./memory-and-dispose.md#leak-monitor)). |
| `app.useTransitions({ mode: 'out-in' })` | Giriş/çıkış geçişlerinin varsayılan kipini seçer (bkz. [Giriş/çıkış kipi](./styling-and-transitions.md#transition-mode)). |

Kancalarda (`MJX122`), olay işleyicilerinde (`MJX123`) ve effect/bağ fonksiyonlarında (`MJX208`) fırlatılan hatalar geliştirme modundan bağımsız olarak, üretimde de raporlanır: `console.error`'a yazılır (`useLogging(false)` değilse) ve `errorHandler.addListener(fn)` dinleyicilerine `MotifError` olarak iletilir (`error.code`, `error.cause`). Uygulama çalışmaya devam eder.

## Sonraki adım {#next}

Uygulamanın parçalarını oluşturmak için [Bileşenler](./components.md) bölümüne geçin.
