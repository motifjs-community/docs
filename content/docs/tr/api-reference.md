---
slug: api-reference
title: API Referansı
description: "@motifx/core paketinden dışa aktarılan sembollerin hızlı referansı ve MJX hata/uyarı kodları tablosu."
category: reference
order: 1
---

Bu bölüm `@motifx/core` paketinden dışa aktarılan başlıca sembollerin hızlı referansıdır. Her satır, ilgili ayrıntılı bölüme bağlanır.

## Uygulama (Application) {#application}

| Sembol | Tür | Açıklama |
|--------|-----|----------|
| `Application` | class | Uygulama örneği. `Application.main` ile global örneğe, `this.context` ile bileşenden erişilir. |
| `Application.CreateBuilder()` | static | `ApplicationBuilder` üretir. |
| `ApplicationBuilder` | class | `services` koleksiyonunu taşır; `build()` ile `Application` üretir. |
| `app.run(host, root?)` | method | Uygulamayı bir DOM elemanına bağlar. |
| `app.useRouter(opts)` | method | Yönlendirmeyi tanımlar. |
| `app.restartRouter()` | method | Router'ı sıfırdan kurar ve bulunduğu adreste yeniden başlatır: çalışırken yeni bir `useRouter` yapılandırması verildiyse onu, yoksa mevcut yapılandırmayı kullanır. Rota listesi, keepAlive önbelleği, yığın ve kaydırma hafızası sıfırlanır, sayfa yeniden kurulur (`onRouterChanged` `initial: true` ile çalışır). `shell` kipinde router'ın gösterdiği sayfada kalır. `run`'dan önce etkisizdir. |
| `app.navigate(uri, seçenekler?)` / `app.navigateByName(name, params?, seçenekler?)` | method | Programatik gezinme; seçenekler router'a iletilir (`NavigationOptions`). Gezinme sonucunu döndürür (ör. guard iptalinde `{ ok: false, cancelled: true, reason: 'guard' }`). |
| `app.router.navigate(uri, seçenekler?)` | method | Seçenekli gezinme: `{ replace?, state?, force?, scroll? }` (`NavigationOptions`). |
| `app.router` | property | Uygulama boyunca tek nesne (`Router`); reaktif, salt okunur rota alanları: `params`, `route`, `uri`, `ok`, `meta`, `extend`, `fullPath`, `aliasOf`, `chain`, `direction`, `state`, `stack` (yalnızca `stack` açıkken). Bkz: [Routing](./routing.md#live-route-state). |
| `app.useGuard(guard)` / `app.use(mw)` | method | Gezinme guard'ı / middleware. Gezinme sonrası için `app.onRouterChanged(fn)`. |
| `app.on/fire/off` | method | Uygulama olay veriyolu. `on` abonelikten çıkma fonksiyonu döndürür. |
| `app.onRouterChanged(fn)` | method | Her gezinmede (açılış ve 404 dâhil) `{ uri, params, meta, route, ok, initial, redirectedFrom?, direction, state }` ile çalışır. |
| `app.onLifecycle(fn)` | method | Uygulama yaşam döngüsü: `{ state, visible, online }`; `state`: `'visible' \| 'hidden' \| 'frozen' \| 'resumed' \| 'restored' \| 'online' \| 'offline'`. Abonelikten çıkma fonksiyonu döndürür. Bkz: [Yaşam Döngüsü](./lifecycle.md). |
| `app.isVisible` / `app.isOnline` | property | Anlık görünürlük ve bağlantı durumu. |
| `app.router.evict(ad \| rota?)` | method | `keepAlive` önbelleğindeki örnekleri dispose eder (argümansız: hepsi). |
| `app.router.resolve(uri)` / `app.router.href(ad, params?)` / `app.router.routes` | method / property | Gezinmeden eşleşme (`ResolveResult`), adlandırılmış rotanın yolu, tanım sırasıyla rota listesi (`RouteInfo[]`). Bkz: [Routing](./routing.md). |
| `app.useDevelopment(b)` / `app.useLogging(b)` / `app.useReactiveMonitor(o)` | method | Geliştirme yapılandırması. |
| `app.dispose()` | method | Router'ı, yaşam döngüsü dinleyicilerini ve servis sağlayıcıyı bertaraf eder; adresi `history.replaceState` ile `/` yapar. |
| `useApplication()` | fn | `{ application, services, router, attach }`. |
| `useNavigation()` | fn | `app.router` ile aynı nesne (`Router`). |

Bkz: [Başlarken](./getting-started.md), [Routing](./routing.md).

## Bileşenler (Component) {#components}

| Sembol | Tür | Açıklama |
|--------|-----|----------|
| `Component` | class | Somut bileşen sınıfı. `super('div')` veya `super()`. |
| `ComponentBase` | class | Tüm bileşenlerin temeli. |
| `ComponentMotif` | class | `ComponentBase.motif` ad alanının tipi; kullanıcı `new` ile oluşturmaz. |
| `FNComponent(view)` | fn | Fonksiyon görünümünü bileşene sarar. |
| `motifComponent(el, props?)` / `motifFragment(props?)` / `motifCompiled(sözleşme)` | fn | Derleyicinin ürettiği koddaki çağrılar (`_mc`, `_mf`, `_mv`); `motifCompiled` derleyici sözleşmesi uyuşmazsa geliştirme modunda `MJX121` uyarısı verir. |
| `Frame` | class | Tek bir dinamik içeriği tutan/değiştiren fragment kapsayıcı: `navigate(page, keepOldControl?)` önceki içeriği bertaraf edip yenisini yerleştirir (dizi de alır), `navigateLazy(() => import(...), options?)` `Lazy` ile yükler, `flush()` içeriği bertaraf eder, `current` gösterilen içerik, `isBusy` gezinme sürüyor mu. `{() => ifade}` çocukları ve `when`/`ternary`/`switchCase` dalları bunun üstüne kuruludur. Bkz: [Frame](./frame.md). |
| `ContentBody` / `ContentBlock` | class | Çok parçalı gövde: `<ContentBody name="x"/>` gövde, `<ContentBlock target="x">…</ContentBlock>` parça; birden çok blok aynı gövdede birikir, her blok bertaraf edilince yalnız kendi parçalarını kaldırır. Bkz: [ContentBody ve ContentBlock](./content-body.md). |
| `Transport` / `TransportTo` | class | Bir bileşenin içeriğini ağacı dışındaki adlandırılmış bir yuvada gösterme (ör. sayfa komutlarını layout başlığına taşıma). Bkz: [Transport ve TransportTo](./transport.md). |
| `Transporter` | class | Programatik taşıma: `Transporter.transport(child, newParent, { index?, keepState?, owner? })`, `transportMany(children, newParent, options?)`. Bkz: [Transport ve TransportTo](./transport.md#transporter). |
| `FragmentNode` | class | Fragment (yorum düğümü) köklü bileşen; `motifFragment()` ve `<>…</>` bunu üretir. `childs` ve `props.nodes` içeriğe eklenir. |
| `ControlCollection` | class | `component.controls`'un tipi; `new` ile oluşturulmaz. |
| `Lazy({ caller, options? })` | fn | Dinamik import ile tembel içerik (`<Lazy caller={() => import('./X')} />`; `LazyOptions`: `Loaderview`, `Placeholderview`, `Fallbackview`, `minDelayMs`, `timeoutMs`, `signal`, `onError`, `mapResult`, `retry`, `onRetry`). Bkz: [Lazy](./lazy.md). |
| `Virtualization<T>` | class | Sanal kaydırmalı liste. |

### `ComponentBase` başlıca üyeleri {#component-base-members}

| Üye | Açıklama |
|-----|----------|
| `element` | Gerçek DOM düğümü. |
| `props` | Bileşen props'u. |
| `controls` | Alt kontrol koleksiyonu (`add(...c)`/`add(index, ...c)`/`insert(index, ...c)`/`remove`/`clear`/`clearAsync`/`detach`/`silentDetach`/`silentUnlink`/`move`/`moveToIndex`/`forEach`/`map`/`items`/`length`). Bkz: [Bileşenler](./components.md#controls). |
| `context` | Çalışan `Application`; üzerinden açılan `on`/`onRouterChanged` abonelikleri bileşen bertaraf edilince kalkar. |
| `class` / `attr` | Sınıf ve öznitelik yardımcıları. |
| `bindings` | Bağ koleksiyonu. |
| `state` (kullanıcı tanımlı) | Genelde `reactive({...})`. |
| `view()` | Şablonu döndüren metod. |
| `motif` | Çerçeve işlemlerinin ad alanı (`ComponentMotif`). Alt sınıf `show`, `on`, `clear`, `options` gibi adları kendi amacıyla tanımlayabilir; çerçeve yalnız `this.motif.*` yolunu kullanır. |
| `motif.on/off/trigger/addHandler` | Olay yönetimi; `x:` önekli adlar yaşam döngüsü olaylarıdır (`x:built`, `x:mounted`, `x:disposed`…). |
| `motif.show/hide/toggle` | Görünürlük. |
| `motif.options` | Bileşen ayar nesnesi (`transition`, `hideStrategy`, `disableDisposal`). |
| `motif.stopAnimations()` | Süren WAAPI ve CSS geçişlerini keser. |
| `isWait` | Bekletme (`x-wait` karşılığı; yazılabilir). |
| `isBuilt` / `isInitialized` / `isConfigured` / `isVisible` / `isDisposed` | Durum bayrakları. |
| `parent` / `childs` | Ebeveyn bileşen / etiket arasına yazılan JSX çocukları. |
| `using(promise, onfulfilled?, onrejected?)` / `doWork(promise)` | Bertaraf sonrası güvenli asenkron sonuç işleme. Bkz: [Bellek Yönetimi ve Dispose](./memory-and-dispose.md#using-dowork). |
| `dispose/disposeAsync` | Bertaraf. |
| `motif.clear()` | İçeriği (çocukları) bertaraf eder. |
| `motif.register/setDisposable` | Kaynak kaydı. |
| `getService(token)` | DI çözümleme. |
| `useModel(model)` | Reaktif model üretir. |
| `style(...)` / `setText(...)` | Yardımcılar. |
| `siblings` | `all/next/prev/nextAll/prevAll`. |
| `$(selector)` | `fromDom()` / `fromComponent()` sorgu. |

### Yaşam döngüsü kancaları {#lifecycle-hooks}

`onInitializing`, `onInitialized`, `onConfig`, `onConfigured`, `onBuilding`, `initializeComponent`, `oninitializeComponent`, `onBuilt`, `onMounted`, `onVisibilityChanged`, `onActivated`, `onDeactivated`, `onDisposing`, `onDisposed`.

`onRefCreated(sender)`: sınıfın `view()`'ındaki her `ref={this.x}` / `ref={ad}` uygulandıktan sonra çağrılır (`sender` ref verilen bileşen); geri çağırım biçimindeki `ref` için çağrılmaz. Bkz: [Bileşenler](./components.md#on-ref-created).

Bkz: [Bileşenler](./components.md), [Yaşam Döngüsü](./lifecycle.md).

## Reaktivite (store) {#reactivity}

| Sembol | İmza | Açıklama |
|--------|------|----------|
| `reactive(model)` | `<T>(m: T) => T` | Reaktif proxy. |
| `useModel(model)` | `<T>(m: T) => T` | `reactive` eş adı. |
| `createSignal(v)` | `<T>(v: T) => Signal<T>` | Tek değer signal'i. |
| `createComputed(fn)` | `<T>(fn) => Computed<T>` | Türetilmiş değer; kurulumda ve her değişimde hesaplanır. |
| `createLazyComputed(fn)` | `<T>(fn) => LazyComputed<T>` | Tembel türetilmiş değer; değişimde kirli işaretlenir, okunduğunda hesaplanır (`value`, `peek`, `isDirty`, `dispose`). |
| `effect(fn, onValue?)` | `(fn, cb?) => () => void` | Yan etki; durdurucu döner. `onValue` her koşudan sonra `fn`'in dönüş değerini alır, içindeki okumalar izlenmez. |
| `asyncTracking` | nesne | Derleyicinin `Virtualization dataRequest` içindeki `await`'leri sarmak için kullandığı çalışma zamanı yardımcısı (`capture`/`suspend`/`resume`/`end`); elle çağrılmaz. Bkz: [Reaktivite](./reactivity.md#await-reads). |
| `untracked(fn)` | `<T>(fn: () => T) => T` | İzlemesiz bölge; `fn`'in dönüş değerini verir. İçindeki `effect` çağrıları normal izler. |
| `deepClone(v)` | `(v) => v` | Derin kopya. |
| `clearModel(m)` | `(m) => void` | Reaktif kaydı temizle. |
| `Signal<T>` / `Computed<T>` / `LazyComputed<T>` | class | İnce taneli ilkeller. |

Bkz: [Reaktivite](./reactivity.md).

## Bağlar (bindings) — `component.bindings` {#bindings}

| Metot | Açıklama |
|-------|----------|
| `add(prop, source, member?, format?, formatInfo?)` | Tek yönlü bağ. `formatInfo`: `{ locale?, currency? }`. |
| `model(source, member?, format?, formatInfo?)` | İki yönlü bağ (eleman türüne göre). |
| `model(getter, setter)` | Fonksiyonlarla iki yönlü bağ; `x-model` buna derlenir. |
| `text(fn)` / `value(fn)` | `textContent` / `value` bağı. |
| `when(condFn, renderFn)` | Koşullu içerik; dal koşulun değeri değişince (`Object.is`, iki yanlış değer aynı sayılır) yeniden kurulur. |
| `ternary(condFn, trueFn, falseFn)` | İki dallı koşul; dal koşulun değeri değişince (`Object.is`) yeniden kurulur. |
| `list(itemsFn, renderFn)` / `loop(...)` | Liste; satırlar öğe nesnesiyle eşleşir. |
| `switchCase(discFn, cases, defaultFn?)` | Çoklu dal. |
| `method(fn)` | Reaktif metin/tek içerik. |
| `watch(fn)` | Otomatik temizlenen izleyici. |
| `wait(fn)` / `display(fn)` / `html(fn)` | Bekletme / görünürlük / innerHTML. |
| `remove(binding)` | Bağı koleksiyondan çıkarır ve devre dışı bırakır. |

Bkz: [Koşullu Gösterim ve Listeler](./conditionals-and-lists.md), [Formlar ve İki Yönlü Bağlama](./forms.md).

## Dependency Injection {#dependency-injection}

| Sembol | Açıklama |
|--------|----------|
| `ServiceCollection` | Kayıt koleksiyonu (`addSingleton/addScoped/addTransient`, `tryAdd*`, `replace`, `remove`, `has`). |
| `ServiceProvider` | Çözümleyici: `get(token)` senkron, `getAsync(token)` async fabrika/Promise kayıtları için, `createScope(ad?)` alt kapsam, `enableAutoDisposeTransients()` alt kapsamdaki transient'ları kapsamla bertaraf eder, `getAllServices()` koleksiyon, `dispose()`. Bkz: [Dependency Injection](./dependency-injection.md#service-disposal). |
| `@Injectable(opts?)` | Sınıfı otomatik kayıt için işaretler; `deps` yapıcı parametrelerini sırayla verir. Standart (TC39) sınıf dekoratörüdür. |
| `inject(token)` | Sağlayıcının kurduğu sınıfın alan başlatıcısında veya yapıcısında bağımlılığı çözer; dönüş tipi token'dan gelir. |
| `FromService(token)` | Uygulamanın sağlayıcısından hızlı çözümleme; çözümlenemezse `null` döner ve geliştirme modunda `MJX414` uyarısı verir. |
| `ServiceLifetime` | `'transient' \| 'singleton' \| 'scoped'`. |

Bkz: [Dependency Injection](./dependency-injection.md).

## Routing {#routing}

| Sembol | Açıklama |
|--------|----------|
| `RouteItem` | Rota tanımı tipi (`control` ya da `redirect`'ten biri zorunlu). |
| `RouteRedirect` / `RedirectTarget` | `redirect` değeri (`string \| (to) => string`) ve fonksiyona geçen `{ path, params, meta }`. |
| `RouterView` | Rota çıktısı yuvası (`name?`). |
| `RouterLink` | Aktif/eşleşme sınıflı bağlantı bileşeni (varsayılan eleman `<a>`). Prop'lar: `to`, `el`, `activeClass`, `exactClass`, `onActive`/`offActive`, `onExact`/`offExact`, `showHref`, `target`, `text`, `bypass` (tıklamayı tarayıcıya bırakır). Bkz: [Routing](./routing.md#router-link). |
| `NavigationDirection` | `'initial' \| 'push' \| 'replace' \| 'back' \| 'forward' \| 'traverse'`. |
| `StackOptions` | `useRouter({ stack })` ayarları: `retain`, `depth`, `persist`, `animation`, `duration`, `swipeBack`. |
| `StackEntryInfo` | `app.router.stack` öğesi: `{ index, uri, current, retained }`. |
| `RouteInfo` | `app.router.routes` öğesi: `{ fullPath, name, meta, route, chain }`. |
| `StackTransitionContext` | Özel yığın animasyonuna gelen `{ direction, entering, leaving }`. |
| `ScrollMemoryOptions` | `scrollMemory` ayarları; `container` ile kap kaydırması. |

Ayrıca `rel="router"` özniteliği ile standart `<a>` bağlantıları yönlendirmeye dahil edilir.

Bkz: [Routing](./routing.md).

## Bertaraf (disposable) {#disposable}

| Sembol | Açıklama |
|--------|----------|
| `IDisposable` | `{ dispose(): void }`. |
| `Disposable` | Bertaraf edilebilir nesnelerin temel sınıfı (`ComponentBase` bundan türer); `dispose()`. |
| `DisposableStore` | Grup temizliği (`add`, `delete`, `detach`, `clear`, `dispose`, `isDisposed`). |
| `disposableCore.toDisposable(fn)` / `toDisposable(fn)` | Fonksiyonu `IDisposable`'a sarar. |
| `disposableCore.disposableTracker` | Canlı bileşen sayımı için izleyici kancası (`IDisposableTracker`). |

Bkz: [Bellek Yönetimi ve Dispose](./memory-and-dispose.md).

## Ortak (common) yardımcılar {#common}

| Sembol | Açıklama |
|--------|----------|
| `dom` | DOM oluşturma yardımcıları: `createElement(tag, options?)` (etiket başına şablon eleman önbelleğe alınır ve klonlanır; `options` yalnız ilk oluşturmada geçer; `'text'` metin düğümü verir; `document` yoksa `MJX101`), `createElementNS(ns, tag, options?)` (hata `MJX103`), `createDocumentFragment()`, `createComment(metin)`, `createTextNode(metin)`, `querySelectorAll(seçici)`, `convertToSvgElement(el)` (elemanı SVG ad alanında yeniden oluşturup yerine koyar), `window`, `document`, `body`. |
| `List`, `Dictionary`, `LinkedList` | Koleksiyon yapıları. Bkz: [Koleksiyonlar](./collections.md). |
| `Query<T>` / `Query.from(kaynak)` / `Group<TKey, T>` | LINQ tarzı sorgu sarmalayıcısı (`where`, `select`, `orderBy`, `groupBy`, `first`, `any`, `aggregate`, `toArray` …). Bkz: [Koleksiyon Sorguları (Query)](./query.md). |
| `NameValuePair<K, V>` | `{ Key, value }` çifti (`Dictionary` öğesi). Bkz: [Koleksiyonlar](./collections.md#dictionary). |
| `NodeTypes` | Düğüm türü sabitleri (enum). |
| `Emitter<T>` | Tipli olay yayıcı: `emitter.event(listener, thisArgs?, disposables?)` abone olur ve `IDisposable` döndürür, `fire(value)` yayınlar, `dispose()` kapatır. Dinleyici hatası `setUnexpectedErrorHandler`'a gider. Bkz: [Hata Yönetimi](./error-handling.md#emitter). |
| `JSX` | JSX tip ad alanı (`JSX.Element`, `JSX.IntrinsicElements`); derleyici `jsx-runtime` için kullanır. |
| `preProcessing(fn)` | Geri çağrıyı kalıcı bir listeye ekler ve listedeki bütün geri çağrıları hemen çalıştırır; stil enjeksiyonu gibi tek seferlik kurulumlar için. |
| `safeCall`, `safeCallAsync`, `safeCallSilent` | Hata-güvenli çağrı yardımcıları. |
| `errorHandler` / `setUnexpectedErrorHandler(fn)` | Merkezî hata yöneticisi. `errorHandler.addListener(fn)` çerçevenin raporladığı her hatayı `MotifError` olarak alır. `setUnexpectedErrorHandler(fn)` yalnız kodsuz beklenmeyen hataları alır (`safeCall`/`safeCallAsync` içinde ve `Emitter` dinleyicilerinde yakalananlar; bunlar `addListener` dinleyicilerine de olduğu gibi gider); varsayılanı hatayı `setTimeout` ile yeniden fırlatır. Kodlu raporlar (`MJX122`, `MJX123`, `MJX208` …) ona gitmez. Bkz: [Hata Yönetimi](./error-handling.md), [Hata ve uyarı kodları](#error-codes). |
| `MotifError` / `MotifErrorCode` | Çerçevenin fırlattığı ve raporladığı hataların sınıfı; `code` (`"MJX302"` gibi) ve `[motifjs] MJX302: …` biçiminde İngilizce mesaj taşır, varsa asıl hata `cause`'dadır. |
| `TransitionProps` | Geçiş yapılandırması arayüzü (tip). |
| `Bind<T>` / `toGetter(v)` / `read(v)` | Prop sözleşmesi: `T \| (() => T)`; `toGetter` canlı okuma için getter'a çevirir, `read` anlık değeri verir. |
| `Resilience` | Dayanıklılık yardımcıları: `Resilience.create.retry(...).timeout(...).execute(fn)` (ayrıca `circuitBreaker`, `bulkhead`, `rateLimiter`, `fallback`). Hataları `MJX602`–`MJX605`. Bkz: [Dayanıklılık (Resilience)](./resilience.md). |
| `decorate(policy, fn)` | Bir dayanıklılık politikasını fonksiyona sarar: `(ctx?) => policy.execute(fn, ctx)`. |
| `ErrorHandler` | `errorHandler` örneğinin sınıfı: `report(err)`, `addListener(fn)`, `setDevelopmentMode(b)`, `setConsoleLogging(b)`, `isDevelopment()`, `safeCall`/`safeCallSilent`/`wrapSafe`/`wrapSafeAsync`. |

## Tipler {#types}

Değer taşımayan, yalnız `import type` ile alınan dışa aktarımlar. Davranışları ilgili bölümde anlatılır; burada ad ve biçimleri toplanmıştır.

| Tip | Biçim / Açıklama | Bkz. |
|-----|------------------|------|
| `IBaseProp<TProps>` | Her bileşen yapıcısının kabul ettiği ortak prop'lar: `TProps` + `childs`, `options`, `onElementCreating`, `initializeComponent`, yaşam döngüsü kancaları (`onConfig`, `onBuilt`, `onMounted`, `onActivated` …), `runover: { initializeComponent? }`; diğer anahtarlar serbesttir (`ref`, `key`, `transition` burada ayrıca tiplenmez). | [Bileşenler](./components.md#props), [Yaşam Döngüsü](./lifecycle.md) |
| `MotifBaseProps` / `MotifBindable<T>` / `MotifValue<T>` / `MotifClass` / `MotifStyle` | JSX öznitelik tipleri: değer ya da getter kabul eden `class`/`style`/öznitelik biçimleri. | [JSX ve Şablonlar](./jsx.md) |
| `Bind<T>` | `T \| (() => T)`; prop sözleşmesi. | [JSX ve Şablonlar](./jsx.md#attribute-ternary) |
| `ComponentBaseOptions<TProps>` | `motif.options` nesnesinin tipi: `transition` (API), `enableRouterClassing` (setter), `hideStrategy`, `disableDisposal`, `props`, `getInstance()`, `hasEvent(ad)`. | [Yaşam Döngüsü](./lifecycle.md#hide-strategy), [Stil ve Animasyon](./styling-and-transitions.md) |
| `RouterClassingSettings` | `{ to, path, activeClass?, exactClass?, onActive?, offActive?, onExact?, offExact? }`. | [Routing](./routing.md#router-classing) |
| `TransitionProps` / `TransitionMode` / `CSSTransitionInfo` | Geçiş sınıf adları ve süresi / `'concurrent' \| 'out-in' \| 'in-out'` / elemanın hesaplanmış geçiş bilgisi. | [Stil ve Animasyon](./styling-and-transitions.md) |
| `IDisposeOptions` | `{ deep?, skipLeaveTransition? }` — `dispose()` seçenekleri. | [Yaşam Döngüsü](./lifecycle.md#dispose) |
| `IDisposable` / `IDisposableTracker` | `{ dispose() }` / `disposableCore.disposableTracker` kancası. | [Bellek Yönetimi ve Dispose](./memory-and-dispose.md) |
| `EventArgs` | `{ cancel: boolean }` — kanca ve `motif.trigger` olay nesnesi. | [Yaşam Döngüsü](./lifecycle.md#class-hooks) |
| `HtmlElementEvents` / `AnyEvents` | `motif.on` olay adlarının tipi: DOM olay adları değiştiricileriyle (`'click:once:prevent'`) ve `x:` yaşam döngüsü adları. | [Olaylar](./events.md#modifiers) |
| `ElementType` / `IElement` / `IHtmlElement` | `Component<TElement>` generic'inin kabul ettiği eleman tipleri. | [Bileşenler](./components.md#root-element) |
| `MotifComponentType` / `MotifComponentConstructor` / `MotifFunctionalComponent` / `MotifFunctionalComponentBasic` / `AnyFunctionalComponent` | Sınıf, yapıcı ve fonksiyon bileşeni tipleri (JSX etiket tipleri için). | [Bileşenler](./components.md) |
| `EffectFn` / `AsyncTrackingToken` | `effect` fonksiyon tipi / `asyncTracking` belirteci. | [Reaktivite](./reactivity.md) |
| `ReadonlySignal<T>` | `asReadonly()` görünümü: `value`, `peek()`. | [Reaktivite](./reactivity.md#create-signal) |
| `AppLifecycleState` / `AppLifecycleEventArgs` | `'visible' \| 'hidden' \| 'frozen' \| 'resumed' \| 'restored' \| 'online' \| 'offline'` / `{ state, visible, online }`. | [Yaşam Döngüsü](./lifecycle.md#app-lifecycle) |
| `RouteItem` / `RouteItemBase` / `RouteControl` / `RouteRedirect` / `RedirectTarget` | Rota tanımı ve parçaları. | [Routing](./routing.md#route-item) |
| `RouterOptions` / `RouterEvents` | `useRouter({...})` nesnesi / genel kancalar `{ onEntering?, onEnter?, onLeave?, onUpdate? }`. | [Routing](./routing.md#use-router) |
| `Router` / `RouteInfo` / `ResolveResult` / `RouterViewProps` | `app.router` nesnesi / `routes` öğesi / `resolve()` sonucu / `RouterView` prop'ları (`name?`). | [Routing](./routing.md#live-route-state) |
| `NavigationOptions` / `NavigationDirection` / `NavigationGuard` / `NavigationGuardContext` | Gezinme seçenekleri / yön / guard imzası `(ctx, next) => void` / `{ to, from }`. | [Routing](./routing.md#guards) |
| `RouterNavigatedEventArgs` | `onRouterChanged` yükü: `{ uri, params, meta, route, ok, initial, redirectedFrom?, direction?, state? }`. | [Routing](./routing.md#guards) |
| `RouterValidateEventArgs` | `validate(e)` argümanı: `{ uri, key, routes, params }`. | [Routing](./routing.md#route-item-fields) |
| `RouteResolveContext` | Middleware bağlamı: `{ uri, context, rewritePath(uri) }`. | [Routing](./routing.md#middleware) |
| `ScrollMemoryOptions` / `StackOptions` / `StackSwipeBackOptions` / `StackEntryInfo` / `StackTransitionContext` | Kaydırma hafızası ve yığın gezinmesi ayarları. | [Routing](./routing.md#scroll-memory), [Routing](./routing.md#stack) |
| `ServiceLifetime` / `ServiceDescriptor` | `'transient' \| 'singleton' \| 'scoped'` / kayıt tanımı (`token`, `lifetime`, `useClass`/`useValue`/`useFactory`, `deps`). | [Dependency Injection](./dependency-injection.md#registration-forms) |
| `LazyOptions<T>` / `LazyRetryOptions` | `Lazy` seçenekleri / `{ count, delayMs?, whenOnline? }`. | [Lazy](./lazy.md#options) |
| `RetryOptions` / `TimeoutOptions` / `CircuitBreakerOptions` / `BulkheadOptions` / `RateLimiterOptions` / `FallbackOptions<T>` | `Resilience` politika seçenekleri. | [Dayanıklılık (Resilience)](./resilience.md#policies) |
| `ResiliencePolicy` / `ResilienceAction<T>` / `ResilienceContext` / `CircuitState` | `{ execute(action, ctx?) }` arabirimi (`Resilience` uygular, `decorate` kabul eder) / `(ctx?) => T \| Promise<T>` / serbest bağlam nesnesi / `'CLOSED' \| 'OPEN' \| 'HALF_OPEN'`. | [Dayanıklılık (Resilience)](./resilience.md#chain) |
| `TransportOptions` | `Transporter.transport` seçenekleri `{ index?, keepState?, owner? }`. | [Transport ve TransportTo](./transport.md#transporter) |
| `VirtualizationProps<T>` / `VirtualizationDataRequest` / `VirtualizationDataResponse<T>` / `VirtualizationState<T>` | Sanal liste prop'ları, istek/yanıt ve durum nesneleri. | [Sanal Listeler (Virtualization)](./virtualization.md#props) |
| `MotifErrorCode` | Bütün `MJX` kodlarının birleşimi. | [Hata Yönetimi](./error-handling.md#motif-error) |
| `Group<TKey, T>` | `Query.groupBy` öğesi `{ key, items }`. | [Koleksiyon Sorguları (Query)](./query.md#chaining) |
| `JSX` | JSX tip ad alanı. | [JSX ve Şablonlar](./jsx.md) |
| `__attr`, `CustomParameters`, `IsOptional`, `OptionalParams`, `IAttribute`, `IClass` | Tip yardımcıları ve `attr`/`class` yardımcılarının arayüzleri; doğrudan kullanılmaz. | — |

## Geliştirici araçları {#devtools}

| Sembol | Açıklama |
|--------|----------|
| `app.useReactiveMonitor(o)` / `configureReactivityLeakMonitor(o)` | Reaktif bağımlılık sızıntı uyarıları (`{ enabled, threshold, name }`). |
| `debugGetDeps(hedef)` / `debugGetDepMap()` | Reaktif bağımlılık haritaları; `@motifx/core/devtools` alt yolundan: `import { debugGetDeps } from "@motifx/core/devtools"`. |

## JSX özel öznitelikleri {#jsx-attributes}

| Öznitelik | Açıklama |
|-----------|----------|
| `class` / `className` | Sınıf (string/dizi/nesne/getter). |
| `style` / `x-style` | Stil. |
| `on<event>` | DOM olayı (`:once`, `:prevent`, `:stop`, `:capture`, `:passive`, `:self`, `:trusted`). |
| `on:ad` / `on-ad` / `on_ad` | İşleyiciyi olduğu gibi `motif.on("ad", fn)` ile bağlar (DOM ve özel olaylar; yalnız önek atılır, `on-my-event` → `my-event`); parametre sayısı ≤ 1 → `fn(event)`, 2+ → `fn(sender, event)`. |
| `ref` / `x-ref` | Etiketin bileşen örneğini yakala: `ref={(c) => …}` ya da `ref={this.alan}`, her etikette, tam bir kez; ikisi aynı etikette birlikte yazılırsa kaynaktaki sırayla çalışır. Yalnız verildiği bileşende çalışır (fonksiyon bileşeninde döndürülen kök); `props`'ta ve `this.props`'ta yer almaz. İçteki bir öğe için ayrı bir prop adı kullanın (ör. `inputRef`). |
| `initializeComponent` | Etiketin bileşeniyle kurulumda bir kez çağrılır (düz DOM, sınıf ve fonksiyon bileşeni etiketinde aynı; fonksiyonda döndürülen kök). Derleyicinin ürettiği kurulum koduyla birlikte çalışır. |
| `oninitializeComponent` | Bütün `initializeComponent` kodundan (sınıf metodu, etiketteki değer, derleyicinin ürettiği) hemen sonra, `view()`'den önce çağrılır. Sınıf metodu ya da etiket prop'u olarak yazılır; fonksiyon bileşeninde döndürülen köke uygulanır. |
| `x-html` | Reaktif `innerHTML`. |
| `x-wait` / `x-display` | Bekletme / görünürlük. |
| `key` | Liste öğesini tanımlar; geliştirme modunda yinelenmeye karşı denetlenir (`MJX202`). Satır eşleşmesi öğe nesnesiyle yapılır, `key` DOM'un yeniden kullanımını değiştirmez. |
| `transition` | Giriş/çıkış geçişi (string veya `TransitionProps`). |
| `on<lifecycle>` / `x-<lifecycle>` / `x:<lifecycle>` | Yaşam döngüsü kancaları; aynı etikette birden çok yazım birleşir, hepsi kaynaktaki sırayla çalışır. |
| `options={{ hideStrategy, disableDisposal }}` | Bileşen ayarları; `motif.options`'a kopyalanır (düz DOM etiketinde de; öznitelik yazılmaz). Bkz: [Yaşam Döngüsü](./lifecycle.md). |
| Metot adlı öznitelikler | `focus`, `blur`, `click`, `select`, `scrollTo`/`scrollBy`/`scrollIntoView`, `show`, `showModal`, `close`, `showPopover`, `hidePopover`, `togglePopover`, `requestSubmit`, `checkValidity`, `reportValidity`, `showPicker`, `load`, `setSelectionRange`, `setRangeText`, `setPointerCapture`, `releasePointerCapture`, `fastSeek` … elemanın aynı adlı metodunu çağırır, öznitelik yazılmaz; getter verilirse her değişimde yeniden çağrılır. `show`/`showModal`/`showPopover` `true` ile açar, `false` ile kapatır (`close()`/`hidePopover()`); `togglePopover` boolean'ı iletir; `close`, `requestSubmit`, `load` gibi metotlar doğru (truthy) değerde çağrılır; `setSelectionRange` gibi argümanlı metotlar değeri argüman olarak alır (dizi → argüman listesi). |

Bkz: [JSX ve Şablonlar](./jsx.md).

## Hata ve uyarı kodları {#error-codes}

Çerçevenin ürettiği her mesaj bir `MJX` kodu taşır ve konsolda `[motifjs] MJX302: …` biçiminde görünür.
`MJX001`–`MJX099` derleyiciye (`@motifx/compiler`) aittir, bkz. [JSX ve Şablonlar](./jsx.md#compile-time-diagnostics);
`MJX1xx` ve sonrası çalışma zamanına.

- **Fırlatılan hatalar** `MotifError`'dur; `code` alanıyla ayırt edilir (`catch (e) { if (e.code === 'MJX302') … }`).
- **Raporlanan hatalar** (bileşen ve rota kancaları, guard'lar, olay işleyicileri, effect'ler, bertaraf ve veri yükleme hataları gibi akışı durdurmayanlar) `errorHandler`'a gider:
  konsola yazılır (`app.useLogging(false)` kapatır), `errorHandler.addListener(fn)` dinleyicilerine `MotifError`
  olarak ulaşır ve asıl hata `cause` alanındadır.
- **Uyarılar** yalnız geliştirme modunda (`app.useDevelopment(true)`) konsola yazılır ve devtools uyarı listesine eklenir.

| Kod | Tür | Anlamı |
|-----|-----|--------|
| `MJX101` | hata | Eleman oluşturulurken `document` yok (DOM ortamı yok). |
| `MJX102` | hata | Geçersiz eleman seçicisi. |
| `MJX103` | rapor | `createElementNS` başarısız. |
| `MJX104` | uyarı | Kendi ebeveynini içeren bileşen DOM'a eklenmedi. |
| `MJX105` | rapor | Yönlendirici bağlantı sınıfları uygulanamadı. |
| `MJX106` | uyarı | Yer tutucu ebeveyni değişti, bileşen yeniden kuruluyor. |
| `MJX107` | rapor | Çocuk bileşen bertaraf edilemedi. |
| `MJX108` | değer | `doWork` sonucu bileşen bertaraf edildiği için atıldı. |
| `MJX109` | uyarı | Bir `ContentBlock` bertaraf edilirken gövdedeki kendi parçası kaldırıldı (parça başına bir uyarı). |
| `MJX110` / `MJX111` | hata | `Lazy` zaman aşımı / iptal. |
| `MJX112` | rapor | `resolveComponent` fabrika zinciri çok derin (100 düzey); bir fabrika kendini döndürüyor olabilir. |
| `MJX113` | hata | Taşıma yuvasının ebeveyni yok. |
| `MJX114` / `MJX115` | rapor | Gezinme hedefi yerleştirilemedi / önceki hedef bertaraf edilemedi. |
| `MJX116` | hata | Dinleyici koruyucusu zaman aşımı. |
| `MJX117` / `MJX118` | rapor | Kontrol ayrılamadı / `onRemove` geri çağrısı başarısız. |
| `MJX119` / `MJX120` | rapor | Fragment DOM aralığının kapanış işaretçisi bulunamadı. |
| `MJX121` | uyarı (dev) | Kod başka bir derleyici sözleşmesi için derlenmiş; `@motifx/compiler` ile `@motifx/core`'u aynı major sürüme getirin, derlenmiş JSX taşıyan paketleri yeniden derleyin. |
| `MJX122` | rapor | Bir bileşen kancası (`onConfig`, `onConfigured`, `onBuilding`, `onBuilt`, `onMounted`, `onActivated`, `onDeactivated`, `onDisposing`, `onDisposed`, `initializeComponent`, `ref` …; sınıf metodu ya da etiketteki `on<lifecycle>`/`x-<lifecycle>`/`x:<lifecycle>` prop'u) hata fırlattı ya da döndürdüğü promise reddedildi; bileşen kurulmaya devam eder. Düz etikette ve sınıf bileşeni etiketinde fırlatan `ref` geri çağrısı da raporlanır, bileşen yine oluşturulur. Kodla `motif.on('x:built', fn)` biçiminde eklenen yaşam döngüsü dinleyicileri (`x:configured`, `x:disposed`, `x:mounted` …) de bu kodla raporlanır (`The component x:built hook threw.`). |
| `MJX123` | rapor | Bir olay işleyicisi (`onClick` …, `motif.on`) ya da uygulama olayı dinleyicisi (`app.on` / `app.fire`, `onRouterChanged` dahil: `The 'motifjs-router-navigated' event handler threw.`) hata fırlattı ya da döndürdüğü promise reddedildi. |
| `MJX124` | uyarı (dev) | Düz DOM etiketine yayılan nesnede `innerHTML` anahtarı var; yazılmadı. Güvendiğiniz HTML için `x-html` kullanın. |
| `MJX125` | uyarı (dev) | Düz DOM etiketine yayılan nesnede `href`/`src`/`action`/`formaction`/`xlink:href` için `javascript:` URL'si var; değer yazılmadı. Bilerek yazılan bağlantıyı etikete doğrudan yazın. |
| `MJX126` | rapor | `Lazy` yüklemesi başarısız oldu ve `Fallbackview` yok; kapsayıcı boşaltıldı. Özgün hata `cause`'dadır. |
| `MJX201` | hata | `ListBinding` `renderFn` bileşen döndürmedi. |
| `MJX202` | uyarı | Listede yinelenen `key`. Satırlar `key` ile değil öğe nesnesiyle eşleştiği için çizim etkilenmez; `key`'ler öğeleri tanımlasın diye benzersiz tutulmalıdır. |
| `MJX203` | uyarı | Kendini yeniden tetikleyen effect bu akıtmada atlandı. |
| `MJX204` | uyarı | Bir bileşen metin bağına düştü. |
| `MJX205` / `MJX207` | rapor | `Virtualization` `watch` geri çağrısı / veri yükleme başarısız (sonraki sayfa isteği dahil). |
| `MJX206` | uyarı | `Virtualization` `autoRefresh` durduruldu. |
| `MJX208` | rapor | Bir effect ya da bağ fonksiyonu hata fırlattı; aynı akıtmadaki diğer effect'ler çalışmaya devam eder. |
| `MJX301` | uyarı | `RouterView` çıkışı zamanında kurulmadı. |
| `MJX302` | hata | Adlandırılmış rota bulunamadı. |
| `MJX303` | uyarı | Yönlendirme döngüsü ya da çok fazla yönlendirme; fırlatılmaz, hata sayfası bu `MotifError`'u `params.error`'da alır. |
| `MJX304` / `MJX305` | rapor | Rota yürütülemedi / hata rotası başarısız. |
| `MJX306` | rapor | Bir rota kancası (`onLeave`, `onEnter`, `onEntering`, `onUpdate`, `onShow`) ya da `useGuard` guard'ı hata fırlattı; guard hatası gezinmeyi iptal eder. |
| `MJX307` / `MJX308` | rapor | Rota bileşeni bertaraf edilemedi / yığın geçişi başarısız. |
| `MJX309` | hata | Yönlendirici kurulmadan gezinme (`useRouter()` çağrılmadı). |
| `MJX310`–`MJX316` | uyarı | Rota tanımı denetimi: boş yol, `/` ile başlamayan çocuk yolu ya da takma ad, ebeveynle aynı yol, yinelenen yol ya da takma ad. |
| `MJX401` | hata | Servis kayıtlı değil. |
| `MJX402` | hata | Eşzamansız fabrika `get()` ile istendi; `getAsync()` kullanın. |
| `MJX403` / `MJX404` | hata | Geçersiz servis tanımı / döngüsel bağımlılık. |
| `MJX405` / `MJX406` | hata | İkinci `ApplicationBuilder` / `run()` hedefi bulunamadı. |
| `MJX407` / `MJX408` | uyarı | `getService` sağlayıcı bulamadı / çözümleme başarısız. |
| `MJX409` | hata | `inject()` servis kurulumu dışında çağrıldı. |
| `MJX410` / `MJX411` | uyarı | Kayıtta birden çok kaynak / `deps` dizi değil. |
| `MJX413` | hata | Kurulamayan bir fonksiyon (ok, `async`, metot) doğrudan kaydedildi; `{ useValue: fn }` ya da `{ useFactory: fn }` kullanın. |
| `MJX414` | uyarı | `FromService` çözümleyemedi; `null` döner. |
| `MJX501` | uyarı | Zaten bertaraf edilmiş nesne yeniden bertaraf edildi. |
| `MJX502` / `MJX505` | hata | Bir disposable kendine kaydedildi / bir depo kendi içinden silinmeye çalışıldı. |
| `MJX503` | hata | Bir depo bertaraf edilirken birden çok hata oluştu; hataların hepsi `cause` alanındaki `AggregateError`'ın `errors` dizisindedir (tek hata olduğu gibi fırlatılır). |
| `MJX504` | uyarı | Bertaraf edilmiş bir `DisposableStore`'a ekleme yapıldı (eklenen nesne sızar). |
| `MJX507` | uyarı | Olası dinleyici sızıntısı. |
| `MJX601` | hata | `Query.first()` boş dizide. |
| `MJX602`–`MJX605` | hata | `Resilience`: devre açık, bulkhead kuyruğu dolu, oran sınırı, zaman aşımı. |
| `MJX607` / `MJX608` | hata | Boş geçmiş / desteklenmeyen işlem. |
| `MJX609` / `MJX610` | rapor | `OperationRunner` işlemi / istek yolu eşleştirmesi başarısız. |
| `MJX611` | uyarı | Devtools paneli yüklenemedi. |

---

Dokümantasyonun başına dönmek için [README](./index.md).
