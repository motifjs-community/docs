---
slug: content-body
title: ContentBody ve ContentBlock
description: Birden çok bloğun birlikte doldurduğu gövde; ContentBody gövdesi, ContentBlock parçaları, birikme, bertaraf ve Transport'tan farkı.
category: advanced
order: 4
---

[Transport](./transport.md) tek bir gönderenin içeriğini bir yuvada **gösterir**; `ContentBody` ise birden çok bloğun **birlikte doldurduğu** bir gövdedir. Layout'ta bir gövde açılır, sayfanın farklı yerlerindeki bloklar parçalarını oraya ekler ve parçalar gövdede birikir.

## Kullanım {#usage}

```tsx file=src/ShellLayout.tsx variant=class
import { Component, ContentBody, RouterView } from "@motifx/core";

export class ShellLayout extends Component {
  view() {
    return (
      <div class="shell">
        <aside class="tools"><ContentBody name="tools" /></aside>
        <main><RouterView /></main>
      </div>
    );
  }
}
```
```tsx file=src/ShellLayout.tsx variant=function
import { ContentBody, RouterView } from "@motifx/core";

export function ShellLayout() {
  return (
    <div class="shell">
      <aside class="tools"><ContentBody name="tools" /></aside>
      <main><RouterView /></main>
    </div>
  );
}
```
```tsx file=src/ShellLayout.tsx variant=options
import { ContentBody, RouterView } from "@motifx/core";

export const ShellLayout = () => ({
  el: 'div',
  view() {
    return (
      <div class="shell">
        <aside class="tools"><ContentBody name="tools" /></aside>
        <main><RouterView /></main>
      </div>
    );
  },
});
```

```tsx file=src/pages/ReportPage.tsx variant=class
import { Component, ContentBlock } from "@motifx/core";

export class ReportPage extends Component {
  view() {
    return (
      <section>
        <ContentBlock target="tools"><button>Dışa aktar</button></ContentBlock>
        <ReportTable />
      </section>
    );
  }
}

export class ReportTable extends Component {
  view() {
    return (
      <table>
        <ContentBlock target="tools"><button>Yazdır</button></ContentBlock>
        {/* satırlar */}
      </table>
    );
  }
}
```
```tsx file=src/pages/ReportPage.tsx variant=function
import { ContentBlock } from "@motifx/core";

export function ReportPage() {
  return (
    <section>
      <ContentBlock target="tools"><button>Dışa aktar</button></ContentBlock>
      <ReportTable />
    </section>
  );
}

export function ReportTable() {
  return (
    <table>
      <ContentBlock target="tools"><button>Yazdır</button></ContentBlock>
      {/* satırlar */}
    </table>
  );
}
```
```tsx file=src/pages/ReportPage.tsx variant=options
import { ContentBlock } from "@motifx/core";

export const ReportPage = () => ({
  el: 'section',
  view() {
    return (
      <section>
        <ContentBlock target="tools"><button>Dışa aktar</button></ContentBlock>
        <ReportTable />
      </section>
    );
  },
});

export const ReportTable = () => ({
  el: 'table',
  view() {
    return (
      <table>
        <ContentBlock target="tools"><button>Yazdır</button></ContentBlock>
        {/* satırlar */}
      </table>
    );
  },
});
```

Sonuç: `aside.tools` içinde "Dışa aktar" ve "Yazdır" butonları yan yana durur; sayfa kapanınca ikisi de gider.

## Prop'lar {#props}

| Bileşen | Prop | Açıklama |
|---------|------|----------|
| `ContentBody` | `name` | Gövdenin adı. Aynı adla ikinci bir gövde kurulursa yeni bloklar ona gider; eski gövdenin sonradan bertaraf edilmesi yeni gövdenin kaydını bozmaz. |
| `ContentBlock` | `target` | Parçaların ekleneceği gövdenin adı. |

## Davranış {#behavior}

- İkisi de fragment köklüdür; bulundukları yere eleman eklemezler.
- Blok çocuklarını **kendisi kurmaz**: eklenen her çocuk (JSX çocukları ve sonradan `controls.add` ile gelenler) hedef gövde varsa o anda gövdenin `controls`'una taşınır ve orada kurulur; ebeveyni gövde olur. Taşıma yapıcıda, blok build edilmeden gerçekleşir. Bloğun `controladded` olayı yine her çocuk için tetiklenir.
- Gövde henüz yoksa çocuklar blokta kurulmadan bekler; gövde kurulduğu anda taşınır (sıra önemsizdir).
- Parçalar gövdede **birikir**; her blok yalnız kendi eklediği parçaları bilir. Blok bertaraf edilince gövdedeki kendi parçalarını kaldırır ve bertaraf eder (geliştirme modunda her parça için `MJX109` uyarısı yazılır); diğer blokların parçaları kalır.
- Gövde bertaraf edilince içindeki bütün parçalar onunla bertaraf edilir; bloklar bilgilendirilmez, aynı adla yeni bir gövde kurulsa da parçalar geri gelmez.
- Taşınan parçaların bağları ve olay işleyicileri yazıldıkları bileşenin durumuyla çalışmaya devam eder.
- Haberleşme uygulama olayı üzerindendir; çalışan bir `Application` içinde kullanılmalıdır.

## Transport ile karşılaştırma {#vs-transport}

| | `Transport` / `TransportTo` | `ContentBody` / `ContentBlock` |
|---|---|---|
| Amaç | Bir gönderenin içeriğini yuvada **göstermek** | Birçok bloğun parçalarını gövdede **biriktirmek** |
| Birden çok kaynak | `mode: 'replace'` sonuncuyu bırakır; `'merge'` birleştirir | Her zaman birikir |
| Gönderen bertaraf | Kendi içeriğini kaldırır | Kendi parçalarını kaldırır (`MJX109`) |
| Yerleşim | Yuva fragment, gönderen boş `<div>` bırakır | İkisi de fragment |

## Sonraki adım {#next}

Tek gönderenli yuva ve programatik taşıma için [Transport ve TransportTo](./transport.md); bileşen ağacının temelleri için [Bileşenler](./components.md).
