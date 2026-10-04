---
slug: publishing-libraries
title: MotifJS için npm Kütüphanesi Yayımlama
description: MotifJS bileşenleri, servisleri ya da sarmalayıcıları içeren bir npm paketi hazırlama; paket biçimi, derleme, tipler, CSS, prop sözleşmesi, test ve yayın denetimi.
category: guides
order: 2
---

Bir UI kütüphanesi, bir sarmalayıcı ya da bir servis seti yazıp başkalarının `npm install` ile kullanmasını istiyorsanız bu bölüm size göredir. Paket, uygulamanın kullandığı aynı `@motifx/core` örneğine bağlanmalı, JSX'i **önceden derlenmiş** olarak taşımalı ve tüketicinin build ayarına bir şey dayatmamalıdır. Aşağıdaki kurulum bunu sağlar.

## Paketin sınırı {#boundary}

İki tür paket vardır; ayar farkı küçüktür:

| Paket | İçerik | Derleyici gerekir mi? |
|-------|--------|-----------------------|
| **Zorunlu (imperative) sarmalayıcı** | JSX kullanmayan `.ts` bileşenleri (`super('canvas')`, `controls.add`, `bindings.*`) | Hayır; `tsc` ya da herhangi bir paketleyici yeter. |
| **JSX kütüphanesi** (UI kit) | `.tsx` bileşenleri | Evet; paket yayımlanmadan önce `@motifx/compiler` ile derlenir. |

Her iki durumda da `@motifx/core` bir **peer bağımlılıktır**: paket onu kendi içine almaz, tüketicinin kurduğu kopyayı kullanır. İki kopya iki reaktivite motoru demektir ve bu hata sessizdir (bkz. [Tek kopya kuralı](./wrapping-libraries.md#single-copy)).

## package.json {#package-json}

```jsonc file=package.json
{
  "name": "@sirket/motif-ui",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./style.css": "./dist/style.css",
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "dev": "vite",
    "build": "vite build && tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "prepublishOnly": "npm run build"
  },
  "peerDependencies": {
    "@motifx/core": "^1.0.0"
  },
  "devDependencies": {
    "@motifx/core": "^1.0.0",
    "@motifx/compiler": "^1.0.0",
    "jsdom": "^26.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.4.0",
    "vitest": "^3.0.0"
  },
  "keywords": ["motifjs", "motifx"],
  "publishConfig": { "access": "public" }
}
```

- `peerDependencies` ile `devDependencies`'te aynı `@motifx/core` major'ı: biri tüketiciye koşul, diğeri sizin derleme ve testiniz için.
- `@motifx/compiler` yalnız `devDependencies`'tedir; tüketici onu kurmak zorunda kalmaz çünkü paket derlenmiş kod taşır.
- `sideEffects: false` tree-shaking'i açar; o zaman içe aktarıldığında iş yapan modül (genel CSS enjeksiyonu, genel kayıt) **bulundurmayın**. Böyle bir şey gerekiyorsa açık bir fonksiyon (`registerX(app)`) olarak dışa aktarın.
- Sarmaladığınız üçüncü parti kütüphane (`chart.js` gibi) de peer bağımlılık olur; `external` listesine onu da ekleyin.

## Derleme {#build}

```ts file=vite.config.ts
/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import compiler from '@motifx/compiler';

export default defineConfig({
  plugins: [compiler()],
  esbuild: { jsx: 'preserve' },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['@motifx/core'],
    },
    sourcemap: true,
    minify: false,
    target: 'es2020',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

```jsonc file=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "useDefineForClassFields": true,
    "noImplicitOverride": true,
    "declaration": true,
    "declarationMap": true,
    "noEmit": true,
    "skipLibCheck": true,
    "lib": ["ESNext", "DOM", "DOM.Iterable"]
  },
  "include": ["./src/**/*", "./vite.config.ts"]
}
```

```jsonc file=tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "emitDeclarationOnly": true,
    "outDir": "./dist/types",
    "rootDir": "./src"
  },
  "include": ["./src/**/*"],
  "exclude": ["./src/**/*.test.ts", "./src/**/*.test.tsx"]
}
```

Ne olur:

- `vite build` kütüphane kipinde çalışır; `@motifx/compiler` her `.tsx` dosyasındaki JSX'i `bindings.*` çağrılarına indirger. Çıktı düz JavaScript'tir, JSX kalmaz; `@motifx/core` içe aktarımları (`motifComponent`, `motifCompiled` …) `external` olduğu için paketin dışında kalır ve tüketicinin kopyasına bağlanır.
- `esbuild: { jsx: 'preserve' }` olmadan esbuild JSX'i `React.createElement`'e çevirir ve derleyici görmez; bu satır zorunludur (bkz. [Build yapılandırması](./getting-started.md#build-setup)).
- `tsc -p tsconfig.build.json` yalnız `.d.ts` üretir; derleyici tiplere dokunmaz. `Component<HTMLDivElement>` generic'inden üretilen `static elementTag` derlenmiş JS'te vardır; tip tarafında görünmez, görünmesi de gerekmez.
- Derlenmiş kod bir **derleyici sözleşmesine** bağlıdır: `@motifx/compiler` 1.x ile derlenen paket `@motifx/core` 1.x ister. Sözleşme yalnız major sürümde değişir; uyuşmazlıkta tüketici geliştirme modunda `MJX121` uyarısı görür. `peerDependencies` aralığını buna göre (`^1.0.0`) verin ve major yükselince paketi yeniden derleyip yayımlayın.
- `noImplicitOverride`: bileşen sınıflarınız `ComponentBase`'in bir üyesini (`dispose`, `controls`, `props`, `element` …) kazara gölgelerse derleme hatası alırsınız.

JSX kullanmayan bir sarmalayıcıda `plugins: [compiler()]` ve `jsx` satırları gereksizdir; gerisi aynıdır.

## Giriş noktası ve dışa aktarımlar {#entry}

```ts file=src/index.ts
export { Button } from './Button';
export { Dialog } from './Dialog';
export type { ButtonProps } from './Button';
export { registerUiServices } from './services';
```

- Bileşenleri ve prop tiplerini **adlı** dışa aktarın; `default export` yalnız `Lazy`/rota tembel yüklemesine uygun tekil bileşenler için anlamlıdır.
- Ağır bileşenleri (editör, grafik, harita) ayrı alt yollardan sunabilirsiniz: `exports["./editor"]` + `build.lib.entry` nesnesi. Tüketici `Lazy({ caller: () => import('@sirket/motif-ui/editor') })` ile yalnız gerekeni yükler (bkz. [Lazy](./lazy.md)).

## Prop sözleşmesi {#prop-contract}

Paketinizin bileşenleri başkalarının JSX'inde kullanılacak; derleyicinin kurallarına uyan bir prop yüzeyi tanımlayın:

```tsx file=src/Button.tsx variant=class
import { Bind, Component, IBaseProp, read } from '@motifx/core';

export interface ButtonProps {
  label: Bind<string>;
  tone?: Bind<'default' | 'accent' | 'danger'>;
  disabled?: Bind<boolean>;
  onPress?: (e: MouseEvent) => void;
}

export class Button extends Component<HTMLButtonElement, ButtonProps> {
  constructor(props: IBaseProp<ButtonProps>) {
    super(props);   // kök: generic'ten üretilen <button>
  }

  onConfigured() {
    this.class.add('mf-button', () => `mf-button--${read(this.props.tone) ?? 'default'}`);
    this.attr.add({ disabled: () => read(this.props.disabled) ?? false });
    this.motif.on('click', (_s, e) => this.props.onPress?.(e));
  }

  view() {
    return <>{() => read(this.props.label)}</>;
  }
}
```
```tsx file=src/Button.tsx variant=function
import { Bind, read } from '@motifx/core';

export interface ButtonProps {
  label: Bind<string>;
  tone?: Bind<'default' | 'accent' | 'danger'>;
  disabled?: Bind<boolean>;
  onPress?: (e: MouseEvent) => void;
}

export function Button(props: ButtonProps) {
  return (
    <button
      class={() => ['mf-button', `mf-button--${read(props.tone) ?? 'default'}`]}
      disabled={() => read(props.disabled) ?? false}
      onclick={(e) => props.onPress?.(e)}
    >
      {() => read(props.label)}
    </button>
  );
}
```
```tsx file=src/Button.tsx variant=options
import { Bind, read } from '@motifx/core';

export interface ButtonProps {
  label: Bind<string>;
  tone?: Bind<'default' | 'accent' | 'danger'>;
  disabled?: Bind<boolean>;
  onPress?: (e: MouseEvent) => void;
}

export const Button = (props: ButtonProps) => ({
  el: 'button',
  view() {
    return (
      <button
        class={() => ['mf-button', `mf-button--${read(props.tone) ?? 'default'}`]}
        disabled={() => read(props.disabled) ?? false}
        onclick={(e) => props.onPress?.(e)}
      >
        {() => read(props.label)}
      </button>
    );
  },
});
```

Kurallar:

- **Sınıf bileşeninde `view()` kökü değil içeriği döndürür.** Kök elemanı generic'ten (`Component<HTMLButtonElement>`) ya da `super('button')` ile alın, kökün sınıf/öznitelik/olaylarını `onConfigured`'da bağlayın; `view()` içinde tekrar `<button>` yazmak iç içe iki eleman üretir. Fonksiyon ve Options biçimlerinde döndürülen/`view()`'daki eleman zaten köktür.
- **Değişebilen her prop `Bind<T>`'dir** ve `read()` ile okunur. Tüketici `label="Kaydet"` de yazabilir, `label={() => state.text}` de; derleyici öznitelikteki üçlü operatörü zaten getter'a sarar (bkz. [Özniteliklerde ternary](./jsx.md#attribute-ternary)). Prop'u doğrudan `this.props.label` diye okursanız getter biçimi çalışmaz.
- **Ortak öznitelikler köke düşer.** `class`, `style`, `id`, `tabindex`, `role`, `aria-*`, `data-*` bileşen etiketinden kök elemana otomatik uygulanır; bunları prop olarak tanımlayıp elle kopyalamayın (bkz. [Attribute fallthrough](./jsx.md#attribute-fallthrough)). Kökün kendi `class`'ı tüketicininkiyle birleşir.
- **Ayrılmış adları kullanmayın:** `options`, `ref`, `key`, `transition`, `childs`, `initializeComponent`, `runover` ve yaşam döngüsü kancalarının adları (`onBuilt`, `onMounted` …) çerçeveye gider (bkz. [Prop adlarında dikkat](./wrapping-libraries.md#prop-names)).
- **DOM olay adıyla çakışan geri çağrı adı vermeyin.** `onChange`, `onSelect`, `onResize`, `onReset`, `onCopy`, `onContextMenu` gibi bir prop bileşen etiketinde kök elemana DOM dinleyicisi olarak bağlanır ve `props`'a hiç ulaşmaz; derleyici `MJX002` ile uyarır. `onPress`, `onValueChange`, `onCommit` gibi adlar güvenlidir.
- **Çocuk içerik** `childs` ile gelir; kök elemanda `view()` yazmadan `<Card>…</Card>` biçimi doğrudan çalışır (bkz. [Çocuk bileşenler](./components.md#childs)).
- Tüketicinin bileşen örneğine `ref` ile ulaşacağını varsayın; dışa açmak istediğiniz davranışı public metot olarak verin (`dialog.open()`), iç alanları `private` yapın.

## Stil ve CSS {#css}

Paket CSS'ini **tek bir dosya** olarak sunun ve tüketici onu bilinçli olarak içe aktarsın:

```ts
// tüketici
import '@sirket/motif-ui/style.css';
```

- Kütüphane kipinde `src/index.ts` içinden içe aktarılan CSS Vite 5'te `dist/style.css` olarak yazılır (Vite 6'da adı `build.lib.cssFileName: 'style'` ile verin); `exports["./style.css"]` onu adreslenebilir yapar. Girişten içe aktarmak `sideEffects: false` ile çelişmez: CSS dosyaları paketleyici tarafından yan etkili sayılır.
- Kuralları bir `@layer` içine koyun (`@layer mf.base, mf.components;`). Katmansız kurallar bütün katmanları özgüllükten bağımsız ezdiği için tüketicinin tek satırlık bir ezmesi daima kazanır; tema değerlerini `--mf-*` gibi önekli CSS değişkenleriyle verin.
- Bileşen içinde `<style>` etiketi (bkz. [Satır içi style](./styling-and-transitions.md#inline-style-tag)) küçük, kendine yeten bileşenlerde işe yarar ama her örnekte bir `<style>` düğümü üretir ve kapsamlı değildir; kütüphane ölçeğinde dosya tercih edin.
- Geçişler için sınıf adlarını belgeleyin: `transition="mf-fade"` yazan tüketici `mf-fade-enter-from/active/to` kurallarını sizden bekler (bkz. [Geçiş prop'u](./styling-and-transitions.md#transition-prop)).

## Servisler {#services}

Paket bir servis (tema, bildirim kuyruğu, dil) taşıyorsa `@Injectable` ile işaretleyin; sınıf modülü yüklendiği anda işaretlenir ve ilk çözümlemede kaydedilir (bkz. [Dekoratörlerle otomatik kayıt](./dependency-injection.md#injectable-decorator)). Derleyici eklentisi dekoratörleri `.ts` dosyalarında da derler; eklentisiz bir sarmalayıcıda TypeScript standart dekoratörü kendisi derler.

Tüketicinin yaşam süresini seçmesi gerekiyorsa açık bir kayıt fonksiyonu daha nettir:

```ts file=src/services.ts
import { ServiceCollection } from '@motifx/core';
import { ThemeService } from './ThemeService';

export function registerUiServices(services: ServiceCollection) {
  services.addSingleton(ThemeService, ThemeService);
}
```

```ts
// tüketici
const builder = Application.CreateBuilder();
registerUiServices(builder.services);
const app = builder.build();
```

Açık kayıt dekoratörü ezer; ikisini birlikte vermek güvenlidir.

## Test ve geliştirme {#testing}

- `vitest` + `jsdom`, `vite.config.ts`'teki aynı eklentiyle çalışır; testlerde JSX için ek ayar gerekmez. `document`'a ekleyip `onMounted` davranışını da sınayın.
- Her bileşen için bir **tur testi** yazın: kur, DOM'a ekle, `dispose()`, canlı bileşen sayısının başa döndüğünü doğrulayın (bkz. [Temizliği kanıtlayın](./wrapping-libraries.md#prove-cleanup)). Sızıntı ancak böyle görülür.
- Geliştirme için paketin köküne bir `index.html` ve `src/showcase/` koyun; `vite` ile bileşenleri gerçek tarayıcıda görün. Vitrin, `exports` dışında kaldığı için pakete girmez.
- `motif-lint` (`@motifx/compiler` ile gelir) prop tiplerine karşı JSX'i denetler; `package.json`'a `"lint:jsx": "motif-lint"` ekleyin (bkz. [motif-lint](./jsx.md#motif-lint)).

## Yayın öncesi denetim {#release-checklist}

1. `npm run build` → `dist/index.js`, `dist/index.cjs`, `dist/types/index.d.ts`, `dist/style.css` oluştu mu?
2. `dist/index.js` içinde `jsx(`/`createElement(` yok, `from "@motifx/core"` var mı? (Derleyici çalıştı ve çekirdek dışarıda kaldı.)
3. `npx publint` ve `npx @arethetypeswrong/cli --pack`: `exports`/`types` tutarlı mı, CJS tüketici tipleri görüyor mu?
4. Boş bir Vite uygulamasında `npm pack` çıktısını kurup bir bileşeni kullanın; `app.useDevelopment(true)` ile `MJX121` ya da `MJX002` uyarısı çıkmadığını görün.
5. Monorepo'da `file:`/`link:` ile bağlı test ederken tüketicide `resolve: { dedupe: ['@motifx/core'] }` verin; yayımlanan pakette bu gerekmez.
6. `README`'de peer bağımlılıkları, `style.css` içe aktarımını, prop tablosunu ve geçiş sınıf adlarını yazın.

## Sonraki adım {#next}

Üçüncü parti bir kütüphaneyi bileşene çevirme kuralları için [Üçüncü Parti Kütüphane Sarmalama](./wrapping-libraries.md); paketin içindeki bileşenlerin yaşam döngüsü için [Yaşam Döngüsü](./lifecycle.md).
