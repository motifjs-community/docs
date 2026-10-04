---
slug: error-handling
title: Hata Yönetimi
description: Fırlatılan, raporlanan ve uyarı olarak yazılan hataların ayrımı; MotifError, errorHandler, setUnexpectedErrorHandler, safeCall yardımcıları ve Emitter.
category: app
order: 5
---

MotifJS kullanıcı kodundan gelen hatayı yutmaz, ama uygulamayı da düşürmez. Her hata bir **`MJX` kodu** taşır ve üç yoldan birine girer. Bu bölüm o yolları, hataları dinleme noktalarını ve çerçevenin kendi hata-güvenli çağrı yardımcılarını anlatır. Kodların tam listesi [Hata ve uyarı kodları](./api-reference.md#error-codes) tablosundadır.

## Üç yol {#three-paths}

| Yol | Ne zaman | Nereye gider |
|-----|----------|--------------|
| **Fırlatma** | Çağıranın hemen düzeltmesi gereken yanlış kullanım: adlandırılmış rota yok (`MJX302`), servis kayıtlı değil (`MJX401`), ikinci `ApplicationBuilder` (`MJX405`), `Query.first()` boş dizide (`MJX601`) … | `MotifError` fırlatılır; `try/catch` ile yakalanır. |
| **Rapor** | Akışı durdurmaması gereken kullanıcı kodu hatası: bileşen kancası (`MJX122`), olay işleyicisi (`MJX123`), effect/bağ (`MJX208`), rota kancası ve guard (`MJX306`), bertaraf ve veri yükleme hataları … | `errorHandler.report(MotifError)`: konsola `console.error` (`app.useLogging(false)` kapatır), `errorHandler.addListener(fn)` dinleyicilerine, varsa devtools veriyoluna. Asıl hata `cause`'dadır. Üretimde de çalışır. |
| **Uyarı** | Çalışmaya devam eden ama büyük olasılıkla istenmeyen durum: yinelenen `key` (`MJX202`), kendini tetikleyen effect (`MJX203`), rota tanımı denetimi (`MJX310`–`MJX316`) … | Yalnız geliştirme modunda (`app.useDevelopment(true)`) `console.warn` ve devtools uyarı listesi. Dinleyicilere gitmez. |

## `MotifError` {#motif-error}

Çerçevenin fırlattığı ve raporladığı her hata `MotifError`'dur:

```ts
import { MotifError } from "@motifx/core";

try {
  await app.navigateByName('yok');
} catch (e) {
  if (e instanceof MotifError && e.code === 'MJX302') { /* adlandırılmış rota bulunamadı */ }
}
```

| Alan | Açıklama |
|------|----------|
| `code` | `MotifErrorCode` (`'MJX302'` gibi). Mesaj metnine değil buna göre dallanın; metinler İngilizcedir ve değişebilir. |
| `message` | `[motifjs] MJX302: …` biçiminde İngilizce mesaj. |
| `cause` | Raporlanan hatalarda asıl hata (kullanıcı kodunun fırlattığı değer). |
| `name` | `'MotifError'` (`Resilience` zaman aşımında `'TimeoutError'`). |

`MotifErrorCode` tipi bütün kodların birleşimidir; `switch (e.code)` yazarken tamamlama sağlar.

## Raporları dinleme — `errorHandler` {#error-handler}

```ts
import { errorHandler } from "@motifx/core";

const off = errorHandler.addListener((error) => {
  telemetry.capture({ code: error.code, message: error.message, cause: error.cause });
});
// ...
off();
```

- Dinleyici **raporlanan** her `MotifError`'u alır (`MJX122`, `MJX123`, `MJX208`, `MJX306` …). `setUnexpectedErrorHandler`'a giden kodsuz hatalar da (aşağıda) dinleyicilere olduğu gibi ulaşır.
- Fırlatılan hatalar dinleyiciye gitmez (zaten çağırana döner); uyarılar da gitmez.
- Dinleyici hiçbir bileşene bağlı değildir; dönen fonksiyonla kaldırın.
- `errorHandler.report(err)` ile kendi hatanızı aynı yola sokabilirsiniz; `err` bir `Error` olmalıdır, `MotifError` olması gerekmez.

`ErrorHandler` sınıfının diğer üyeleri: `setDevelopmentMode(b)` / `isDevelopment()` (`app.useDevelopment` bunu kullanır), `setConsoleLogging(b)` (`app.useLogging`), `reportSuppressed(context, err)` (yalnız geliştirme modunda konsola yazar, dinleyicilere gitmez — çerçeve kendi içinde yuttuğu hatalar için kullanır).

## Beklenmeyen hatalar — `setUnexpectedErrorHandler` {#unexpected-errors}

`safeCall`/`safeCallAsync` içinde yakalanan ve `Emitter` dinleyicilerinin fırlattığı hatalar **kodsuzdur**; bunlar `errorHandler.onUnexpectedError(err)` yoluna girer:

1. `setUnexpectedErrorHandler(fn)` ile verilen işleyici çağrılır. Varsayılan işleyici hatayı `setTimeout(…, 0)` ile **yeniden fırlatır**: tarayıcıda `window.onerror`/`unhandledrejection` düzeyinde görünür, çağıran akış kesilmez.
2. Ardından `addListener` dinleyicileri hatayı olduğu gibi alır.

```ts
import { setUnexpectedErrorHandler } from "@motifx/core";

setUnexpectedErrorHandler((e) => telemetry.capture(e));   // yeniden fırlatma yerine kaydet
```

Kodlu raporlar (`MJX122` …) bu işleyiciye **gitmez**; onlar için `addListener` kullanın.

## Hata-güvenli çağrı yardımcıları {#safe-call}

Çerçevenin kendi kodunu sarmak için kullandığı yardımcılar dışa açıktır:

| Fonksiyon | Davranış |
|-----------|----------|
| `safeCall(fn, context, fallback?)` | `fn()`'i çağırır; fırlatırsa geliştirme modunda `[motifjs Error - context]` yazar, hatayı `onUnexpectedError`'a verir ve `fallback`'i (yoksa `undefined`) döndürür. |
| `safeCallAsync(fn, context, fallback?)` | Aynı; `fn` `Promise` döndürür, reddedilme yakalanır. |
| `safeCallSilent(fn, context)` | Fırlatırsa yalnız geliştirme modunda konsola yazar; `onUnexpectedError`'a ve dinleyicilere **gitmez**. |
| `errorHandler.safeCallSilentAsync`, `errorHandler.wrapSafe(fn, context)`, `errorHandler.wrapSafeAsync(fn, context)` | Asenkron sessiz çağrı; `fn`'i aynı davranışla saran yeni fonksiyon döndürür (`safeCall` gibi raporlar). |

`context` yalnız günlükte görünen serbest bir etikettir.

## Kullanıcı kodunda hata nerede yakalanır? {#where-errors-land}

| Yer | Sonuç |
|-----|-------|
| Yaşam döngüsü kancası (`onConfig`, `onBuilt`, `onMounted` …), `initializeComponent`, `ref` geri çağrısı, Options API `ctor`, `motif.on('x:…')` dinleyicisi | `MJX122` raporu; bileşen kurulmaya devam eder. `async` kancanın reddedilen promise'i de aynı. |
| DOM/bileşen olay işleyicisi (`onclick`, `motif.on`, `on:ad`) | `MJX123` raporu; aynı olayın diğer işleyicileri çalışır. |
| Uygulama olayı dinleyicisi (`app.on`, `onRouterChanged`) | `MJX123` raporu; diğer dinleyiciler çalışır, gezinme tamamlanır. |
| `effect`, `bindings.watch`, bağ getter'ı, `createComputed` getter'ı | `MJX208` raporu; aynı akıtmadaki diğer effect'ler çalışır, hata veren effect izlemeye devam eder. |
| Rota kancası (`onEntering`, `onEnter`, `onLeave`, `onUpdate`, `onShow`) | `MJX306` raporu; gezinme devam eder. |
| `useGuard` guard'ı | `MJX306` raporu ve gezinme **iptal** (`{ ok: false, cancelled: true, reason: 'guard' }`). |
| Rota bileşeni yapıcısı / `import()` başarısızlığı | `MJX304` raporu ve `fallbacks.error` sayfası (`params.error`). |
| `Virtualization dataRequest` | İlk yükleme/yenileme: `errorTemplate` ya da `MJX207`; sonraki sayfa: `MJX207` + `getState().error`. |
| `Lazy caller` | `onError`, sonra `Fallbackview`; `Fallbackview` yoksa `MJX126` raporlanır (`cause` = özgün hata). İptal (`signal`) raporlanmaz. |
| `DisposableStore.clear/dispose` içindeki birden çok hata | `MJX503` fırlatılır; `cause.errors` dizisi. |
| `Emitter` dinleyicisi | `onUnexpectedError` (varsayılan: yeniden fırlatma) + dinleyiciler. |

## `Emitter<T>` — tipli olay yayıcı {#emitter}

Bileşenden bağımsız, tek tip taşıyan küçük bir yayıcı. Servisler arası bildirim için uygundur:

```ts
import { Emitter, DisposableStore } from "@motifx/core";

class AuthService {
  private _changed = new Emitter<{ user: User | null }>();
  readonly onChanged = this._changed.event;        // Event<T>: (listener, thisArgs?, disposables?) => IDisposable

  login(user: User) { this._changed.fire({ user }); }
  dispose() { this._changed.dispose(); }
}

const store = new DisposableStore();
auth.onChanged((e) => render(e.user), undefined, store);   // abonelik store'a eklenir
store.dispose();                                            // abonelik kalkar
```

- `event(listener, thisArgs?, disposables?)` abone olur ve bir `IDisposable` döndürür; `disposables` bir `DisposableStore` ya da `IDisposable[]` ise abonelik oraya da eklenir. Bir bileşene bağlamak için `this.motif.register(auth.onChanged(fn))`.
- `fire(value)` dinleyicileri ekleniş sırasıyla, senkron çağırır. Dağıtım sırasında eklenen dinleyici o dağıtımı almaz; kaldırılan dinleyici bir daha çağrılmaz.
- Dinleyicinin fırlattığı hata diğerlerini durdurmaz; `onUnexpectedError`'a gider.
- `dispose()` bütün abonelikleri geçersiz kılar; sonraki `event(...)` çağrıları boş bir `IDisposable` döndürür.

## Geliştirme ve üretim {#dev-vs-prod}

| | Geliştirme (`app.useDevelopment(true)`) | Üretim |
|---|---|---|
| Raporlar (`MJX122` …) | konsol + dinleyiciler | konsol + dinleyiciler |
| Uyarılar (`MJX2xx`, `MJX3xx` denetimleri …) | `console.warn` | yok |
| `safeCallSilent` / `reportSuppressed` | konsol | yok |
| Derleyici sözleşmesi uyuşmazlığı (`MJX121`) | `console.warn` | yok |

`app.useLogging(false)` yalnız konsol çıktısını kapatır; dinleyiciler çalışmaya devam eder.

## Sonraki adım {#next}

Ağ ve dış kaynak çağrılarını yeniden deneme, zaman aşımı ve devre kesiciyle sarmak için [Dayanıklılık](./resilience.md).
