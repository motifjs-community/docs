---
slug: events
title: Olaylar
description: DOM olayları ve değiştiriciler, motif.on/off/trigger bileşen olayları, yaşam döngüsü olayları ve uygulama olay veriyolu.
category: core
order: 5
---

MotifJS'te üç olay katmanı vardır:

1. **DOM olayları** — bir elemana `onclick`, `oninput` gibi prop'larla bağlanır.
2. **Bileşen olayları** — `component.motif.on/trigger/off` ile bileşenler arası iletişim.
3. **Uygulama olayları** — `context.on/fire` ile uygulama genelinde yayın.

## DOM olayları {#dom-events}

JSX'te `on...` prop'ları DOM olaylarına bağlanır. Olay adları küçük harfle yazılır.

```tsx
<button onclick={() => console.log("tık")}>Tıkla</button>
<input oninput={(e) => console.log(e.target.value)} />
<form onsubmit={(s, e) => { e.preventDefault(); /* ... */ }}>...</form>
```

Düz etikette her DOM olayı bu yazımla bağlanır (`onpointerdown`, `onmouseenter`, `onanimationend` dahil); `onClick` gibi camelCase yazım da aynı olayı bağlar.

Bir bileşen etiketinde DOM olay adı taşıyan prop (`onchange`/`onChange`, `onCopy`, `onResize`, `onSelect`, `onReset`, `onContextMenu` …) bileşenin kök elemanına DOM dinleyicisi olarak bağlanır ve `this.props`'a ulaşmaz; camelCase yazımda derleyici `MJX002` uyarısı verir. Geri çağrı prop'u için DOM olayıyla çakışmayan bir ad seçin (`onValueChange`, `onConfirm`).

### İşleyici imzaları {#handler-signatures}

İşleyici iki biçimden biriyle yazılabilir; MotifJS argüman sayısına göre doğru olanı çağırır:

```tsx
// Yalnızca olay
<button onclick={(e) => console.log(e.clientX)} />

// Gönderen (bileşen) + olay
<button onclick={(sender, e) => sender.context.navigate('/home')} />
```

- `sender` — olayı tetikleyen `ComponentBase` örneğidir; `sender.element`, `sender.context`, `sender.motif` gibi üyelere erişebilirsiniz.
- İşleyici `false` döndürürse veya `{ cancel: true }` döndürürse, MotifJS `preventDefault()` ve `stopPropagation()` çağırır. Bu metotlar yalnızca olay nesnesinde varsa çağrılır; `motif.trigger('ad', { … })` ile düz bir veri nesnesi geçildiğinde hiçbiri çağrılmaz ve hata oluşmaz. `:prevent` / `:stop` değiştiricileri de aynı kurala uyar.
- Parametre sayısı fonksiyonun `length` değeridir: bildirilen parametre sayısı ≤ 1 ise `fn(event)`, 2 ve üzeri ise `fn(sender, event)` çağrılır. Varsayılan değerli ya da rest parametre ve ondan sonrakiler sayılmaz; bu yüzden `(...a) => …` 0 sayılır ve yalnızca `event` alır, `(s = null, e) => …` de 0 sayılır.

### İşleyici hataları {#handler-errors}

İşleyici hata fırlatırsa ya da `async` işleyicinin döndürdüğü promise reddedilirse hata `MJX123` (`The '<olay>' event handler threw.`) koduyla bir `MotifError` olarak `errorHandler`'a raporlanır; asıl hata `cause` alanındadır. Rapor üretim kipinde de konsola yazılır (`app.useLogging(false)` kapatır) ve `errorHandler.addListener(fn)` dinleyicilerine ulaşır. Aynı olayın diğer dinleyicileri çalışmaya devam eder.

### `on:ad` / `on-ad` / `on_ad` yazımı {#context-events}

Bu yazım işleyiciyi olduğu gibi etiketin bileşenine bağlar: `<X on:save={fn}/>`, `sender.motif.on("save", fn)` demektir. Olay adı, önek (`on:`, `on-`, `on_`) atıldıktan sonra kalan kısmın tamamıdır: `on-my-event` → `my-event`, `on_my_event` → `my_event`. Hem DOM olayları hem de `motif.trigger` ile tetiklenen özel olaylar için kullanılır ve yukarıdaki parametre sayısı kuralı aynen geçerlidir:

```tsx
// Tek parametre: olay (özel olayda trigger'a verilen veri)
<Editor on:save={(e) => console.log(e.id)} />

// İki parametre: gönderen bileşen + olay
<button on-click={(sender, e) => sender.motif.hide()}>Kapat</button>

// Metot referansı da olduğu gibi geçer
<button on_click={this.handleClick}>Tıkla</button>
```

`Editor` içinde `this.motif.trigger('save', { id: 7 })` çağrıldığında ilk işleyici `{ id: 7 }` alır.

## Olay değiştiricileri (modifiers) {#modifiers}

Olay adına iki nokta ile eklenen değiştiriciler davranışı ayarlar. Bunlar `component.motif.on` API'sinde ve tip sisteminde tanımlıdır:

| Değiştirici | Etki |
|-------------|------|
| `:once` | Bir kez çalışır, sonra kendini kaldırır. |
| `:passive` | `addEventListener` için `passive: true`. |
| `:capture` | Yakalama (capture) fazında dinler. |
| `:prevent` | İşleyici sonrası `preventDefault()`. |
| `:stop` | İşleyici sonrası `stopPropagation()`. |
| `:self` | Yalnızca olay hedefi elemanın kendisiyse çalışır. |
| `:trusted` | Yalnızca `isTrusted` olaylarda çalışır. |

JSX'te öznitelik adı tek bir `:` alabildiği için etikette öznitelik başına bir değiştirici yazılır (`onclick:once`, `onsubmit:prevent`). Zincir (`click:once:prevent`) zorunlu API ile kurulur:

```ts
this.motif.on('click:once:prevent', (s, e) => { /* ... */ });
this.motif.on('scroll:passive', (s, e) => { /* ... */ });
```

## Bileşen olay API'si: `motif.on` / `motif.off` / `motif.trigger` {#component-events}

Her bileşende programatik olay yönetimi `this.motif` ad alanındadır:

```ts
// Dinle (DOM olayı veya özel olay)
await this.motif.on('click', (sender, e) => { /* ... */ });

// Aynı işleyiciyi kaldır
await this.motif.off('click', handler);

// Özel bir olayı elle tetikle
await this.motif.trigger('myCustomEvent', { data: 123 });
```

- `motif.on` ile eklenen dinleyiciler, bileşen dispose edildiğinde **otomatik olarak temizlenir** (bellek sızıntısı önlenir).
- `motif.on`'un üçüncü argümanı `domEvent` (varsayılan `true`)'dur. `false` verirseniz DOM'a `addEventListener` yapılmaz; yalnızca dahili (özel) olay olarak tutulur — `motif.trigger` ile tetiklenebilir.
- `motif.trigger('ad', veri)` yalnız **tam o adla** (değiştiricisiz, büyük/küçük harf duyarsız) kaydedilmiş işleyicileri çağırır; `'click:once'` ile kaydedilen işleyiciyi `trigger('click')` çağırmaz. İşleyiciler `veri`'yi olay nesnesi olarak alır.
- DOM olaylarında `motif.off(ad, fn)` aynı işleyicinin **bir** kaydını kaldırır; aynı işleyici birden çok kez eklendiyse her biri için çağrılır. Olay adı kayıttaki yazımla (değiştiriciler dâhil) verilir.
- `motif.addHandler(ad, fn)`, `motif.on(ad, fn)` ile aynıdır (dönüş değeri yok).

### `x:mounted` — DOM'a bağlanma anı {#x-mounted}

Eleman gerçekten DOM'a eklendiğinde çalışacak bir kanca:

```ts
this.motif.on('x:mounted', () => {
  // this.element document içinde
});
```

Her abonelik **bir kez** çalışır; eleman zaten `document` içindeyse hemen çalışır. Bileşen sökülüp yeniden yerleştiğinde (taşıma, `motif.hide`/`motif.show`, keepAlive) `x:mounted` tekrar fırlamaz; o an için `x:activated` kullanın ([Yaşam Döngüsü](./lifecycle.md)). Henüz çalışmamış bir aboneliği `motif.off('x:mounted', işleyici)` iptal eder. İşleyicinin fırlattığı hata `MJX122` olarak raporlanır.

## Yaşam döngüsü olayları {#lifecycle-events}

Bileşen yaşam döngüsü olaylarını da `motif.on` ile dinleyebilirsiniz. `x:` öneki bu olayları DOM'a değil bileşenin kendi yayıcısına bağlar; işleyici `(sender, e)` imzasıyla çağrılır (`e`: `{ cancel }`), tek parametreli işleyici yalnızca `e` alır:

```ts
this.motif.on('x:built', (sender, e) => { /* inşa bitti */ });
this.motif.on('x:disposed', () => { /* bertaraf tamamlandı */ });
```

Tanınan adlar: `x:initializing`, `x:initialized`, `x:config`, `x:configured`, `x:building`, `x:built`, `x:mounted`, `x:visibilityChanged`, `x:activated`, `x:deactivated`, `x:disposing`, `x:disposed`. Abonelik bileşenle birlikte temizlenir; `motif.off` ile elle de kaldırılır. Aynı işleyici birden çok kez abone olduysa `motif.off` hepsini kaldırır.

Bu dinleyicilerden biri hata fırlatırsa hata, kanca sınıf metodu ya da prop olarak yazılmış gibi `MJX122` (ör. `The component x:built hook threw.`) koduyla `errorHandler`'a raporlanır; bileşen kurulmaya devam eder.

> Zamanlama notu: düz `new Component('div', …)` örneklerinde `x:config` yapıcıda fırlar; yapıcı döndükten sonra abone olmak için geç kalınmış olur. Alt sınıflarda (`class X extends Component`) `onConfig` `build()` başında çalıştığı için yapıcıdan sonra abone olmak yeterlidir. Ayrıntı: [Yaşam Döngüsü](./lifecycle.md).

## Uygulama olayları — `context.on` / `context.fire` {#app-events}

Bileşenler arasında (ebeveyn-çocuk ilişkisi olmadan) haberleşmek için uygulama olay veriyolu kullanılır. `this.context` çalışan `Application`'dır. Dinleyici bileşen bertaraf edilince abonelik kendiliğinden kalkar:

```tsx file=src/Labels.tsx variant=class
import { Component } from '@motifx/core';

export class Labels extends Component<HTMLDivElement> {
  onConfig() {
    this.context.on('languageChanged', () => this.refreshLabels());
  }
  refreshLabels() { /* ... */ }
}
```
```tsx file=src/Labels.tsx variant=function
export function Labels() {
  const refreshLabels = () => { /* ... */ };
  return <div onconfig={(s) => s.context.on('languageChanged', refreshLabels)} />;
}
```
```tsx file=src/Labels.tsx variant=options
export const Labels = () => ({
  el: 'div',
  onConfigured() {
    this.context.on('languageChanged', () => this.refreshLabels());
  },
  refreshLabels() { /* ... */ },
});
```

```tsx
// Yayıncı (başka bir bileşenden)
<div onclick={(sender, e) => sender.context.fire('languageChanged')}>Türkçe</div>
```

`Application` olay API'si:

| Metot | Açıklama |
|-------|----------|
| `app.on(event, handler)` | Dinler; abonelikten çıkmak için bir fonksiyon döndürür. |
| `app.fire(event, args?)` | Olayı tetikler. |
| `app.off(event, handler)` | Dinleyiciyi kaldırır. |
| `app.onRouterChanged(handler)` | Her navigasyonda (açılış ve 404 dâhil) çalışacak kanca; abonelikten çıkmak için bir fonksiyon döndürür. |
| `app.onLifecycle(handler)` | Sekme/uygulama görünürlüğü ve bağlantı değişimleri; bkz. [Uygulama yaşam döngüsü](./lifecycle.md#app-lifecycle). |

Olay adı dizge ya da `Symbol` olabilir; `fire` dinleyicileri ekleniş sırasıyla, senkron çağırır.

Uygulama olayı dinleyicisinin fırlattığı hata `MJX123` (`The '<olay>' event handler threw.`) koduyla raporlanır ve olayın diğer dinleyicileri çalışır. `onRouterChanged` işleyicileri de böyledir (`The 'motifjs-router-navigated' event handler threw.`); gezinme yine tamamlanır.

Bir bileşenin `this.context`'i uygulamanın bileşene bağlı bir görünümüdür: onun üzerinden açılan `on` ve `onRouterChanged` abonelikleri bileşen bertaraf edilince kendiliğinden kaldırılır (`onLifecycle` bu kapsama girmez). `Application.main`, elde tutulan `app` örneği ya da `useApplication().application` üzerinden açılan abonelikler hiçbir bileşene bağlı değildir; döndürülen fonksiyonu kendiniz çağırın ya da bir bileşene `motif.setDisposable` ile kaydedin ([Bellek Yönetimi ve Dispose](./memory-and-dispose.md)).

```tsx
const unsubscribe = app.on('data-updated', (payload) => { /* ... */ });
// ...
unsubscribe();  // aboneliği bitir
```

## Örnek: dil değişimini yayınlama {#example-language}

`MainLayout` bir dil değiştirir ve yayınlar; `Home` sayfası dinler ve kendini günceller:

```tsx
// MainLayout içinde
<div onclick={(sender: Component, e: Event) => {
  mainState.selectedLangText = "Türkçe";
  sender.context.fire('languageChanged');
}}>Türkçe</div>

// Home içinde
<div onconfig={(s: Component) => {
  s.context.on('languageChanged', () => changeLang());
}}>...</div>
```

## Sonraki adım {#next}

Form girdilerini ve iki yönlü bağlamayı öğrenmek için [Formlar ve İki Yönlü Bağlama](./forms.md) bölümüne geçin.
