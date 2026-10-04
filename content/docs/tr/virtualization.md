---
slug: virtualization
title: Sanal Listeler (Virtualization)
description: Virtualization bileşeni; props referansı, dataRequest sözleşmesi, şablonlar, autoRefresh, filtreleme, çizim modeli ve yöntemler.
category: advanced
order: 5
---

Binlerce öğelik listelerde tüm öğeleri DOM'a koymak performansı düşürür. MotifJS'in `Virtualization` bileşeni yalnızca görünür (ve az miktarda tampon) öğeyi DOM'da tutarak satır yüksekliği sabit ya da önceden hesaplanabilen listeleri verimli gösterir. Sayfa tabanlı veri isteğini (pagination) içselleştirir.

## Temel kullanım {#basic-usage}

```tsx file=src/TodoList.tsx variant=class
import { Component, reactive, Virtualization } from "@motifx/core";

interface Todo { userId: number; id: number; title: string; completed: boolean; }

export default class TodoList extends Component {
  state = reactive({ todos: [] as Todo[] });

  async onConfig() {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos');
    this.state.todos = await res.json();
  }

  view() {
    return <Virtualization<Todo>
      x-wait={() => this.state.todos.length === 0}
      itemHeight={60}
      pageSize={20}
      dataRequest={async ({ page, pageSize }) => {
        const start = page * pageSize;
        const end = start + pageSize;
        return {
          items: this.state.todos.slice(start, end),
          totalCount: this.state.todos.length,
          hasMore: end < this.state.todos.length,
        };
      }}
      itemTemplate={(todo, index) => (
        <div class="todo-item">
          <input type="checkbox" checked={() => todo.completed}
                 onchange={(e) => todo.completed = e.target.checked} />
          <span>{todo.title}</span>
        </div>
      )}
    />;
  }
}
```
```tsx file=src/TodoList.tsx variant=function
import { reactive, Virtualization } from "@motifx/core";

interface Todo { userId: number; id: number; title: string; completed: boolean; }

export default function TodoList() {
  const state = reactive({ todos: [] as Todo[] });

  return <div onconfig={async () => {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos');
    state.todos = await res.json();
  }}>
    <Virtualization<Todo>
      x-wait={() => state.todos.length === 0}
      itemHeight={60}
      pageSize={20}
      dataRequest={async ({ page, pageSize }) => {
        const start = page * pageSize;
        const end = start + pageSize;
        return {
          items: state.todos.slice(start, end),
          totalCount: state.todos.length,
          hasMore: end < state.todos.length,
        };
      }}
      itemTemplate={(todo, index) => (
        <div class="todo-item">
          <input type="checkbox" checked={() => todo.completed}
                 onchange={(e) => todo.completed = e.target.checked} />
          <span>{todo.title}</span>
        </div>
      )}
    />
  </div>;
}
```
```tsx file=src/TodoList.tsx variant=options
import { reactive, Virtualization } from "@motifx/core";

interface Todo { userId: number; id: number; title: string; completed: boolean; }

export const TodoList = () => ({
  el: 'div',
  data: reactive({ todos: [] as Todo[] }),

  async onConfigured() {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos');
    this.data.todos = await res.json();
  },

  view() {
    return <Virtualization<Todo>
      x-wait={() => this.data.todos.length === 0}
      itemHeight={60}
      pageSize={20}
      dataRequest={async ({ page, pageSize }) => {
        const start = page * pageSize;
        const end = start + pageSize;
        return {
          items: this.data.todos.slice(start, end),
          totalCount: this.data.todos.length,
          hasMore: end < this.data.todos.length,
        };
      }}
      itemTemplate={(todo, index) => (
        <div class="todo-item">
          <input type="checkbox" checked={() => todo.completed}
                 onchange={(e) => todo.completed = e.target.checked} />
          <span>{todo.title}</span>
        </div>
      )}
    />;
  },
});
```

## Props referansı (`VirtualizationProps<T>`) {#props}

| Prop | Tip | Açıklama |
|------|-----|----------|
| `dataRequest` | `(req) => Promise<VirtualizationDataResponse<T>>` | **Zorunlu.** Sayfa verisini getiren fonksiyon. |
| `itemTemplate` | `(item: T, index: number) => any` | **Zorunlu.** Her öğenin şablonu. |
| `itemHeight` | `number \| (item: T, index: number) => number` | **Zorunlu.** Her öğenin piksel yüksekliği. Sayı: tüm satırlar aynı; fonksiyon: satır başına bilinen yükseklik (aşağıya bakın). |
| `pageSize` | `number` | Her istekte kaç öğe talep edileceği (varsayılan 50). |
| `mainTemplate` | `(content, state) => any` | Ana kapsayıcıyı saran özel layout. |
| `loadingTemplate` | `(state) => any` | Yükleme görünümü. |
| `emptyTemplate` | `() => any` | Boş veri görünümü. |
| `errorTemplate` | `(error) => any` | İlk yükleme, `refresh()` ya da `autoRefresh` isteği hata verince gösterilen görünüm; verilmezse hata `MJX207` olarak raporlanır. Sonraki sayfa isteğinin (`autoLoad`) hatası `MJX207` olarak raporlanır ve `getState().error`'a yazılır; yüklenmiş satırlar ekranda kalır, hata görünümü gösterilmez, bir sonraki kaydırmada istek yeniden yapılır ve başarılı yüklemede `error` temizlenir. |
| `filter` | `(items: T[]) => T[]` | Yüklü veriye uygulanır; boşluklar ve indeksler filtrelenmiş uzunluğa göre hesaplanır. |
| `overscan` | `number` | Görünür alanın **üstünde ve altında** ek çizilen satır sayısı (varsayılan: görünür satır sayısı). |
| `cacheSize` | `number` | Ekran dışına çıkmış ama yeniden kullanım için canlı tutulan satır bileşeni üst sınırı (LRU; varsayılan `max(200, 3 × pencere)`). |
| `autoRefresh` | `boolean` | `dataRequest` içinde okunan reaktif veri değişince yüklü aralığı (sayfa 0'dan geçerli sayfaya kadar) tek istekte yeniden alır (varsayılan açık); satır bileşenleri yeniden kurulur. İzleme ilk yüklemede ve `refresh()`'te kurulur, `setData()` onu durdurur. `false` verilirse yalnızca `refresh()` ile yenilenir. |
| `watch` | `() => unknown` | `autoRefresh` için ek bağımlılık: burada okunan reaktif alanlar da yeniden yüklemeyi tetikler (`await` sonrası okumalar için yedek yol). |
| `overscanPages`, `renderMode`, `pageBuffer` | | Ayrılmış; `'page'` modu uygulanmamıştır. |
| `autoLoad` | `boolean` | Dipte otomatik yükleme (varsayılan açık). Çizilen pencere yüklü verinin sonuna `overscan` kadar yaklaştığında da (ör. ilk sayfa görünür alanı doldurmuyorsa) sonraki sayfa istenir. |
| `autoLoadThreshold` | `number` | **Yüklü** verinin alt sınırına (`data.length × itemHeight`) kaç piksel kala sonraki sayfa istensin (varsayılan 100). |
| `className` | `string` | Ana `div`'e ek sınıf. |
| `style` | `Partial<CSSStyleDeclaration>` | Satır içi stil. |

## `dataRequest` sözleşmesi {#data-request}

İstek nesnesi (`VirtualizationDataRequest`):

```ts
{ page: number;      // 0 tabanlı sayfa indeksi
  pageSize: number;  // istenen öğe sayısı
  scrollTop: number; // istek anındaki kaydırma pozisyonu
}
```

Yanıt nesnesi (`VirtualizationDataResponse<T>`):

```ts
{ items: T[];          // bu sayfadaki öğeler
  totalCount: number;  // tüm veri setinin toplam öğe sayısı
  hasMore: boolean;    // daha fazla veri var mı
}
```

`totalCount` yalnızca `state.totalCount`'a yazılır (ör. başlıkta toplamı göstermek için); kaydırma çubuğu ve boşluklar **yüklü** veriden hesaplanır. Sonraki sayfanın istenip istenmeyeceğine `hasMore` karar verir: `false` döndüğünde otomatik yükleme durur.

### Otomatik yenileme — `autoRefresh` {#auto-refresh}

`autoRefresh` (varsayılan açık) `dataRequest` içinde okunan reaktif alanları izler; biri değişince yüklü aralık (sayfa 0'dan geçerli sayfaya) tek istekte yeniden alınır ve satır bileşenleri yeniden kurulur. İzleme ilk yüklemede ve `refresh()`'te kurulur; `setData()` izlemeyi durdurur. `dataRequest` `async` olduğu için derleyici içindeki `await`'leri sarar: `await` sonrasında okunan reaktif alanlar da bağımlılık olur (başka yerlerde `await` sonrası okumalar izlenmez; bkz. [`await` sonrası okumalar](./reactivity.md#await-reads)). `dataRequest`'i JSX dışında tanımladıysanız (sarma yalnız etikete yazılan ok fonksiyonunda yapılır) ya da bağımlılığı başka bir yerden geliyorsa `watch={() => state.filtre}` ile ek bağımlılık verin: `watch` izleme kurulurken `dataRequest` ile aynı effect içinde bir kez çağrılır, okuduğu alanlar bağımlılığa eklenir (fırlattığı hata `MJX205`). Yeniden yükleme değişimden sonraki mikro görevde yapılır; içerik yanıt gelene kadar yerinde kalır. Bir saniyede 30'dan fazla yeniden yükleme tetiklenirse (döngü koruması) izleme durdurulur ve geliştirme modunda `MJX206` uyarısı yazılır; `refresh()` izlemeyi yeniden kurar.

## Şablon aşamaları ve `state` {#templates-and-state}

`mainTemplate`, `loadingTemplate` gibi şablonlar `VirtualizationState<T>` alır:

```ts
{ isLoading: boolean;
  isInitialized: boolean;
  currentPage: number;
  totalCount: number;
  hasMore: boolean;
  error?: Error;
  data: T[];
}
```

### Özel kapsayıcı — `mainTemplate` ve `<content>` {#main-template}

`mainTemplate`, listeyi saran layout'u tanımlar. Sanal içeriğin nereye gireceğini `<content></content>` yer tutucusuyla belirtirsiniz:

```tsx
mainTemplate={(content, state) => (
  <div class="list-container">
    <div class="list-header">
      <h2>Todo Listesi</h2>
      {state.isInitialized && (
        <span class="count">{() => state.data.length} öğe</span>
      )}
    </div>
    <div class="scroll-container">
      <content></content>   {/* sanal öğeler buraya gelir */}
    </div>
  </div>
)}
```

### Diğer şablonlar {#other-templates}

```tsx
loadingTemplate={(state) => <div class="spinner">Yükleniyor...</div>}
emptyTemplate={() => <div class="empty">Kayıt yok</div>}
errorTemplate={(error) => <div class="error">Hata: {error.message}</div>}
```

## `x-wait` ile ilk veriyi bekletme {#x-wait}

Veri gelene kadar sanal listeyi bekletmek için `x-wait` kullanın:

```tsx
<Virtualization<Todo>
  x-wait={() => this.state.todos.length === 0}
  /* ... */
/>
```

## Filtreleme {#filtering}

`filter` prop'u ile veya `dataRequest` içinde diliminizi filtreleyerek çalışır:

```tsx
<Virtualization<Todo>
  filter={(items) => items.filter(x => x.completed)}
  dataRequest={async ({ page, pageSize }) => {
    const done = this.state.todos.filter(x => x.completed);
    const start = page * pageSize;
    return {
      items: done.slice(start, start + pageSize),
      totalCount: done.length,
      hasMore: start + pageSize < done.length,
    };
  }}
  /* ... */
/>
```

## Çizim modeli ve yöntemler {#rendering-and-methods}

- DOM'da yalnızca pencere kadar satır bulunur: `[anchor − overscan, anchor + görünür + overscan)`,
  `anchor = floor(scrollTop / itemHeight)`. Satırlar iki boşluk `div`'i arasında düz kardeşlerdir;
  boşluk yükseklikleri hiç negatif olmaz ve `üst + satırlar + alt = filtrelenmiş uzunluk × itemHeight`.
- Pencereden çıkan satır **dispose edilmez, DOM'dan sökülür**; geri gelince aynı bileşen (bağları,
  input durumu, `reactive(row)` proxy'si) sıralı konumuna takılır. Yer tutucu yorum birikmez.
  Sökülen satır `onDeactivated`, geri takılan satır `onActivated` alır.
  `cacheSize` aşılınca en uzun süredir görünmeyen satırlar dispose edilir.
- Satırlar öğe nesnesinin kimliğiyle (ilkel öğelerde sırayla) önbelleğe alınır. Aynı nesne veride
  birden çok kez bulunabilir; her geçiş kendi satırını alır.
- Her kaydırma olayında pencere yeniden hesaplanır (`hasMore === false` iken de); yalnızca eski ve
  yeni pencere arasındaki fark işlenir (O(pencere)).
- İlk çizim yerleşimi bekler: `clientHeight` 0 ise (element henüz `document`'ta değil) `onMounted`'da
  tekrar denenir.
- Sayfalı modda kaydırma çubuğu yalnızca **yüklü** sayfaları temsil eder (sonsuz kaydırma hissi).

| Yöntem | Etki |
|---|---|
| `refresh()` | Veriyi sıfırlar, sayfa 0'ı `dataRequest` ile yeniden ister; önbellekteki tüm satırlar dispose edilir. `Promise` döner. |
| `setData(items)` | İstek yapmadan veriyi değiştirir; `hasMore=false`, sayfa 0. |
| `scrollToIndex(i)` | `i × itemHeight` konumuna kaydırır ve hemen çizer. |
| `getState()` | Durumun sığ kopyası. |

## Ne zaman kullanmalı? {#when-to-use}

| Durum | Öneri |
|-------|-------|
| Az öğe (< ~100), değişken yükseklik | Normal `.map` liste bağı ([05. bölüm](./conditionals-and-lists.md)). |
| Çok öğe, **sabit** ya da **önceden hesaplanabilen** satır yüksekliği | `Virtualization` (`itemHeight` sayı ya da fonksiyon). |
| Sonsuz kaydırma / sayfalı API | `Virtualization` + `autoLoad`. |

### Değişken yükseklik ve boyut değişimi {#variable-height}

Satırların yüksekliği farklıysa ama önceden hesaplanabiliyorsa (başlık satırları, iki tip kart, mesaj türüne göre yükseklik) `itemHeight`'a fonksiyon verin:

```tsx
<Virtualization<Mesaj>
  itemHeight={(m) => m.tip === 'resim' ? 220 : 64}
  dataRequest={...}
  itemTemplate={(m) => <MesajSatiri mesaj={m} />}
/>
```

Yükseklikler veri her değiştiğinde (yükleme, `setData`, `filter`) bir kez toplanır; görünür aralık ikili aramayla bulunur, `scrollToIndex` de bu toplamları kullanır. Geçersiz (`NaN`, negatif) değerler 0 sayılır. Yükseklik yalnızca çizimden sonra ölçülerek bilinebiliyorsa (serbest metinli akış) bu yöntem uygun değildir.

Liste kabının boyutu değişince (ekran döndürme, mobil klavyenin açılması, pencere boyutu) görünür satırlar kaydırma beklenmeden yeniden hesaplanır. Bunun için `ResizeObserver` kullanılır; ortamda yoksa bu adım atlanır, liste dispose edilince gözlemci bırakılır.

## Sonraki adım {#next}

Bellek yönetimini ve bertaraf (dispose) desenini öğrenmek için [Bellek Yönetimi ve Dispose](./memory-and-dispose.md) bölümüne geçin.
