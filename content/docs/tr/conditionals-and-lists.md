---
slug: conditionals-and-lists
title: Koşullu Gösterim ve Listeler
description: x-wait/x-display, && ve üçlü operatör, .map listeleri, key ve öğe kimliği, switch ve bağ API'si.
category: core
order: 4
---

MotifJS'te koşullu gösterimin birincil yolu `x-wait` direktifidir; liste gösterimi ise JSX içinde `.map` ile yazılır. `@motifx/compiler` derleyicisi bunları uygun reaktif bağlara (`bindings.wait`, `bindings.display`, `bindings.when`, `bindings.ternary`, `bindings.list`, `bindings.switchCase`, `bindings.method`) dönüştürür. Bu bölüm hem JSX yazımını hem de altındaki bağ API'sini anlatır.

## Koşullu gösterim {#conditional}

### `x-wait` — birincil yöntem {#x-wait}

Bir elemanı koşula bağlı göstermenin MotifJS'teki doğal yolu `x-wait` direktifidir. Fonksiyon
`true` döndürdüğü sürece eleman **bekler**, `false` olunca görünür:

```tsx
const state = reactive({ loggedIn: false });

<p x-wait={() => !state.loggedIn}>Hoş geldin!</p>
```

Okunuşu "şu koşul sağlanana kadar bekle"dir. Tersini yazmak isterseniz `x-display` aynı
mekanizmanın ters çevrilmişidir — `true` iken gösterir:

```tsx
<p x-display={() => state.loggedIn}>Hoş geldin!</p>
```

İkisi de her türlü etikette çalışır: düz DOM elemanı, sınıf bileşeni, fonksiyon bileşeni.

### Neden `x-wait`? {#why-x-wait}

- **Tembel kurulum.** Koşul ilk değerlendirmede `true` ise eleman hiç `build()` edilmez. Ne
  kendisi ne de alt ağacı DOM'a girer; yerine bir yer tutucu bırakılır. Açılışta kapalı olan
  ağır bir panelin bedeli sıfırdır.
- **Örnek korunur.** Bir kez kurulduktan sonra açıp kapatmak yalnızca göster/gizle yapar.
  Bileşen dispose edilmez, iç durumu (kaydırma konumu, form girdisi, üçüncü parti eklenti)
  olduğu gibi kalır.
- **Senkron ilk çizim.** İkisi de `build()` döndüğünde yazılıdır. `&&`, ternary ve JSX
  döndüren `{this.parca()}` için de aynısı geçerlidir: boş bir `Frame`'e ilk içerik senkron
  yerleşir. Sonraki dal değişimleri asenkrondur.

Gizlenen eleman iki kipte de DOM'dan çıkar ve alt ağacının bağları askıya alınır; `hideStrategy` farkı belirler: varsayılan `'placeholder'` elemanın yerine bir yorum düğümü bırakır ve gösterirken onunla yer değiştirir; `'detach'` iz bırakmadan söker, gösterirken ebeveyndeki sırasına göre yeniden yerleştirir (liste satırlarında varsayılan budur). Bkz. [Görünürlük](./lifecycle.md#visibility).

### `&&` — kur ve bertaraf et {#logical-and}

`{koşul && <X/>}` de desteklenir ve `sender.bindings.when(condFn, renderFn)` çağrısına derlenir.
Farkı davranışındadır: koşul her doğru olduğunda **yeni bir örnek kurulur**, her yanlış olduğunda
o örnek **dispose edilir**.

Dal yalnızca koşulun **değeri** değiştiğinde yeniden kurulur (`Object.is`; iki yanlış değer aynı
sayılır). Değer aynı kaldıkça dal bileşen örneğini ve durumunu korur: `{state.n > 0 && <X/>}`
`n` 1 → 2 → 3 giderken aynı `X`'i tutar. Koşulun değeri bir nesneyse (`{state.user && <X/>}`)
`state.user` başka bir nesneyle değiştirildiğinde dal yeniden kurulur.

```tsx
<div>
  {state.loggedIn && <p>Hoş geldin!</p>}
</div>
```

Bu yüzden `&&`'yi yalnızca kurulum/bertarafın kendisini istediğinizde seçin: bir üçüncü parti
eklentinin gerçekten yok edilmesi gerekiyorsa, ya da içerik o kadar ağır ki bellekte tutulmaması
gerekiyorsa. Kalan her durumda `x-wait` daha ucuz ve daha öngörülebilirdir.

Koşul **JS truthiness'ine** göre değerlendirilir: `false`, `null`, `undefined`, `0`, `''` ve `NaN`
için içerik çizilmez. Yani `{user && <Profile/>}` (nesne ya da `null`) ve `{items.length && <List/>}`
(sayı) beklendiği gibi davranır. Bu kural hem gerçek bir elemanın içinde hem de bir **fragment**
(`<>…</>`) kökünün doğrudan çocuğu olarak geçerlidir.

### Hangisini seçmeli? {#which-one}

| Durum | Yöntem |
|-------|--------|
| Göster/gizle, durum korunmalı | `x-wait` / `x-display` |
| Açılışta kapalı, ağır içerik | `x-wait` (hiç kurulmaz) |
| Her kapanışta gerçekten dispose edilmeli | `{koşul && <X/>}` |
| İki daldan biri | üçlü operatör |
| Yalnızca metin değişiyor | getter |

### Üçlü operatör — iki daldan biri {#ternary}

```tsx
<div>
  {state.loading
    ? <Spinner />
    : <Content data={state.data} />}
</div>
```

Bu `sender.bindings.ternary(...)` olarak derlenir. Koşul değiştikçe uygun dal gösterilir, diğeri
dispose edilir. İki dal da hafifse bu en okunaklı biçimdir; ağırsa iki elemanı `x-wait` /
`x-display` ile yan yana koymak örnekleri korur.

Dal yalnızca koşulun değeri değiştiğinde (`Object.is`) yeniden kurulur; iç içe ternary'de de iç
dal, dış koşulun değeri aynı kaldıkça korunur. `{state.n > 0 ? <X/> : <Y/>}` `n` 1 → 2 giderken
`X`'i yeniden kurmaz.

### Dal içindeki bileşen prop'ları {#branch-props}

Dal içinde bileşene düz ifadeyle verilen prop, koşulun dışında olduğu gibi **dalın kurulduğu
andaki değerdir**. `<Badge count={state.n} />` `state.n`'e sonradan yazılan değeri,
`<Content data={state.data} />` `state.data`'ya sonradan atanan yeni nesneyi görmez; dal koşulun
değeri değişmedikçe yeniden kurulmaz. Prop'un canlı kalması için getter geçin ve alıcıda
`Bind<T>` sözleşmesiyle okuyun (bkz. [Özniteliklerde ternary](./jsx.md#attribute-ternary)):

```tsx
<Badge count={() => state.n} />

interface BadgeProps { count: Bind<number>; }
// Badge içinde: <span>{() => read(this.props.count)}</span>
```

### Getter içinde koşullu metin {#conditional-text}

Basit metin için getter yeterlidir, eleman bile değişmez:

```tsx
<span>{() => state.completed ? '✅' : '❌'}</span>
```

## Liste gösterimi — `.map` {#lists}

Bir diziyi `.map` ile öğelere dönüştürmek, reaktif bir **liste bağı** kurar:

```tsx
const state = reactive({
  todos: [
    { id: 1, title: "Alışveriş", done: false },
    { id: 2, title: "Spor", done: true },
  ],
});

<ul>
  {state.todos.map(todo => (
    <li key={todo.id}>
      {todo.title}
    </li>
  ))}
</ul>
```

Bu `sender.bindings.list(itemsFn, renderFn)` olarak derlenir. Dizi değiştiğinde (ekleme, çıkarma, sıralama), MotifJS **yalnızca farkı** DOM'a uygular — tüm listeyi yeniden oluşturmaz.

### `key` ve öğe kimliği {#key-and-identity}

Satırlar **öğe nesnesinin kimliğiyle** eşleşir: yeni dizide aynı nesne (reaktif proxy'nin ham nesnesi) yine yer alıyorsa satırı yeniden kullanılır ve gerekirse DOM'da taşınır; dizide bulunmayan nesnenin satırı dispose edilir. Diziye yeni nesneler konursa (ör. sunucudan gelen taze liste) aynı `id`'yi taşısalar bile satırlar yeniden kurulur. Aynı nesne dizide birden çok kez bulunabilir (`push(items[0])`, `splice(i, 0, items[j])`); her geçiş kendi satırını alır ve hepsi aynı nesneyi gösterir, nesnedeki değişiklik hepsine yansır. Dizi metotları öğeyi kopyalamaz; bağımsız bir kopya gerekiyorsa açıkça kopyalayın: `items.splice(i, 0, { ...items[j] })`. İlkel değerli dizilerde (`string[]`) aynı sıradaki aynı değer satırını korur; şablon fonksiyonu ikinci argümanı (`index`) almıyorsa yer değiştiren aynı değer de satırını korur.

`key` bu eşleşmeye katılmaz ve DOM'un yeniden kullanımını değiştirmez; öğeyi tanımlar. Yine de kararlı, benzersiz bir değer verin (genelde `item.id`): aynı `key` iki öğede görülürse geliştirme modunda `MJX202` uyarısı verilir, `key` yazılmamış `.map` için derleyici `MJX003` uyarır. `x-key` ve `indexkey` adları `key` ile aynıdır.

### Öğe içi reaktivite {#item-reactivity}

Liste öğeleri de reaktiftir. Bir öğe alanı değiştiğinde yalnızca o öğenin ilgili düğümü güncellenir:

```tsx
{state.todos.map(todo => (
  <li key={todo.id}>
    <input
      type="checkbox"
      checked={() => todo.done}
      onchange={(e) => todo.done = e.target.checked}
    />
    <span class={() => todo.done ? 'done' : ''}>{todo.title}</span>
  </li>
))}
```

`.map`'in ikinci argümanı JS'teki gibi çalışır: `items.map(function (i) { … }, ctx)` içinde `this`, `ctx`'tir. Ok fonksiyonu kendi `this`'ini korur.

### Filtreleme {#filtering}

`.filter().map()` zinciri desteklenir; koşul reaktif kaynaklara bağlıysa filtre de reaktif olur:

```tsx
<ul>
  {state.todos.filter(t => !t.done).map(t => <li key={t.id}>{t.title}</li>)}
</ul>
```

## `switch` benzeri çoklu dal {#switch}

Bir ayırıcı değere göre farklı içerikler göstermek için `switchCase` bağı vardır (derleyici `switch` yapısını buna çevirir):

```ts
this.bindings.switchCase(
  () => state.status,               // ayırıcı
  {
    loading: (frame) => frame.navigate(<Spinner />),
    ready:   (frame) => frame.navigate(<Content />),
    error:   (frame) => frame.navigate(<ErrorView />),
  },
  (frame) => frame.navigate(<Empty />) // varsayılan (opsiyonel)
);
```

Her dal bir `Frame` alır; `frame.navigate(...)` ile o dalın içeriğini yerleştirirsiniz. Ayırıcının değeri `String(...)` ile anahtara çevrilir; aynı değer art arda gelirse dal yeniden kurulmaz.

JSX'te bu, blok gövdeli bir getter içindeki `switch` ile yazılır; derleyici her `case`'in `return` ettiği dalı `switchCase`'e çevirir:

```tsx
<div>
  {() => {
    switch (state.status) {
      case 'loading': return <Spinner />;
      case 'ready':   return <Content />;
      case 'error':   return <ErrorView />;
      default:        return <Empty />;
    }
  }}
</div>
```

`case` etiketleri dizge, sayı ya da boolean **literal** olmalıdır; değişken ya da ifade olan `case`'ler dönüşümde atlanır. `return`'süz bir dal boş içerik yerleştirir.

## Bağ API'sini doğrudan kullanmak {#binding-api}

JSX yerine zorunlu (imperative) kod yazmak isterseniz, `this.bindings` üzerindeki metotları doğrudan çağırabilirsiniz. JSX derleyicisi de zaten bunları üretir: JSX bu çağrıların **kısa yazımıdır** ve aynı API saf TS ile de yazılabilir. Hangi JSX biçiminin hangi çağrıya indiğini tahmin etmek yerine yazdırın: `npx motif-explain dosya.tsx` (bkz. [Bu ifade neye derlendi?](./jsx.md#explain)).

| Metot | İşlev |
|-------|-------|
| `bindings.add(prop, source, member?, format?, formatInfo?)` | Bir DOM özelliğine/özniteliğine tek yönlü bağ kurar. |
| `bindings.text(fn)` | `textContent`'i reaktif bağlar (`x-text`). |
| `bindings.value(fn)` | `value`'yu reaktif bağlar (`x-value`). |
| `bindings.html(fn)` | `innerHTML`'i reaktif bağlar (`x-html`). |
| `bindings.when(condFn, renderFn)` | Koşullu içerik (`&&`) — koşulun değeri değişip doğru olduğunda yeni örnek. |
| `bindings.ternary(condFn, trueFn, falseFn)` | İki dallı koşul; dal koşulun değeri değişince yeniden kurulur. |
| `bindings.list(itemsFn, renderFn)` | Liste gösterimi (`.map`); satırlar öğe nesnesiyle eşleşir. |
| `bindings.loop(itemsFn, renderFn)` | `list` ile aynı; alternatif ad. |
| `bindings.switchCase(discFn, cases, defaultFn?)` | Çoklu dal. |
| `bindings.method(fn)` | Reaktif metin veya reaktif tek-içerik; `fn` her çalışmada bir kez çağrılır. Dizge, sayı, boolean ve bigint metin olarak yazılır; bileşen bir `Frame`'e yerleşir. Sonuç metin ile bileşen arasında değişebilir, yeni içerik aynı yerde çizilir. Bileşen yerine `null`/`undefined` gelirse yer boşalır ve önceki bileşen dispose edilir; sonra gelen bileşen yeri yeniden doldurur. |
| `bindings.watch(fn)` | Yan etki izleyici (`x-watch`; dispose'da otomatik durur). |
| `bindings.model(source, member?, format?, formatInfo?)` / `bindings.model(getter, setter)` | İki yönlü bağ (bkz. [Formlar](./forms.md)). |
| `bindings.wait(fn)` / `bindings.display(fn)` | Bekletme / görünürlük (`x-wait` / `x-display`) — örnek korunur. |
| `bindings.remove(binding)` | Bir bağı koleksiyondan çıkarır ve devre dışı bırakır; `add`/`list`/`wait`… çağrılarının döndürdüğü `IBaseBinding` ile. |

### `bindings.add` örneği {#bindings-add}

```tsx
<input
  type="checkbox"
  onconfig={(s) => {
    // 'checked' DOM özelliğini, todo.completed alanına bağla
    s.bindings.add('checked', todo, 'completed');
  }}
/>
```

`bindings.add` imzaları:

```ts
add(propertyName: string, dataSource: any): IBaseBinding;
add(propertyName: string, dataSource: any, dataMember: string): IBaseBinding;
add(propertyName: string, dataSource: any, dataMember: string, formatString: string): IBaseBinding;
add(propertyName: string, dataSource: any, dataMember: string, formatString: string, formatInfo: { locale?: string | string[]; currency?: string }): IBaseBinding;
add(binding: IBaseBinding): IBaseBinding;
```

`dataSource` tek başına bir getter da olabilir (`add('textContent', () => state.ad)`); `dataMember` verildiğinde o alan okunur. `formatString` kodları: sayılarda `C` para, `P` yüzde, `N`/`N2` sabit ondalık (varsayılan 2); `Date` değerlerinde `d` tarih, `t` saat. Yerel ayar ve para birimi `formatInfo`'dan gelir: `bindings.add('textContent', state, 'fiyat', 'C', { locale: 'en-US', currency: 'USD' })` → `$1,234.50`. `locale` verilmezse çalışma ortamının varsayılan yerel ayarı kullanılır; `currency` verilmezse `C` tutarı iki ondalıkla, simgesiz yazar.

### `bindings.list` örneği {#bindings-list}

```ts
this.bindings.list(
  () => state.items,                  // öğe kaynağı (fonksiyon; dizi ya da iterable döndürür)
  (item, index) => <li>{item.name}</li> // öğe şablonu
);
```

## Büyük listeler {#large-lists}

Binlerce öğelik listelerde her öğeyi DOM'a koymak yerine **sanal kaydırma** kullanın. MotifJS bunun için `Virtualization` bileşeni sağlar — bkz. [Sanal Listeler](./virtualization.md).

## Sonraki adım {#next}

Olay yönetimini öğrenmek için [Olaylar](./events.md) bölümüne geçin.
