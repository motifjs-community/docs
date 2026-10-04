---
slug: components
title: Bileşenler
description: Class, Function ve Options API bileşenleri; kök eleman, props, childs, controls, Transport ve ref.
category: core
order: 1
---

MotifJS'te bir bileşen, bir DOM elemanını ve onun alt kontrollerini (`controls`) yöneten bir nesnedir. Her bileşen `ComponentBase`'ten türer; günlük kullanımda somut `Component` sınıfını veya JSX'i kullanırsınız.

Bileşen yazmanın **üç stili** vardır: sınıf, fonksiyon ve Options API. Üçü de aynı çekirdeğe derlenir; birini seçmek tercihe bağlıdır.

## 1. Sınıf bileşenleri {#class-components}

En açık ve en yetenekli stildir. `Component`'ten türetir, `view()` metodunda şablonu döndürürsünüz.

```tsx file=src/Counter.tsx
import { Component, reactive } from '@motifx/core';

export default class Counter extends Component {
  state = reactive({ count: 0 });

  constructor() {
    super('div');           // kök eleman etiketi
  }

  increment = () => this.state.count++;

  view() {
    return (
      <div class="counter">
        <span>Değer: {this.state.count}</span>
        <button onclick={this.increment}>Artır</button>
      </div>
    );
  }
}
```

### Kök eleman {#root-element}

`super(...)`'a geçtiğiniz değer bileşenin **kök elemanını** belirler:

- `super('div')` → bir `<div>` kök elemanı oluşturur. SVG elemanı için `super('svg', { options: { isSvg: true } })` yazılır; eleman SVG ad alanında üretilir.
- `super(node)` → elinizdeki bir DOM düğümü (`document.createElement('canvas')`, sayfadaki mevcut bir eleman) kök olur; bileşen onu yaratmaz, sahiplenir (bkz. [Üçüncü parti sarmalama](./wrapping-libraries.md)).
- Argüman vermezseniz (`super()`), kök bir **fragment** (yorum düğümü) olur; `view()`'in döndürdüğü içerik bu fragmentin altına yerleşir. Fragment kökte `props` ilk argüman olarak da verilebilir: `super(props)` ile `super(undefined, props)` aynıdır.
- `Component<HTMLDivElement>` gibi bir eleman generic'i verdiyseniz `@motifx/compiler` sınıfa `static elementTag = 'div'` ekler; bu durumda `super()` fragment değil, o türde gerçek bir eleman üretir (bkz. [Kök element](./wrapping-libraries.md#root-element)). `Component<SVGSVGElement>` gibi SVG generic'lerinde derleyici ayrıca `static elementNamespace = 'http://www.w3.org/2000/svg'` ekler; eleman SVG ad alanında üretilir. İki statik alanı elle de yazabilirsiniz; yazılmışsa derleyici dokunmaz.

Yapıcıya hazır bir bileşen örneği verilirse (`new Component(örnek)`) yeni bileşen oluşturulmaz, o örnek döner.

`view()` içinde `<div class="counter">...</div>` gibi bir sarmalayıcı döndürüyorsanız, çoğu zaman kök elemanı önemsizdir; `super()` (fragment) yeterlidir. Kök elemana doğrudan öznitelik/olay bağlamak istiyorsanız somut bir etiket verin (`super('div')`).

### `view()` mi, yoksa doğrudan `controls` mü? {#view-or-controls}

İki yol vardır:

- **`view()` döndür:** Bildirimsel (declarative). Bileşen build edilirken `view()` bir kez çağrılır ve sonucu alt kontrol olarak eklenir. En yaygın yaklaşımdır.
- **`controls.add(...)` çağır:** Zorunlu (imperative). Herhangi bir anda DOM'a eleman ekler. Render döngüsü olmadığı için ekleme anında gerçekleşir.

```tsx file=src/Live.tsx variant=class
import { Component } from '@motifx/core';

export class Live extends Component<HTMLDivElement> {
  onBuilt() {
    // İstediğiniz anda DOM'a doğrudan ekleyin — yeniden render yok
    this.controls.add(<div>Sonradan eklendi</div>);
  }
}
```
```tsx file=src/Live.tsx variant=function
export function Live() {
  return <div onbuilt={(component) => {
    component.controls.add(<div>Sonradan eklendi</div>);
  }} />;
}
```
```tsx file=src/Live.tsx variant=options
export const Live = () => ({
  el: 'div',

  onBuilt() {
    this.controls.add(<div>Sonradan eklendi</div>);
  },
});
```

## 2. Fonksiyon bileşenleri {#function-components}

Bir fonksiyon, JSX döndürür. State ve olay yakalayıcıları closure ile tutulur.

```tsx file=src/Greeting.tsx
import { reactive } from '@motifx/core';

export default function Greeting(props: { name: string }) {
  const state = reactive({ likes: 0 });

  return (
    <div class="greeting">
      <h2>Merhaba {props.name}</h2>
      <button onclick={() => state.likes++}>
        Beğen ({state.likes})
      </button>
    </div>
  );
}
```

Fonksiyon bileşenleri JSX'te sınıflarla birebir aynı şekilde kullanılır:

```tsx
<Greeting name="Ada" />
```

### Yaşam döngüsüne bağlanma {#function-lifecycle}

Fonksiyon bileşenlerinde yaşam döngüsü kancalarına, döndürülen kök elemana **prop** olarak bağlanabilirsiniz (bkz. [Yaşam Döngüsü](./lifecycle.md)):

```tsx file=src/Panel.tsx
export default function Panel() {
  return (
    <div
      onconfig={(s) => console.log('yapılandırılıyor')}
      onbuilt={(s) => console.log('inşa edildi')}
    >
      İçerik
    </div>
  );
}
```

### Etikete yazılan direktifler ve kancalar {#function-tag-directives}

Fonksiyon bileşeninin **etiketine** yazdığınız çerçeve prop'ları — `x-display`, `x-wait` gibi
direktifler, `onconfig`/`onbuilt`/`x-mounted`/`x-initializing` gibi yaşam döngüsü kancaları (her yazımıyla),
`initializeComponent` ve `ref` — fonksiyonun döndürdüğü köke uygulanır (`ref` fonksiyona giden `props`'ta yer almaz):

```tsx
<InfoBar x-display={() => this.state.status === 'error'} title="Sunucu hatası" />
```

Fonksiyonun bunun için hiçbir şey yapması gerekmez: ne prop tipinde `runover` bildirmek, ne de
prop'ları köküne aktarmak. (Fonksiyon prop'ları köküne zaten aktarıyorsa — `motifComponent('div', props)`
— çerçeve prop'ları ikinci kez uygulanmaz.) Sınıf bileşenlerinde aynı prop'lar yapıcıya geçer.

## 3. Options API bileşenleri {#options-components}

Vue'nun Options API'sini andıran bir nesne döndürürsünüz: `el`, `data`, `view` ve isteğe bağlı `ctor`. Bu nesne, JSX içinde bir bileşen gibi kullanılabilir.

```tsx file=src/MessageBox.tsx
import { reactive } from '@motifx/core';

export const MessageBox = () => ({
  el: 'div',
  data: reactive({ message: 'Merhaba' }),
  view() {
    return (
      <div class="msg" onclick={() => { this.data.message = 'Tıklandı!'; }}>
        {this.data.message}
      </div>
    );
  },
  ctor(props) {
    if (props?.greeting) this.data.message = props.greeting;
  },
});
```

```tsx
<MessageBox greeting="Selam" />
```

Nesnenin `el` dışındaki tüm alanları bileşene kopyalanır; `ctor` kopyalanmaz, bileşen oluşturulduktan hemen sonra (`build()`/`view()`'den önce) **bir kez** çağrılır: `this` bileşendir, tek argümanı etikete yazılan `props`'tur. İçinde fırlatılan hata bileşen oluşturmayı bozmaz, merkezî hata yöneticisine `MJX122` olarak raporlanır. Etikete yazılan `props` ayrıca `this.props` olarak da erişilebilir. `el` bir etiket adı (`'div'`), bir DOM düğümü ya da başka bir bileşen (sınıf, fonksiyon, Options nesnesi) olabilir; bileşen verilirse onun kökü kullanılır.

Nesnedeki `get` erişimcileri kopyalama sırasında bir kez değerlenir ve sonucu düz değer olarak kopyalanır; türetilmiş değer için metot yazın (`visible() { … }`). Nesneye yazılan yaşam döngüsü metotlarından `onConfigured`, `onBuilding`, `initializeComponent`, `onBuilt`, `onMounted`, `onVisibilityChanged`, `onActivated`, `onDeactivated`, `onDisposing`, `onDisposed` çalışır. `onInitializing`, `onInitialized` ve `onConfig` ise çalışmaz: bu üç evre `el` elemanı yaratılırken, alanlar nesneden kopyalanmadan önce biter. Kurulum kodunu `ctor` ya da `onConfigured` içine yazın; etikete yazılan `onconfig={…}` prop'u ise yapıcıya ulaştığı için çalışır.

## `props` ve bileşenler arası veri akışı {#props}

JSX'te bir bileşene verdiğiniz öznitelikler `props` olur:

```tsx
<UserCard userId={42} highlighted />
```

Sınıf bileşeninde `props`'a `this.props` üzerinden erişilir; tip parametresiyle şekli belirtebilirsiniz. Fonksiyonda tek argüman, Options API'de `this.props`/`ctor(props)`:

```tsx file=src/UserCard.tsx variant=class
import { Component } from '@motifx/core';

interface UserCardProps { userId: number; highlighted?: boolean; }

export class UserCard extends Component<HTMLDivElement, UserCardProps> {
  constructor(props: UserCardProps) {
    super('div', props);
  }
  view() {
    return <div class={this.props.highlighted ? 'card active' : 'card'}>
      Kullanıcı #{this.props.userId}
    </div>;
  }
}
```
```tsx file=src/UserCard.tsx variant=function
interface UserCardProps { userId: number; highlighted?: boolean; }

export function UserCard(props: UserCardProps) {
  return <div class={props.highlighted ? 'card active' : 'card'}>
    Kullanıcı #{props.userId}
  </div>;
}
```
```tsx file=src/UserCard.tsx variant=options
interface UserCardProps { userId: number; highlighted?: boolean; }

export const UserCard = () => ({
  el: 'div',
  view() {
    const props = this.props as UserCardProps;
    return <div class={props.highlighted ? 'card active' : 'card'}>
      Kullanıcı #{props.userId}
    </div>;
  },
});
```

> Not: Yaşam döngüsü prop'ları (`onconfig`, `onbuilt`, `onmounted`… ve `x-` biçimleri) ile `initializeComponent` kanca olarak kaydedilir ve `props` sözlüğünden ayıklanır. `ref` de bileşene uygulanır ve `this.props`'ta yer almaz. Bileşen etiketinde bilinen bir DOM olay adı (`onclick`, `onChange`, `oninput:once`) kök elemana dinleyici olarak bağlanır ve `props`'a hiç ulaşmaz. Bunların dışındaki `on...` prop'ları (`onSave`, `onValueChange`) sıradan geri çağrı prop'udur, `this.props` içinde kalır.

## Çocuk bileşenler (`childs`) {#childs}

Bir bileşenin açılış ve kapanış etiketi arasına yazdığınız JSX içeriği, o bileşene `childs`
olarak ulaşır (`ComponentBase[]`). Bunu şablonun istediğiniz yerine `{this.childs}` / `{props.childs}` ile
yerleştirirsiniz — React'teki `props.children` yansıtmasının karşılığıdır:

```tsx file=src/Panel.tsx variant=class
import { Component } from '@motifx/core';

export class Panel extends Component<HTMLDivElement, { baslik: string }> {
  view() {
    return <div class="panel">
      <h3>{this.props.baslik}</h3>
      <div class="body">{this.childs}</div>
    </div>;
  }
}
```
```tsx file=src/Panel.tsx variant=function
export function Panel(props: { baslik: string }) {
  return <div class="panel">
    <h3>{props.baslik}</h3>
    <div class="body">{props.childs}</div>
  </div>;
}
```
```tsx file=src/Panel.tsx variant=options
export const Panel = () => ({
  el: 'div',
  view() {
    return <div class="panel">
      <h3>{this.props.baslik}</h3>
      <div class="body">{this.childs}</div>
    </div>;
  },
});
```

```tsx
<Panel baslik="Ayarlar">
  <p>İçerik buraya gelir.</p>
</Panel>
```

`childs` derleyici için rezerve bir isimdir: `{this.childs}`, `{props.childs}` ve `{childs}`
biçimlerinin hepsi metin değil **içerik yerleştirme** olarak derlenir (`controls.add`). Aynı şey
elinizdeki bileşen dizisi için de geçerlidir: `{[kartA, kartB]}`.

Birkaç ayrıntı:

- Yerleştirme **statiktir**: `childs` kurulum sırasında bir kez gelir. İçeriğin sonradan değişmesi
  gerekiyorsa `{() => this.childs}` yazın; bu bir `Frame` üretir ve içerik değiştiğinde yenilenir.
- Yapıcı bir eleman almadığında (fragment kök ya da `Component<HTMLDivElement>` / `static elementTag`
  ile bildirilen eleman) `childs` köke otomatik eklenir; `view()` içinde `{this.childs}` ile
  yerleştirirseniz oraya taşınır. `super('div', props)` gibi somut etiket verilen sınıflarda
  yerleştirmeyi siz yaparsınız.
- İmperatif karşılığı: `this.controls.add(...this.childs)`.
- Yalnızca birebir `childs` özeldir; `this.childsCount` gibi isimler normal metin bağlaması olur.

## `controls` — alt kontrol koleksiyonu {#controls}

Her bileşenin bir `controls` koleksiyonu vardır. Bu, bileşenin çocuklarını yöneten canlı bir listedir:

```ts
this.controls.add(child, other);       // sona ekle (anında DOM'a yansır); eklenenleri dizi olarak döndürür
this.controls.add(2, child);           // verilen dizine ekle
this.controls.insert(2, child, other); // add(index, ...) ile aynı
this.controls.remove(child);           // çocuğu kaldır ve dispose et
await this.controls.detach(child);     // çıkış geçişini oynat, DOM'dan sök; dispose ETME
this.controls.clear();                 // tüm çocukları dispose et
await this.controls.clearAsync();      // aynı; bütün bertaraflar bitince çözülür
this.controls.move(child, before);     // çocuğu `before`'un önüne taşı (before yoksa sona)
this.controls.moveToIndex(child, 0);   // çocuğu verilen dizine taşı
this.controls.forEach(fn);             // çocuklar üzerinde dolaş
this.controls.map(fn);                 // eşleyip dizi döndür
this.controls.items;                   // çocuk dizisi
this.controls.length;                  // çocuk sayısı
```

- `add`/`insert` düz değer de kabul eder: string, sayı, boolean ve bigint birer metin düğümüne sarılır. Zaten bir ebeveyni olan çocuk önce oradan ayrılır (`detach`), sonra eklenir. Bertaraf edilmiş çocuk eklenmez.
- `add` çağrıldığı anda, bileşen zaten DOM'a bağlıysa çocuk da anında ilgili konuma yerleştirilir. Bir render/flush beklemek gerekmez. Bileşen `isWait` ile bekletiliyorsa çocuk kaydedilir, bekletme kalkınca kurulur.
- `detach` çocuğu ağaçtan ve DOM'dan çıkarır ama bertaraf etmez; başka bir yere `add` ile yeniden eklenebilir. `remove` ve `clear` ise bertaraf eder.
- `move` yalnız aynı ebeveynin çocukları arasında çalışır; DOM'da da aynı sıraya taşır (fragment köklü çocuklar aralığıyla birlikte). Yer değişmiyorsa hiçbir şey yapmaz.
- `onAdd`/`onRemove`/`onAddBeforeBuild` geri çağrıları çerçevenindir; elle atanmaz. Çocuk eklenip çıkarıldığını dinlemek için `motif.on('controladded', fn)` / `motif.on('controlremoved', fn)` kullanın (`e.control` eklenen/çıkarılan bileşendir).

## İçeriği başka bir yere taşımak {#transport}

Bir bileşenin içeriğini kendi ağacının dışında göstermek için iki yerleşik bileşen çifti vardır; ikisi de kendi sayfasında anlatılır:

- [Transport ve TransportTo](./transport.md) — tek bir gönderenin içeriğini adlandırılmış bir yuvada gösterir (`mode: 'replace' | 'merge'`); programatik taşıma için `Transporter` yardımcısı da oradadır.
- [ContentBody ve ContentBlock](./content-body.md) — birden çok bloğun parçalarını tek bir gövdede biriktirir.

## Bileşen içinde eleman erişimi (`element` ve `ref`) {#element-and-ref}

Her bileşenin gerçek DOM düğümüne `this.element` ile erişebilirsiniz. Ayrıca JSX'te `ref` (ya da `x-ref`) ile bir etiketin bileşen örneğini bir değişkene yakalayabilirsiniz:

```tsx file=src/Form.tsx variant=class
import { Component } from '@motifx/core';

export class Form extends Component {
  input!: Component;
  label!: Component;

  view() {
    return (
      <div>
        <input ref={this.input} type="text" />
        <label ref={(s) => this.label = s}>Ad</label>
        <button onclick={() => (this.input.element as HTMLInputElement).focus()}>
          Odakla
        </button>
      </div>
    );
  }
}
```
```tsx file=src/Form.tsx variant=function
import { Component } from '@motifx/core';

export function Form() {
  let input: Component;
  let label: Component;

  return (
    <div>
      <input ref={input} type="text" />
      <label ref={(s) => label = s}>Ad</label>
      <button onclick={() => (input.element as HTMLInputElement).focus()}>
        Odakla
      </button>
    </div>
  );
}
```
```tsx file=src/Form.tsx variant=options
import { Component } from '@motifx/core';

export const Form = () => ({
  el: 'div',
  input: null as Component | null,
  label: null as Component | null,

  view() {
    return (
      <div>
        <input ref={this.input} type="text" />
        <label ref={(s) => this.label = s}>Ad</label>
        <button onclick={() => (this.input!.element as HTMLInputElement).focus()}>
          Odakla
        </button>
      </div>
    );
  },
});
```

- `ref={(s) => ...}` — geri çağırım biçimi; `s` etiketin bileşenidir (düz DOM etiketinde elemanı saran `Component`, bileşen etiketinde bileşen örneği, fonksiyon bileşeninde döndürülen kök).
- `ref={this.x}` / `ref={ad}` — derleyici hedefi çözer. Hedef bir metot, fonksiyon değerli alan ya da yerel fonksiyonsa etiketin bileşeniyle **çağrılır**. Bildirilmiş bir alan (değersiz ya da düz değerli) ya da başlangıç değeri olmayan bir değişkense bileşen ona **atanır**. Derleme anında belirlenemeyen hedeflerde (bildirilmemiş ya da üst sınıftan gelen üye, import, parametre, `props.x`, fonksiyon tipli alan, getter) karar çalışma anında verilir: değer fonksiyonsa çağrılır, değilse atanır.
- İki biçim de düz DOM etiketinde ve bileşen etiketinde aynı anlamdadır; `x-ref` (ve `x:ref`) `ref` ile aynıdır.
- `ref`, etiketin bileşeni kurulurken (`build()`'den önce) tam bir kez çağrılır ve DOM'a öznitelik olarak yazılmaz.
- Aynı etikette `ref` ile `x-ref` birlikte yazılırsa ikisi de kaynaktaki sırayla birer kez çalışır.
- `ref` bir prop değildir, yalnız verildiği bileşende çalışır: sınıf bileşeninde bileşenin kendisine, fonksiyon bileşeninde döndürülen köke uygulanır. Fonksiyona giden `props`'ta ve `this.props`'ta yer almaz; bu yüzden `{...props}` / `{...this.props}` ile yaymak onu içteki bir bileşene taşımaz.
- JSX olmadan kurarken de aynıdır: `new Kart({ ref: (c) => ... })` bileşenin kendisine uygulanır ve `this.props`'ta kalmaz. `ref` prop nesnesinde ya da `runover` içinde (`{ runover: { ref } }`) verilebilir; ikisi de yalnız o bileşene uygulanır.
- Kural basittir: `ref` bir fonksiyonsa bileşenle **çağrılır** ve prop'tan çıkarılır; bir nesneyse bileşen o alana **atanır** (`props.ref` ya da `runover.ref`). `const p = { ref: {} }; const k = new Kart(p);` sonrasında `p.ref === k` olur.
- `element` mount'tan önce bile mevcuttur.

İçteki bir öğeyi dışarıya açmak için ayrı bir prop adı kullanın (ör. `inputRef`) ve içteki etiketin `ref`'inden onu çağırın:

```tsx file=src/SearchBox.tsx
import { Component } from '@motifx/core';

export function SearchBox(props: { inputRef?: (c: Component) => void; placeholder?: string }) {
  return (
    <div class="search">
      <input ref={(c) => props.inputRef?.(c)} placeholder={props.placeholder} />
    </div>
  );
}
```

```tsx file=src/Toolbar.tsx
import { Component } from '@motifx/core';
import { SearchBox } from './SearchBox';

export class Toolbar extends Component {
  search!: Component;
  box!: Component;

  view() {
    return <SearchBox ref={this.box} inputRef={(c) => this.search = c} placeholder="Ara" />;
  }
}
```

Burada `this.box` fonksiyonun döndürdüğü kök `div`'i, `this.search` içteki `input`'u alır. `ref={props.inputRef}` yazımı da çalışır: değer bir fonksiyonsa içteki bileşenle çağrılır.

### `onRefCreated` — ref'lerin ortak kancası {#on-ref-created}

Sınıf bileşeni `onRefCreated(sender)` metodunu tanımlarsa, `view()` içindeki her `ref={this.x}` / `ref={ad}` hedefine uygulandıktan hemen sonra bu metot çağrılır. `sender` ref verilen etiketin bileşenidir; hedef alan o anda atanmış, hedef metot çağrılmış olur. Geri çağırım biçimindeki `ref={(s) => ...}` için çağrılmaz.

```tsx file=src/Form.tsx
import { Component } from '@motifx/core';

export class Form extends Component {
  name!: Component;
  email!: Component;
  fields: Component[] = [];

  view() {
    return (
      <div>
        <input ref={this.name} />
        <input ref={this.email} />
      </div>
    );
  }

  onRefCreated(sender: Component) {
    this.fields.push(sender);
  }
}
```

Ref'ler etiketlerin bileşenleri kurulurken kaynaktaki sırayla uygulanır; `onRefCreated` her birinden sonra bir kez çalışır. Kanca, JSX'i yazan sınıfın (`view()`'ın `this`'i) üyesidir; ref verilen bileşenin değil. Sınıfın metotlarında ve alanlarındaki (ok fonksiyonları dahil) JSX için çağrılır; fonksiyon bileşenlerinde, modül düzeyindeki JSX'te ve sınıf metodunun içindeki `function` ifadelerinde çağrılmaz.

## Bağlam (`context`) — uygulamaya erişim {#context}

Her bileşen, ebeveyn zincirini tırmanarak uygulamaya `this.context` ile ulaşır. `context`, çalışan `Application` örneğidir:

```tsx
// programatik yönlendirme
this.context.navigate('/docs');

// uygulama genelinde olay dinleme/tetikleme
this.context.on('languageChanged', () => this.setState());
this.context.fire('languageChanged');
```

`this.context` üzerinden açılan `on`/`onRouterChanged` abonelikleri bileşenin ömrüne bağlıdır; bileşen bertaraf edilince kendiliğinden kalkar. `onLifecycle` için bu geçerli değildir; dönen iptal fonksiyonunu `this.motif.setDisposable(off)` ile bileşene bağlayın.

Uygulama olayları hakkında ayrıntı için [Olaylar](./events.md).

## Servislere erişim {#services}

DI ile kayıtlı servislere bileşenden erişmek için `getService` kullanın:

```tsx
const logger = this.getService(LoggerService);
```

Ayrıntı: [Dependency Injection](./dependency-injection.md).

## Sonraki adım {#next}

Şablon dilinin kurallarını öğrenmek için [JSX ve Şablonlar](./jsx.md) bölümüne geçin.
