---
slug: styling-and-transitions
title: Stil ve Animasyon
description: class/style/attr yardımcıları, satır içi <style>, CSS sınıf tabanlı transition prop'u, WAAPI keyframe geçişleri, görünürlük ve giriş/çıkış kipi.
category: app
order: 3
---

## Stil verme yolları {#styling}

### JSX'te `class` / `className` {#class}

İkisi de kabul edilir; string, dizi, nesne veya getter alabilir:

```tsx
<div class="card active" />
<div class={state.theme} />
<div class={() => `todo ${state.done ? 'done' : ''}`} />
```

### JSX'te `style` {#style}

String, nesne veya getter:

```tsx
<div style="color: red;" />
<div style={{ verticalAlign: 'top', width: '33%' }} />
<div style={() => ({ opacity: state.visible ? 1 : 0 })} />
```

### Satır içi `<style>` {#inline-style-tag}

CSS'i `view()` içinde doğrudan `<style>` bloğuyla verebilirsiniz. Kurallar bileşenle sınırlanmaz, tüm belgeye uygulanır:

```tsx file=src/Panel.tsx variant=class
import { Component } from "@motifx/core";

export class Panel extends Component {
  view() {
    return <div class="panel">
      <style>{`
        .panel { padding: 20px; border-radius: 8px; }
        .panel h2 { margin: 0; }
      `}</style>
      <h2>Başlık</h2>
    </div>;
  }
}
```
```tsx file=src/Panel.tsx variant=function
export function Panel() {
  return <div class="panel">
    <style>{`
      .panel { padding: 20px; border-radius: 8px; }
      .panel h2 { margin: 0; }
    `}</style>
    <h2>Başlık</h2>
  </div>;
}
```
```tsx file=src/Panel.tsx variant=options
export const Panel = () => ({
  el: 'div',
  view() {
    return <div class="panel">
      <style>{`
        .panel { padding: 20px; border-radius: 8px; }
        .panel h2 { margin: 0; }
      `}</style>
      <h2>Başlık</h2>
    </div>;
  },
});
```

### Zorunlu (imperative) sınıf ve stil {#imperative-class-style}

Bileşen üzerinden:

```ts
this.class.add('active');
this.class.add('a', 'b');
this.class.add(() => state.on ? 'on' : 'off');  // reaktif katkı
this.class.remove('active');
this.class.remove('**');                          // her şeyi temizle

this.style({ color: 'red' });
this.style('color: red; font-weight: bold;');
this.style(() => ({ opacity: state.o }));
```

`class.add`, katkı-sayımı (reference counting) tutar: aynı sınıf birden çok kaynaktan eklenirse, hepsi kaldırılana kadar sınıf durur.

### Öznitelik yardımcısı — `attr` {#attr}

DOM özniteliklerini programatik yönetmek için `this.attr` vardır:

```ts
this.attr.add({ href: '/docs', title: 'Dokümanlar' });
```

`RouterLink` bileşeni de `href`'i (`showHref: false` verilmemişse) bu yolla ekler.

`attr.add` değerleri: `false`, `null` ve `undefined` özniteliği kaldırır, `true` boş değerle (`""`) yazar, dizge ve sayılar olduğu gibi yazılır. `aria-*` ve `data-*` özniteliklerinde `true`/`false` metin olarak yazılır (`"true"`/`"false"`). Nesnedeki bir anahtar `null` ise yalnızca o öznitelik kaldırılır, diğer anahtarlar yazılır (`this.attr.add({ title: null, role: 'tab' })`).

Öznitelik adları yalnızca `attr.add`'e verilen nesnenin kendi anahtarlarıdır; değerin içine inilmez. Nesne ya da dizi değer tek bir öznitelik değeri olarak metne çevrilip yazılır: `{ title: { a: 1 } }` → `title="[object Object]"`, `{ 'data-ids': [1, 2] }` → `data-ids="1,2"`. Getter'ın döndürdüğü nesne ve dizi de aynı biçimde yazılır. Adı bir eleman metoduyla aynı olan anahtarda değer o metodun argümanıdır (bkz. [Eleman metotları](./jsx.md#element-methods)).

## Tailwind, Bootstrap ve harici CSS {#external-css}

MotifJS herhangi bir CSS çözümüne bağlı değildir. Demo uygulaması Tailwind ve Bootstrap sınıflarını doğrudan `class` üzerinden kullanır:

```tsx
<a rel="router" href="/docs" class="btn btn-primary btn-lg me-3">Başla</a>
```

Tailwind için `@tailwindcss/vite` eklentisini `vite.config.ts`'e ekleyin.

## Geçiş (transition) sistemi {#transitions}

MotifJS iki tür giriş/çıkış animasyonu destekler:

1. **CSS sınıf tabanlı geçiş** — Vue tarzı; `transition` prop'u ile.
2. **WAAPI (Web Animations API) keyframe** — `motif.options.transition.in/out` ile programatik.

Geçişler; bir bileşen DOM'a **eklendiğinde** (enter) ve **kaldırıldığında/gizlendiğinde** (leave) otomatik oynatılır.

### CSS sınıf tabanlı geçiş — `transition` prop'u {#transition-prop}

En basit biçim, bir isim vermektir:

```tsx
<div transition="fade">İçerik</div>
```

Bu, aşağıdaki CSS sınıflarını uygun aşamalarda uygular (Vue ile aynı adlandırma):

| Aşama | Uygulanan sınıflar |
|-------|--------------------|
| Giriş (enter) | `fade-enter-from` → `fade-enter-active` → `fade-enter-to` |
| Çıkış (leave) | `fade-leave-from` → `fade-leave-active` → `fade-leave-to` |

Karşılık gelen CSS'i siz yazarsınız:

```css
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,   .fade-leave-to     { opacity: 0; }
.fade-enter-to,     .fade-leave-from   { opacity: 1; }
```

`transition` düz etiketlerde, sınıf bileşeni ve fonksiyon bileşeni etiketlerinde aynı şekilde çalışır; fonksiyon bileşeninde dönen köke uygulanır ve etikete yazılan değer, fonksiyonun kendi köküne yazdığı değerin önüne geçer. Etikete yazılan üçlü ifade getter'a derlenir ve bileşen yaşadığı sürece izlenir; getter `null` ya da boş dizge dönerse geçiş kapanır:

```tsx
<Rozet transition={state.hizli ? 'hizli' : 'yavas'} />
```

### Özel sınıf adları ve süre — nesne biçimi {#transition-props}

`transition` prop'una bir `TransitionProps` nesnesi vererek sınıf adlarını ve süreyi özelleştirin:

```tsx
<div transition={{
  name: 'slide',
  duration: { enter: 300, leave: 200 },
  enterFromClass: 'slide-in-start',
  enterActiveClass: 'slide-in-active',
  enterToClass: 'slide-in-end',
  leaveFromClass: 'slide-out-start',
  leaveActiveClass: 'slide-out-active',
  leaveToClass: 'slide-out-end',
}}>
  İçerik
</div>
```

`TransitionProps` alanları (`import type { TransitionProps } from "@motifx/core"`): `name`, `type` (`'transition'` veya `'animation'`: hangi bitiş olayının bekleneceği), `css`, `duration` (`number` veya `{ enter, leave }`), ve `enter*Class` / `leave*Class` / `appear*Class`. `css: false` sınıf tabanlı geçişi kapatır: geçiş sınıfları eklenmez, giriş ve çıkış hemen biter. `name` verilmezse sınıf önekleri `motif` olur (`motif-enter-from` …).

`duration` verilmezse süre, elemanın hesaplanmış CSS `transition`/`animation` süresinden okunur; verilirse o süre (ya da ilk bitiş olayı) beklenir. Süre 0 ise geçiş hemen biter.

`appear*Class` yalnızca bileşenin **ilk** girişinde (DOM'a ilk kez görünür olarak girdiğinde; başlangıçta gizli olan bir bileşende bu ilk `motif.show()`'dur) kullanılır; verilmezse `enter*Class` değerlerine düşer. Sonraki girişler her zaman `enter*Class` kullanır.

### WAAPI keyframe animasyonu — `motif.options.transition.in/out` {#waapi}

Daha güçlü, kod tabanlı animasyonlar için giriş/çıkış keyframe'lerini bileşenin `onconfig`/`initializeComponent` aşamasında tanımlayın:

```tsx
function setFx(s) {
  s.motif.options.transition.in({
    keyframes: [
      { opacity: '0', transform: 'translateX(-50px)' },
      { opacity: '1', transform: 'translateX(0)' }
    ],
    options: { duration: 1000, easing: 'ease-in-out', fill: 'forwards' }
  });
  s.motif.options.transition.out({
    keyframes: [
      { opacity: '1', transform: 'translateX(0)' },
      { opacity: '0', transform: 'translateX(-50px)' }
    ],
    options: { duration: 500, easing: 'ease-in-out', fill: 'forwards' }
  });
}

// Kullanım
<div onconfig={(s) => setFx(s)}>Animasyonlu içerik</div>
```

`in`/`out`, standart WAAPI `element.animate(keyframes, options)` imzasını kullanır:
- `keyframes`: `Keyframe[]` veya `PropertyIndexedKeyframes`
- `options`: süre (sayı) veya `KeyframeAnimationOptions`

`in`/`out` tanımı bileşene aittir ve sonraki her giriş/çıkışta kullanılır; yeniden çağrılırsa öncekinin yerine geçer. Süren animasyonlar `motif.options.transition.activeAnimations` dizisinde tutulur.

> **Öncelik:** Bir bileşende hem WAAPI (`motif.options.transition.in/out`) hem CSS sınıf geçişi tanımlıysa, WAAPI keyframe'leri önceliklidir.

### Geçiş ve görünürlük {#transition-visibility}

`motif.hide()`/`motif.show()` çağrıldığında ilgili leave/enter geçişi otomatik oynatılır. Çıkışta DOM'dan kaldırma, leave animasyonu bittikten sonra gerçekleşir. Animasyonu atlamak için:

```ts
this.motif.options.transition.skipNextLeave = true;
await this.motif.hide();
```

Bayrak yalnızca bir sonraki çıkışı etkiler ve kullanılınca sıfırlanır. Kök bir fragment ise görünür çocuklar da animasyonsuz gizlenir.

Rota sayfasının geçişleri gezinmede de oynar: ayrılan sayfa çıkış geçişini bitirir, sonra gelen sayfa girer. Router yığın kipindeyken (`useRouter({ stack })`) ve `stack.animation` verilmemişse (ya da `'none'` ise) bu geçişler yığın geçişi olarak kullanılır ve sayfa öğesi giriş geçişi süresince `data-nav-direction` taşır. `stack.animation` verildiğinde `push`, `back` ve `forward` gezinmelerinde sayfanın kendi giriş geçişi yerine yığın animasyonu oynar; bkz. [Yönlendirme](./routing.md).

### Giriş ve çıkış sırası — `mode` {#transition-mode}

Bir kapsayıcıda bir çocuk çıkarken başka biri girdiğinde iki kip vardır:

| Kip | Davranış |
|---|---|
| `'concurrent'` (varsayılan) | Gelen çocuk hemen yerleşir ve girişini oynar, giden çocuğun çıkışı aynı anda sürer. |
| `'out-in'` | Gelen çocuk, o kapsayıcıda süren çıkışlar bitene kadar DOM'a yerleşmez; çıkış bitince yerleşir ve girişini oynar. |
| `'in-out'` | Gelen çocuk hemen yerleşir ve girişini oynar; giden çocuk o sırada yerinde durur, çıkışını gelenin girişi bitince oynar. |

Kip üç yerden verilir; dar olan geniş olanı ezer:

```ts
app.useTransitions({ mode: 'out-in' });                 // uygulama geneli, router gerekmez
<div transition={{ mode: 'out-in' }}>{...}</div>        // kapsayıcı başına
this.motif.options.transition.mode = 'concurrent';      // kapsayıcı başına, kodla
```

`transition={{ mode }}` yalnız kipi ayarlar, kapsayıcının kendisine animasyon eklemez; `name` ve sınıf adlarıyla birlikte de verilebilir. Kip, kapsayıcıya `controls.add` ile gelen her çocuğa uygulanır: `when`/ternary/`switch` dalları, `Frame` ve `Lazy` içerikleri, liste satırları, elle eklenen bileşenler. Kip en yakın **eleman** kapsayıcıdan okunur: `Frame` ve fragment gibi yorum düğümlü kapsayıcılar kendi kipi yoksa ebeveynlerininkini kullanır, bu yüzden `<div transition={{ mode: 'out-in' }}>{koşul ? <A/> : <B/>}</div>` dal değişiminde de çalışır (bkz. [Frame zamanlaması](./frame.md)). Kardeşler arasında `motif.hide()` / `motif.show()` ile geçişte de `show`, kardeşin çıkışını bekler. Bekleme sırasında gelen çocuk kaldırılırsa ya da tekrar gizlenirse hiç yerleşmez. Süren bir çıkış yoksa `out-in` beklemez. İptal edilen çıkış (`Animation.cancel`) bekleyeni serbest bırakır.

`in-out` kipinde giden çocuğun çıkışı, aynı işlemde başlayan girişleri görmek için bir mikro görev bekler; giriş geçişi olmayan bir çocuk geliyorsa ya da hiç gelen yoksa çıkış hemen oynar. Giden çocuk bertaraf ediliyorsa `dispose()` Promise'i çıkış bitince çözülür; `motif.hide()` için de aynısı geçerlidir. İptal edilen giriş bekleyen çıkışı serbest bırakır.

### Aktif animasyonları durdurma {#stop-animations}

```ts
await this.motif.stopAnimations();  // hem WAAPI hem CSS geçişini keser
```

## Sonraki adım {#next}

Büyük listeleri verimli göstermek için [Sanal Listeler (Virtualization)](./virtualization.md) bölümüne geçin.
