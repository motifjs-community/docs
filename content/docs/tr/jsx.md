---
slug: jsx
title: JSX ve Şablonlar
description: JSX kuralları, reaktif metin ve öznitelikler, spread, class/style, x- direktifleri, derleme zamanı tanıları ve explain.
category: core
order: 2
---

MotifJS'te JSX, çalışma anında bir sanal ağaç üretmez. `@motifx/compiler` derleyicisi JSX'i doğrudan DOM eleman oluşturma ve **reaktif bağ (binding)** kurma çağrılarına dönüştürür. Bu bölüm, JSX içinde ne yazabileceğinizi ve her yazımın nasıl davrandığını anlatır.

## Elemanlar ve iç içe yapı {#elements}

Standart HTML etiketleri doğrudan yazılır:

```tsx
<div class="card">
  <h2>Başlık</h2>
  <p>Paragraf</p>
</div>
```

Bileşenler büyük harfle başlar ve etiket gibi kullanılır:

```tsx
<UserCard userId={1} />
<Greeting name="Ada" />
```

### Fragment {#fragment}

Birden fazla kök eleman döndürmek için fragment kullanın:

```tsx
<>
  <Header />
  <Main />
  <Footer />
</>
```

## Metin ve reaktif ifadeler {#text-and-expressions}

Süslü parantez `{...}` içine ifade yazılır. **İfadenin biçimi, reaktif olup olmadığını belirler:**

### Sabit metin {#static-text}

```tsx
<span>{"Merhaba"}</span>
<span>{someLocalVariable}</span>
```

Bir kez değerlendirilir. `someLocalVariable` reaktif bir modele ait değilse güncellenmez.

### Reaktif model alanı {#reactive-field}

Reaktif bir modelin alanını doğrudan yazarsanız, o alana **tek yönlü bağ** kurulur. Alan değiştiğinde yalnızca ilgili metin düğümü güncellenir:

```tsx
const state = reactive({ name: "Ada" });

<span>{state.name}</span>   // reaktif: state.name değişince metin güncellenir
```

Derleyici bunu `sender.bindings.add("textContent", state, "name")` çağrısına çevirir.

### Getter fonksiyonu ile reaktif ifade {#reactive-getter}

Hesaplanmış/türetilmiş bir değeri reaktif tutmak için ifadeyi bir **ok fonksiyonu** içine alın:

```tsx
<span>{() => state.firstName + " " + state.lastName}</span>
<span>{() => state.count > 0 ? "Var" : "Yok"}</span>
```

Fonksiyon içindeki reaktif okumalar izlenir; bağımlılıklardan biri değişince metin yeniden hesaplanır. Bu, en esnek reaktif metin yazımıdır.

> **Kural:** Bir ifadenin değerinin zamanla değişmesini ve DOM'a yansımasını istiyorsanız ya doğrudan bir reaktif alan (`state.x`) ya da bir getter (`() => ...`) yazın. Düz bir yerel değişken statik kalır.

## Öznitelikler (attributes) {#attributes}

Öznitelikler değer veya değer döndüren fonksiyon alabilir:

```tsx
<input type="text" placeholder="Ara..." />          {/* sabit */}
<a href={state.url}>Bağlantı</a>                     {/* reaktif alan */}
<img src={() => state.avatarUrl} alt="Avatar" />     {/* reaktif getter */}
<button disabled={() => state.isBusy}>Gönder</button>
```

Bir öznitelik değeri bir fonksiyon olduğunda, MotifJS onu reaktif bir öznitelik bağı olarak kurar.

Düz DOM etiketinde literal değerler olduğu gibi `attr.add`'e geçer: sayı, eksi sayı, `true`/`false` ve `null` (dizi ve `new X()` de değer olarak geçer; [eleman metotlarında](#element-methods) argüman olur). `false`, `null` ve `undefined` özniteliği yazmaz (varsa kaldırır); `true` ve değersiz yazım özniteliği boş değerle (`""`) yazar; sayılar dizgeye çevrilir:

```tsx
<button disabled={false} />   {/* disabled yok */}
<button disabled />           {/* disabled="" */}
<div tabindex={0} />          {/* tabindex="0" */}
<div title={null} />          {/* title yok */}
<div hidden={true} />         {/* hidden="" */}
```

`aria-*` ve `data-*` özniteliklerinde boolean değer metin olarak yazılır: `aria-expanded={false}` → `aria-expanded="false"`, `data-on={true}` → `data-on="true"`; `null`/`undefined` yine özniteliği kaldırır.

Değişken okuyan bir ifade (`a + b`, `!state.open`, `state.url`) getter'a sarılır ve canlı kalır: `aria-busy={!state.open}` `state.open` değişince güncellenir. Tek başına bir değişken (`attr={v}`) olduğu gibi geçer; yalnızca fonksiyon tutuyorsa canlıdır. Düz fonksiyon çağrısı (`data-n={fmt(x)}`) bir kez değerlendirilir; canlı kalması için `() => fmt(x)` yazın.

> Güvenlik: etikete yazılan öznitelikler ve `attr.add` değerleri süzmeden yazar. `href`, `src`, `action`, `formaction` gibi URL özniteliklerine kullanıcıdan gelen bir değer bağlanıyorsa `javascript:` ile başlayan bir değer tıklamada kod çalıştırır. Böyle değerleri bağlamadan önce izin verilen şemalara göre denetleyin:
>
> ```tsx
> const safeUrl = (url: string) => /^(https?:|mailto:|\/|#|\.)/i.test(url.trim()) ? url : '#';
> <a href={() => safeUrl(state.profile.website)}>Web sitesi</a>
> ```
>
> `attr.add({ innerHTML })` de `x-html` gibi HTML'i olduğu gibi yazar. Yalnız [spread](#spread) dışarıdan gelen `innerHTML` ve `javascript:` URL'lerini kendiliğinden atlar.

### Eleman metotları {#element-methods}

Düz DOM etiketinde adı bir eleman metoduyla aynı olan prop öznitelik yazmaz, o metodu çağırır. Değer getter (ya da reaktif alan) ise her değişimde yeniden uygulanır:

```tsx
<dialog showModal={() => state.open}>…</dialog>              {/* true → showModal(), false → close() */}
<input focus={() => state.editing} />                         {/* true → focus(), false → blur() */}
<div popover="manual" showPopover={() => state.tip}>…</div>   {/* true → showPopover(), false → hidePopover() */}
<input setSelectionRange={() => [0, 5]} />                    {/* dizi argümanlara açılır */}
<dialog showModal={true} />                                   {/* literal değer de çağırır: showModal() */}
<dialog show />                                               {/* değersiz yazım true sayılır: show() */}
```

| Prop | `true` | `false` | Diğer değer |
| --- | --- | --- | --- |
| `focus` | `focus()` | `blur()` | `focus(değer)` |
| `show`, `showModal` | çağırır | `close()` | doğru (truthy) değerde argümansız çağırır |
| `showPopover` | çağırır | `hidePopover()` | doğru değerde argümansız çağırır |
| `togglePopover` | `togglePopover(true)` | `togglePopover(false)` | doğru değerde `togglePopover()` |
| `play` | `play()` | `pause()` | doğru → `play()`, yanlış → `pause()` |
| `select` | `select()` | seçimi kaldırır | doğru → `select()`, yanlış → seçimi kaldırır |
| `requestFullscreen`, `requestPointerLock` | çağırır | çıkar | doğru → çağırır, yanlış → çıkar |
| `close`, `hidePopover`, `requestSubmit`, `checkValidity`, `reportValidity`, `showPicker`, `load` | çağırır | — | doğru değerde `metot(değer)` — ör. `close('iptal')`, `requestSubmit(düğme)` |
| `blur`, `click`, `pause`, `submit`, `reset`, `exitFullscreen`, `exitPointerLock`, `requestPictureInPicture`, `exitPictureInPicture` | çağırır | — | doğru değerde argümansız çağırır |
| `scrollIntoView` | `scrollIntoView()` | `scrollIntoView(false)` | `null`/`undefined` → `scrollIntoView()`, diğerleri `scrollIntoView(değer)` |
| `scrollTo`, `scrollBy` | — | — | yalnız nesne ya da dizi: `metot(değer)` |
| `setSelectionRange`, `setRangeText`, `setPointerCapture`, `releasePointerCapture`, `fastSeek` | `metot(true)` | — | `null`/`undefined` dışında `metot(değer)` |

Dizi değer argümanlara açılır (`setSelectionRange={[0, 5]}` → `setSelectionRange(0, 5)`), nesne değer tek argüman olarak geçer (`scrollTo={{ top: 0 }}`, `focus={{ preventScroll: true }}`); ikisinde de öznitelik yazılmaz. Çağrı bir mikro görev sonra yapılır. Eleman o metoda sahip değilse değer düz öznitelik olarak yazılır. Bileşen etiketinde (`<Comp focus={…}/>`) bu adlar sıradan prop'tur.

## Spread — `{...props}` {#spread}

Bir **düz DOM elemanına** yayılan nesne, öznitelikler doğrudan yazılmış gibi uygulanır:

```tsx file=src/Field.tsx variant=function
export function Field(props) {
  return <input {...props} />;
}
```
```tsx file=src/Field.tsx variant=class
import { Component } from '@motifx/core';

export class Field extends Component {
  view() {
    return <input {...this.props} />;
  }
}
```
```tsx file=src/Field.tsx variant=options
export const Field = () => ({
  el: 'input',   // etiketteki prop'lar bu input'a {...props} gibi uygulanır
});
```

```tsx
<Field class="mf-input" id="email" aria-label="E-posta" value={() => state.email} oninput={(e) => state.email = e.target.value} />
```

| Anahtar | Uygulama |
|---|---|
| `class` / `className` | `class.add` — doğrudan yazılan `class` ile **toplanır** |
| `style` | `style()` — string, nesne veya getter |
| `value` / `checked` / `selected` | özellik bağı (`bindings.add`) |
| `on*` (`onclick`, `onClick`, `oninput:once`) | DOM olayı |
| diğer her anahtar (`id`, `title`, `aria-*`, `data-*`, `viewBox`…) | attribute (`attr.add`) |
| `innerHTML` | yazılmaz (geliştirme modunda `MJX124` uyarısı) |
| `href` / `src` / `action` / `formaction` / `xlink:href` değeri `javascript:` ile başlıyorsa | yazılmaz, getter'da o anki değer kaldırılır (geliştirme modunda `MJX125` uyarısı) |

Spread nesnesi çoğu zaman dışarıdan gelen veriyi taşıdığı için bu iki yol kapalıdır. Güvendiğiniz HTML için `x-html`, bilerek yazılan bir `javascript:` bağlantısı için etikete doğrudan yazılan öznitelik (`<a href="javascript:void 0">`) kullanılır; bunlar süzülmez.

Getter (`() => …`) değerler canlıdır. Parametre bekleyen fonksiyonlar (`renderItem: (x) => …`) öznitelik sayılmaz ve atlanır. `ref`, `key`, `options`, `transition`, `initializeComponent`, `childs`, `x-*` ve yaşam döngüsü prop'ları çerçeveye gider.

Sıralama: spread yapıcıda uygulanır, etikete doğrudan yazılan öznitelikler derleyicinin ürettiği `initializeComponent`'te — aynı attribute'ta **doğrudan yazılan kazanır** (`<div {...p} id="sabit"/>`), `class` ise birleşir.

> Yalnızca elemana ait olmayan düz değerleri (`items: [...]`) **DOM elemanına** yaymayın; attribute olarak yazılırlar.

### Bileşen etiketinde: ortak öznitelikler köke düşer (attribute fallthrough) {#attribute-fallthrough}

`<Card class="x" id="y" aria-label="…" {...props}/>` yazıldığında **yalnızca ortak öznitelikler** — `class`/`className` (bileşenin kendi sınıfıyla birleşir), `style`, `id`, `tabindex`, `role`, `aria-*`, `data-*` — bileşenin **kök elemanına** otomatik uygulanır; getter'lar canlıdır. Bileşenin kendi `onConfigured`/`initializeComponent`/`view`'ında yazdığı aynı attribute kazanır (uygulama yapıcıda, bunlardan önce olur). Veri ve callback prop'ları (`items`, `label`, `title`, `onSave`, `disabled`…) köke yazılmaz — `title` bilerek listede değil, bileşenlerde yaygın bir veri prop'u adıdır. Tüm prop'lar, düşenler dâhil, `this.props`'ta okunabilir kalır.

```tsx file=src/Card.tsx variant=class
import { Component } from '@motifx/core';

export class Card extends Component<HTMLDivElement, { title: string }> {
  onConfigured() { this.class.add('mf-card'); }     // <Card class="wide"/> → "mf-card wide"
  view() { return <h3>{this.props.title}</h3>; }
}
```
```tsx file=src/Card.tsx variant=function
export function Card(props: { title: string }) {
  // <Card class="wide"/> → kök div: "mf-card wide"
  return <div class="mf-card">
    <h3>{props.title}</h3>
  </div>;
}
```
```tsx file=src/Card.tsx variant=options
export const Card = () => ({
  el: 'div',
  onConfigured() { this.class.add('mf-card'); },    // <Card class="wide"/> → "mf-card wide"
  view() { return <h3>{this.props.title}</h3>; },
});
```

Fonksiyon bileşenlerinde de aynı: `<Fn class="x"/>` etiketindeki ortak öznitelikler fonksiyonun döndürdüğü köke düşer; kök `<div {...props}/>` ise aynı değer ikinci kez uygulanmaz. Kökü fragment (yorum düğümü) olan bileşenlerde sessizce yok sayılır.

## `class` ve `className` {#class}

İkisi de desteklenir. Değer; string, dizi, nesne veya getter fonksiyonu olabilir:

```tsx
<div class="card active" />                              {/* string */}
<div class={state.theme} />                              {/* reaktif alan */}
<div class={() => `todo ${state.done ? 'done' : ''}`} /> {/* reaktif getter */}
```

Şablon dizesi (template literal) içinde reaktif alan kullanmak yaygındır:

```tsx
<p class={`todo-title ${todo.completed ? 'completed' : ''}`}>{todo.title}</p>
```

### Zorunlu (imperative) sınıf yönetimi {#imperative-class}

Bileşen üzerinden sınıfları programatik olarak yönetmek için `class` yardımcısı vardır:

```ts
this.class.add('active');           // sınıf ekle
this.class.add('a', 'b', 'c');      // birden fazla
this.class.add(() => cond ? 'on' : 'off'); // reaktif katkı
this.class.remove('active');        // kaldır
this.class.remove('**');            // tüm sınıfları ve reaktif izleyicileri temizle
```

## `style` {#style}

`style` string, nesne veya getter alabilir:

```tsx
<div style="color: red; font-weight: bold;" />
<div style={{ verticalAlign: 'top', width: '33%' }} />
<div style={() => ({ opacity: state.visible ? 1 : 0 })} />
```

Getter **canlıdır**: bağımlılıklar değişince yeniden uygulanır; getter'ın yeni sonucunda bulunmayan anahtarlar temizlenir (`{color}` → `{opacity}` geçişinde `color` silinir). Getter string döndürürse `cssText` tümüyle değişir (o elemandaki diğer inline stiller de gider). `x-style={...}` `style` ile birebir aynıdır.

Bileşen üzerinden de uygulanabilir; `style(fn)` tek izleyici tutar, yeniden çağrılırsa önceki durur:

```ts
this.style({ color: 'red' });                 // tek seferlik
this.style('color: red;');                    // tek seferlik
this.style(() => ({ opacity: state.o }));     // reaktif
```

## Hazır bileşenleri çocuk olarak yerleştirme {#component-children}

JSX parçalarını bir değişkende toplayıp çocuk konumuna koyabilirsiniz; değer bir bileşen ya da bileşen dizisiyse metne çevrilmeden `controls`'a yerleştirilir:

```tsx
const parts = [<span>a</span>, <span>b</span>];
const one = <em>tek</em>;
return <div>{parts}{one}{this.childs}</div>;
```

Değer bileşen değilse (dizge, sayı…) her zamanki reaktif metin bağı kurulur. Yani bir prop'un **bileşen mi veri mi** olduğunu ayrıca bildirmeniz gerekmez:

```tsx file=src/Card.tsx variant=function
export function Card(props) {
  return (
    <div class="card">
      {props.headerTemplate}   {/* bileşen → yerleştirilir */}
      {props.title}            {/* dizge   → reaktif metin  */}
    </div>
  );
}
```
```tsx file=src/Card.tsx variant=class
import { Component } from '@motifx/core';

export class Card extends Component {
  view() {
    return (
      <div class="card">
        {this.props.headerTemplate}   {/* bileşen → yerleştirilir */}
        {this.props.title}            {/* dizge   → reaktif metin  */}
      </div>
    );
  }
}
```
```tsx file=src/Card.tsx variant=options
export const Card = () => ({
  el: 'div',
  view() {
    return (
      <div class="card">
        {this.props.headerTemplate}   {/* bileşen → yerleştirilir */}
        {this.props.title}            {/* dizge   → reaktif metin  */}
      </div>
    );
  },
});
```

```tsx
<Card headerTemplate={<h1>Başlık</h1>} title="Alt başlık" />
```

### Şablon sonradan değişecekse getter yazın {#template-getter}

Yerleştirme kararı **kurulum anında** verilir ve **tek seferliktir**: prop kurulurken bileşen tutuyorsa yerleşir, sonradan değişse bile DOM güncellenmez (yerleşen bileşenin kendi bağları her zamanki gibi canlıdır).

Şablon başta `null` olup sonradan gelecekse ya da çalışırken takas edilecekse **getter** yazın — bu bir slot (`Frame`) kurar ve her değişimde içeriği yeniler:

```tsx
<div class="card">{() => props.headerTemplate}</div>
```

Getter yazmadığınız hâlde bir bileşen sonradan metin bağına düşerse çerçeve DOM'a hiçbir şey yazmaz ve geliştirme modunda `MJX204` uyarısıyla getter biçimini önerir.

## Ham HTML — `x-html` {#x-html}

Bir elemanın `innerHTML`'ini reaktif olarak ayarlamak için `x-html` kullanın:

```tsx
<h1 x-html={() => state.heroTitle}></h1>
```

> Güvenlik: `x-html` işaretlenmemiş HTML enjekte eder. Yalnızca güvendiğiniz içerikte kullanın.

## Olaylar {#events}

`on...` prop'ları DOM olaylarına bağlanır. İşleyici `(sender, event)` veya yalnızca `(event)` imzasıyla yazılabilir:

```tsx
<button onclick={() => console.log("tık")}>A</button>
<button onclick={(s, e) => s.context.navigate('/home')}>B</button>
<input onchange={(e) => console.log(e.target.value)} />
```

İşleyicinin fırlattığı hata (async işleyicide reddedilen söz dahil) `MJX123` koduyla `errorHandler`'a bildirilir.

Olay adları küçük harfle yazılır (`onclick`, `onchange`, `oninput`). Değiştiriciler (`:once`, `:prevent`, `:stop` vb.) desteklenir; JSX öznitelik adı tek bir `:` alabildiği için etikette öznitelik başına bir değiştirici yazılır — ayrıntı için [Olaylar](./events.md).

`on:ad` / `on-ad` / `on_ad` yazımı işleyiciyi olduğu gibi etiketin bileşenine `motif.on("ad", fn)` ile bağlar (yalnız önek atılır: `on-my-event` → `my-event`, `on_my_event` → `my_event`); özel olaylar (`motif.trigger`) için de kullanılır ve aynı parametre sayısı kuralı geçerlidir:

```tsx
<Editor on:save={(e) => console.log(e)} />            {/* tek parametre: olay verisi */}
<button on:click={(s, e) => s.motif.hide()}>C</button> {/* iki parametre: gönderen + olay */}
```

## Özel `x-` öznitelikleri {#x-directives}

Derleyicinin tanıdığı, DOM özniteliği olmayan yardımcı prop'lar:

| Öznitelik | İşlev |
|-----------|-------|
| `x-ref={(s) => ...}` / `x-ref={this.alan}` | Etiketin bileşen örneğini yakalar; kısa `ref` ile aynıdır ve iki biçim her etikette çalışır. Aynı etikette `ref` ile `x-ref` birlikte yazılırsa ikisi de kaynaktaki sırayla çalışır — ayrıntı için [Bileşenler](./components.md#element-and-ref). |
| `x-key={...}` | `key` ile aynıdır (`indexkey` de kabul edilir); bkz. [`key` ile öğe kimliği](#key). |
| `x-text={() => metin}` | Elemanın `textContent`'ini reaktif ayarlar (`bindings.text`); çocuk konumundaki `{() => metin}` ile aynı işi görür. |
| `x-html={() => html}` | `innerHTML`'i reaktif ayarlar (`bindings.html`). |
| `x-value={() => değer}` | Elemanın `value` özelliğini tek yönlü, reaktif ayarlar (`bindings.value`); iki yön için `x-model`. |
| `x-model={() => state.alan}` | İki yönlü bağ; `bindings.model(getter, setter)`'a derlenir — ayrıntı için [Formlar](./forms.md). |
| `x-watch={() => ...}` | Etiketin bileşenine bağlı bir izleyici kurar (`bindings.watch`): fonksiyon içindeki reaktif okumalar izlenir, değişimde yeniden çalışır; bileşen bertaraf edilince durur. DOM'a bir şey yazmaz. |
| `x-wait={() => bool}` | Koşul `true` iken bileşeni bekletir/gizler. **Koşullu gösterimin birincil yolu.** |
| `x-display={() => bool}` | `x-wait`'in tersi: koşul `true` iken gösterir, `false` iken gizler. |
| `x-style={...}` | `style` ile aynı (getter canlı). |
| `x-building`, `x-built`, `x-config`, `x-configured`, `x-mounted`, `x-activated`, `x-deactivated`, `x-disposing`, `x-disposed`, `x-initializing`, `x-initialized`, `x-visibilitychanged` | Yaşam döngüsü kancaları (prop biçiminde; `x:` yazımı da geçerlidir). Aynı etikette `onbuilt` ile `x-built` gibi birden çok yazım birleşir ve hepsi kaynaktaki sırayla çalışır. |

`x-text`, `x-html`, `x-value`, `x-model` ve `x-watch` getter, metot başvurusu ya da nesne ister; düz dizge/boolean verilirse derleme `MJX011` ile durur.

Derleyicinin tanımadığı bir `x-` adı `MJX007` uyarısı verir; `x-reload`, `x-bind`, `x-effect`,
`x-focus`, `x-interrupt`, `x-to`, `x-list` ve `x-loop` desteklenmez ve derlemeyi `MJX006` ile
durdurur (bkz. [Derleme hataları](#compile-errors)).

`x-wait` ve `x-display` örneği:

```tsx
<div x-wait={() => state.items.length === 0}>Liste hazır</div>
<div x-display={() => state.isOpen}>Açık panel</div>
```

Koşul ilk değerlendirmede `true` ise (`x-display` için `false`) bileşen **hiç kurulmaz** — alt
ağacı da DOM'a girmez. Sonradan açılınca bir kez kurulur, tekrar kapanınca örnek korunur.
`{koşul && <X/>}` ise her açılışta yeni örnek kurar ve her kapanışta dispose eder; ayrıntılı
karşılaştırma için bkz. [Koşullu Gösterim ve Listeler](./conditionals-and-lists.md).

## Özniteliklerde ternary {#attribute-ternary}

Bir öznitelik ya da bileşen prop'una yazılan üçlü operatör **daima tembel sarılır**:

```tsx
<Comp mode={state.acik ? 'overlay' : 'inline'} />
//   → mode: () => state.acik ? 'overlay' : 'inline'
```

Bu bilinçli bir tasarım kararıdır: sarma olmasaydı ifade `view()` sırasında bir kez değerlenir ve
donardı. Karşılığı, prop'u alan bileşenin onu `Bind<T>` olarak bildirip okumasıdır:

```tsx
import { Bind, toGetter, read } from "@motifx/core";

interface Props { mode: Bind<'overlay' | 'inline'>; }
const mode = toGetter(props.mode);      // canlı
const simdiki = read(props.mode);       // anlık okuma
```

Düz tipli bir prop'u doğrudan kullanan bileşen bu sözleşmeyi çiğner ve çalışma zamanında bir
fonksiyon alır. Diğer ifadeler (`{p.a}`, `{f()}`, `{a && b}`) sarılmaz, değer olarak geçer.

## Derleme zamanı uyarıları {#compile-time-diagnostics}

`@motifx/compiler`, sessizce yanlış çalışan birkaç JSX yazımını derleme sırasında terminale bildirir.
Uyarılar derlemeyi **durdurmaz**; kodun yanında dosya, satır ve kod çerçevesiyle görünür.

| Kod | Ne yakalar | Doğrusu |
|-----|-----------|---------|
| `MJX001` | JSX çocuk konumunda blok gövdeli ok fonksiyonu içinde yerel değişken tanımlayıp koşul döndürmek. Derleyici koşulu kapanışın dışına taşır, değişken dallarda görünmez ve `ReferenceError` alırsınız. | İfade gövdeli ok kullanın ya da mantığı adlandırılmış bir metoda taşıyın. |
| `MJX002` | Bileşen etiketinde **camelCase** DOM olay adı (`onChange`, `onClick`). Geri çağrı prop'u sanılır ama kökün DOM dinleyicisi olur; `this.props.onChange` tanımsız kalır. | Çakışmayan bir ad seçin (`onValueChange`, `onConfirm`). Kasıtlı DOM dinleyicisi için küçük harf yazın: `<Button onclick={…}>` — bu uyarı üretmez. |
| `MJX003` | `.map()` / `.forEach()` ile kurulan liste öğesinde `key` yok. Satırlar öğe nesnesiyle (ilkel öğelerde değerle) eşleştiği için `key` DOM'un yeniden kullanımını değiştirmez. | Öğe köküne kararlı bir anahtar verin: `key={item.id}`; öğeyi tanımlar ve yinelenmeye karşı denetlenir (`MJX202`). Satır eşleşmesinin nasıl yapıldığı için bkz. [`key` ve öğe kimliği](./conditionals-and-lists.md#key-and-identity). |
| `MJX004` | Reaktif getter içinde `this.` köklü bir dizide `some`/`every`/`find`. Yüklem ilk eşleşmede durduğu için dizinin geri kalanı bağımlılık olarak kaydedilmez. | Sonucu bir alanda tutun ya da diziyi tam gezin (`filter(...).length > 0`). |
| `MJX007` | Derleyicinin tanımadığı bir `x-` adı (`x-checked`). Değer `on<ad>` prop'u olarak geçer (`onchecked`) ve çoğu zaman hiçbir şey yapmaz. | Desteklenen direktiflerden birini ya da düz bir prop/öznitelik kullanın. |

Uyarıları kapatmak için Vite eklentisine `diagnostics: false` verin:

```ts file=vite.config.ts
compiler({ diagnostics: false })
```

### Derleme hataları {#compile-errors}

Aşağıdaki yazımlar çalışan koda indirilemez; derleyici derlemeyi durdurur ve hatayı dosya,
satır ve kod çerçevesiyle verir. Hata nesnesinin `code` alanı koddur.

| Kod | Ne yakalar | Doğrusu |
|-----|-----------|---------|
| `MJX006` | Desteklenmeyen direktif: `x-reload`, `x-bind`, `x-effect`, `x-focus`, `x-interrupt`, `x-to`, `x-list`, `x-loop`. | Koşul için `x-wait`/`x-display`, liste için `{items.map(i => <X key={i.id}/>)}`, efekt için `effect(...)` ya da `x-watch`, odak için `focus={() => …}` eleman metodu ya da `ref`. |
| `MJX008` | Çocuk konumunda `function () { … }` ifadesi. | Ok fonksiyonu yazın: `{() => …}`. |
| `MJX009` | DOM olayına dizge ya da boolean değer (`onclick="go()"`). | İşleyici fonksiyon verin: `onclick={() => go()}`. |
| `MJX010` | Yaşam döngüsü kancasına fonksiyon olmayan değer (`onbuilt="x"`). | Fonksiyon ya da fonksiyona başvuru verin. |
| `MJX011` | `x-text`, `x-html`, `x-value`, `x-model`, `x-watch` direktifine getter'a çevrilemeyen değer (`x-text="düz"`). | Getter ya da başvuru verin: `x-text={() => state.ad}`. |
| `MJX012` | `x-wait`/`x-display` direktifine nesne değişmezi. | Boolean döndüren bir ifade ya da getter verin. |
| `MJX013` | Derleyicinin tanımadığı bir JSX etiket adı ya da çocuk düğüm türü. | Etiketi bileşen ya da HTML etiketi olarak yazın. |

### Tip-bilinçli denetim: `motif-lint` (MJX005) {#motif-lint}

Derleyici prop **tiplerini** göremez. Öznitelikteki ternary daima `() => …` ile sarıldığı için
(bkz. [Özniteliklerde ternary](#attribute-ternary)) `<Icon name={ok ? 'a' : 'b'}/>` yazımında
`name` düz `IconName` bildirilmişse bileşen çalışma anında bir fonksiyon alır; TypeScript de sorun
görmez, çünkü ternary'nin tipi `IconName`dır. Bu boşluğu TypeScript program'ı üzerinden çalışan
ayrı bir denetim kapatır:

```sh
npx motif-lint                      # ./tsconfig.json
npx motif-lint -p tsconfig.app.json src/pages/Home.tsx   # tek proje / tek dosya
npx motif-lint --json --no-fail     # CI için makine çıktısı, çıkış kodu 0
```

| Kod | Ne yakalar | Doğrusu |
|-----|-----------|---------|
| `MJX005` | Bileşen prop'una ternary yazılmış ama prop'un **bildirilen** tipi fonksiyon kabul etmiyor (`name: IconName`). | Bileşende prop'u `Bind<T>` bildirip `read()`/`toGetter()` ile okuyun. Değer gerçekten statikse ternary'yi JSX dışında hesaplayıp değişkeni geçin. |

Kural DOM etiketlerinde, `Bind<T>`/`any`/`unknown`/fonksiyon tipli prop'larda, `key`/`x-*`/`on:*`
adlarında ve generic (`value: T`) prop'larda sessizdir. Bulgu varsa çıkış kodu 1'dir; `package.json`
içine `"lint:jsx": "motif-lint"` koyup CI'ya bağlayabilirsiniz. `tsconfig` okunamazsa komut
`MJX014` hatasıyla durur.

## Bu ifade neye derlendi? — `explain` {#explain}

JSX, MotifJS'te bir görünüm dili değil, bağ API'sinin (`bindings.add`, `bindings.when`,
`controls.add`…) kısa yazımıdır; derleyici de bir dönüştürücü değil, klasik anlamda bir **lowering**
aşamasıdır. Kaynakla çıktı arasında benzerlik aramak anlamsızdır; ama "bu çalışınca ne olacak"
sorusu tahmine bırakılmaz. Derleyicinin `-S` bayrağı gibi çalışan `explain`, her JSX ifadesi için
**indiği gerçek çağrıyı** (üretilmiş koddan alınır, tahmin değildir), reaktiflik sınıfını ve
bağımlılık yüzeyini yazar:

```sh
npx motif-explain src/pages/Home.tsx            # okunur döküm
npx motif-explain src/pages/Home.tsx --site prop   # yalnızca bileşen prop'ları
npx motif-explain src/pages/Home.tsx --json --code # makine çıktısı + üretilen kod
```

```text
[motifjs explain] src/pages/Home.tsx — 9 expressions
  9:21     child/text.field         {this.state.ad}
           => sender.bindings.add("textContent", this.state, "ad")
           LIVE · deps: this.state.ad — this field only (exact)
  10:20    child/method             {() => this.state.ad + '!'}
           => sender.bindings.method(() => this.state.ad + '!')
           LIVE · deps: ALL reactive fields read inside the getter; collected again on every run
           note: reactive text if the result is text, a Frame if it is a component (the instance is rebuilt on every change)
  8:50     attr/attr.call           data-n={fmt(this.state.sayi)}
           => sender.attr.add({ "data-n": fmt(this.state.sayi) })
           ONCE · deps: none — evaluated once during setup, then frozen
           note: a plain function call is passed as a VALUE; write `() => f(x)` to keep it live
  17:23    prop/prop.ternary        name={this.state.acik ? 'check' : 'error'}
           => name: () => this.state.acik ? 'check' : 'error'
           RECEIVER · deps: wherever the receiving component reads the getter; nowhere if it does not
           note: ternary wrapped lazily (by design): the receiving component should declare the prop as Bind<T> and read it with read()/toGetter()
```

Reaktiflik sınıfları:

| Sınıf | Anlamı |
|-------|--------|
| `LIVE` | Bir effect kurulur; bağımlılıklar değişince DOM güncellenir. |
| `STATIC` | Literal (dizge, sayı, eksi sayı, boolean, `null`); hiçbir bağ kurulmaz. |
| `ONCE` | İfade kurulum anında bir kez değerlenir, sonra donar (`attr={f(x)}`, `prop={nesne}`). |
| `RECEIVER` | İfade fonksiyon olarak geçer; canlılık alıcı bileşenin `Bind<T>` sözleşmesine bağlıdır. |
| `RUNTIME` | Değer türü çalışma anında belli olur: fonksiyonsa canlı, değilse bir kez (`attr={degisken}`). |

Aynı dökümü geliştirme sunucusunda görmek için Vite eklentisine `explain` verin; dizge ya da RegExp
yalnızca eşleşen dosyaları döker, çıktı kodu değişmez:

```ts file=vite.config.ts
compiler({ explain: 'pages/Home' })
```

Programatik kullanım: `import { explain } from '@motifx/compiler'` → `explain(kaynak, dosyaAdı)` bir
`MotifExplanation[]` döndürür (`site`, `shape`, `source`, `lowered`, `reactive`, `deps`, `note`).

## `key` ile öğe kimliği {#key}

Liste öğelerine `key` verin. `key` öğeyi tanımlar ve geliştirme modunda yinelenmeye karşı denetlenir (`MJX202`); satırlar `key` ile değil öğe nesnesiyle eşleşir. Ayrıntı için bkz. [Koşullu Gösterim ve Listeler](./conditionals-and-lists.md#key-and-identity):

```tsx
{state.items.map(item => <li key={item.id}>{item.text}</li>)}
```

## Geçişler — `transition` prop'u {#transition}

Bir bileşene giriş/çıkış animasyonu vermek için `transition` prop'u kullanılır. String verirseniz Vue-tarzı CSS sınıf geçişi olur; nesne verirseniz özel sınıf adları belirtebilirsiniz:

```tsx
<div transition="fade">İçerik</div>
```

Bu, `fade-enter-from/active/to` ve `fade-leave-from/active/to` CSS sınıflarını uygular. Ayrıntı ve WAAPI (keyframe) tabanlı animasyon için [Stil ve Animasyon](./styling-and-transitions.md).

`transition` düz DOM etiketinde öznitelik yazmaz, geçiş motoruna gider. `options` prop'u da öyledir: `<div options={{ hideStrategy: 'detach', disableDisposal: true }}/>` içindeki `hideStrategy` ve `disableDisposal` o etiketin `motif.options`'ına kopyalanır, DOM'a öznitelik yazılmaz.

## Reaktif olmayan yerel değişkenler tuzağı {#local-variable-trap}

Şu kod **güncellenmez**, çünkü `label` düz bir yerel değişkendir:

```tsx
let label = state.count + " öğe";
<span>{label}</span>   // count değişse de metin değişmez
```

Doğrusu getter kullanmaktır:

```tsx
<span>{() => state.count + " öğe"}</span>
```

## Sonraki adım {#next}

Reaktif durumu ayrıntılı öğrenmek için [Reaktivite](./reactivity.md) bölümüne geçin.
