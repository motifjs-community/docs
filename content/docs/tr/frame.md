---
slug: frame
title: Frame
description: Tek bir değişen içeriği tutan kapsayıcı; navigate ile içerik değişimi, zamanlama, çıkış geçişleri ve çerçevenin Frame kurduğu yerler.
category: advanced
order: 1
---

Koşullu dallar (`&&`, üçlü operatör, `switch`), `{() => ifade}` biçimindeki getter çocuklar ve rota sayfaları aynı yapı üstünde çalışır: **tek bir içeriği tutan ve değiştiren bir kapsayıcı**. Bu kapsayıcı `Frame`'dir. `Frame`, kökü bir yorum düğümü olan (DOM'a eleman eklemeyen) bir bileşendir; içinde her an en fazla bir içerik (bileşen ya da bileşen dizisi) bulunur, `navigate` ile içerik değiştirilir, eskisi bertaraf edilir.

## Kullanım {#usage}

```tsx file=src/Panel.tsx variant=class
import { Component, Frame } from "@motifx/core";

export class Panel extends Component<HTMLDivElement> {
  frame = new Frame();

  view() {
    return <div>
      <button onclick={() => this.frame.navigate(<Settings />)}>Ayarlar</button>
      <button onclick={() => this.frame.navigate(<Profile />)}>Profil</button>
      {this.frame}
    </div>;
  }
}
```
```tsx file=src/Panel.tsx variant=function
import { Frame } from "@motifx/core";

export function Panel() {
  const frame = new Frame();
  return <div>
    <button onclick={() => frame.navigate(<Settings />)}>Ayarlar</button>
    <button onclick={() => frame.navigate(<Profile />)}>Profil</button>
    {frame}
  </div>;
}
```
```tsx file=src/Panel.tsx variant=options
import { Frame } from "@motifx/core";

export const Panel = () => ({
  el: 'div',
  frame: new Frame(),
  view() {
    return <div>
      <button onclick={() => this.frame.navigate(<Settings />)}>Ayarlar</button>
      <button onclick={() => this.frame.navigate(<Profile />)}>Profil</button>
      {this.frame}
    </div>;
  },
});
```

JSX'te `<Frame>…</Frame>` yazılırsa çocuklar ilk içerik olur; bir `Promise` ile `navigate` çağrısı içeriği [Lazy](./lazy.md) ile yükler.

## API {#api}

| Üye | Açıklama |
|-----|----------|
| `new Frame(props?)` | Boş kapsayıcı. `props.childs` verilirse (JSX'te `<Frame>…</Frame>`) çocuklar ilk içerik olarak eklenir. |
| `navigate(page, keepOldControl?)` | `page` bir bileşen, bileşen dizisi, bileşen sınıfı/fabrikası ya da bir `Promise` olabilir. Eski içerik bertaraf edilir (`keepOldControl: true` verilirse yerinde kalır), yenisi eklenir. `Promise` verilirse içerik `Lazy` ile yüklenir; bir sonraki `navigate` önceki yüklemeyi iptal eder. Aynı içerikle ikinci çağrı hiçbir şey yapmaz. Döndürdüğü `Promise` içerik yerleştiğinde çözülür. |
| `navigateLazy(caller, options?, keepOldControl?)` | `navigate(Lazy({ caller, options }))` kısa yazımı. |
| `flush()` | Mevcut içeriği bertaraf eder; kapsayıcı boş kalır. `motif.clear()` da aynı işi yapar. |
| `current` | Gösterilen içerik (`ComponentBase`, dizi ya da `null`). |
| `isBusy` | Bir `navigate` sürüyorken `true`. |
| `dispose(options?)` | Önce içeriği, sonra kapsayıcıyı bertaraf eder; `options` içeriğe de iletilir. |

## Zamanlama {#timing}

- **İlk içerik senkrondur.** Kapsayıcı boşken ve `page` bir `Promise` değilken `navigate` döndüğünde içerik yerleşmiştir; `build()` tamamlandığında ilk dal ekrandadır (bkz. [Koşullu gösterim - Senkron ilk çizim](./conditionals-and-lists.md#why-x-wait)).
- **Sonraki değişimler sıralıdır.** Art arda `navigate` çağrıları bir kilitle sıraya girer; her biri öncekinin bitmesini bekler. Araya giren yeni bir çağrı, henüz yerleşmemiş eski çağrının sonucunu düşürür (yalnız en son istenen içerik yerleşir).
- **Çıkış geçişi olmayan eski içerik** bertaraf edildikten (`onDisposed`) sonra yeni içerik eklenir.
- İçerik yerleştirilemezse `MJX114`, eski içerik bertaraf edilemezse `MJX115` raporlanır; kapsayıcı çalışmaya devam eder.

## Çıkış ve giriş geçişleri {#transitions}

Eski içerik çıkış geçişini oynatır: önce süren animasyonları iptal edilir, sonra `dispose({ deep: true })` ile bertaraf edilir; çıkış geçişi tanımlıysa (`transition` prop'u ya da `motif.options.transition.out(...)`) oynar. Yeni içerik eski içeriğin bitmesini **beklemez**: eski içerik çıkarken yenisi hemen eklenir ve ikisinin sırası en yakın **eleman** ebeveynin `mode`'una göre belirlenir (bkz. [Stil ve animasyon - Giriş ve çıkış sırası](./styling-and-transitions.md#transition-mode)):

| `mode` | Davranış |
|--------|----------|
| `'concurrent'` (varsayılan) | Eski içerik çıkarken yeni içerik aynı anda girer. |
| `'out-in'` | Yeni içerik, eskinin çıkışı bitene kadar DOM'a yerleşmez. |
| `'in-out'` | Eskinin çıkışı, yeninin girişi bitene kadar ertelenir. |

`Frame` yorum düğümlü olduğundan kipi kendisi taşımaz; en yakın eleman ebeveyninkini kullanır. `<div transition={{ mode: 'out-in' }}>{koşul && <A/>}</div>` yazımı iç içe `Frame`'lerden geçerek uygulanır.

`dispose()`, `flush()` ve `motif.clear()` de içeriğin çıkış geçişini oynatır ve bitmesini bekler; `dispose({ skipLeaveTransition: true })` içeriğe de aynı seçenekle iletilir.

## Çerçevenin Frame kurduğu yerler {#where-used}

Çerçeve `Frame`'i şu yerlerde kendisi kurar: `{koşul && <X/>}` (`bindings.when`), üçlü operatör (`bindings.ternary`), `switch` (`bindings.switchCase`), bileşen döndüren `{() => …}` çocuklar (`bindings.method`) ve [Lazy](./lazy.md). `RouterView` ayrı bir bileşendir ama sayfa değişiminde aynı gezinme mantığını (sıralı kilit, eski sayfanın bertarafı, `Promise` için `Lazy`) kullanır. Hepsi için yukarıdaki kurallar geçerlidir.

## Sonraki adım {#next}

Dinamik `import()` ile içerik için [Lazy](./lazy.md); dal değişimlerinin kullanım tarafı için [Koşullu Gösterim ve Listeler](./conditionals-and-lists.md).
