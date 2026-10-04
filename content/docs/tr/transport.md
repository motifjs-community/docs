---
slug: transport
title: Transport ve TransportTo
description: İçeriği kendi ağacının dışındaki bir yuvada gösterme; Transport yuvası, TransportTo göndereni, replace/merge kipleri ve programatik taşıma için Transporter.
category: advanced
order: 3
---

Bir bileşenin içeriğini kendi ağacının dışındaki bir yerde göstermek için kullanılır. Tipik örnek: sayfaya özel komut butonlarının, layout'taki başlık çubuğunda görünmesi. İki parçadan oluşur:

- **`Transport`** — hedef **yuva**. Layout'a (ya da içeriğin görüneceği herhangi bir yere) konur.
- **`TransportTo`** — **gönderen**. Etiketleri arasına yazılan içerik, aynı adlı yuvaya taşınır.

## Kullanım {#usage}

```tsx file=src/ShellLayout.tsx variant=class
import { Component, RouterView, Transport } from '@motifx/core';

export class ShellLayout extends Component {
  view() {
    return (
      <div class="shell">
        <header class="titlebar">
          <h1>Yönetim</h1>
          <Transport name="commands" />
        </header>
        <main><RouterView /></main>
      </div>
    );
  }
}
```
```tsx file=src/ShellLayout.tsx variant=function
import { RouterView, Transport } from '@motifx/core';

export function ShellLayout() {
  return (
    <div class="shell">
      <header class="titlebar">
        <h1>Yönetim</h1>
        <Transport name="commands" />
      </header>
      <main><RouterView /></main>
    </div>
  );
}
```
```tsx file=src/ShellLayout.tsx variant=options
import { RouterView, Transport } from '@motifx/core';

export const ShellLayout = () => ({
  el: 'div',
  view() {
    return (
      <div class="shell">
        <header class="titlebar">
          <h1>Yönetim</h1>
          <Transport name="commands" />
        </header>
        <main><RouterView /></main>
      </div>
    );
  },
});
```

```tsx file=src/pages/OrdersPage.tsx variant=class
import { Component, TransportTo, reactive } from '@motifx/core';

export class OrdersPage extends Component {
  state = reactive({ count: 0 });

  view() {
    return (
      <section>
        <TransportTo name="commands">
          <button onclick={() => this.state.count++}>Yenile ({this.state.count})</button>
        </TransportTo>
        {/* sayfanın geri kalanı */}
      </section>
    );
  }
}
```
```tsx file=src/pages/OrdersPage.tsx variant=function
import { TransportTo, reactive } from '@motifx/core';

export function OrdersPage() {
  const state = reactive({ count: 0 });

  return (
    <section>
      <TransportTo name="commands">
        <button onclick={() => state.count++}>Yenile ({state.count})</button>
      </TransportTo>
      {/* sayfanın geri kalanı */}
    </section>
  );
}
```
```tsx file=src/pages/OrdersPage.tsx variant=options
import { TransportTo, reactive } from '@motifx/core';

export const OrdersPage = () => ({
  el: 'section',
  data: reactive({ count: 0 }),

  view() {
    return (
      <section>
        <TransportTo name="commands">
          <button onclick={() => this.data.count++}>Yenile ({this.data.count})</button>
        </TransportTo>
        {/* sayfanın geri kalanı */}
      </section>
    );
  },
});
```

## Prop'lar {#props}

| Bileşen | Prop | Açıklama |
|---------|------|----------|
| `Transport` | `name` | Yuvanın adı (zorunlu). |
| `Transport` | `mode` | `'replace'` (varsayılan) veya `'merge'`; bkz. [Yuvada birden çok gönderen](#mode). |
| `TransportTo` | `name` | İçeriğin gönderileceği yuvanın adı. |

## Davranış {#behavior}

- **Sıra önemsizdir.** Yuva önce ya da sonra oluşabilir; `TransportTo` yuva henüz yokken kurulursa, içerik yuva kaydolduğu anda taşınır.
- **İçerik gönderen bileşene bağlı kalır.** Taşınan elemanlardaki bağlar ve olay işleyicileri, yazıldıkları bileşenin durumuyla çalışmaya devam eder; yukarıdaki örnekte `count` değişince yuvadaki buton da güncellenir.
- **Ömür gönderene bağlıdır.** `TransportTo` bertaraf edildiğinde (örneğin sayfadan çıkıldığında) taşıdığı içerik yuvadan kaldırılır ve bertaraf edilir. Router sayfa değişiminde eski sayfayı yenisi yerleşmeden bertaraf ettiği için komut çubuğu gibi kullanımlarda içerik kendiliğinden yer değiştirir.
- **Yuva kaldırılırsa içerik de gider.** Yuva bertaraf edildiğinde içindeki taşınmış içerik de bertaraf edilir; aynı adlı yuva yeniden oluşturulsa bile içerik geri gelmez.
- **Sonradan eklenen çocuklar da taşınır.** `TransportTo`'nun `controls` koleksiyonuna sonradan eklenen bir bileşen, yuva varsa doğrudan yuvaya gider; ilk çocuklar gibi canlı kalır ve gönderen bertaraf edilince onlarla birlikte gider. Gönderenin `controladded` olayı her çocuk için tetiklenir.
- `Transport` yuvası kendisi bir fragmenttir (DOM'a eleman eklemez; içerik bulunduğu yere yerleşir). `TransportTo` bulunduğu yerde boş bir `<div>` bırakır; içerik orada değil yuvada görünür.
- İkisi de haberleşmeyi uygulama olayları üzerinden yapar; çalışan bir `Application` içinde kullanılmalıdır.
- Aynı adla ikinci bir `Transport` kurulursa kayıt yenisine geçer; gönderenler içeriği yeni yuvaya taşır.

## Yuvada birden çok gönderen — `mode` {#mode}

Aynı yuvaya birden çok `TransportTo` içerik gönderdiğinde `mode` belirleyicidir. Yuvanın gönderenlerden önce ya da sonra kurulması sonucu değiştirmez:

- `'replace'` (varsayılan): yuvada yalnızca en son kurulan gönderenin içeriği kalır. Yuvadaki önceki içerik kaldırılır ve bertaraf edilir; o gönderen kapansa bile geri gelmez.
- `'merge'`: bütün gönderenlerin içeriği kurulma sırasıyla yuvaya eklenir; her gönderen kapandığında yalnızca kendi içeriği kalkar.

Birden çok bloğun **birlikte** doldurduğu, gövdede biriken bir alan isteniyorsa [ContentBody ve ContentBlock](./content-body.md) bunun için tasarlanmıştır.

## Programatik taşıma — `Transporter` {#transporter}

`Transport`/`TransportTo` çiftinin altındaki yardımcı dışa açıktır; bir bileşeni JSX olmadan başka bir ebeveyne taşımak için kullanılır:

```ts
import { Transporter } from '@motifx/core';

Transporter.transport(child, newParent);                 // sona ekle
Transporter.transport(child, newParent, { index: 0 });   // verilen dizine ekle
Transporter.transportMany([a, b], newParent);
```

`transport` çocuğu eski ebeveyninden çıkış geçişi oynatmadan ayırır, yeni ebeveynin `controls`'una ekler ve bağlarını yeniden etkinleştirir (`reState`). `TransportOptions`: `index` (ekleme dizini), `keepState: true` (bağları yeniden etkinleştirme), `owner` (taşıyanı `motif.options.ownerTransporter`'a yazar). Çocuk zaten o ebeveyndeyse hiçbir şey yapmaz.

## Sonraki adım {#next}

Birden çok kaynaktan birikerek dolan gövde için [ContentBody ve ContentBlock](./content-body.md); `controls` koleksiyonunun geri kalanı için [Bileşenler - controls](./components.md#controls).
