---
slug: reactivity
title: Reaktivite
description: reactive, createSignal, createComputed, createLazyComputed, effect, untracked ve bağların DOM'la buluşması.
category: core
order: 3
---

MotifJS'in reaktivite sistemi **noktasaldır** (fine-grained). Bir modelin bir alanı değiştiğinde, yalnızca o alanı okuyan bağlar ve efektler yeniden çalışır. Tüm bileşen yeniden render edilmez.

İki ana reaktif ilkel vardır:

1. **Reaktif nesneler** — `reactive(model)` / `useModel(model)` ile oluşturulan proxy'ler. Nesne alanlarına doğrudan erişip yazarsınız.
2. **Signal / Computed** — tek bir değeri saran ince taneli ilkeller.

## `reactive(model)` {#reactive}

Bir nesneyi (veya diziyi) reaktif bir proxy'ye dönüştürür. Alanları normal nesne gibi okur/yazarsınız; okumalar izlenir, yazmalar bağımlıları tetikler.

```tsx
import { reactive } from "@motifx/core";

const state = reactive({
  count: 0,
  user: { name: "Ada", age: 30 },
  items: [] as string[],
});

state.count++;                 // bu alana bağlı bağları tetikler
state.user.name = "Grace";     // iç içe nesneler de reaktiftir
state.items.push("yeni");      // dizi metotları izlenir
state.items[state.items.length] = "son";   // indeksle ekleme de indeksi ve length'i tetikler
state.items.length = 0;        // kısaltma, düşen indekslerin okuyucularını uyandırır
```

Proxy asıl nesnenin üzerine kurulur, kopya alınmaz; aynı nesne için her zaman aynı proxy döner (`reactive(a) === reactive(a)`). Düz nesneler, diziler ve sınıf örnekleri (`[object Object]`) reaktif olur; `Map`, `Set`, `WeakMap`, `WeakSet`, `Date`, `RegExp` gibi nesneler ve genişletilemez (`Object.freeze`) nesneler **olduğu gibi** döner, içlerindeki değişiklik bağları tetiklemez. Böyle bir değer değiştiğinde alanı yeni bir referansla yazın (`state.tags = new Set(state.tags).add(x)`) ya da düz dizi/nesne kullanın.

Bileşende en yaygın kullanım:

```tsx file=src/Counter.tsx variant=class
import { Component, reactive } from "@motifx/core";

export class Counter extends Component<HTMLButtonElement> {
  state = reactive({ count: 0 });
  view() {
    return <button onclick={() => this.state.count++}>
      {this.state.count}
    </button>;
  }
}
```
```tsx file=src/Counter.tsx variant=function
import { reactive } from "@motifx/core";

export function Counter() {
  const state = reactive({ count: 0 });
  return <button onclick={() => state.count++}>
    {state.count}
  </button>;
}
```
```tsx file=src/Counter.tsx variant=options
import { reactive } from "@motifx/core";

export const Counter = () => ({
  el: 'div',
  data: reactive({ count: 0 }),
  view() {
    return <button onclick={() => this.data.count++}>
      {this.data.count}
    </button>;
  },
});
```

### `useModel(model)` {#use-model}

`reactive` ile aynı işi yapan bir eş addır (alias). Fonksiyon bileşenlerinde/kanca stilinde tercih edilir. Ayrıca `ComponentBase` üzerinde `this.useModel(model)` metodu da vardır.

```tsx
const state = useModel({ open: false });
```

### Türetilmiş (computed) alanlar — nesne içinde fonksiyon {#derived-fields}

Reaktif nesne içinde bir fonksiyon alan tanımlarsanız, türetilmiş reaktif değer gibi davranır:

```tsx
const state = reactive({
  theme: "light",
  lang: "tr",
  full: () => state.theme + state.lang,   // türetilmiş
});

// JSX'te:
<span>{() => state.full()}</span>
```

## Signal ve Computed {#signals}

Tek bir değeri saran, en ince taneli ilkellerdir. Bileşen ağacından bağımsız reaktif durum tutmak için idealdir.

### `createSignal(initialValue)` {#create-signal}

```tsx
import { createSignal } from "@motifx/core";

const count = createSignal(0);

count.value;                 // oku (izlenir)
count.value = 5;             // yaz (bağımlıları tetikler)
count.peek();                // izlemeden oku
count.update(n => n + 1);    // fonksiyonla güncelle
count.mutate(v => { /* referans korunarak mutasyon */ });
count.notify();              // referans değişmese de dinleyicileri uyar
count.asReadonly();          // salt-okunur görünüm
count.dispose();             // bertaraf et
```

`Signal` sınıfının özeti:

| Üye | Açıklama |
|-----|----------|
| `get value` / `set value` | İzlenen okuma / tetikleyen yazma. |
| `peek()` | İzlemeden oku. |
| `update(fn)` | Önceki değere göre güncelle. |
| `mutate(fn)` | İç mutasyon sonrası bildir (referans aynı kaldığında). |
| `notify()` | Manuel bildirim. |
| `asReadonly()` | `ReadonlySignal<T>` görünümü (`value`, `peek()`). |
| `dispose()` | Sonraki işlemleri no-op yapar. |

Eşitlik karşılaştırıcısı özelleştirilebilir (varsayılan `Object.is`); bunun için `Signal` sınıfını doğrudan kurun:

```tsx
import { Signal } from "@motifx/core";

const s = new Signal(0, (a, b) => Math.abs(a - b) < 0.001);
```

### `createComputed(getter)` {#create-computed}

Bağımlılıklarından otomatik türetilen, önbelleklenen değer. Kurulumda **hemen** hesaplanır; bağımlılıklarından biri değişince kimse okumasa da **bir sonraki mikro görevde** yeniden hesaplanır ve değer değiştiyse kendisine bağlı effect'leri tetikler. `.value` önbellekteki değeri verir, okuma sırasında hesap yapmaz; bu yüzden yazmadan hemen sonraki senkron okuma bir önceki değeri verebilir:

```tsx
import { createSignal, createComputed } from "@motifx/core";

const first = createSignal("Ada");
const last = createSignal("Lovelace");
const full = createComputed(() => first.value + " " + last.value);

full.value;   // "Ada Lovelace" — bağımlılıklar değişince yeniden hesaplanır
full.peek();  // izlemeden oku
full.dispose();
```

### `createLazyComputed(getter)` — okunana kadar hesaplama {#create-lazy-computed}

`createComputed`'ın tembel karşılığı. Kurulumda hesap yapmaz; bir bağımlılık değişince yalnızca **kirli** işaretlenir ve kendisine bağlı effect'ler uyandırılır. Hesap, `.value` ilk okunduğunda ve her kirli okumada yapılır; okunmayan bir değer hiç hesaplanmaz. İşaretleme yazma anında senkrondur: `a.value = 2` satırından hemen sonra `lazy.value` taze değeri verir.

```tsx
import { createSignal, createLazyComputed } from "@motifx/core";

const rows = createSignal<Row[]>([]);
const report = createLazyComputed(() => buildExpensiveReport(rows.value));

rows.value = load();      // hesap yok, yalnızca kirli işareti
report.isDirty;           // true
report.value;             // şimdi hesaplanır ve önbelleğe alınır
report.value;             // önbellekten
report.peek();            // izlemeden oku (kirliyse yine hesaplar)
report.dispose();         // izlemeyi bırakır; sonraki okumalar son değeri verir
```

Ne zaman hangisi: değer sürekli ekranda okunuyorsa `createComputed` (her değişimde hazır); pahalı ve seyrek okunuyorsa ya da arka arkaya çok yazma geliyorsa `createLazyComputed` (N yazma → 1 hesap). Ödün: tembel değer değişmese de bağımlı effect'ler uyanır, çünkü kirli işaretlenirken hesap yapılmaz ve eşitlik bilinemez.

Senkron tazelik zincirin tamamı `reactive`/`Signal`/`LazyComputed`'dan oluştuğunda geçerlidir. Zincirde bir `createComputed` varsa onun yenilenmesi mikro görevde olduğu için ondan beslenen tembel değer de yazmadan hemen sonra değil, akıtmadan sonra tazelenir.

## `effect(fn)` — yan etkiler ve izleyiciler {#effect}

Bir efekt kurulduğu anda senkron olarak bir kez çalışır, içinde okunan reaktif değerlere abone olur ve bunlar değiştikçe yeniden çalışır. `effect` bir **durdurucu fonksiyon** döndürür:

```tsx
import { effect } from "@motifx/core";

const stop = effect(() => {
  console.log("count şu an:", count.value);
});

// aboneliği bitir
stop();
```

İkinci argüman isteğe bağlı bir **sonuç geri çağrısıdır**: `effect(getter, onValue)` her koşudan sonra `getter`'ın dönüş değerini `onValue`'ya verir ve `onValue` içindeki okumalar **izlenmez**. Bağımlılık yüzeyini yalnız `getter`'la sınırlamak için kullanılır; çerçevenin `when`/`ternary`/`switchCase` bağları böyle kuruludur:

```tsx
const stop = effect(() => state.filter, (filter) => {
  // yalnız state.filter değişince koşar; burada okunan state.rows izlenmez
  render(filter, state.rows);
});
```

Bileşen içinde bir efekt kurarken, temizliğin otomatik olması için `bindings.watch` kullanmak daha güvenlidir (bkz. aşağıda) — bileşen dispose edildiğinde efekt de durur.

### `await` sonrası okumalar {#await-reads}

İzleme, efektin **senkron** parçasıyla sınırlıdır: `async` bir getter/efekt içinde ilk `await`'ten sonra okunan reaktif alanlar bağımlılık olarak kaydedilmez. Asenkron bir işin sonucuna göre güncellenmesi gereken durumu, sonucu reaktif bir alana yazıp o alanı okuyan ayrı bir bağla gösterin. Tek istisna `Virtualization`'ın `dataRequest` prop'udur: derleyici oradaki `await`'leri sarar ve `await` sonrası okumalar da izlenir (bkz. [Sanal Listeler](./virtualization.md#auto-refresh)). Bu sarmanın çalışma zamanı yarısı `asyncTracking` dışa aktarımıdır; elle çağrılmaz.

### İzlemesiz okuma — `untracked` {#untracked}

Bir efektin içinde bir değeri okumak ama ona **abone olmamak** istediğinizde `untracked(fn)` kullanın; `fn`'in dönüş değerini verir. İçeride kurulan `effect`'ler kendi bağımlılıklarını normal izler.

```tsx
import { effect, untracked } from "@motifx/core";

effect(() => {
  const q = state.query;                       // izlenir
  const limit = untracked(() => state.limit);  // izlenmez: limit değişince bu efekt koşmaz
  search(q, limit);
});
```

Çekirdek bunu `ListBinding`'de kullanır: satır bileşenleri liste effect'inin içinde üretilir, ancak satır şablonundaki depo okumaları listeye değil satırın kendi bağlarına yazılır. Böylece depo değişince liste diff'i gereksiz koşmaz.

> **Kural: bir efekt kendi okuduğu değeri yazmamalı.** `state.n++` hem okuma hem yazmadır; efekt kendini yeniden tetikler ve döner. Sayaç/günlük gibi yan kayıtları `untracked` içine alın:
>
> ```tsx
> effect(() => {
>   const t = total.value;                    // izlenen okuma
>   untracked(() => {                         // yazmalar izlenmez → kendini tetiklemez
>     state.effectRuns++;
>     state.log.unshift(`toplam ${t}`);
>   });
> });
> ```
>
> Çerçeve bunu yakalar: bir efekt tek akıtmada 50 kez koşarsa o akıtma boyunca atlanır ve geliştirme modunda `MJX203` uyarısı verilir. Kuyruktaki diğer efektler etkilenmez.
>
> Dizi mutatörleri (`push`, `pop`, `shift`, `unshift`, `splice`, `reverse`) bu kuralın dışındadır: çağrının kendi iç okumaları (`length`, indeksler) izlenmez, yani bir efekt içinde `state.items.push(x)` yazmak efekti diziye abone etmez. Efekt diziyi ayrıca okuyorsa (`state.items.length` gibi) abonelik yine kurulur.

### Zincirli (türetilmiş) durum {#chained-state}

Bir efekt, başka bir efektin yazdığı durumu okuyabilir. Zincirin tamamı **aynı mikro görevde** oturur; sıralama önemli değildir ve ara adımları beklemek gerekmez:

```tsx
effect(() => { b.n = a.n + 1; });   // yazar
effect(() => { c.n = b.n + 1; });   // okur ve yazar

a.n = 10;
// bir sonraki mikro görevde c.n === 12
```

Bir efekt (ya da bir bağın getter'ı) hata fırlatırsa yalnızca o efekt etkilenir; aynı akıtmadaki diğerleri çalışmaya devam eder. Hata, asıl hatayı `cause` alanında taşıyan `MJX208` kodlu bir `MotifError` olarak merkezî hata yöneticisine bildirilir: konsola yazılır ve `errorHandler.addListener(fn)` dinleyicilerine ulaşır.

### Bileşene bağlı izleyici — `bindings.watch` / `x-watch` {#watch}

İzleyici bileşene kaydedilir; bileşen dispose edilince kendiliğinden durur. İlk koşu bileşen kurulurken (build öncesi) yapılır.

```tsx file=src/Logger.tsx variant=class
import { Component, reactive } from "@motifx/core";

export class Logger extends Component<HTMLDivElement> {
  state = reactive({ q: "" });
  onConfig() {
    this.bindings.watch(() => {
      console.log("arama:", this.state.q);
    });
  }
}
```
```tsx file=src/Logger.tsx variant=function
import { reactive } from "@motifx/core";

export function Logger() {
  const state = reactive({ q: "" });
  return <div x-watch={() => console.log("arama:", state.q)} />;
}
```
```tsx file=src/Logger.tsx variant=options
import { reactive } from "@motifx/core";

export const Logger = () => ({
  el: 'div',
  data: reactive({ q: "" }),
  onConfigured() {
    this.bindings.watch(() => {
      console.log("arama:", this.data.q);
    });
  },
});
```

## Ardışık yazmalar kendiliğinden toplanır {#batching}

Aynı senkron blokta yapılan yazmalar için ayrı bir toplama çağrısı gerekmez. Yazmalar effect'leri bir kuyruğa ekler; kuyruk bir sonraki mikro görevde boşaltılır ve her effect **bir kez** çalışır. Ara durumları hiçbir effect görmez:

```tsx
state.a = 1;
state.b = 2;
state.c = 3;
// üçünü de okuyan bir effect, mikro görevde yalnızca bir kez koşar
```

## Yardımcılar {#helpers}

| Fonksiyon | Açıklama |
|-----------|----------|
| `deepClone(value)` | Reaktif değerin derin kopyasını üretir. |
| `clearModel(model)` | Bir modelin reaktif kaydını temizler. |

## Reaktivite ile DOM'un buluşması {#bindings}

Reaktif alanlar DOM'a **bağlar (bindings)** aracılığıyla yansır. JSX yazdığınızda bunlar otomatik kurulur:

```tsx
<span>{state.name}</span>          // → bindings.add("textContent", state, "name")
<div class={() => state.cls} />    // → reaktif sınıf bağı
<input value={() => state.q} />    // → reaktif değer bağı
```

Zorunlu (imperative) durumda `setState()` / `reState()` ile alt ağacın bağlarını (metin, öznitelik, sınıf ve stil getter'ları, `model`; listeler satırlarını yeniden kurar) yeniden etkinleştirebilirsiniz. İkisi de bileşenin ve bütün çocuklarının bağlarını yeniden değerlendirir; yalnız sıra farklıdır: `setState()` önce çocukları, sonra bileşenin kendisini, `reState()` önce bileşenin kendisini, sonra çocukları işler.

```tsx
this.setState();   // bu bileşen ve çocuklarının bağlarını yeniden değerlendir
```

Genellikle `reactive` ile çalışırken `setState`'e gerek kalmaz; noktasal reaktivite güncellemeyi kendi yapar. `setState`, reaktif olmayan düz veriyi elle güncellediğiniz durumlar içindir (örneğin bir dil sözlüğü değiştiğinde bütün metin bağlarını yeniden okutmak gibi).

## Sonraki adım {#next}

Koşullu ve liste tabanlı gösterimi öğrenmek için [Koşullu Gösterim ve Listeler](./conditionals-and-lists.md) bölümüne geçin.
