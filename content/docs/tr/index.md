---
slug: index
title: MotifJS Dokümantasyonu
description: MotifJS'in ne yaptığı, bölümlerin dizini ve bir sayaç bileşeniyle hızlı bakış.
category: start
order: 0
---

MotifJS; hızı, reaktiviteyi ve mimari yapıyı tek çatı altında toplayan, modern web uygulamaları için tasarlanmış, JavaScript ve TypeScript için bir UI framework'üdür. JSX derleme zamanında doğrudan DOM bağlarına derlenir. Sanal DOM (VDOM) ve diffing kullanmaz; bileşenler **doğrudan gerçek DOM'a** bağlanır ve güncellemeler noktasal (fine-grained) reaktivite ile yalnızca değişen yere uygulanır.

## MotifJS neyi farklı yapar? {#what-is-different}

- **Render döngüsü yoktur.** `this.controls.add(<div/>)` çağrısı elemanı anında DOM'a ekler. Yeniden render, diffing veya görünmez katmanlar yoktur.
- **Noktasal reaktivite.** Bir state alanı değiştiğinde tüm bileşen değil, yalnızca o alana bağlı DOM düğümü/özniteliği güncellenir.
- **Gerçek eleman erişimi.** Her bileşenin `element` referansı, mount'tan önce bile erişilebilirdir.
- **Bütünleşik altyapı.** Router, Dependency Injection, yaşam döngüsü, animasyon ve bellek yönetimi çekirdekle birlikte gelir.
- **JavaScript, TypeScript ve JSX/TSX desteklenir.** Bileşenleri sınıf, fonksiyon veya Options API stiliyle yazabilirsiniz.

> MotifJS uzun ömürlü ve durum-yoğun arayüzler için tasarlanmıştır. SSR (sunucu tarafı render) bilinçli olarak kapsam dışıdır.

## İçindekiler {#contents}

| Kategori | Bölüm | Konu |
|----------|-------|------|
| Başlangıç | [Başlarken](./getting-started.md) | Kurulum, build yapılandırması, ilk bileşen ve uygulama |
| Çekirdek | [Bileşenler](./components.md) | Sınıf / fonksiyon / Options API bileşenleri, kök eleman, `props`, `childs`, `controls`, `ref` |
| Çekirdek | [JSX ve Şablonlar](./jsx.md) | JSX kuralları, class/style/öznitelik, spread, `x-` direktifleri, fragment, derleme tanıları, `explain` |
| Çekirdek | [Reaktivite](./reactivity.md) | `reactive`, `createSignal`, `createComputed`, `createLazyComputed`, `effect`, `untracked` |
| Çekirdek | [Koşullu Gösterim ve Listeler](./conditionals-and-lists.md) | `x-wait`, `&&`, üçlü operatör, `.map`, `switch`, bağ API'si |
| Çekirdek | [Olaylar](./events.md) | DOM olayları, değiştiriciler, bileşen ve uygulama olayları |
| Çekirdek | [Formlar ve İki Yönlü Bağlama](./forms.md) | `bindings.model`, `x-model`, `checked`, `value` |
| Çekirdek | [Yaşam Döngüsü](./lifecycle.md) | Lifecycle kancaları ve sıraları, görünürlük, bertaraf, uygulama yaşam döngüsü |
| Uygulama | [Routing](./routing.md) | Rota tanımı, `RouterView`, `RouterLink`, navigasyon, guard'lar, yığın gezinmesi |
| Uygulama | [Dependency Injection](./dependency-injection.md) | Servis kaydı, `@Injectable`, `inject`, servis bertarafı |
| Uygulama | [Stil ve Animasyon](./styling-and-transitions.md) | `class`/`style` yardımcıları, geçiş (transition) sistemi |
| Uygulama | [Bellek Yönetimi ve Dispose](./memory-and-dispose.md) | `IDisposable`, otomatik temizlik, sızıntı izleme |
| Uygulama | [Hata Yönetimi](./error-handling.md) | Fırlatma/rapor/uyarı yolları, `MotifError`, `errorHandler`, `safeCall*`, `Emitter` |
| Uygulama | [Dayanıklılık (Resilience)](./resilience.md) | `retry`, `timeout`, `circuitBreaker`, `bulkhead`, `rateLimiter`, `fallback` |
| Gelişmiş Bileşenler | [Frame](./frame.md) | Tek değişen içeriği tutan kapsayıcı; zamanlama ve geçişler |
| Gelişmiş Bileşenler | [Lazy](./lazy.md) | Dinamik `import()` ile içerik; yükleme akışı, yeniden deneme |
| Gelişmiş Bileşenler | [Transport ve TransportTo](./transport.md) | İçeriği başka bir yuvada gösterme; `Transporter` |
| Gelişmiş Bileşenler | [ContentBody ve ContentBlock](./content-body.md) | Birden çok bloğun birlikte doldurduğu gövde |
| Gelişmiş Bileşenler | [Virtualization](./virtualization.md) | Büyük veri için sanal kaydırma |
| Kılavuzlar | [Üçüncü Parti Kütüphane Sarmalama](./wrapping-libraries.md) | Kendi DOM'unu yöneten kütüphaneleri bileşene dönüştürme |
| Kılavuzlar | [MotifJS için npm Kütüphanesi Yayımlama](./publishing-libraries.md) | Bileşen/servis paketi hazırlama: derleme, tipler, CSS, prop sözleşmesi, yayın denetimi |
| Referans | [API Referansı](./api-reference.md) | Dışa aktarılan tüm sembollerin özeti, MJX kodları |
| Referans | [Koleksiyon Sorguları (Query)](./query.md) | `Query.from(...)` ile LINQ tarzı filtreleme, sıralama, gruplama |
| Referans | [Koleksiyonlar](./collections.md) | `List`, `Dictionary`, `NameValuePair`, `LinkedList` |

## Hızlı bakış {#quick-look}

```tsx file=src/Counter.tsx variant=class
import { Component, reactive } from "@motifx/core";

export class Counter extends Component<HTMLDivElement> {
  state = reactive({ count: 0 });

  view() {
    return (
      <div class="counter">
        <p>Sayaç: {this.state.count}</p>
        <button onclick={() => this.state.count++}>Artır</button>
      </div>
    );
  }
}
```
```tsx file=src/Counter.tsx variant=function
import { reactive } from "@motifx/core";

export function Counter() {
  const state = reactive({ count: 0 });

  return (
    <div class="counter">
      <p>Sayaç: {state.count}</p>
      <button onclick={() => state.count++}>Artır</button>
    </div>
  );
}
```
```tsx file=src/Counter.tsx variant=options
import { reactive } from "@motifx/core";

export const Counter = () => ({
  el: 'div',
  data: reactive({ count: 0 }),

  view() {
    return (
      <div class="counter">
        <p>Sayaç: {this.data.count}</p>
        <button onclick={() => this.data.count++}>Artır</button>
      </div>
    );
  },
});
```

```tsx file=src/main.tsx variant=class
import { Application } from "@motifx/core";
import { Counter } from "./Counter";

const app = Application.CreateBuilder().build();
app.run("#app", new Counter());
```
```tsx file=src/main.tsx variant=function
import { Application } from "@motifx/core";
import { Counter } from "./Counter";

const app = Application.CreateBuilder().build();
app.run("#app", <Counter />);
```
```tsx file=src/main.tsx variant=options
import { Application } from "@motifx/core";
import { Counter } from "./Counter";

const app = Application.CreateBuilder().build();
app.run("#app", <Counter />);
```

Yukarıdaki örnekte `{this.state.count}` ifadesi reaktif bir metin bağıdır: `count` değeri değiştiğinde yalnızca ilgili metin düğümü güncellenir, `<div>` yeniden oluşturulmaz.

Başlamak için [Başlarken](./getting-started.md) bölümüne geçin.
