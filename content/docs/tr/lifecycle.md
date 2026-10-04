---
slug: lifecycle
title: Yaşam Döngüsü
description: Kanca sırası, sınıf metodu ve JSX prop'u olarak kancalar, initializeComponent, görünürlük, bekletme, bertaraf ve uygulama yaşam döngüsü.
category: core
order: 7
---

Her MotifJS bileşeni, oluşturulmasından DOM'a bağlanmasına ve bertaraf edilmesine kadar belirli bir yaşam döngüsünden geçer. Bu aşamalarda çalışan kancaları (hooks) hem **sınıf metodu** olarak hem de **JSX prop'u** olarak tanımlayabilirsiniz.

## Kancalar ve çalışma sırası {#hooks}

| Sıra | Kanca | Ne zaman çalışır |
|------|-------|-------------------|
| 1 | `onInitializing` | Yapıcıda, element atanıp props işlendikten sonra (`this.props` hazır; alt sınıfın `state = reactive(...)` gibi alanları henüz ilklenmemiştir). |
| 2 | `onInitialized` | Yapıcıda, `onInitializing`'den hemen sonra. |
| 3 | `onConfig` | Yapılandırma aşaması; **props hazır, DOM'a henüz bağlı değil**. Veri çekmek için idealdir. Alt sınıflarda `build()` başında (sınıf alanları ilklendikten sonra) çalışır. |
| 4 | `onConfigured` | Yapılandırma tamamlandığında (build başlangıcı). |
| 5 | `onBuilding` | DOM inşası başlarken. |
| 6 | `initializeComponent` | `view()` çağrılmadan hemen önce; bileşenin kurulum kodu (JSX'ten derleyici üretir). |
| 7 | `oninitializeComponent` | Bütün `initializeComponent` kodu (sınıf metodu, etiketteki değer, derleyicinin ürettiği) çalıştıktan hemen sonra, `view()`'den önce. |
| 8 | `onBuilt` | Bileşen ve çocukları inşa edildikten sonra. Element bu anda hâlâ **detached** bir fragment içinde olabilir (ternary/liste dalları). |
| 9 | `onMounted` | Element canlı DOM'a (`document`) bağlandığında, **bir kez**. `focus()`, ölçüm, üçüncü parti widget'lar için doğru yer. |
| — | `onActivated` / `onDeactivated` | Bileşen DOM'dan sökülüp (dispose edilmeden) yeniden yerleştiğinde: `keepAlive` rota dönüşü, `controls.detach`/`silentDetach` sonrası `controls.add` (taşıma dahil), `motif.hide()`/`motif.show()` (`x-wait`/`x-display` dahil), `Virtualization` satırının pencereden çıkıp geri gelmesi. Ayrılırken `onDeactivated`, geri gelince `onActivated`. İlk gösterimde çalışmaz. Görünür alt ağaca da iletilir (önce ebeveyn); gizli bir çocuk ebeveyniyle etkinleşmez, kendi `motif.show()`'unda etkinleşir. |
| — | `onVisibilityChanged` | `motif.show()`/`motif.hide()`/`motif.toggle()` (`x-wait`/`x-display` dahil) görünürlüğü değiştirirken; `isVisible` güncellenmeden önce çalışır (gizlemede çıkış animasyonu bittikten sonra), kanca içinde `isVisible` önceki değeri gösterir. |
| — | `onDisposing` | Bertaraf başlarken. |
| — | `onDisposed` | Bertaraf tamamlandığında. |

> `onInitializing` ve `onInitialized` bileşen **oluşturulurken** (constructor akışında) çalışır. `onConfig`, düz `new Component(tag, { onconfig })` örneklerinde yapıcıda; **alt sınıflarda** (`class X extends Component`) ise `state = reactive(...)` gibi sınıf alanları ilklendikten sonra, `build()` başında `onConfigured`'dan hemen önce çalışır (hiç build edilmeyen bir alt sınıf örneği `onConfig` almaz). `onConfigured`, `onBuilding`, `initializeComponent`, `oninitializeComponent` ve `onBuilt` `build()` sırasında; `onMounted` ise element `document`'a bağlanınca çalışır (zaten bağlıysa hemen). `isInitialized` `onInitializing` sırasında `false`, `onInitialized`'dan itibaren `true`'dur (yapıcıdaki ilkleme bitince atanır).

Durum bayrakları: `isInitialized`, `isConfigured`, `isBuilt`, `isVisible`, `isWait`, `isDisposed` ilgili evre geçildiğinde güncellenir ve bileşen üzerinden okunur.

Options API nesnesine yazılan `onInitializing`, `onInitialized` ve `onConfig` çalışmaz (bu evreler alanlar nesneden kopyalanmadan önce biter); kurulum için `ctor` ya da `onConfigured` kullanın (bkz. [Options API](./components.md#options-components)).

## Sınıf metodu olarak tanımlama {#class-hooks}

```tsx file=src/TodoList.tsx variant=class
import { Component, ComponentBase, EventArgs, reactive } from "@motifx/core";

export default class TodoList extends Component {
  state = reactive({ todos: [] as any[] });

  constructor() { super('div'); }

  // Veri çekmek için en uygun kanca: props hazır, DOM'a bağlanmadan önce
  public async onConfig(sender: ComponentBase, e: EventArgs) {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos');
    this.state.todos = (await res.json()).slice(0, 200);
  }

  public onBuilt(sender: ComponentBase, e: EventArgs) {
    console.log("inşa edildi (henüz document'ta olmayabilir)", this.element);
  }

  public onMounted(sender: ComponentBase, e: EventArgs) {
    console.log("canlı DOM'a bağlandı", document.contains(this.element)); // true
  }

  view() {
    return <ul>{this.state.todos.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
  }
}
```
```tsx file=src/TodoList.tsx variant=function
import { reactive } from "@motifx/core";

export default function TodoList() {
  const state = reactive({ todos: [] as any[] });

  return (
    <div
      onconfig={async () => {
        const res = await fetch('https://jsonplaceholder.typicode.com/todos');
        state.todos = (await res.json()).slice(0, 200);
      }}
      onbuilt={(s) => console.log("inşa edildi (henüz document'ta olmayabilir)", s.element)}
      onmounted={(s) => console.log("canlı DOM'a bağlandı", document.contains(s.element))}
    >
      <ul>{state.todos.map(t => <li key={t.id}>{t.title}</li>)}</ul>
    </div>
  );
}
```
```tsx file=src/TodoList.tsx variant=options
import { reactive } from "@motifx/core";

export const TodoList = () => ({
  el: 'div',
  data: reactive({ todos: [] as any[] }),

  // Options API'de onConfig çalışmaz; en erken kanca onConfigured'dır
  async onConfigured() {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos');
    this.data.todos = (await res.json()).slice(0, 200);
  },

  onBuilt() {
    console.log("inşa edildi (henüz document'ta olmayabilir)", this.element);
  },

  onMounted() {
    console.log("canlı DOM'a bağlandı", document.contains(this.element)); // true
  },

  view() {
    return <ul>{this.data.todos.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
  },
});
```

Her kanca `(sender, e)` imzasıyla çağrılır:
- `sender` — bileşenin kendisidir.
- `e` — `EventArgs` (`{ cancel: boolean }`).

Bir kancada fırlatılan hata ya da kancanın döndürdüğü Promise'in reddedilmesi (`async` kancalar dahil) `MotifError` `MJX122` olarak raporlanır: `console.error`'a yazılır (`app.useLogging(false)` değilse) ve `errorHandler.addListener(fn)` dinleyicilerine iletilir; geliştirme modu gerekmez, üretimde de çalışır. Bileşen kurulmaya devam eder. Bu kural `initializeComponent`, `oninitializeComponent`, Options API nesnesinin `ctor`'u, `ref` geri çağrısı (düz etikette ve sınıf bileşeni etiketinde; bileşen yine oluşturulur) ve kodla `this.motif.on('x:built', fn)` biçiminde eklenen yaşam döngüsü dinleyicileri (`x:mounted` dahil) için de geçerlidir.

## JSX prop'u olarak tanımlama {#prop-hooks}

Fonksiyon bileşenlerinde ve satır içi elemanlarda kancaları prop olarak bağlayın:

```tsx
<div
  onconfig={(s) => console.log("yapılandırılıyor")}
  onbuilt={(s) => console.log("inşa edildi")}
  ondisposing={(s) => console.log("temizleniyor")}
>
  İçerik
</div>
```

`x-` ve `x:` biçimleri de kabul edilir:

```tsx
<div x-config={(s) => ...} x:built={(s) => ...}>...</div>
```

> **Önemli:** Prop olarak verdiğiniz yaşam döngüsü işleyicileri, sınıf metotlarının **yerini almaz**; ikisi de çalışır (prop işleyicileri toplanır ve sınıf metoduna ek olarak çağrılır).

Aynı etikette bir kancanın birden çok yazımı (`on<kanca>`, `x-<kanca>`, `x:<kanca>`; büyük/küçük harf farkı dahil, örn. `onBuilt`) birleşir: hepsi kaynaktaki sırayla birer kez çalışır. Bu, düz DOM etiketinde ve bileşen etiketinde aynıdır; fonksiyon bileşeni etiketinde kancalar, tek yazımla da birleşik yazımla da, fonksiyonun döndürdüğü köke uygulanır. `initializing`/`initialized` kancaları fonksiyon bileşeni etiketinde kök kurulur kurulmaz, sınıf bileşeni etiketindeki sırayla çalışır: `ref` → `initializing` → `initialized` → `config` → … → `building` → `initializeComponent` → `built`. Bu kural `built`, `building`, `mounted`, `config`, `configured`, `initializing`, `initialized`, `disposing`, `disposed`, `visibilitychanged`, `activated`, `deactivated` kancalarının hepsi için geçerlidir:

```tsx
<div onbuilt={() => log('önce')} x-built={() => log('sonra')} />
```

## `initializeComponent` — bileşenin kurulum kodu {#initialize-component}

`initializeComponent`, `view()`'den hemen önce, bileşen başına bir kez çalışır. Derleyici JSX'ten ürettiği kurulum kodunu (etikete yazılan öznitelikler, olaylar, direktifler, çocukların yerleştirilmesi) bu adla verir; JSX kullanan bir bileşende bunu yazmanız gerekmez. JSX olmadan, bileşeni elle kurarken isteğe bağlı olarak kullanılır; bağ eklemek veya çocukları programatik hazırlamak için uygundur:

```tsx file=src/Panel.tsx variant=class
import { Component, ComponentBase } from "@motifx/core";

export class Panel extends Component<HTMLDivElement> {
  initializeComponent(sender: ComponentBase) {
    sender.bindings.watch(() => console.log("state değişti"));
  }
}
```
```tsx file=src/Panel.tsx variant=function
export function Panel() {
  return <div initializeComponent={(s) => s.bindings.watch(() => console.log("state değişti"))} />;
}
```
```tsx file=src/Panel.tsx variant=options
export const Panel = () => ({
  el: 'div',
  initializeComponent() {
    this.bindings.watch(() => console.log("state değişti"));
  },
});
```

JSX'siz, elle kurulan bileşende prop olarak:

```ts
const list = new Component("ul", {
  initializeComponent: (s: ComponentBase) => s.bindings.list(() => state.items, renderItem),
});
```

`initializeComponent` bir etikete prop olarak da yazılabilir; etiketin bileşeni `sender` olarak verilir ve kurulumda bir kez çağrılır. Düz DOM etiketinde, sınıf bileşeni etiketinde ve fonksiyon bileşeni etiketinde (fonksiyonun döndürdüğü kökte) anlamı ve zamanlaması aynıdır:

```tsx
<ul initializeComponent={(s) => s.bindings.watch(() => console.log(state.items.length))}>...</ul>
<Panel initializeComponent={(s) => console.log("panel kuruluyor", s)} />
```

Derleyici bileşen etiketlerinde `initializeComponent`'i `runover` içinde aktarır. Kullanıcının verdiği ve derleyicinin ürettiği ikisi de çalışır; sıra: bileşenin `initializeComponent` metodu, etikette verilen, derleyicinin ürettiği.

### `oninitializeComponent` — kurulum kodundan hemen sonra {#on-initialize-component}

JSX kullanan bir bileşende `initializeComponent` aşamasını derleyicinin kurulum kodu doldurur. `oninitializeComponent`, aynı aşamada bu kod bittikten hemen sonra çalışan kancadır. Öznitelikler, olaylar, bağlar ve çocuklar bu anda tanımlanmış olur; `view()` henüz çağrılmamıştır. Derleyicinin ürettiği kurulumun üzerine kendi kurulumunu eklemek isteyen kod için yeri burasıdır.

`build()` içindeki sıra:

1. Sınıfın `initializeComponent` metodu.
2. Etiketten ya da derleyiciden gelen `initializeComponent` değerleri.
3. Sınıfın `oninitializeComponent` metodu.
4. Etiketten gelen `oninitializeComponent` değerleri.
5. `view()`.

Sınıf metodu olarak:

```tsx file=src/Card.tsx
import { Component, ComponentBase, EventArgs } from "@motifx/core";

export class Card extends Component {
  oninitializeComponent(sender: ComponentBase, e: EventArgs) {
    sender.bindings.watch(() => console.log("kurulum tamamlandı", sender.controls.items.length));
  }
}
```

Etikette prop olarak (düz DOM etiketi, sınıf bileşeni etiketi ve fonksiyon bileşeni etiketi; fonksiyon bileşeninde fonksiyonun döndürdüğü köke uygulanır):

```tsx
<ul oninitializeComponent={(s) => console.log("çocuklar hazır", s.controls.items.length)}>
  <li>Bir</li>
</ul>
<Card oninitializeComponent={(s) => console.log("kart kuruldu", s)} />
```

Düz etikette bu kanca çalıştığında etiketin JSX çocukları `controls` içine eklenmiştir; yukarıdaki örnek `1` yazar.

## Görünürlük — `motif.show` / `motif.hide` / `motif.toggle` {#visibility}

Bir bileşeni bertaraf etmeden gizleyip gösterebilirsiniz:

```ts
await this.motif.hide();     // gizle (varsa çıkış animasyonu oynatılır)
await this.motif.show();     // göster (varsa giriş animasyonu)
this.motif.toggle();         // tersine çevir
this.isVisible;              // mevcut görünürlük
```

Görünürlük değişince `onVisibilityChanged` çalışır; kanca `isVisible` güncellenmeden önce çağrılır. Gizlenen bileşenin alt ağacındaki bağlar askıya alınır (`onDeactivated`), gösterilince yeniden etkinleşir (`onActivated`). Fragment köklü bileşende gizleme/gösterme çocuklara tek tek uygulanır.

### Gizleme stratejisi — `hideStrategy` {#hide-strategy}

Gizlenen bir bileşenin DOM'da nasıl ele alınacağını `hideStrategy` belirler:

| Değer | Davranış |
|-------|----------|
| `'placeholder'` | Eleman DOM'dan çıkar, yerine bir yorum yer tutucu konur; gösterirken yer tutucuyla yer değiştirir. |
| `'detach'` | DOM'dan iz bırakmadan çıkarılır; gösterilince ebeveyndeki sırasına göre yeniden eklenir. |
| `'auto'` (varsayılan) | Liste bağlamında (`.map` satırı, `key` verilmiş öğe) `detach`, aksi halde `placeholder`. |

Strateji, JSX'te `options` prop'uyla verilir; programatik olarak `motif.options.hideStrategy` alanına yazılır:

```tsx
<div options={{ hideStrategy: 'detach' }} x-display={() => state.open}>Ağır panel</div>
```

```ts
this.motif.options.hideStrategy = 'detach';
```

`options` prop'u bileşenin kendi ayar nesnesidir; çerçevenin tanıdığı anahtarlar okunur: `hideStrategy` ve `disableDisposal` `motif.options`'a kopyalanır, `isSvg` kök elemanın ad alanını belirler (bkz. [Kök eleman](./components.md#root-element)); diğer anahtarlar yok sayılır. Bu adı veri prop'u olarak kullanmayın. Fonksiyon bileşeni etiketine yazılan `options` döndürülen köke uygulanır.

## Bekletme — `isWait` / `x-wait` {#wait}

`x-wait` direktifi bir bileşenin DOM'a eklenmesini bir koşula bağlar; programatik karşılığı `isWait` özelliğidir (`isWait` bir JSX prop'u değildir). Koşul `true` iken bileşen bekletilir (gizli/eklenmemiş), `false` olunca eklenir. Koşullu gösterimde birincil yöntem budur — bkz. [Koşullu Gösterim ve Listeler](./conditionals-and-lists.md):

```tsx
<Virtualization
  x-wait={() => state.items.length === 0}
  /* ... */
/>
```

Programatik:

```ts
this.isWait = true;   // beklet
this.isWait = false;  // devam et (gerekirse DOM'a eklenir)
```

Yaşam döngüsü açısından önemli iki nokta:

- Koşul **başlangıçta** `true` ise `build()` koşul `false` olana kadar çalışmaz. `onconfig`/`onconfigured`
  çalışır; `onbuilding`/`onbuilt`/`onmounted` kancaları o ana kadar tetiklenmez, bileşenin alt ağacı
  kurulmaz ve DOM'a girmez.
- Bekleme durumuna geri dönmek **dispose etmez**. `ondisposing`/`ondisposed` çalışmaz, iç durum
  korunur; bileşen gizlenir ve `ondeactivated` alır. Gerçekten bertaraf istiyorsanız `{koşul && <X/>}` kullanın ya da `dispose()` çağırın.

## Bertaraf (dispose) {#dispose}

Gerekmeyen bir bileşen bertaraf edilir. Bu; olay dinleyicilerini kaldırır, bağları deaktive eder, çocukları özyinelemeli dispose eder ve DOM'dan söker:

```ts
await this.dispose();                               // varsayılan: { deep: true } + çıkış animasyonu
await this.dispose({ skipLeaveTransition: true });  // animasyonsuz
await this.dispose({ deep: false });                // çocuklarda başvuru temizliğini atla
await this.disposeAsync();                          // çocuk bertarafı: çıkış geçişi oynatılmaz, süren animasyonlar durdurulur
```

`deep` (varsayılan `true`) çocuk bileşenlerde başvuru temizliğini (`element`, `props`, `childs`, olay haritaları) de yapar; kök bileşen her zaman temizlenir. `disposeAsync`, çerçevenin bir ebeveyn bertaraf edilirken çocuklar için kullandığı yoldur; dışarıdan çağrılırsa bileşen çıkış geçişi beklemeden söner. Süren bir bertaraf varken ikinci `dispose`/`disposeAsync` çağrısı yenisini başlatmaz, aynı Promise'i döndürür.

`controls.remove(child)` veya `controls.clear()` da ilgili çocukları dispose eder. Bertaraf detayları ve bellek yönetimi için [Bellek Yönetimi ve Dispose](./memory-and-dispose.md).

## Tam örnek: veri yaşam döngüsü {#full-example}

```tsx file=src/UserProfile.tsx variant=class
import { Component, reactive } from "@motifx/core";

export class UserProfile extends Component<HTMLDivElement, { id: number }> {
  state = reactive({ user: null as any, loading: true });

  constructor(props: { id: number }) { super('div', props); }

  async onConfig() {
    this.state.loading = true;
    this.state.user = await fetchUser(this.props.id);
    this.state.loading = false;
  }

  onDisposing() {
    // gerekirse el ile temizlik (abonelikler, zamanlayıcılar)
  }

  view() {
    return <div>
      {() => this.state.loading
        ? <Spinner />
        : <div>{this.state.user.name}</div>}
    </div>;
  }
}
```
```tsx file=src/UserProfile.tsx variant=function
import { reactive } from "@motifx/core";

export function UserProfile(props: { id: number }) {
  const state = reactive({ user: null as any, loading: true });

  return (
    <div
      onconfig={async () => {
        state.loading = true;
        state.user = await fetchUser(props.id);
        state.loading = false;
      }}
      ondisposing={() => { /* gerekirse el ile temizlik */ }}
    >
      {() => state.loading
        ? <Spinner />
        : <div>{state.user.name}</div>}
    </div>
  );
}
```
```tsx file=src/UserProfile.tsx variant=options
import { reactive } from "@motifx/core";

export const UserProfile = () => ({
  el: 'div',
  data: reactive({ user: null as any, loading: true }),

  async onConfigured() {
    this.data.loading = true;
    this.data.user = await fetchUser(this.props.id);
    this.data.loading = false;
  },

  onDisposing() {
    // gerekirse el ile temizlik (abonelikler, zamanlayıcılar)
  },

  view() {
    return <div>
      {() => this.data.loading
        ? <Spinner />
        : <div>{this.data.user.name}</div>}
    </div>;
  },
});
```

## Uygulama yaşam döngüsü — `app.onLifecycle` {#app-lifecycle}

Bileşen kancalarından ayrı olarak, uygulamanın bütünü için de bir yaşam döngüsü vardır: sekme arka plana alınır, mobil işletim sistemi sayfayı dondurur, bağlantı kopar. Yoklama, websocket ve zamanlayıcıları duraklatıp sürdürmek, dönüşte bayat veriyi yenilemek için:

```tsx
const off = app.onLifecycle(({ state, visible, online }) => {
  switch (state) {
    case 'hidden':   poller.pause(); break;          // sekme/uygulama arka planda
    case 'visible':  poller.resume(); break;
    case 'frozen':   socket.close(); break;          // tarayıcı sayfayı dondurdu
    case 'resumed':  socket.open(); break;
    case 'restored': store.refresh(); break;         // geri/ileri önbelleğinden (bfcache) döndü
    case 'offline':  banner.show(); break;
    case 'online':   banner.hide(); queue.flush(); break;
  }
});
off(); // abonelikten çık
```

`app.isVisible` ve `app.isOnline` anlık durumu verir. Tarayıcı dinleyicileri yalnızca ilk abonelikte kurulur (kullanılmıyorsa maliyeti sıfırdır) ve `app.dispose()` ile kaldırılır. Abonelik bir bileşenin ömrüne bağlı değildir; bileşen içinden açıyorsanız `off`'u `this.motif.setDisposable(off)` ile kaydedin.

## Sonraki adım {#next}

Sayfalar arası yönlendirmeyi öğrenmek için [Routing](./routing.md) bölümüne geçin.
