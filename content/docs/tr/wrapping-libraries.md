---
slug: wrapping-libraries
title: Üçüncü Parti Kütüphane Sarmalama
description: Kendi DOM'unu yöneten kütüphaneleri bileşene dönüştürme kuralları; onMounted kurulumu, setDisposable temizliği, untracked yazma, DOM sahipliği çakışması, kök element ve tek kopya kuralı.
category: guides
order: 1
---

Gerçek uygulamalarda her şey MotifJS ile yazılmaz. Grafik, zengin metin editörü, harita, sürükle-bırak gibi işler kendi DOM'unu yöneten olgun kütüphanelere bırakılır. Bu bölüm o kütüphaneleri MotifJS bileşenine dönüştürmenin kurallarını anlatır.

Chart.js ve SortableJS için hazır sarmalayıcılar topluluk paketleri olarak yayımlanır: `@motifjs-community/chartjs` ve `@motifjs-community/sortablejs`.

## Önce karar: sarmalamak gerekiyor mu? {#should-you-wrap}

Sarmalayın:

- Kütüphane kendi DOM'unu üretiyorsa (`canvas` çiziyor, ağaç kuruyor, düğüm taşıyor).
- İmperatif bir yaşam döngüsü varsa (`new X()` / `x.destroy()`).
- İşi MotifJS'in ince taneli bağlarıyla yapmak mantıksızsa (grafik çizimi, metin editörü).

Sarmalamayın:

- Saf hesaplama yapan kütüphaneler (tarih, para, doğrulama). Onları doğrudan çağırın.
- React'e bağlı paketler. MotifJS'te çalışmazlar; headless bir alternatif arayın.
- MotifJS'in zaten yaptığı işler (liste çizimi, koşullu gösterim, sanallaştırma).

## Dört kural {#four-rules}

### 1. Kurulum `onMounted` içinde {#setup-in-on-mounted}

`onBuilt` element hâlâ kopuk bir parça içindeyken tetiklenebilir (üçlü operatör ve liste dalları detached fragment'ta kurulur). Ölçü alan ya da canlı DOM isteyen kütüphaneler orada yanlış sonuç üretir. `onMounted` element `document`'a bağlandığında **bir kez** çalışır.

```tsx file=src/LibHost.tsx variant=class
import { Component } from '@motifx/core';
import { SomeLib } from 'some-lib';

export class LibHost extends Component<HTMLDivElement> {
  private lib: SomeLib | null = null;

  override onMounted() {
    this.lib = new SomeLib(this.element, { /* ... */ });
  }
}
```
```tsx file=src/LibHost.tsx variant=function
import { SomeLib } from 'some-lib';

export function LibHost() {
  return <div onmounted={(s) => {
    const lib = new SomeLib(s.element, { /* ... */ });
    s.motif.setDisposable(() => lib.destroy());
  }} />;
}
```
```tsx file=src/LibHost.tsx variant=options
import { SomeLib } from 'some-lib';

export const LibHost = () => ({
  el: 'div',
  lib: null as SomeLib | null,
  onMounted() {
    this.lib = new SomeLib(this.element, { /* ... */ });
  },
});
```

Bölümün geri kalanındaki örnekler sınıf biçimindedir; fonksiyon ve Options biçiminde aynı kancalar kök etikete prop (`onmounted`) ya da nesne metodu (`onMounted`) olarak yazılır, `this`/`s` üzerinden `element`, `motif` ve `bindings` aynı biçimde kullanılır.

### 2. Temizlik `motif.setDisposable` ile {#cleanup-set-disposable}

Kütüphanenin `destroy()`/`disconnect()` çağrısı bileşenin ömrüne bağlanır. Bileşen gittiğinde kütüphane de gider; siz ayrıca bir şey çağırmazsınız.

```tsx
override onMounted() {
  const lib = new SomeLib(this.element);
  this.lib = lib;
  this.motif.setDisposable(() => {
    this.lib = null;
    lib.destroy();
  });
}
```

Zamanlayıcı, `ResizeObserver`, `WebSocket` gibi yan kaynaklar da aynı yere kaydedilir. Ayrıntı için [Bellek Yönetimi ve Dispose](./memory-and-dispose.md).

### 3. Okuma izlenir, yazma `untracked` içinde olur {#tracked-read-untracked-write}

Reaktif veriyi kütüphaneye aktarırken iki tuzak var:

- Veriyi doğrudan kütüphaneye verirseniz, kütüphane kendi güncellemesi sırasında o nesneyi **okur**. Bu okuma izlenen bir bölgedeyse effect kendi kendini tetikler ve döngü oluşur.
- Okumayı tümüyle `untracked` içine alırsanız bu kez iç alanlar hiç izlenmez ve veri değişince güncelleme olmaz.

Doğru biçim: izlenen bölgede **düz bir kopya** çıkarın, kütüphaneye yazmayı `untracked` içinde yapın.

```tsx
import { untracked } from '@motifx/core';

override onMounted() {
  // ... kurulum
  this.bindings.watch(() => {
    // İzlenen bölge: her okuma bağımlılık olur.
    const snapshot = store.points.map((p) => ({ ...p }));

    // İzlenmeyen bölge: kütüphanenin okumaları effect'e sızmaz.
    untracked(() => this.lib?.setData(snapshot));
  });
}
```

Kopya, derin değişiklikleri de yakalar: `store.points[3].value = 7` yazıldığında `map` o alanı okuduğu için effect yeniden çalışır.

### 4. Kurulum hatası raporlanır {#setup-errors}

`onMounted` içinden fırlatılan istisna (ya da `async` `onMounted`'ın reddedilen promise'i) yutulmaz: MotifJS onu `MJX122` (`The component onMounted hook threw.`) koduyla bir `MotifError` olarak `errorHandler`'a raporlar, asıl hata `cause` alanındadır. Rapor üretim kipinde de konsola yazılır (`app.useLogging(false)` kapatır) ve `errorHandler.addListener(fn)` dinleyicilerine ulaşır. Sarmalayıcının ayrıca `console.error` yazması gerekmez.

Kurulum hatasında bileşeni tutarlı bir durumda bırakmak (yarım kalan örneği yıkmak, yedek içerik göstermek) sarmalayıcının işidir; bunun için hatayı yakalayıp işledikten sonra yeniden fırlatın, rapor yine oluşur:

```tsx
override onMounted() {
  try {
    this.lib = new SomeLib(this.element);
  } catch (error) {
    this.lib = null;
    this.element.textContent = 'Yüklenemedi';
    throw error;
  }
}
```

## DOM sahipliği çakışması {#dom-ownership}

En zor durum, kütüphanenin MotifJS'in çizdiği düğümleri **taşıdığı** hâldir. Sürükle-bırak kütüphaneleri tam olarak bunu yapar: bırakma anında DOM'u kendisi yeniden sıralar. Oysa o düğümlerin sahibi liste bağıdır; iki sahip çakışırsa bağ bir daha doğru hesap yapamaz.

Çözüm şablonu:

1. Kütüphanenin DOM değişikliğini **geri alın**.
2. Aynı değişikliği **modele** uygulayın.
3. DOM'u yeniden MotifJS çizsin.

Effect kuyruğu mikro-görevde boşaldığı için geri alma ile yeniden çizim aynı karede tamamlanır; ekranda titreme olmaz.

Aşağıda SortableJS ile tek listelik, en sade hâli var:

```tsx
import { Component, read, type Bind } from '@motifx/core';
import Sortable from 'sortablejs';

interface SortableListProps<T> {
  list: Bind<T[]>;
}

export class SortableList<T> extends Component<HTMLDivElement, SortableListProps<T>> {
  override onMounted() {
    const sortable = Sortable.create(this.element, {
      animation: 150,
      onEnd: (evt) => this.handleEnd(evt),
    });
    this.motif.setDisposable(() => sortable.destroy());
  }

  private handleEnd(evt: Sortable.SortableEvent) {
    const { item, from, oldIndex, newIndex } = evt;
    if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;

    // 1. SortableJS'in taşımasını geri al
    item.remove();
    const last = from.lastElementChild;
    const ref = from.children[oldIndex] ?? (last ? last.nextSibling : from.lastChild);
    from.insertBefore(item, ref);

    // 2. Aynı taşımayı modele uygula
    const list = read(this.props.list);
    const [moved] = list.splice(oldIndex, 1);
    list.splice(newIndex, 0, moved);

    // 3. DOM'u liste bağı yeniden sıralar; burada başka iş yok
  }
}
```

Kullanımı: `list` prop'una, JSX'te `.map` edilen reaktif dizinin **kendisi** verilir ve her öğe `key` taşır.

```tsx
import { reactive } from '@motifx/core';

const state = reactive({
  tasks: [
    { id: 1, text: 'Tasarım' },
    { id: 2, text: 'Kodlama' },
    { id: 3, text: 'Test' },
  ],
});

<SortableList list={state.tasks}>
  {state.tasks.map((t) => <div key={t.id}>{t.text}</div>)}
</SortableList>
```

Geri almadaki `ref` hesabı bilinçli olarak `from.children[oldIndex] ?? null` değildir. MotifJS listeyi bir parça içinde çizer; kapsayıcının son çocuğu genellikle listenin **kapanış işaretçisi** olan bir yorum düğümüdür. Öğe sondan sürüklendiyse `insertBefore(item, null)` onu o işaretçinin dışına, yani listenin dışına koyar ve liste bağı bir sonraki güncellemede öğeyi bulamaz. Son elementin `nextSibling`'i ise işaretçinin önünü verir; öğe listenin içinde kalır.

Bu sade hâl tek liste içindir. Listeler arası taşıma, klonlama ve `draggable` seçicisiyle filtrelenmiş sıralama için `@motifjs-community/sortablejs` bu şablonun tam uygulamasıdır.

Kütüphane kendi kapsayıcısının içini tamamen yönetiyorsa (grafik, editör) çakışma yoktur: JSX yalnızca boş bir kapsayıcı verir, içine MotifJS hiçbir şey çizmez.

## Kök element {#root-element}

Kütüphanelerin çoğu gerçek bir element ister (`canvas`, `div`). Bileşenin kök elementi `view()` ile değil, sınıfın kendisiyle belirlenir. İki yol vardır:

**Generic ile.** `Component<HTMLCanvasElement>` yazdığınızda `@motifx/compiler` element türünü generic'ten çıkarır ve kök `<canvas>` olarak kendiliğinden oluşur:

```tsx
import { Component } from '@motifx/core';
import { Chart } from 'chart.js';

export class ChartHost extends Component<HTMLCanvasElement> {
  override onMounted() {
    const chart = new Chart(this.element, { /* ... */ });
    this.motif.setDisposable(() => chart.destroy());
  }
}
```

**`super` ile.** Kurucudaki `super` çağrısının ilk parametresine etiket adını dizge olarak ya da hazır bir elementi verirsiniz:

```ts
export class ChartHost extends Component<HTMLCanvasElement> {
  constructor(props?: ChartHostProps) {
    super('canvas', props);
  }
}
```

```ts
export class ChartHost extends Component<HTMLCanvasElement> {
  constructor(props?: ChartHostProps) {
    super(document.createElement('canvas'), props);
  }
}
```

`super` biçimi generic'e bağlı olmadığı için `@motifx/compiler` ile derlenmeyen bir pakette de çalışır. İkisi birlikte verilirse `super`'a verilen değer geçerlidir.

Hiçbiri verilmezse kök bir **fragment** (yorum düğümü) olur ve `view()`'in döndürdüğü içerik ya da JSX çocukları bu fragmentin yerine yerleşir. Fragment gerçek bir element olmadığı için `this.element` bir kütüphaneye kapsayıcı olarak verilemez; sarmalayıcıda kök elementi mutlaka bildirin.

Kök element bildirilmiş bir bileşende `view()` yazılmazsa JSX çocukları o elementin içine eklenir; `<SortableList>{items.map(...)}</SortableList>` biçimi bu yüzden çalışır.

## Prop adlarında dikkat {#prop-names}

`options` prop'u çerçevenindir: bileşenin **kendi** ayar nesnesidir, yapıcıda okunur ve tanınan anahtarlar `motif.options`'a kopyalanır — `hideStrategy`, `disableDisposal` (bkz. [Gizleme stratejisi](./lifecycle.md#hide-strategy)) ve kök elementi SVG ad alanında oluşturan `isSvg`. Kütüphane seçeneklerini bu prop'la geçmeyin; `chartOptions`, `sortableOptions` gibi açık bir ad seçin.

```tsx
<ChartHost data={salesData} chartOptions={{ responsive: true, animation: false }} />
```

```ts
override onMounted() {
  const { data, chartOptions } = this.props;
  const chart = new Chart(this.element, { type: 'line', data, options: chartOptions });
  this.motif.setDisposable(() => chart.destroy());
}
```

`on` ile başlayan prop'lar `this.props` içinde kalır ve geri çağrı olarak kullanılabilir; DOM olay adı taşıyanlar bunun dışındadır. `onChange`, `onCopy`, `onResize`, `onSelect`, `onReset`, `onContextMenu` gibi bir prop bileşen etiketinde kök elemana DOM dinleyicisi olarak bağlanır ve `this.props`'a hiç ulaşmaz; derleyici camelCase yazımda `MJX002` uyarısı verir. Alan adını belirginleştirin (`onChartUpdate`, `onCodeCopy`).

## Tek kopya kuralı {#single-copy}

Sarmalayıcı ayrı bir paketse, sarmalanan kütüphane ve `@motifx/core` uygulamada **tek kopya** olmalıdır. İki kopya olursa:

- Kütüphanenin genel kayıt defteri (örneğin `Chart.registry`) ikiye ayrılır; sizin kaydınız paketin gördüğü kopyaya işlemez.
- İki ayrı reaktivite motoru oluşur; `untracked` karşı taraftaki effect'i tanımaz.

Her iki hata da **sessizdir**. Vite'ta çözüm tek satır:

```ts
resolve: { dedupe: ['@motifx/core', 'chart.js', 'sortablejs'] }
```

## Temizliği kanıtlayın {#prove-cleanup}

Sarmalayıcının doğruluğu "çalışıyor görünüyor" ile ölçülmez. Bileşeni defalarca kurup söken bir tur testi yazın: tur sonunda canlı bileşen sayısı ve canlı dış örnek sayısı başladığı değere dönmelidir. Ölçüm kancaları için [Bellek Yönetimi ve Dispose](./memory-and-dispose.md) bölümündeki `disposableTracker` bölümüne bakın.

## Sonraki adım {#next}

Uygulanmış örnekler için `@motifjs-community/chartjs` ve `@motifjs-community/sortablejs` topluluk paketlerini inceleyin. Sarmalayıcıyı ya da bir bileşen setini npm'de yayımlamak için [MotifJS için npm Kütüphanesi Yayımlama](./publishing-libraries.md).
