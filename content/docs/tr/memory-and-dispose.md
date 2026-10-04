---
slug: memory-and-dispose
title: Bellek Yönetimi ve Dispose
description: Otomatik temizlenenler, motif.register/setDisposable, bertaraf metotları, detach/silentDetach/silentUnlink, DisposableStore, using/doWork, sızıntı izleme ve canlı bileşen sayımı.
category: app
order: 4
---

MotifJS uzun ömürlü, durum-yoğun uygulamalar için tasarlanmıştır; bu yüzden **kaynak temizliği** birinci sınıf bir konudur. Sanal DOM olmadığı için bileşenler gerçek DOM düğümlerine, olay dinleyicilerine ve reaktif aboneliklere doğrudan tutunur. Bunların doğru bertaraf edilmesi (dispose) bellek sızıntılarını önler.

## Otomatik olarak temizlenenler {#auto-cleanup}

Bir bileşen dispose edildiğinde MotifJS şunları **otomatik** yapar:

- `motif.on(...)` ile eklenen tüm DOM olay dinleyicilerini kaldırır.
- Tüm bağları (`bindings`) deaktive eder.
- `bindings.watch` / `bindings.method` gibi efektleri durdurur.
- Çocuk bileşenleri özyinelemeli olarak dispose eder.
- DOM düğümlerini (varsa çıkış animasyonundan sonra) söker.
- İç referansları (`element`, `props`, `class`, `attr`) serbest bırakır.

Bu nedenle **JSX içinde kurduğunuz olaylar, bağlar ve çocuklar için elle temizlik gerekmez.**

## Elle kaydettiğiniz kaynaklar {#manual-resources}

Bir bileşenin ömrüne bağlı harici kaynaklar (zamanlayıcılar, abonelikler, gözlemciler) oluşturuyorsanız, bunları bileşene **kaydedin** ki dispose'da otomatik temizlensinler.

### `motif.register(disposable)` ve `motif.setDisposable(fn)` {#register}

```tsx file=src/Clock.tsx variant=class
import { Component, disposableCore } from "@motifx/core";

export class Clock extends Component<HTMLDivElement> {
  onConfig() {
    const id = setInterval(() => this.tick(), 1000);

    // Yol 1: bir temizleyici fonksiyon kaydet
    this.motif.setDisposable(() => clearInterval(id));

    // Yol 2: IDisposable kaydet
    this.motif.register(disposableCore.toDisposable(() => clearInterval(id)));
  }
  tick() { /* ... */ }
}
```
```tsx file=src/Clock.tsx variant=function
export function Clock() {
  const tick = () => { /* ... */ };
  return <div onconfig={(s) => {
    const id = setInterval(tick, 1000);
    s.motif.setDisposable(() => clearInterval(id));
  }} />;
}
```
```tsx file=src/Clock.tsx variant=options
export const Clock = () => ({
  el: 'div',
  onConfigured() {
    const id = setInterval(() => this.tick(), 1000);
    this.motif.setDisposable(() => clearInterval(id));
  },
  tick() { /* ... */ },
});
```

- `this.motif.setDisposable(() => void)` — bir temizleyici fonksiyon kaydeder.
- `this.motif.register(IDisposable)` — bir `IDisposable` nesnesi kaydeder.
- Kayıtlı temizleyiciler bileşen dispose edilirken çağrılır.

### Uygulama olayı aboneliğini bırakma {#app-event-unsubscribe}

`this.context.on(...)` ile açılan abonelik bileşenin ömrüne **kendiliğinden** bağlanır; bileşen dispose edilince kaldırılır, ayrıca kaydetmeniz gerekmez. Erken bırakmak isterseniz döndürdüğü fonksiyonu çağırın:

```tsx
onConfig(s: Component) {
  const off = s.context.on('data-updated', () => this.refresh());
  // ... gerekirse: off();
}
```

Bileşen dışından açılan abonelikler (`app.on(...)` / `Application.main.on(...)`) otomatik bağlanmaz; onların iptal fonksiyonunu bir bileşene `motif.setDisposable` ile kaydedin ya da elle çağırın.

## `effect` temizliği {#effect-cleanup}

Doğrudan `effect(...)` kullanırsanız, döndürdüğü durdurucuyu kaydedin. Bileşen içinde ise bunun yerine `bindings.watch` tercih edin — o otomatik temizlenir:

```tsx
// Önerilen: otomatik temizlenir
this.bindings.watch(() => console.log(state.x));

// Elle: durdurucu kaydedilmeli
const stop = effect(() => console.log(state.x));
this.motif.setDisposable(stop);
```

## Bertaraf metotları {#dispose-methods}

```ts
await this.dispose();                                 // deep + çıkış animasyonu (varsayılan)
await this.dispose({ skipLeaveTransition: true });    // animasyonsuz
await this.dispose({ deep: false });                  // çocuklarda başvuru temizliğini atla
await this.disposeAsync();                            // çıkış geçişi oynatmadan, süren animasyonları durdurarak
```

Seçeneklerin ayrıntısı için [Bertaraf](./lifecycle.md#dispose).

`controls` üzerinden dolaylı bertaraf:

```ts
this.controls.remove(child);   // child'ı kaldırır ve DISPOSE eder (tam temizlik)
this.controls.clear();         // tüm çocukları DISPOSE eder
await this.motif.clear();      // içeriği temizle (Promise)
```

**Yok etme vs. taşıma:** `remove()`/`clear()` çocuğu **dispose eder** (bağlar, effect'ler, olay dinleyicileri ve DOM temizlenir). Bir bileşeni yok etmeden başka bir yere **taşımak/yeniden kullanmak** istiyorsanız dispose etmeyen üçlüden birini kullanın:

| Metot | Koleksiyon | Çıkış animasyonu | DOM | Bildirim |
|---|---|---|---|---|
| `detach(child)` | çıkarır | **oynatır**: kök element ise kendi leave'i; kök fragment ise görünür element çocuklarının (iç içe fragment'lar dâhil) leave'leri birlikte | leave bitince söker (fragment köklüyse açılış..kapanış aralığının tamamı; gizliyse yer tutucu); geçiş tanımlı değilse senkron | leave bitip DOM söküldükten sonra ebeveynde `controlremoved` |
| `silentDetach(child)` | çıkarır | oynatmaz | senkron söker | yok |
| `silentUnlink(child)` | çıkarır | oynatmaz | dokunmaz | yok |

Üçü de bileşeni ve çocuklarını canlı bırakır. `detach` ve `silentDetach` DOM söküldüğünde bileşene ve görünür alt ağacına `onDeactivated`, bileşen `controls.add` ile yeniden yerleşince `onActivated` gönderir; `silentUnlink` DOM'a dokunmadığı için bildirim göndermez ([Yaşam Döngüsü](./lifecycle.md)). `detach` bir `Promise` döndürür; geçiş varsa söküm bittiğinde çözülür, yoksa çözülmüş gelir:

```ts
await this.controls.detach(child);   // leave oynadı, DOM söküldü
other.controls.add(child);           // yeni yere taşı
```

Beklemeden `other.controls.add(child)` yazmak da güvenlidir: eski ebeveynden `detach` kendiliğinden yapılır, koleksiyon ve `parent` hemen güncellenir, DOM ise leave bitince yeni ebeveyne bağlanır. Animasyonlu kaldırmanın diğer yolları `motif.hide()` ve `dispose()`'dur.

`isDisposed` ile durumu kontrol edin; dispose sonrası çoğu metot güvenli biçimde no-op'tur.

## `DisposableStore` — grup temizliği {#disposable-store}

Birden fazla kaynağı bir grupta toplamak için `DisposableStore` kullanın:

```tsx
import { DisposableStore, disposableCore } from "@motifx/core";

const store = new DisposableStore();
const timer = store.add(disposableCore.toDisposable(() => clearInterval(id)));  // add eklediğini döndürür
store.add(someOtherDisposable);

store.delete(timer);   // tekini çıkar ve dispose et
store.detach(timer);   // tekini çıkar, dispose ETME
store.clear();         // hepsini dispose et, depo açık kalır

// Hepsini birden temizle ve depoyu kapat
store.dispose();
store.isDisposed;   // true
```

Kapatılmış depoya `add` yapılırsa eklenen nesne bertaraf edilmez (sızar) ve geliştirme modunda `MJX504` uyarısı yazılır. `clear`/`dispose` sırasında birden çok öğe hata fırlatırsa hepsi tek bir `MJX503` hatasının `cause`'undaki `AggregateError` içinde toplanır; tek hata olduğu gibi fırlatılır.

Bir bileşene bağlamak için `this.motif.register(store)` çağırın.

## Bertaraf sonrası güvenlik: `using` ve `doWork` {#using-dowork}

Asenkron işlem tamamlandığında bileşen dispose edilmiş olabilir. `using` ve `doWork`, sonucu yalnızca bileşen hâlâ canlıysa işler:

```ts
// Yalnızca bileşen dispose edilmemişse onfulfilled çalışır
this.using(fetchData(), (data) => this.state.items = data);

// bileşen bu arada bertaraf edildiyse Promise reddedilmez, bir Error örneğiyle (MotifError, code 'MJX108') çözülür; aksi halde değeri geçirir
const value = await this.doWork(fetchData());
if (value instanceof Error) return;
```

Bu, "dispose edilmiş bileşen üzerinde state güncelleme" hatalarını önler.

## Sızıntı izleme (leak monitoring) {#leak-monitor}

Geliştirme sırasında reaktif bağımlılıkların anormal büyümesini izlemek için:

```ts
app.useReactiveMonitor({ enabled: true, threshold: 200, name: 'app' });
```

Bir bağımlılık kümesi eşiği aştığında MotifJS uyarı üretir — bu genelde bir efektin/bağın temizlenmediğine işaret eder. Üretimde kapalı tutun (varsayılan kapalıdır).

## Canlı bileşen sayımı — `disposableCore.disposableTracker` {#disposable-tracker}

Her bileşen bir `Disposable`'dır: yapıcısı `trackDisposable`, bertaraf zinciri `markAsDisposed` çağırır. `disposableCore.disposableTracker`'a bir izleyici takarak canlı bileşen sayısını ölçebilirsiniz; tur testlerinde ("N kez kur-sök sonrası sayaç başladığı değere döndü mü") kullanılır:

```ts
import { disposableCore, ComponentBase, IDisposable } from "@motifx/core";

let alive = 0;
const disposedOnce = new WeakSet<IDisposable>();
disposableCore.disposableTracker = {
  trackDisposable(x) { if (x instanceof ComponentBase) alive++; },
  markAsDisposed(x) {
    if (!(x instanceof ComponentBase) || disposedOnce.has(x)) return;
    disposedOnce.add(x);
    alive--;
  },
  setParent() { },
  markAsSingleton() { },
};
```

`markAsDisposed` bertaraf zincirinde birden çok kez gelebilir; `WeakSet` bu yüzden gerekir. Reaktif nesnelerin bağımlılık haritalarını incelemek için `@motifx/core/devtools` alt yolundaki `debugGetDeps(hedef)` ve `debugGetDepMap()` kullanılır (`import { debugGetDeps } from "@motifx/core/devtools"`).

## En iyi uygulamalar {#best-practices}

- JSX ile kurduğunuz her şey (olay, bağ, çocuk) otomatik temizlenir — dokunmayın.
- Harici kaynak (timer, observer, WebSocket, harici abonelik) oluşturuyorsanız **mutlaka** `motif.register`/`motif.setDisposable` ile kaydedin.
- Bileşen içi reaktif izleyicilerde `effect` yerine `bindings.watch` kullanın.
- Asenkron sonuçları `using`/`doWork` ile koruyun.
- Manuel `controls.add` ile eklediğiniz bileşenleri, kapsayıcı dispose edilince otomatik temizleneceğini bilerek yönetin; erken kaldırmak için `controls.remove` kullanın.

## Sonraki adım {#next}

Tüm dışa aktarılan API'nin özeti için [API Referansı](./api-reference.md) bölümüne geçin.
