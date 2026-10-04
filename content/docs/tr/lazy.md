---
slug: lazy
title: Lazy
description: Dinamik import ya da herhangi bir Promise ile yüklenen içerik; yükleme akışı, seçenekler, yeniden deneme, iptal ve hata raporu.
category: advanced
order: 2
---

`Lazy`, bir `Promise` üreten fonksiyonu çağırır, sonucu bileşene çevirir ve bir [Frame](./frame.md) içine yerleştirir. Kod bölme (`() => import('./X')`) için tasarlanmıştır ama herhangi bir `Promise` ile çalışır.

## Kullanım {#usage}

```tsx
import { Lazy } from "@motifx/core";

<Lazy caller={() => import('./Grafik')} options={{
  Loaderview: <Spinner />,
  Fallbackview: <YuklenemediKutusu />,
  minDelayMs: 300,
  timeoutMs: 10000,
  retry: 3,
}} />
```

`Lazy` bir fonksiyondur; `Lazy({ caller, options })` çağrısı da aynı `Frame`'i döndürür ve `controls.add` ile yerleştirilebilir. `frame.navigateLazy(caller, options)` ve `frame.navigate(promise)` da aynı yolu kullanır.

## Yükleme akışı {#flow}

1. Varsa `Placeholderview` (yoksa `Loaderview`) hemen gösterilir.
2. `caller()` **hemen** çağrılır (bileşen DOM'a girmeyi beklemez). `timeoutMs` verildiyse süre dolunca yükleme `MJX110` ile başarısız sayılır; `signal` verildiyse `abort()` yüklemeyi `MJX111` ile keser.
3. Başarılı sonuç `mapResult` ile bileşene çevrilir. Varsayılan dönüştürücü modülün `default` dışa aktarımını alır (`import()` sonucu için); başka bir dışa aktarım gerekiyorsa `mapResult: (m) => m.Grafik` yazın. Dönen değer sınıf ise `new` ile, fonksiyon ise çağrılarak kurulur; hazır örnek olduğu gibi kullanılır (prop verilmez).
4. `minDelayMs` verildiyse ve yükleme ondan hızlı bittiyse kalan süre beklenir (kısa yüklemelerde yükleme görünümünün yanıp sönmesini önler). Sonra içerik `Frame`'e yerleştirilir; `Loaderview` çıkış geçişini oynatarak bertaraf edilir.
5. Başarısızlıkta önce `onError(err)` çağrılır. `Fallbackview` varsa gösterilir ve hata orada kalır (rapor edilmez). Yoksa kapsayıcı boşaltılır ve hata `errorHandler.report` ile `MJX126` olarak raporlanır — `console.error`'a yazılır ve `errorHandler.addListener` dinleyicilerine gider; özgün hata `cause` alanındadır (bkz. [Hata yönetimi - Raporları dinleme](./error-handling.md#error-handler)). `onError` verilmiş olması raporu kaldırmaz.

İptal edilen (`signal`) bir yüklemede `onError` yine çağrılır ama `Fallbackview` gösterilmez, içerik değişmez ve rapor yazılmaz. Kapsayıcı bertaraf edildiğinde süren zamanlayıcılar ve bekleyen yeniden denemeler temizlenir.

## Seçenekler (`LazyOptions<T>`) {#options}

| Seçenek | Tip | Açıklama |
|---------|-----|----------|
| `Loaderview` | `ComponentBase` | Yükleme sürerken gösterilen içerik. |
| `Placeholderview` | `ComponentBase` | `Loaderview`'den önceliklidir; ikisi birden verildiğinde yalnız bu gösterilir. |
| `Fallbackview` | `ComponentBase` | Son deneme de başarısız olunca gösterilen içerik. |
| `minDelayMs` | `number` | İçeriğin yerleşmesi için geçmesi gereken en az süre. |
| `timeoutMs` | `number` | Her denemenin üst sınırı; aşılınca `MJX110`. |
| `signal` | `AbortSignal` | Yüklemeyi dışarıdan iptal etme; `MJX111`. `Frame.navigate(promise)` bunu kendisi verir. |
| `mapResult` | `(sonuç) => bileşen` | Yükleme sonucunu bileşene çevirir; varsayılan `default` dışa aktarımı. |
| `onError` | `(hata) => void` | Her başarısızlıkta (iptal dâhil), `Fallbackview`'den önce. |
| `retry` | `number \| LazyRetryOptions` | Yeniden deneme (aşağıda). |
| `onRetry` | `(deneme, hata) => void` | Her yeniden denemeden önce; `deneme` 1'den başlar. |

## Yeniden deneme — `retry` {#retry}

```tsx
retry: 3                                              // count: 3, delayMs: 500, whenOnline: true
retry: { count: 3, delayMs: 500, whenOnline: true }   // açık biçim (LazyRetryOptions)
```

- `count` kadar yeniden denenir; toplam deneme `count + 1`.
- Bekleme her denemede artar: `delayMs × deneme` (500, 1000, 1500…).
- `whenOnline: true` iken cihaz çevrimdışıysa (`navigator.onLine === false`) sayaç başlamaz; `online` olayı gelince bekleme başlar.
- Bekleme sırasında kapsayıcı bertaraf edilir ya da `signal` iptal edilirse deneme bırakılır ve son hata `onError`'a gider.
- `timeoutMs` her denemeye ayrı uygulanır.

## Rota sayfalarında {#in-routes}

Rota tanımındaki `control: () => import('./pages/X')` ve `fallbacks.notFound/error` kendi tembel yükleme yolunu kullanır; `Lazy` seçenekleri (yükleme görünümü, yeniden deneme) orada geçerli değildir. Bir sayfanın **içindeki** ağır parçayı tembel yüklemek için `Lazy` kullanın (bkz. [Routing - Lazy yükleme](./routing.md#lazy)).

## Sonraki adım {#next}

Çerçevenin hata raporlama modeli için [Hata Yönetimi](./error-handling.md); kapsayıcının zamanlama kuralları için [Frame](./frame.md#timing).
