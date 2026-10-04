---
slug: routing
title: Routing
description: RouteItem tanımı, redirect/alias, rota kancaları, parametreler, useRouter modları, scrollMemory, RouterView, bağlantılar, programatik gezinme, guard'lar, yığın gezinmesi ve Lazy.
category: app
order: 1
---

MotifJS yönlendirmesi (routing) çekirdekle birlikte gelir. Rotaları bir yapılandırma dizisiyle tanımlar, `RouterView` ile ekrana yerleştirir ve `Application` üzerinden programatik olarak gezersiniz.

## Rota tanımı (`RouteItem`) {#route-item}

Rotalar bir `RouteItem[]` dizisidir. Her öğe bir yolu (`path`) bir bileşene (`control`) eşler:

```tsx
// config/routes.ts
import { RouteItem } from '@motifx/core';

export const routes = [
  {
    path: '/',                                        // layout rota
    control: () => import('../layouts/MainLayout'),
    extend: { layoutName: 'MainLayout' },
    childs: [
      { path: '/',        control: () => import('../pages/Home') },   // varsayılan çocuk
      { path: '/docs/{page?:}',  control: () => import('../pages/Docs') },
      { path: '/api/{page?:getting-started}', control: () => import('../pages/Api') },
      { path: '/home/{id?:0}',   control: () => import('../pages/Home') },
    ]
  }
] as RouteItem[];
```

### `RouteItem` alanları {#route-item-fields}

| Alan | Açıklama |
|------|----------|
| `path` | Rota yolu. Parametreler `{name}` biçiminde. Layout ve varsayılan çocuk için `'/'`; her çocuk yolu `/` ile başlar (linter aksi halde uyarır). Aynı derinlikte statik segment parametreden önce gelir (`/orders`, `/{slug}`'ı yener). |
| `control` | Rota bileşeni. Doğrudan bileşen, `() => Component`, `() => import(...)` (lazy) veya Promise olabilir. Yalnızca `redirect` tanımlı rotada zorunlu değildir. |
| `childs` | Alt rotalar. Tanımlıysa bu rota bir **layout** rotasıdır. |
| `name` | Rotaya isimle erişim için (opsiyonel). |
| `meta` | Guard ve kancaların kullanabileceği serbest veri (`{ requiresAuth: true, title: '...' }`). Eşleşen zincirdeki (layout → çocuk) `meta` nesneleri birleştirilir; layout'a yazılan `requiresAuth` çocuklarında da görünür. |
| `extend` | Rotaya iliştirilen ekstra veri; `meta` gibi zincir boyunca birleştirilir. `extend.targetOutlet` rotanın bileşeninin yerleşeceği adlandırılmış `RouterView`'ı seçer (bkz. [`RouterView`](#router-view)). |
| `keepAlive` | `true` ise bileşen örneği korunur: ayrılırken outlet'ten **ayrılır ve önbelleğe alınır** (`onDeactivated`), geri dönüşte aynı örnek aynı konuma yeniden bağlanır (`onActivated`); ikisi de sayfanın görünür alt bileşenlerine iletilir. Önbellek `app.router.evict(ad \| rota)` (argümansız: hepsi; o an ekranda olan örnek atlanır) ya da `app.dispose()` ile boşaltılır. |
| `redirect` | Bu rotaya gelindiğinde başka yola yönlendirir: `{param}` yer tutuculu yol dizesi ya da `(to) => yol` fonksiyonu. Ayrıntı: [Yönlendirme ve alias](#redirect-and-alias). |
| `alias` | Aynı rotaya açılan ek yol(lar); adres çubuğunda alias kalır. Ayrıntı: [Yönlendirme ve alias](#redirect-and-alias). |
| `validate(e)` | Eşleşme sırasında `{ uri, key, routes, params }` ile çağrılır; `false` döndürürse bu rota eşleşmiş sayılmaz (başka bir rota ya da `fallbacks.notFound` devreye girer). Zincirdeki her rotanın `validate`'i çalışır. |
| `onShow(component)` | Rotanın bileşeni kendi `RouterView`'ına her yerleştirildiğinde, bileşen örneğiyle çağrılır: ilk gösterim, parametre değişiminde yeniden oluşturma, `keepAlive` önbelleğinden dönüş. Layout rotaları için de çağrılır; gezinme boyunca yerinde kalan layout için tekrar çağrılmaz. Kancanın fırlattığı hata `MJX306` koduyla raporlanır, gezinmeyi durdurmaz. |

### Yönlendirme ve alias {#redirect-and-alias}

```tsx
const routes: RouteItem[] = [
  { path: '/eski-profil/{id}', redirect: '/users/{id}' },
  { path: '/ara/{q}', redirect: (to) => '/search?q=' + encodeURIComponent(to.params.q) },
  {
    path: '/users', control: UsersLayout, alias: '/people', childs: [
      { path: '/', control: UserList },
      { path: '/{id}', control: UserDetail, alias: '/profile/{id}' },
    ]
  },
];
```

**`redirect`**

- Dize biçiminde `{param}` yer tutucuları eşleşen parametrelerle dolar. Kaynak adresteki sorgu dizesi (`?…`) ve `#…`, hedef kendi sorgusunu/`#`'ını içermiyorsa hedefe taşınır.
- Fonksiyon biçimi `{ path, params, meta }` alır; döndürdüğü yol olduğu gibi kullanılır.
- Yönlendirme eşleşmeden hemen sonra, `onLeave` ve `useGuard` guard'larından **önce** uygulanır; guard'lar ve kancalar yalnızca hedef rota için çalışır. Kaynak rotanın bileşeni hiç oluşturulmaz.
- Zincir izlenir (`/a` → `/b` → `/c`). 10 adımı aşan ya da daha önce geçilen bir yola dönen yönlendirme durdurulur, istenen adreste `fallbacks.error` sayfası gösterilir ve geliştirme modunda konsola uyarı yazılır.
- Tarayıcı geçmişine yalnızca hedef girer. Adres çubuğu zaten kaynak yolu gösteriyorsa (ilk yükleme, geri/ileri) kayıt `replace` ile değiştirilir; böylece "geri" tuşu yönlendirmeye takılmaz.
- Hedefin nereden geldiği `to.redirectedFrom` (guard ve `onLeave` bağlamı) ve `onRouterChanged` yükündeki `redirectedFrom` alanıyla okunur.
- Yalnızca eşleşen **yaprak** rotanın `redirect`'i uygulanır. Bir layout'un `'/'` varsayılan çocuğu varsa layout yolunda eşleşen yaprak o çocuktur; bu durumda layout'a yazılan `redirect` çalışmaz, yönlendirmeyi varsayılan çocuğa yazın.

**`alias`**

- Alias, `path` ile aynı kuralla ebeveyn yoluna eklenir (`/admin` altındaki `alias: '/people'` → `/admin/people`). Parametreler alias kalıbından okunur.
- Layout'un alias'ı altında çocukları da açılır: yukarıdaki örnekte `/people/5` → `UserDetail`.
- Alias ile asıl yol aynı rotadır: aralarında geçişte bileşen korunur, yalnızca parametre değişirse `onUpdate` çalışır; `keepAlive` önbelleği de ortaktır.
- Bir alias başka bir rotanın asıl yoluyla çakışırsa asıl yol kazanır. Linter; alias'ın kendi yoluna eşit olmasında, iki rotanın aynı alias'ı kullanmasında ve çocuk alias'ında `/` öneki eksikliğinde uyarır.
- `app.router.fullPath` eşleşen kalıbı (alias'ta alias kalıbını), `app.router.aliasOf` asıl kalıbı verir (alias değilse `null`). `navigateByName` her zaman asıl yolu üretir.
- `RouterLink` sınıfları URL'ye bakar: `/people`'dayken `to="/users"` linki aktif sayılmaz.

### Rota yaşam döngüsü kancaları {#route-hooks}

`RouteItem` üzerinde, gezinme yaşam döngüsüne bağlı kancalar tanımlanabilir:

| Kanca | Ne zaman |
|-------|----------|
| `onEntering(ctx)` | Rota bileşeni oluşturulmadan önce (guard'lardan sonra; sayfa henüz DOM'da değil); aynı rotada parametre değişiminde `onUpdate`'ten sonra. |
| `onEnter(ctx)` | Rota bileşeni mount edildikten ve `onShow` çalıştıktan sonra. |
| `onLeave(ctx)` | Rotadan çıkarken (aynı rotada parametre değişiminde de), `useGuard` guard'larından önce. `false` veya `{ cancel: true, reason }` döndürerek gezinmeyi iptal eder. |
| `onUpdate(ctx)` | Aynı rotada yalnızca parametreler değiştiğinde; ardından `onEntering` çalışır. |

Sıra: `onLeave` (ayrılan rota) → `useGuard` → `onUpdate` (yalnızca parametre değişiminde) → `onEntering` → bileşen oluşturma ve yerleştirme → `onShow` → `onEnter` → `onRouterChanged`.

Bağlam nesneleri: `onEntering`/`onEnter` `{ path, params, meta, to: { path, params, meta } }`; `onLeave` `{ from: { path, params, meta }, to: { path, params, meta, redirectedFrom? } }`; `onUpdate` `{ from: { path, params }, to: { path, params }, meta }`. Kancalar `async` olabilir; router sonucunu bekler.

Bu kancaların fırlattığı hata (async kancada reddedilen promise dahil) ve `onShow`'un fırlattığı hata (async `onShow`'un reddedilen promise'i dahil) `MJX306` koduyla raporlanır; gezinme devam eder. Rota bileşeni oluşturulamazsa (yapıcı hata fırlatır, `import` başarısız olur) `MJX304` raporlanır ve `fallbacks.error` sayfası gösterilir.

`useRouter({ hooks })` ile aynı dört kanca (`onEntering`, `onEnter`, `onLeave`, `onUpdate`) uygulama genelinde tanımlanır; genel kanca yalnızca kendi kancası olmayan rotalar için çalışır, rotanın kendi kancası genel olanın yerine geçer.

```ts
{
  path: '/orders/{id}',
  control: () => import('../pages/Order'),
  onLeave: ({ from, to }) => {
    if (hasUnsavedChanges()) return { cancel: true, reason: 'Kaydedilmemiş değişiklik' };
  },
  onUpdate: ({ to }) => reloadOrder(to.params.id),
}
```

## Yol parametreleri {#params}

Parametreler `{name}` sözdizimiyle tanımlanır:

| Sözdizimi | Anlam |
|-----------|-------|
| `{id}` | Zorunlu parametre. |
| `{id:1}` | Zorunlu; `1` yalnızca `href` / `navigateByName` yol üretirken değer verilmezse kullanılır (`/h/{id:1}` kalıbı `/h` adresiyle eşleşmez). |
| `{id?}` | Opsiyonel. |
| `{id?:5}` | Opsiyonel, varsayılan `5`: adreste yoksa `params.id` `'5'` olur. |

```ts
{ path: '/docs/{page?:overview}', control: () => import('../pages/Docs') }
```

`href`, `navigateByName` ve `redirect` dizesi `{…}` yer tutucularını doldurur.

Parametrelere gezinme bağlamından/router'dan erişilir:

```ts
import { useNavigation } from "@motifx/core";
const nav = useNavigation();
console.log(nav.params.page);
```

`params` sorgu dizesi değerlerini de içerir. Yol parametreleri gibi sorgu değerleri de dizedir ve adreste yazıldığı gibi gelir (`/users/5?page=2` → `{ id: '5', page: '2' }`); `true`, `null`, `2025-10-27` ya da `{"a":1}` gibi değerler de metin kalır. Sayı, boolean ya da tarih gerekiyorsa değeri kendiniz çevirin (`Number(params.page)`). Tekrarlanan anahtar (`?t=a&t=b`) dizge dizisi olur (`['a', 'b']`). Aynı adda yol parametresi sorgu değerini ezer. `#…` kısmı hiçbir zaman `params`'a girmez.

Sorgu yalnızca gidilen adresten okunur: `history` modunda adreste `?` yoksa `params` sorgu değeri içermez (önceki sayfanın sorgusu taşınmaz). `hash`/`file` modunda `#`'ten önceki sorgu (`/?x=1#/a`) sayfa düzeyindedir; kendi sorgusu olmayan her rotada `params`'a gelir, rotanın kendi sorgusu (`#/b?z=3`) varsa onun yerine o kullanılır.

## Router'ı etkinleştirme {#use-router}

`Application` üzerinde `useRouter` ile rotaları ve modu tanımlayın:

```tsx
app.useRouter({
  routes,
  mode: 'history',                       // 'history' | 'hash' | 'file' | 'shell'
  fallbacks: {
    notFound: () => import('./pages/NotFound'),
    error: () => import('./pages/NotFound'),
  },
  hooks: { /* onEntering, onEnter, onLeave, onUpdate — kendi kancası olmayan rotalar için */ },
  scrollMemory: true,                    // kaydırma konumunu hatırla (varsayılan kapalı)
  stack: { retain: true },               // mobil tarzı yığın gezinmesi (varsayılan kapalı)
});
```

Yalnızca bir dizi de geçebilirsiniz: `app.useRouter(routes)`.

| Mod | Davranış |
|-----|----------|
| `'history'` | Yol adres çubuğunun yolu ve sorgusudur (`/docs?x=1`); gezinme `history.pushState` / `replaceState` ile yazılır. `mode` verilmezse varsayılandır. |
| `'hash'`, `'file'` | İkisi aynı çalışır: yol `#`'ten sonraki kısımdır (`/index.html#/docs`). `mode` verilmezse sayfa `file:` adresinden açıldığında (Electron gibi) bu davranış seçilir. `file:` altında `'history'` modu kullanılmaz; adresin yolu bir dosya yoludur. |
| `'shell'` | Adres çubuğuna ve tarayıcı geçmişine hiç dokunulmaz; router her zaman `/` ile başlar, sayfanın adresi ve sorgusu `params`'a girmez. `popstate`/`hashchange` dinlenmez: tarayıcının geri/ileri tuşu ya da bir `popstate` olayı router'ı hareket ettirmez. `stack` bu modda etkisizdir. |

### Kaydırma hafızası — `scrollMemory` {#scroll-memory}

Tek sayfalık uygulamada gezinme belgeyi değiştirir ama kaydırma konumunu değiştirmez; tarayıcı da bunu SPA için kendiliğinden yönetmez. `scrollMemory` açıldığında router her yolun son kaydırma konumunu tutar ve o yola dönüldüğünde (geri/ileri, bağlantı, yenileme) konumu yerine koyar:

```tsx
app.useRouter({ routes, mode: 'history', scrollMemory: true });
```

Kurallar:

- **Hiç görülmemiş yol** sayfa başından başlar (`top: false` ile kapatılır).
- **Adreste çıpa varsa** (`/docs/routing#guardlar`) çıpa hafızayı ezer; ilgili `id`'ye kaydırılır. Sabit bir üst şerit varsa CSS'te `scroll-margin-top` verin.
- **Gezinmeye özel `scroll` seçeneği** hafızayı ezer: `app.router.navigate('/x', { scroll: 'top' })` her zaman başa alır.
- Konumlar `sessionStorage`da tutulur, yani **yenilemeden sonra** da hatırlanır (`persist: false` ile kapatılır).

Ayar nesnesiyle ince ayar:

```tsx
app.useRouter({
  routes,
  scrollMemory: {
    top: true,          // görülmemiş yolda başa dön (varsayılan)
    anchor: true,       // çıpa kayıtlı konumu ezsin (varsayılan)
    settleMs: 1200,     // içeriğin oturmasını bekleme üst sınırı
    persist: true,      // sessionStorage'da sakla (varsayılan)
    limit: 60,          // kaç yol hatırlansın
    // Aynı sayfaya iki adresten geliniyorsa tek anahtara indirin:
    key: (path) => (path === '/docs' ? '/docs/giris' : path),
    // Pencere yerine bir kabın kaydırmasını hatırla (seçici, öğe ya da öğe döndüren fonksiyon):
    container: '#icerik',
  },
});
```

**Kaydırma bir kabın içindeyse** (sabit başlık ve sekme çubuğu olan mobil kabuklar gibi) `container` verin. Kap her gezinmede yeniden aranır, yani ilk açılışta henüz DOM'da olmaması sorun değildir; bulunamazsa pencere kaydırması kullanılır.

**İçerik asenkron çiziliyorsa** (uzak veri, markdown, sanal liste) endişelenmeyin: geri koyma tek seferlik değil, hedefe ulaşılana ya da `settleMs` dolana kadar her karede yeniden denenir. Kullanıcı bu sırada tekerlek/dokunuş/tuş/fare tıklamasıyla araya girerse deneme bırakılır.

**Maliyeti:** durağan hâlde sıfır. `scroll` olayı dinlenmez; konum her gezinmede bir kez okunur: guard'lar geçtikten sonra, adres uygulanmadan ve içerik değiştirilmeden hemen önce. O an ayrılan sayfa hâlâ ekrandadır ve konumu gerçektir; iptal edilen gezinmede konum okunmaz. Açıkken `history.scrollRestoration` `'manual'` yapılır ve konumlar `pagehide` / sayfa gizlenince de kaydedilir. Kapalıyken (varsayılan) hiçbir dinleyici bağlanmaz ve `history.scrollRestoration`a dokunulmaz.

**Çıpa kaynağı moda göre değişir.** Adres çubuğundaki `#…` yalnızca `history` modunda çıpa olarak okunur. `hash` / `file` (ve `shell`) modunda yalnızca rotanın kendi çıpası (`/sayfa#bolum`) kullanılır; adresin `#` kısmı rota olduğu için çıpa sayılmaz. Hafıza bu modlarda varsayılan `anchor` ayarıyla çalışır.

### Bulunamayan rota ve hata sayfası {#fallbacks}

Hiçbir rota eşleşmezse `fallbacks.notFound` bileşeni, URL'nin öneki olarak eşleşen **en derin layout'un** outlet'ine basılır (kabuk kaybolmaz), adres çubuğu istenen URL'ye güncellenir ve `app.router.ok` `false` olur (`app.router.params.path` istenen yolu taşır). Fallback tanımlı değilse gömülü bir "404 - Not Found" paneli gösterilir. `fallbacks.error` ise rota bileşeni yüklenemediğinde/hata fırlattığında aynı şekilde kullanılır (`params.error`).

## `RouterView` — rota çıktısı yerleştirme {#router-view}

Rota bileşenlerinin ekranda gösterileceği yer `RouterView`'dir. Layout içine yerleştirin:

```tsx file=src/layouts/MainLayout.tsx variant=function,options
import { RouterView } from "@motifx/core";

export default function MainLayout() {
  return (
    <div class="layout">
      <nav>...</nav>
      <main>
        <RouterView></RouterView>   {/* çocuk rotalar buraya gelir */}
      </main>
    </div>
  );
}
```
```tsx file=src/layouts/MainLayout.tsx variant=class
import { Component, RouterView } from "@motifx/core";

export default class MainLayout extends Component {
  view() {
    return (
      <div class="layout">
        <nav>...</nav>
        <main>
          <RouterView></RouterView>   {/* çocuk rotalar buraya gelir */}
        </main>
      </div>
    );
  }
}
```
`control: () => import('../layouts/MainLayout')` ile yüklenen modülün `default` dışa aktarımı (yoksa modülün kendisi) rota bileşeni olarak kullanılır. Sınıf `new Sınıf(app)`, fonksiyon `fn(app)` ile kurulur: ilk argüman çalışan `Application`'dır, rota bileşeni etiketten prop almaz. Options API nesnesi üreten fonksiyon rota bileşeni olamaz; `control` bir bileşen örneği ya da örnek döndüren sınıf/fonksiyon olmalıdır. Bileşen DI'da kayıtlıysa (`@Injectable` sınıf) örnek sağlayıcıdan çözülür.

Adlandırılmış `RouterView` desteklenir. Bir rotanın bileşeni varsayılan olarak üst rotanın `default` adlı `RouterView`'ına yerleşir; başka bir outlet'e yerleşmesi için rotada `extend.targetOutlet` verin:

```tsx
<RouterView name="sidebar"></RouterView>

// rota tanımı
{ path: '/filtreler', control: FilterPanel, extend: { targetOutlet: 'sidebar' } }
```

Her rota tek bir outlet'e yerleşir.

`app.run`'a kök bileşen vermezseniz, MotifJS köke otomatik olarak `name: 'default'` bir `RouterView` yerleştirir.

## Bağlantılar (links) {#links}

### `rel="router"` ile {#rel-router}

Standart `<a>` etiketine `rel="router"` ekleyerek MotifJS'in tıklamayı yakalamasını ve tam sayfa yenilemeden gezinmesini sağlayın:

```tsx
<a rel="router" href="/docs" class="btn btn-primary">Başla</a>
<a rel="router" href="/playground">Dokümantasyon</a>
```

`data-router-link` özniteliği de aynı işi görür. Ctrl/Meta/Shift/Alt ile yapılan tıklamalar, `target`'ı `_self` dışında olan bağlantılar ve `history` modunda başka origin'e giden adresler yakalanmaz. `hash`/`file` modunda `href="#/docs"` ve `href="/docs"` aynı yere gider.

### `RouterLink` bileşeni {#router-link}

Aktif/eşleşme sınıflarını otomatik yöneten bir bağlantı bileşenidir:

```tsx
import { RouterLink } from "@motifx/core";

<RouterLink
  to="/docs"
  activeClass="active"
  exactClass="exact-active"
>Dokümanlar</RouterLink>
```

Bağlantı bir `<a>` elemanıdır; başka bir etiket için `el` verilir. Prop'lar:

| Prop | Etki |
|---|---|
| `to` | Hedef yol; `href` olarak da yazılır. |
| `showHref` | `false` ise `href` yazılmaz; tıklama yine gezinir. |
| `target` | Öznitelik olarak yazılır. `_self` dışındaki bir değerde tıklama tarayıcıya bırakılır, router gezinmez. |
| `text` | Bağlantının çocuğu yoksa metni; çocuk varsa çocuklar kullanılır. |
| `bypass` | `true` ise tıklama router'a gitmez; bağlantı tarayıcıda normal bir bağlantı gibi açılır. |

Ctrl/Cmd/Shift/Alt ile yapılan tıklama tarayıcıya bırakılır. Diğer tıklamalarda `RouterLink` `router.navigate(to)` çağırır ve mevcut URL ile eşleşmeye göre sınıfları uygular:

| Sınıf / geri çağırım | Ne zaman |
|---|---|
| `activeClass`, `onActive` / `offActive` | Mevcut yol `to` ile başlıyorsa (segment bazında; tam eşleşme dahil). `/users/5`'teyken `to="/users"` aktiftir. |
| `exactClass`, `onExact` / `offExact` | Yalnızca mevcut yol `to` ile tam eşleştiğinde (sorgu dizesi ve `#` yok sayılır). |

Tam eşleşmede iki sınıf birlikte uygulanır. `to="/"` yalnızca kök yolda aktif olur; her yolun öneki sayılmaz.

### Herhangi bir bileşende rota sınıfları — `enableRouterClassing` {#router-classing}

`RouterLink`'in sınıf mantığı her bileşene açıktır: `motif.options.enableRouterClassing`'e bir `RouterClassingSettings` yazıldığında bileşenin kök elemanı, geçerli adres `path` ile eşleştikçe sınıf alır. Menü öğesi, sekme ya da kenar çubuğu başlığı gibi `<a>` olmayan elemanlar için kullanılır:

```tsx file=src/NavItem.tsx variant=class
import { Component } from "@motifx/core";

export class NavItem extends Component<HTMLLIElement, { path: string }> {
  onConfigured() {
    this.motif.options.enableRouterClassing = {
      to: 'all',
      path: this.props.path,
      activeClass: 'is-active',
      exactClass: 'is-exact',
    };
  }
  view() { return <span>{this.childs}</span>; }
}
```
```tsx file=src/NavItem.tsx variant=function
export function NavItem(props: { path: string }) {
  return <li onconfigured={(s) => {
    s.motif.options.enableRouterClassing = {
      to: 'all',
      path: props.path,
      activeClass: 'is-active',
      exactClass: 'is-exact',
    };
  }}>{props.childs}</li>;
}
```
```tsx file=src/NavItem.tsx variant=options
export const NavItem = () => ({
  el: 'li',
  onConfigured() {
    this.motif.options.enableRouterClassing = {
      to: 'all',
      path: this.props.path,
      activeClass: 'is-active',
      exactClass: 'is-exact',
    };
  },
  view() { return <span>{this.childs}</span>; },
});
```

| Alan | Açıklama |
|------|----------|
| `path` | Karşılaştırılacak yol. |
| `to` | Hangi eşleşmelerin işleneceği: `'all'` (ikisi), `'active'`, `'exact'`, `'none'`. |
| `activeClass` / `exactClass` | Boşlukla ayrılmış sınıf adları; eşleşme durumuna göre `classList.toggle` edilir. |
| `onActive` / `offActive` / `onExact` / `offExact` | Her değerlendirmede eşleşme durumuna göre çağrılan geri çağrılar. |

Eşleşme kuralları `RouterLink` ile aynıdır (aktif = segment öneki ya da tam; exact = tam; sorgu ve `#` yok sayılır). Ayar yazıldığı anda bir kez değerlendirilir, sonra her gezinmede (`onRouterChanged`) yeniden; abonelik bileşenle birlikte kalkar. Değerlendirme hatası `MJX105` olarak raporlanır. Router kurulmamışsa (`useRouter` yok) hiçbir şey yapmaz. Kök eleman gerekir; fragment köklü bileşende sınıf yazılacak eleman yoktur.

## Rota tablosunu sorgulama — `resolve`, `href`, `routes` {#resolve-href-routes}

`app.router` gezinmeden rota tablosunu sorgulamak için üç üye taşır:

```tsx
// Bir adres hangi rotaya eşleşir? (gezinmez, adres çubuğuna dokunmaz)
const hit = app.router.resolve('/users/5');
if (hit.ok) console.log(hit.route?.name, hit.params.id, hit.meta);

// Adlandırılmış rotanın yolu — RouterLink `to`, menü ve breadcrumb için
<RouterLink to={app.router.href('user', { id: 5 })}>Profil</RouterLink>

// Tanım sırasıyla bütün rotalar (takma adlar hariç); menü ya da site haritası üretmek için
const menu = app.router.routes.filter(r => r.meta.menu);
```

| Üye | Döndürür |
|-----|----------|
| `resolve(uri)` | `ResolveResult`: `{ ok, uri, fullPath, route, chain, params, meta, extend, aliasOf }`. Eşleşme yoksa `ok: false`. |
| `href(ad, params?)` | Adlandırılmış rotanın parametreleri doldurulmuş yolu (`navigateByName` ile aynı hesap). `0` ve `false` değerleri yazılır; `undefined`, `null` ve `''` verilen ya da hiç verilmeyen parametrede kalıbın varsayılanı kullanılır (varsayılan yoksa o segment yazılmaz). Ad yoksa `MJX302` fırlatır. |
| `routes` | `RouteInfo[]`: `{ fullPath, name, meta, route, chain }`. Layout ve varsayılan çocuk ayrı öğelerdir; `chain` kökten bu rotaya kadar olan rota tanımlarıdır. |

## Programatik gezinme {#navigate}

`Application` veya `useNavigation` üzerinden:

```tsx
// Bileşen içinden (context = Application)
this.context.navigate('/docs');

// Application örneğinden
await app.navigate('/docs/routing');
await app.navigateByName('order', { id: 42 });

// Gezinme seçenekleriyle (replace, state, force, scroll)
await app.navigate('/docs', { replace: true });
await app.router.navigate('/docs', { replace: true });
```

`app.navigate(uri, seçenekler?)` ile `app.router.navigate(uri, seçenekler?)` aynı `NavigationOptions` tipini alır; `app.navigate` seçenekleri router'a iletir.

| Seçenek | Etki |
|---------|------|
| `replace` | Yeni geçmiş kaydı eklemek yerine mevcut kaydı değiştirir. |
| `state` | Geçmiş kaydına yazılan değer (bkz. [Gezinme yönü ve kayıt durumu](#direction-state)). |
| `force` | Ekrandaki adrese yapılan gezinme normalde yok sayılır; `force: true` ile middleware, guard'lar ve `onRouterChanged` yine çalışır. Sayfa yeniden oluşturulmaz. |
| `scroll` | Gezinme sonunda kaydırma: `'top'`, `'smooth'`, `'instant'` ya da `{ top, left, behavior }`. Verildiğinde `scrollMemory`'yi ezer. |

`app.navigate` gezinmenin sonucunu döndürür: tamamlanan gezinmede gösterilen rotanın `ResolveResult`'ı (bulunamayan adreste ve hata sayfasında `ok: false`), yok sayılan gezinmede `{ ok: true, skipped: true, uri }`, guard ya da `onLeave` iptalinde `{ ok: false, cancelled: true, reason }` (`reason`: `'guard'`, `'onLeave'` ya da `onLeave`'in verdiği metin), middleware'in durdurduğu gezinmede `{ ok: false, uri, cancelled: true, reason: 'middleware' }`. `app.router.navigate` sonuç döndürmez.

`useNavigation()` kancası `app.router` ile aynı nesneyi döndürür:

```tsx
import { useNavigation } from "@motifx/core";

const nav = useNavigation();
await nav.navigate('/home');
await nav.navigateByName('order', { id: 7 });
nav.params;    // mevcut yol parametreleri
nav.route;     // mevcut rota
nav.uri;       // mevcut URI
nav.fullPath;  // tam yol
nav.meta;      // rota meta verisi
nav.chain;     // zincirdeki her rotanın yolu
```

### Canlı rota durumu {#live-route-state}

`app.router` uygulama boyunca tek nesnedir. Bir alana, `useApplication()`'dan ya da `useNavigation()`'dan alınan router her okumada güncel rotayı verir. Rota alanları (`params`, `route`, `uri`, `ok`, `meta`, `extend`, `fullPath`, `aliasOf`, `chain`, `direction`, `state`, `stack`) reaktiftir: bir fonksiyon içinde okunduklarında gezinmede yeniden çalışırlar.

```tsx file=src/Shell.tsx variant=class
import { Component, useNavigation } from "@motifx/core";

export class Shell extends Component<HTMLDivElement> {
  nav = useNavigation();
  view() {
    return <h1>{() => this.nav.params.id}</h1>;
  }
}
```
```tsx file=src/Shell.tsx variant=function
import { useNavigation } from "@motifx/core";

export function Shell() {
  const nav = useNavigation();
  return <h1>{() => nav.params.id}</h1>;
}
```
```tsx file=src/Shell.tsx variant=options
import { useNavigation } from "@motifx/core";

export const Shell = () => ({
  el: 'div',
  nav: useNavigation(),
  view() {
    return <h1>{() => this.nav.params.id}</h1>;
  },
});
```

- **Canlı okuma nesne üzerinden yapılır.** `const { params } = useNavigation()` ya da `const id = nav.params.id` o anın değerini alır ve sonradan değişmez; güncel değer için her seferinde `nav.params.id` okuyun.
- **Rota, eski sayfa kaldırıldıktan sonra ve yeni sayfa bağlanmadan önce değişir** (yığın gezinmesinde geçiş animasyonundan önce); `scoped` servisler de aynı anda yeni gezinmeye geçer. Ayrılan sayfa `onDeactivated` / `onDisposing` içinde kendi rotasını görür. Router'ın kurduğu yeni sayfa, yapıcısında ve alan başlangıç değerlerinde gidilen rotayı görür.
- **Guard ve rota kancaları** (`useGuard`, `onEntering`, `onUpdate`) rota değişmeden önce çalışır; gidilen rota bağlam nesnesindedir (`to`, `params`). İptal edilen gezinmede rota değişmez.
- **Önbellekteki `keepAlive` sayfalar** gizliyken de güncel rotayı okur: bağları başka bir rotaya geçildiğinde o rotanın değerleriyle yeniden çalışır. Rotaya bağlı işi (veri yükleme gibi) `onActivated` içinde yapın.
- `useRouter()` çağrılmadan önce rota alanları boştur (`params` `{}`, `uri` `''`, `route` `null`, `chain` `[]`) ve `navigate` `MJX309` fırlatır.

## Gezinme guard'ları ve kancaları (uygulama düzeyi) {#guards}

`Application` üzerinde global guard'lar ve kancalar tanımlanır:

```tsx
// Her gezinmeden ÖNCE çalışır — next() ile devam/yönlendir/iptal
app.useGuard(({ to, from }, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login');   // yönlendir
  } else {
    next();            // devam et
  }
  // next() hiç çağrılmazsa gezinme engellenir
  // next(false) → gezinmeyi iptal et
});

// Her navigasyondan SONRA (açılış ve 404 dâhil); açılışı ayırmak için initial alanını kullanın
app.onRouterChanged(({ uri, meta, initial }) => {
  document.title = meta?.title ?? 'Uygulama';
  if (!initial) trackPageView(uri);
});
```

Guard'lar açılış gezinmesi dahil her gezinmede, eklendikleri sırayla çalışır; ilk yönlendiren ya da iptal eden guard zinciri bitirir.

Guard'ın `next('/login')` yönlendirmesi, adres çubuğu engellenen yolu gösteriyorsa (ilk yükleme, geri/ileri) geçmiş kaydını `replace` ile değiştirir; "geri" tuşu tekrar engellenen yola dönüp aynı guard'a takılmaz. Programatik gezinmede (başka bir sayfadan) hedef normal biçimde geçmişe eklenir.

Guard hata fırlatırsa (ya da döndürdüğü promise reddedilirse) gezinme iptal edilir ve hata `MJX306` koduyla (`The guard hook threw.`) raporlanır; `app.navigate`'in sonucu `{ ok: false, cancelled: true, reason: 'guard' }` olur. Geri/ileri gezinmesinde adres, diğer iptallerde olduğu gibi geri alınır.

**Geri/ileri iptal edilirse adres geri alınır.** Tarayıcının geri/ileri tuşu (Android'de sistem geri hareketi de) adresi gezinme başlamadan değiştirir. Bir guard, `onLeave` ya da middleware bu gezinmeyi iptal ederse router adresi `history.go` ile ekranda duran sayfanın kaydına geri döndürür; adres ve ekran ayrışmaz, geçmiş de bozulmaz. "Kaydedilmemiş değişiklikler var" onayı bu sayede geri tuşunda da doğru çalışır. Bunun için router her geçmiş kaydının `history.state`'ine ad alanlı bir sıra damgası (`__motifHistory`) yazar; başka bir kod `history.pushState`'i doğrudan çağırırsa sıra hesabı kayabilir.

### Gezinme yönü ve kayıt durumu — `direction`, `state` {#direction-state}

Her gezinmenin yönü `direction` alanında gelir: `'initial'` (açılış), `'push'`, `'replace'`, `'back'`, `'forward'` ya da sırası bilinemeyen geçmiş hareketi için `'traverse'`. Yön guard'lara (`to.direction`), `onRouterChanged` yüküne ve `app.router.direction`'a yansır. Geçişleri yöne göre seçmek (ileride sola, geride sağa kaydırma) için kullanın.

`navigate(uri, { state })` ile verilen değer o geçmiş kaydına yazılır ve kayda **geri/ileri ile dönüldüğünde de** geri gelir; sayfa yenilense bile korunur. Adrese yazılmadan taşınması gereken veriler (listeden hangi filtreyle gelindi, açık sekme gibi) için uygundur:

```tsx
await app.navigate('/urun/7', { state: { from: 'liste', page: 3 } });

app.router.state;                // { from: 'liste', page: 3 } — geri/ileri ile dönüldüğünde de
app.useGuard(({ to }, next) => { console.log(to.direction, to.state); next(); });
app.onRouterChanged(({ direction, state }) => { /* ... */ });
```

Düz nesneler olduğu gibi saklanır (router yalnızca kendi damgasını ekler, `app.router.state` onu çıkarır); `Date`, `Map` gibi düz olmayan değerlere hiç dokunulmaz. `state` verilmemiş kayıtta `app.router.state` `undefined`'dır.

### Middleware — `app.use` {#middleware}

Gezinme çözümleme zincirine ara katman eklemek için:

```tsx
app.use(async (ctx, next) => {
  // ctx: RouteResolveContext — { uri, context (Application), rewritePath(uri) }
  if (ctx.uri === '/eski') ctx.rewritePath('/yeni');   // hedefi değiştir
  await next();  // zinciri devam ettir
});
```

Middleware'ler eklendikleri sırayla, yönlendirme (`redirect`), `onLeave` ve guard'lardan önce çalışır. `next()` çağırmayan middleware gezinmeyi iptal eder. `rewritePath` ile verilen adres gidilen ve adres çubuğuna yazılan adres olur. Router'ın açılış gezinmesinde (`run()` ve `restartRouter()`) middleware'ler çalışmaz; guard'lar çalışır.

### Router'ı yeniden başlatma ve kapatma {#restart-dispose}

`app.restartRouter()` yeni bir router kurar ve eskisini dispose eder. `run()`'dan sonra `useRouter` yeniden çağrıldıysa en son yapılandırma, çağrılmadıysa mevcut yapılandırma kullanılır; `run()`'dan sonra verilen yeni yapılandırma ancak `restartRouter()` ile devreye girer. Router güncel adreste yeniden başlar (`shell` modunda router'ın gösterdiği sayfada; hiç gezinmediyse `/`). Rota tablosu yeniden kurulur, `keepAlive` önbelleği ve yığında tutulan sayfalar atılır, sayfa yeniden oluşturulur; geçmişe kayıt eklenmez. `onRouterChanged` `initial: true` ve `direction: 'initial'` ile çalışır. `run()`'dan önce çağrılırsa hiçbir şey yapmaz.

`app.dispose()` router'ı da dispose eder (dinleyiciler, `keepAlive` önbelleği, yığındaki sayfalar) ve adresi yalnızca `history.replaceState` ile `/` yapar; `#` yazılmaz, geçmişe kayıt eklenmez.

## Yığın gezinmesi — `stack` {#stack}

Varsayılan davranışta sayfadan ayrılınca eski sayfa atılır, geri gelindiğinde yeniden oluşturulur. Mobil uygulamalarda beklenen ise **yığın** davranışıdır: ileri gidince önceki sayfa durumu, kaydırması ve formuyla korunur; geri gelince aynı örnek geri gelir. `stack` bunu açar:

```tsx
app.useRouter({
  routes,
  mode: 'history',
  stack: {
    retain: true,        // önceki sayfalar DOM'da gizli tutulsun (varsayılan false: bellekte, DOM'dan ayrılmış)
    depth: 5,            // en fazla kaç önceki sayfa tutulsun (varsayılan 5; taşan en eski sayfa atılır)
    persist: false,      // yığındaki adresler sessionStorage'a yazılsın (varsayılan false)
    animation: 'slide',  // 'none' (varsayılan) | 'slide' | özel fonksiyon
    duration: 300,       // 'slide' süresi (ms)
    swipeBack: true,     // ekranın sol kenarından sağa kaydırarak geri (varsayılan kapalı)
  },
});
```

`stack: true` varsayılan değerlerle açar. Seçenek verilmezse davranış yukarıda anlatıldığı gibidir; hiçbir şey değişmez. `shell` modunda geçmiş olmadığı için etkisizdir.

Kurallar:

- **Tutulan sayfa geçmiş kaydına bağlıdır, rotaya değil.** `/urun/1` → `/urun/2` → geri: `/urun/1`'in kendi örneği geri gelir. (Yığın açıkken aynı rotaya farklı parametreyle ileri gitmek yeni bir örnek oluşturur; `onUpdate` yine çağrılır.)
- **İleri gidince (push/forward) ayrılan sayfa tutulur; geri gidince (back) ayrılan sayfa atılır.** Tarayıcının ileri tuşu o sayfayı yeniden oluşturur. `replace` ile değiştirilen sayfa tutulmaz. Geri dönüp yeni bir yere gidince ileri kayıtların sayfaları atılır.
- Tutulan sayfa gizlenirken `onDeactivated`, geri geldiğinde `onActivated` ve rotanın `onShow` kancası çalışır. Sayfanın içindeki kaydırılabilir öğelerin konumu korunur.
- `retain: true` ile gizli sayfa DOM'da `display: none`, `inert` ve `aria-hidden` ile durur; stilleri geri gelince aynen geri konur. Sayfanın kökü bir öğe değilse (fragment) DOM'dan ayrılarak tutulur.
- `keepAlive` rotalar kendi önbelleğini kullanmaya devam eder.
- Uygulama ya da router dispose edilince tutulan tüm sayfalar dispose edilir.

**`app.router.stack`** yığının güncel listesini verir: `[{ index, uri, current, retained }]`. Geri düğmesinde önceki sayfanın adını göstermek gibi işler için kullanın. `persist: true` ile bu liste sayfa yenilemesinden sonra da gelir; yenilemede önceki sayfalar yeniden oluşturulmaz, geri gidildikçe oluşturulur.

**Geçiş animasyonu.** `animation: 'slide'` ileri gidişte yeni sayfayı sağdan kaydırır, geri gidişte mevcut sayfayı sağa çıkarır; bu sırada diğer sayfa altta durur. Animasyon `retain` ayarından bağımsız çalışır: `retain: false` iken ayrılan sayfa animasyon bitene kadar DOM'da kalır, sonra ayrılır. Kullanıcı sistemde "hareketi azalt" seçtiyse animasyon atlanır. Kendi animasyonunuzu yazmak için fonksiyon verin; iki sayfa üst üste konumlanmış olarak gelir, fonksiyon bitince stiller geri alınır:

```tsx
stack: {
  retain: true,
  animation: async ({ direction, entering, leaving }) => {
    await Promise.all([
      entering?.animate([{ opacity: 0 }, { opacity: 1 }], 200).finished,
      leaving?.animate([{ opacity: 1 }, { opacity: 0 }], 200).finished,
    ]);
  },
}
```

Yığın animasyonu çalışan gezinmede sayfaların kendi geçişleri (`motif.options.transition`, bkz. [Stil ve Animasyon](./styling-and-transitions.md)) oynamaz; geçişi yalnızca yığın animasyonu yapar.

**Sayfaların kendi geçişleri.** `animation` verilmezse yığın, sayfaların kendi giriş/çıkış geçişlerini kullanır; ayrıca bir yığın animasyonu tanımlamak gerekmez. Sıra yığın kapalıyken olduğu gibidir: önce ayrılan sayfanın çıkışı biter, sonra gelen sayfa girer.

- İleri gidişte ayrılan sayfa çıkış geçişini oynatır, bittikten sonra yığında tutulur (`retain` ayarına göre ayrılır ya da gizlenir). Geri gidişte ayrılan sayfa çıkış geçişini oynatarak atılır.
- Gelen sayfa giriş geçişini oynatır; yığından geri gelen tutulan sayfa da, `retain` hangi değerde olursa olsun, yeniden giriş geçişini oynatır.
- Geçişi olmayan sayfa anında ayrılır ya da gelir.
- Geçiş süresince sayfa öğesinde `data-nav-direction` özniteliği gezinmenin yönünü taşır (`initial`, `push`, `back`, `forward`, `replace`, `traverse`); geçiş bitince kaldırılır. Aynı CSS'le ileri ve geri için farklı animasyon yazılabilir:

```css
.page-enter-active { animation: slide-from-right .3s ease; }
.page-leave-active { animation: slide-to-left .3s ease forwards; }
[data-nav-direction="back"].page-enter-active { animation-name: slide-from-left; }
[data-nav-direction="back"].page-leave-active { animation-name: slide-to-right; }
```

**Kaydırarak geri.** `swipeBack: true` ile ekranın sol kenarından (varsayılan 24px) başlayan yatay dokunuş sayfayı parmakla birlikte kaydırır. Önceki sayfanın sürükleme sırasında altta görünmesi için `retain: true` gerekir; `retain: false` iken önceki sayfa DOM'da olmadığından altta sayfanın arka planı görünür, bırakınca geri gidiş yine çalışır. Genişliğin %35'ini (`threshold`) geçen ya da hızlı bir fiske geri gider, aksi hâlde sayfa yerine oturur. Guard geri gidişi iptal ederse sayfa geri kayar ve adres korunur. Kaydırarak yapılan geri gidişte sürükleme animasyonun kendisidir; sayfaların kendi geçişleri oynamaz. Ayarlar: `swipeBack: { edge: 24, threshold: 0.35 }`. Dokunuş dinleyicisi yalnızca kenardan başlayan dokunuşta etkin hâle gelir; sayfanın dikey kaydırmasını ve yatay kaydırılan içerikleri etkilemez.

## Lazy (tembel) yükleme {#lazy}

`control` alanında `() => import(...)` kullanmak, rota bileşenini yalnızca ihtiyaç anında yükler ve otomatik kod bölme (code splitting) sağlar:

```ts
{ path: '/reports', control: () => import('../pages/Reports') }
```

`fallbacks.notFound` ve `fallbacks.error` de aynı lazy biçimi destekler.

Bir bileşen içindeki tembel içerik için [Lazy](./lazy.md) kullanılır. Mobil ağda yükleme başarısız olabileceği için `retry` ile yeniden deneme açılabilir; cihaz çevrimdışıysa bağlantı gelene kadar beklenir:

```tsx
<Lazy caller={() => import('./Grafik')} options={{
  Loaderview: <Spinner />,
  Fallbackview: <YuklenemediKutusu />,
  retry: { count: 3, delayMs: 500, whenOnline: true },   // ya da kısaca retry: 3
  onRetry: (attempt, error) => console.warn('yeniden deneniyor', attempt),
}} />
```

Bekleme her denemede `delayMs` kadar artar (500, 1000, 1500…); `retry: 3` kısa yazımı `delayMs: 500` ve `whenOnline: true` kullanır. `onError` ve `Fallbackview` yalnızca son deneme de başarısız olursa devreye girer. Bekleme sırasında bileşen dispose edilirse ya da `signal` iptal edilirse deneme durur ve dinleyiciler temizlenir. `retry` verilmezse davranış tek denemedir.

## Sonraki adım {#next}

Servislerin nasıl kaydedilip enjekte edildiğini öğrenmek için [Dependency Injection](./dependency-injection.md) bölümüne geçin.
