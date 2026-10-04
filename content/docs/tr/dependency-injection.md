---
slug: dependency-injection
title: Dependency Injection
description: Yaşam süreleri, scoped tutamaçlar, ServiceCollection kayıt biçimleri, ServiceProvider çözümleme, @Injectable, inject, deps ve servis bertarafı.
category: app
order: 2
---

MotifJS, .NET'in servis koleksiyonu modeline benzeyen bütünleşik bir bağımlılık enjeksiyonu (DI) sistemi içerir. Servisleri uygulama başlarken kaydeder, sonra bileşenlerden veya başka servislerden çözümlersiniz (resolve).

## Yaşam süreleri (lifetimes) {#lifetimes}

| Yaşam süresi | Davranış |
|--------------|----------|
| `singleton` | Uygulama boyunca tek örnek. |
| `scoped` | Gezinme başına bir örnek. Aynı gezinmede ekranda olan her şey (layout, sayfa, alt bileşenler, `FromService`, singleton bağımlılıkları) aynı örneği görür; ayrıntı aşağıda. Router yoksa kök sağlayıcıda tek örnektir. |
| `transient` | Her çözümlemede yeni örnek (varsayılan). |

### `scoped`: gezinme başına tek örnek {#scoped}

Router her gezinmede bir kapsam açar. `scoped` bir servisi isteyen herkes (`getService`, `inject`, `deps`, `FromService`) servisin kendisini değil, o servise giden bir **tutamaç** alır. Tutamaç servis gibi kullanılır (alanlar, metotlar, `#private` alanlar, `instanceof`) ve her erişimde doğru gezinmenin örneğine gider:

```tsx
@Injectable({ lifetime: 'scoped' })
export class CartService {
  items = reactive<string[]>([]);
  add(x: string) { this.items.push(x); }
}

class ShellLayout extends Component {
  cart = this.getService(CartService)!;
  view() { return <span>{() => this.cart.items.length}</span>; }
}

class ProductsPage extends Component {
  cart = this.getService(CartService)!;
  view() { return <button onclick={() => this.cart.add('elma')}>Ekle</button>; }
}
```

- Sayfanın eklediği ürünü layout aynı anda görür; ikisi aynı gezinmenin örneğindedir.
- Başka bir sayfaya geçildiğinde layout'un `cart`'ı kendiliğinden yeni gezinmenin örneğine geçer ve bağ (`{() => this.cart.items.length}`) yenilenir. Önceki gezinmenin örneği bertaraf edilir (`dispose()`).
- Ayrılan sayfa önceki gezinmenin örneğine bağlı kalır. Sayfa ayrıldıktan sonra tamamlanan bir iş (`await` sonrası) yeni sayfanın servisine değil, kendi gezinmesinin örneğine yazar. Aynı rotada parametre değişimi (`/urun/1` → `/urun/2`) de yeni bir gezinmedir.
- `keepAlive` bir sayfa önbellekte beklerken kendi gezinmesinin örneğini yaşatır; yeniden gösterildiğinde güncel gezinmenin örneğine geçer. Mobil yığında bekleyen sayfalar da aynı kurala uyar. Servisteki durumun gezinmeler arasında korunması isteniyorsa servis `singleton` olmalıdır.
- Geri ve ileri gezinme de yeni bir gezinmedir, yeni örnek açar.
- Gezinme gerçekleşmezse (guard iptali, sayfa kurulum hatası) güncel örnek değişmez; açılan kapsam bertaraf edilir.
- Sayfa kurulurken (yapıcıda ya da yapıcının başlattığı işte) yeni gezinmenin örneği kullanılır.
- `app.provider.createScope()` ile koddan açılan bir kapsam bu düzenin dışındadır: servisin kendisini verir ve yalnız o kapsamda yaşar.
- Tutamaç bileşen başına ayrı bir nesnedir: iki bileşenin aldığı tutamaçlar aynı örneğe gitse de `===` ile eşit değildir; servisleri içerikleriyle karşılaştırın.

Bertaraf edilen bir bileşenin alanları temizlendiği için, uzun süren bir işte bileşenin kendisini kontrol etmek (`if (this.isDisposed) return;`) yine iyi bir alışkanlıktır.

## Servis kaydı {#registration}

Servisler `ApplicationBuilder.services` (bir `ServiceCollection`) üzerine kaydedilir:

```tsx
import { Application } from "@motifx/core";
import { LoggerService } from "./services/LoggerService";
import { AuthService } from "./services/AuthService";

const builder = Application.CreateBuilder();

builder.services.addSingleton(LoggerService, LoggerService);
builder.services.addScoped(AuthService, AuthService);
builder.services.addTransient(RequestId, RequestId);

const app = builder.build();
```

### Kayıt biçimleri {#registration-forms}

`add*(token, impl)` metotlarında `impl` şunlardan biri olabilir:

```ts
// 1) Sınıf (useClass)
builder.services.addSingleton(LoggerService, LoggerService);

// 2) Hazır değer (useValue)
builder.services.addSingleton(Config, { apiUrl: "/api" });

// 3) Fabrika / descriptor nesnesi — `deps` verilirse fabrika (…bağımlılıklar, sağlayıcı) ile çağrılır
builder.services.addSingleton(Db, {
  useFactory: (config: Config) => new Db(config),
  deps: [Config]
});

// deps'siz fabrika yalnızca sağlayıcıyı alır
builder.services.addSingleton(Cache, { useFactory: (sp) => new Cache(sp.get(Config)) });

// 4) Async değer (Promise) — async fabrikaya sarılır; `get` değil `getAsync` ile çözümlenir
builder.services.addSingleton(Remote, import('./remote').then(m => new m.Remote()));
const remote = await app.provider.getAsync(Remote);
```

`deps` dizisi hem sınıf hem fabrika kayıtlarında geçerlidir: sıralı olarak çözümlenir ve yapıcıya/fabrikaya aynı sırada geçirilir; fabrikada son parametre her zaman `ServiceProvider`'dır.

Sağlayıcı yalnız sınıf kaydını (`useClass`) `new` ile kurar. `useValue` ile verilen değer ve fabrikanın döndürdüğü değer olduğu gibi verilir; `get` ve `getAsync` aynı değeri döndürür. Bir fonksiyonu ya da sınıfın kendisini servis olarak vermek için `{ useValue: fn }` veya onu döndüren bir fabrika kullanın; örnek isteyen fabrika `new`'i kendisi yazar.

`add*(token, impl)`'e doğrudan verilen bir fonksiyon sınıf olarak kurulur. Kurulamayan bir fonksiyon (ok fonksiyonu, `async` fonksiyon, nesne metodu) TypeScript'te derleme hatası verir, çalışma zamanında da kayıt satırında `MJX413` fırlatır:

```ts
builder.services.addSingleton('formatter', (x: number) => x.toFixed(2));             // hata: MJX413
builder.services.addSingleton('formatter', { useValue: (x: number) => x.toFixed(2) }); // fonksiyonun kendisi
builder.services.addSingleton(Logger, { useFactory: (sp) => new Logger(sp.get(Config)) }); // fabrika
```

`ServiceCollection` metotları:

| Metot | Açıklama |
|-------|----------|
| `addSingleton/addScoped/addTransient(token, impl)` | Kayıt. |
| `tryAddSingleton/tryAddScoped/tryAddTransient(token, impl)` | Yalnızca kayıtlı değilse ekler; `boolean` döner. |
| `replace(token, impl, lifetime?)` | Var olan kaydı değiştirir. |
| `remove(token)` / `has(token)` | Kaldır / kontrol et. |
| `reset()` | Tümünü temizle. |
| `buildServiceProvider()` | `ServiceProvider` üretir (`build()` bunu otomatik yapar). |

## Servis çözümleme {#resolution}

### `ServiceProvider.get` {#service-provider-get}

```tsx
const provider = app.provider;
const logger = provider.get(LoggerService);
```

Router bir rota bileşenini, sağlayıcıda kayıtlıysa (`add*` ya da `@Injectable`) sağlayıcıdan çözer, kayıtlı değilse doğrudan kurar. Kayıtlı bir bileşen çözülemezse (eksik bağımlılık, döngü, yapıcı hatası) gezinme `MJX304` ile hata verir, asıl hata `cause`'da taşınır ve `fallbacks.error` gösterilir.

`get` senkrondur ve async fabrika ya da Promise ile kaydedilmiş bir servis için hata (`MJX402`) fırlatır; onları `await provider.getAsync(token)` ile çözümleyin. `provider.createScope(ad?)` yeni bir alt kapsam üretir; `scoped` servisler kapsam başına tek örnektir.

Bileşen içinden uygulamanın sağlayıcısına erişim:

```tsx
// MainLayout örneğindeki gibi
const logger = Application.main.provider.get(LoggerService);
```

### Bileşenden `getService` {#get-service}

`ComponentBase.getService`, en yakın sağlayıcıyı bulup token'ı çözümler; bulunamazsa ya da çözümleme hata verirse `null` döner (geliştirme modunda `MJX407`/`MJX408` uyarısı yazılır):

```tsx
class Dashboard extends Component {
  onConfig() {
    const auth = this.getService(AuthService);
    if (auth?.isLoggedIn) { /* ... */ }
  }
}
```

### `FromService` yardımcısı {#from-service}

Herhangi bir yerde (bileşen dışında da) hızlı çözümleme için:

```tsx
import { FromService } from "@motifx/core";
const logger = FromService(LoggerService);   // çözümlenemezse null
```

Servis kayıtlı değilse, döngüsel bağımlılık varsa ya da yapıcı hata fırlatırsa `null` döner; geliştirme modunda asıl hatayla birlikte `MJX414` uyarısı yazılır. `scoped` bir servis için güncel gezinmenin örneğine giden tutamacı verir.

## Dekoratörlerle otomatik kayıt {#injectable-decorator}

`@Injectable`, bir sınıfı otomatik kayıt için işaretler. Uygulama build edilirken (`builder.build()` içinde `autoRegisterInjectables` çağrılır) bu sınıflar otomatik kaydedilir.

Modülü `build()`'den **sonra** yüklenen sınıflar da (yalnızca tembel bir sayfanın içe aktardığı servisler) kaydedilir: tanımlayıcı bulunamadığında kayıt ilk çözümleme anında yapılır. Açık kayıt (`addSingleton`/`addScoped`/`addTransient`) her zaman dekoratörü ezer, dekoratör açık kaydı ezemez.

```tsx
import { Injectable, inject } from "@motifx/core";

@Injectable({ lifetime: 'singleton' })
export class LoggerService {
  log(msg: string) { console.log("[LOG]", msg); }
}

@Injectable()   // varsayılan lifetime: 'transient'
export class UserService {
  private logger = inject(LoggerService);

  save(user: any) {
    this.logger.log("kullanıcı kaydedildi");
  }
}
```

`@Injectable` standart (TC39) bir sınıf dekoratörüdür; `tsconfig.json`'da ya da Vite'ın `esbuild` ayarında ek bir ayar gerektirmez. `@motifx/compiler` dekoratörleri `.tsx` dosyalarında olduğu gibi `.ts` ve `.js` dosyalarında da derler; `vite dev` ve `vite build` aynı sonucu verir. En yakın `tsconfig.json`'unda `experimentalDecorators: true` olan dosyalar TypeScript'in eski dekoratör dönüşümüne bırakılır; `@Injectable` o biçimde de çalışır.

### `@Injectable` seçenekleri {#injectable-options}

```ts
@Injectable({
  lifetime: 'singleton' | 'scoped' | 'transient',   // varsayılan: 'transient'
  deps: [DepA, DepB]                                 // yapıcı parametreleri, sırayla
})
```

### `inject(token)` — bağımlılık alma {#inject}

`inject`, sağlayıcı bir sınıfı kurarken o sınıfın alan başlatıcılarında ve yapıcısında, ya da sağlayıcı bir `useFactory` fabrikasını çağırırken fabrikanın içinde çağrılır. Bağımlılığı sınıfı kuran sağlayıcıdan çözer: `scoped` bir servis, onu isteyen rota kapsamının örneğidir. Dönüş tipi token'dan gelir.

```tsx
@Injectable()
export class OrderService {
  private db = inject(Db);
  private log = inject(LoggerService);
  private readonly total: number;

  constructor() {
    this.total = this.db.count();   // yapıcıda da kullanılabilir
  }
}
```

`inject` yalnız kurulum anında çalışır. Bir metodun içinde, `setTimeout` geri çağrısında ya da sınıf elle `new OrderService()` ile kurulduğunda `MJX409` hatası fırlatır. Kayıtlı olmayan token `MJX401`, döngüsel bağımlılık `MJX404` verir. `inject` senkrondur; `getAsync` gerektiren async kayıtları `deps` ya da `getAsync` ile alın.

Bileşenlerde bağımlılık için `this.getService(token)` kullanılır.

### `deps` — yapıcı parametreleri {#deps}

Bağımlılıklar yapıcıya parametre olarak da verilebilir. `deps` dizisindeki token'lar sırayla çözümlenir ve yapıcıya aynı sırada geçirilir:

```tsx
@Injectable({ deps: [Db, LoggerService] })
export class OrderService {
  constructor(private db: Db, private log: LoggerService) {}
}
```

Sıra TypeScript tarafından denetlenmez; `deps` ile yapıcı parametreleri aynı sırada yazılmalıdır. Bu biçimde sınıf testte sahte bağımlılıklarla elle kurulabilir: `new OrderService(sahteDb, sahteLog)`.

## Servis kullanan bir bileşen — tam örnek {#full-example}

```ts file=src/CounterStore.ts
import { Injectable, reactive } from "@motifx/core";

@Injectable({ lifetime: 'singleton' })
export class CounterStore {
  state = reactive({ value: 0 });
  increment() { this.state.value++; }
}
```

```tsx file=src/main.tsx
import { Application } from "@motifx/core";
import { CounterStore } from "./CounterStore";

const builder = Application.CreateBuilder();
// @Injectable ile işaretlendiği için otomatik kaydedilir;
// ya da elle: builder.services.addSingleton(CounterStore, CounterStore);
const app = builder.build();
```

```tsx file=src/CounterView.tsx variant=class
import { Component } from "@motifx/core";
import { CounterStore } from "./CounterStore";

export class CounterView extends Component<HTMLDivElement> {
  store = this.getService(CounterStore)!;
  view() {
    return <button onclick={() => this.store.increment()}>
      {() => this.store.state.value}
    </button>;
  }
}
```
```tsx file=src/CounterView.tsx variant=function
import { FromService } from "@motifx/core";
import { CounterStore } from "./CounterStore";

export function CounterView() {
  const store = FromService(CounterStore)!;
  return <button onclick={() => store.increment()}>
    {() => store.state.value}
  </button>;
}
```
```tsx file=src/CounterView.tsx variant=options
import { CounterStore } from "./CounterStore";

export const CounterView = () => ({
  el: 'div',
  store: null as CounterStore | null,
  ctor() {
    this.store = this.getService(CounterStore);
  },
  view() {
    return <button onclick={() => this.store!.increment()}>
      {() => this.store!.state.value}
    </button>;
  },
});
```

Fonksiyon bileşeninin `this`'i olmadığı için servis `FromService` ile uygulamanın sağlayıcısından alınır; `scoped` servis için bu da güncel gezinmenin tutamacını verir.

## Servislerin bertarafı {#service-disposal}

`app.dispose()` ve `provider.dispose()` sağlayıcının kurduğu örnekleri bertaraf eder: singleton önbelleği, kapsamların `scoped` örnekleri ve gezinme kapsamları. Her örnekte varsa sırayla `dispose()`, `close()`, `[Symbol.dispose]()` ve `[Symbol.asyncDispose]()` çağrılır; birinin fırlattığı hata diğerlerini durdurmaz. Gezinme kapsamı kapanırken (yeni gezinme, iptal) o kapsamın `scoped` örnekleri aynı yolla bertaraf edilir. `useValue` ile verilen değer de kayıtlıysa aynı işlemden geçer.

`transient` örnekler varsayılan olarak izlenmez; `provider.enableAutoDisposeTransients()` açıldığında bir alt kapsamda (`createScope`, gezinme kapsamı) üretilen transient örnekler o kapsamla birlikte bertaraf edilir. Kök sağlayıcıdan çözülen transient'lar yine izlenmez.

`provider.getAllServices()` sağlayıcının kullandığı `ServiceCollection`'ı verir.

## `useApplication` kancası {#use-application}

Uygulama, sağlayıcı ve router'a topluca erişim:

```tsx
import { useApplication } from "@motifx/core";

const { application, services, router, attach } = useApplication();
const logger = services.get(LoggerService);
```

## Sonraki adım {#next}

Stil ve animasyon sistemini öğrenmek için [Stil ve Animasyon](./styling-and-transitions.md) bölümüne geçin.
