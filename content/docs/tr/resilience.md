---
slug: resilience
title: Dayanıklılık (Resilience)
description: Resilience.create zinciriyle yeniden deneme, zaman aşımı, devre kesici, bulkhead, oran sınırı ve fallback politikaları; sıralama, durum ve hata kodları.
category: app
order: 6
---

Ağ istekleri ve dış kaynaklar başarısız olur, gecikir, aşırı yüklenir. `Resilience`, bu durumlar için altı **politika** sunar ve bunları tek bir zincirde birleştirir. Çerçevenin geri kalanından bağımsızdır; servislerde, veri katmanında ya da bir `dataRequest` içinde kullanılabilir.

```ts
import { Resilience } from "@motifx/core";

const policy = Resilience.create
  .retry({ retries: 3, delay: 200 })
  .timeout({ timeoutMs: 5000 })
  .fallback({ fallback: () => [] });

const rows = await policy.execute(() => fetch('/api/rows').then(r => r.json()));
```

## Zincir ve sıralama {#chain}

`Resilience.create` yeni, boş bir zincir verir; her politika metodu zincire ekler ve aynı nesneyi döndürür. `execute(action, ctx?)` eklenen politikaları **eklenme sırasıyla dıştan içe** sarar ve `action`'ı çalıştırır:

```ts
Resilience.create.retry().timeout().execute(fn)
// retry( timeout( fn ) ): her deneme kendi zaman aşımına sahiptir
Resilience.create.timeout().retry().execute(fn)
// timeout( retry( fn ) ): bütün denemeler tek bir zaman aşımı içinde
```

`action` senkron ya da `Promise` döndürebilir; `execute` her zaman `Promise` döndürür. `ctx` serbest bir nesnedir (`ResilienceContext`), `action(ctx)` ve geri çağrılara olduğu gibi iletilir.

Tipler dışa aktarılır: seçenekler için `RetryOptions`, `TimeoutOptions`, `CircuitBreakerOptions`, `BulkheadOptions`, `RateLimiterOptions`, `FallbackOptions<T>`; devre durumu için `CircuitState`; `execute` imzası için `ResiliencePolicy` ve `action` için `ResilienceAction<T>`. `Resilience` sınıfı `ResiliencePolicy`'yi uygular; bir zinciri alan fonksiyonu `(policy: ResiliencePolicy) => …` diye tipleyin.

**Durum zincirde yaşar.** `circuitBreaker`, `bulkhead` ve `rateLimiter` çağrılar arasında sayaç tutar; her `Resilience.create` yeni sayaçlar açar. Bu politikaların işe yaraması için zinciri bir kez kurup (servis alanı, modül sabiti) her çağrıda **aynı** nesnenin `execute`'unu kullanın. `retry`, `timeout` ve `fallback` durumsuzdur.

```ts
@Injectable({ lifetime: 'singleton' })
export class ApiClient {
  private policy = Resilience.create
    .circuitBreaker({ failureThreshold: 5, durationOfBreakMs: 30000 })
    .retry({ retries: 2 })
    .timeout({ timeoutMs: 8000 });

  get<T>(url: string): Promise<T> {
    return this.policy.execute(() => fetch(url).then(r => r.json()));
  }
}
```

## Politikalar {#policies}

### `retry(seçenekler?)` {#retry}

Başarısız `action`'ı bekleyip yeniden dener.

| Seçenek | Varsayılan | Açıklama |
|---------|-----------|----------|
| `retries` | `3` | Yeniden deneme sayısı; toplam deneme `retries + 1`. |
| `backoff` | `'exponential'` | `'exponential'`: `delay × 2^(deneme−1)`; `'fixed'`: her seferinde `delay`; `'none'`: bekleme yok. |
| `delay` | `100` | Taban bekleme (ms). |
| `jitter` | `0.1` | Beklemeye eklenen rastgele pay oranı (0–1): bekleme `± jitter × bekleme` aralığında sapar. |
| `shouldHandle` | zaman aşımı dışındaki her hata | `(hata) => boolean`; `false` dönerse yeniden denenmez, hata hemen fırlatılır. Varsayılan `TimeoutError`'u (`timeout` politikasının hatası) **yeniden denemez**. |
| `onRetry` | — | `(deneme, hata, beklemeMs, ctx)`; her beklemeden önce çağrılır, `Promise` döndürürse beklenir. |

Son deneme de başarısız olursa son hata fırlatılır. Zaman aşımına uğrayan isteği de yeniden denemek için `shouldHandle: () => true` verin.

### `timeout({ timeoutMs })` {#timeout}

`action` `timeoutMs` içinde bitmezse `MJX605` kodlu, `name`'i `'TimeoutError'` olan bir `MotifError` fırlatılır. Süren işlem iptal edilmez (`fetch` için `AbortController`'ı kendiniz bağlayın); yalnız sonucu beklenmez. Zamanlayıcı her iki durumda da temizlenir.

### `circuitBreaker(seçenekler?)` {#circuit-breaker}

Arka arkaya başarısızlıkta çağrıları bir süre hiç yapmadan reddeder; kaynağa toparlanma payı verir.

| Seçenek | Varsayılan | Açıklama |
|---------|-----------|----------|
| `failureThreshold` | `5` | `CLOSED` durumda bu kadar ardışık başarısızlık devreyi açar. Araya giren başarı sayacı sıfırlar. |
| `successThreshold` | `2` | `HALF_OPEN` durumda bu kadar ardışık başarı devreyi kapatır. |
| `durationOfBreakMs` | `60000` | `OPEN` durumun süresi; dolunca ilk çağrı `HALF_OPEN`'a geçer. |
| `shouldHandle` | zaman aşımı dışındaki her hata | Hangi hataların başarısızlık sayılacağı. |
| `onStateChange` | — | `(eski, yeni)`; `'CLOSED' \| 'OPEN' \| 'HALF_OPEN'`. |

`OPEN` durumda `execute` `action`'ı çağırmadan `MJX602` fırlatır. `HALF_OPEN`'da tek bir başarısızlık devreyi yeniden açar. Devre durumunu `onStateChange` ile izleyin; zincirin bir "durum oku" metodu yoktur.

### `bulkhead(seçenekler?)` {#bulkhead}

Aynı anda çalışan `action` sayısını sınırlar; fazlası kuyruğa girer.

| Seçenek | Varsayılan | Açıklama |
|---------|-----------|----------|
| `maxConcurrent` | `10` | Eşzamanlı üst sınır. |
| `maxQueue` | `50` | Bekleme kuyruğu üst sınırı; dolunca `MJX603` fırlatılır. |

Kuyruk FIFO'dur; bir çağrı bitince sıradaki başlar.

### `rateLimiter(seçenekler?)` {#rate-limiter}

Jeton kovası: her çağrı bir jeton harcar, jetonlar aralıklarla dolar.

| Seçenek | Varsayılan | Açıklama |
|---------|-----------|----------|
| `tokensPerInterval` | `1` | Her aralıkta eklenen jeton. |
| `intervalMs` | `1000` | Aralık. |
| `capacity` | `tokensPerInterval` | Kova kapasitesi; başlangıçta kova doludur. Patlama (burst) payı istenirse daha büyük verin. |

Jeton yoksa `execute` beklemez, `MJX604` fırlatır. Varsayılan değerler "saniyede en çok 1" demektir; "saniyede en çok N" için `tokensPerInterval: N` yeter. `capacity: 10, tokensPerInterval: 1` ise ilk 10 çağrıyı anında geçirir, sonra saniyede 1 verir.

### `fallback({ fallback, shouldHandle? })` {#fallback}

`action` başarısız olursa `fallback(hata, ctx)`'in döndürdüğü değer (senkron ya da `Promise`) sonuç olur. `shouldHandle` (varsayılan her hata) `false` dönerse hata fırlatılır. Zincirin **ilk** sırasına konursa içteki bütün politikaların son hatasını yakalar.

## `decorate(policy, fn)` {#decorate}

Bir zinciri fonksiyona bağlayıp yeniden kullanılabilir hâle getirir:

```ts
import { Resilience, decorate } from "@motifx/core";

const loadRows = decorate(
  Resilience.create.retry({ retries: 2 }).timeout({ timeoutMs: 5000 }),
  () => fetch('/api/rows').then(r => r.json()),
);

const rows = await loadRows();        // policy.execute(fn, ctx) ile aynı
```

`decorate(policy: ResiliencePolicy, fn: ResilienceAction<T>)` ilk argüman olarak `execute(action, ctx?)` metodu olan her nesneyi kabul eder; `Resilience` zinciri bu arabirimi uygular.

## Hata kodları {#errors}

| Kod | Politika | Anlamı |
|-----|----------|--------|
| `MJX602` | `circuitBreaker` | Devre açık; `action` çağrılmadı. |
| `MJX603` | `bulkhead` | Kuyruk dolu. |
| `MJX604` | `rateLimiter` | Jeton yok. |
| `MJX605` | `timeout` | Zaman aşımı (`name: 'TimeoutError'`). |

Dördü de `MotifError`'dur ve `execute`'tan fırlatılır; `fallback` ile yakalanabilir. `retry` ve `circuitBreaker` varsayılan `shouldHandle` ile zaman aşımını saymaz, diğer üçünü sayar.

## Sonraki adım {#next}

Dışa aktarılan koleksiyon yapıları için [Koleksiyonlar](./collections.md).
