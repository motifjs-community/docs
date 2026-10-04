---
slug: forms
title: Formlar ve İki Yönlü Bağlama
description: Tek yönlü value+oninput, bindings.model ve x-model ile iki yönlü bağ, select, form gönderimi ve doğrulama deseni.
category: core
order: 6
---

MotifJS form girdilerini iki yolla yönetir:

1. **Reaktif okuma + olay yazma** (tek yönlü, açık): `value={() => state.x}` + `oninput`.
2. **İki yönlü bağ** (`bindings.model`): girdi ile model otomatik senkronize olur. Belirli bir DOM özelliğine tek yönlü bağ için `bindings.add` kullanılır.

## Tek yönlü (açık) yaklaşım {#one-way}

En şeffaf yöntemdir. Değeri reaktif okursunuz, değişikliği olayla modele yazarsınız:

```tsx
const state = reactive({ name: "", agree: false });

<form>
  <input
    type="text"
    value={() => state.name}
    oninput={(e) => state.name = e.target.value}
  />

  <input
    type="checkbox"
    checked={() => state.agree}
    onchange={(e) => state.agree = e.target.checked}
  />
</form>
```

Bu yaklaşım, gerçek demo koddaki liste öğelerinde de kullanılır:

```tsx
<input
  type="checkbox"
  checked={() => todo.completed}
  onchange={(e) => todo.completed = e.target.checked}
/>
```

## İki yönlü bağ — `bindings.model` {#model}

`bindings.model`, elemanın türüne göre doğru DOM özelliğini otomatik seçip modele iki yönlü bağlar:

| Eleman | Bağlanan özellik |
|--------|------------------|
| `<input type="checkbox">`, `<input type="radio">` | `checked` (boolean) |
| `<input>` (diğer) | `value` |
| `<select>` | `value` |
| `<textarea>` | `value` |
| `<img>`, `<audio>`, `<video>` | `src` (tek yönlü: yalnız model → eleman) |

Input'larda `checked`/`value` seçimi bağ kurulurken değil, **her okuma/yazmada** elemanın o anki
`type`'ına göre yapılır: `onconfig` bağı kurduğunda `type` attribute'u henüz uygulanmamış olabilir.

Modele yazılan değerin türü de elemana göre belirlenir:
>
> | Girdi | Modele yazılan |
> |---|---|
> | `checkbox`, `radio` | `boolean` |
> | `number`, `range` | `number` (girdi boşaltılırsa `null`) |
> | diğer hepsi (`text`, `date`, `select`, `textarea`…) | `string` |
>
> Tarih türleri bilerek dizge kalır: doğal modelleri `'2024-01-31'` biçimidir.

```tsx
<input
  type="text"
  onconfig={(s) => s.bindings.model(state, 'name')}
/>

<input
  type="checkbox"
  onconfig={(s) => s.bindings.model(todo, 'completed')}
/>
```

`onconfig` içinde bağı kurmak yaygın kalıptır: bileşen yapılandırılırken bağ eklenir.

İmzalar:

```ts
model(dataSource: any, dataMember: string): IBaseBinding;
model(dataSource: any, dataMember: string, formatString: string): IBaseBinding;
model(dataSource: any, dataMember: string, formatString: string, formatInfo: { locale?: string | string[]; currency?: string }): IBaseBinding;
model(getter: () => any, setter: (value: any) => void): IBaseBinding;
model(binding: IBaseBinding): IBaseBinding;
```

`dataMember` noktalı yol da olabilir (`'adres.sehir'`). Tek argümanlı çağrıda nesne bir `IBaseBinding` olarak yorumlanır; veri kaynağı her zaman `dataMember` ile birlikte verilir. `model(dataSource, dataMember)` çağrıldığı andaki `dataSource` nesnesini tutar; o nesne bütünüyle değiştirilebiliyorsa `x-model` ya da getter/setter biçimini kullanın.

### `x-model` kısa yazımı {#x-model}

```tsx
<input type="text" x-model={() => state.name} />
<input type="checkbox" x-model={() => todo.completed} />
```

`x-model`, `bindings.model(getter, setter)` çağrısına derlenir ve iki yönlüdür. Yazma tarafı, üyenin sahibi olan nesneyi her yazışta yeniden okur (`state.name` için `state`, `satir.ad` için `satir`, `state.form.ad` için `state.form`). Bu sayede nesne bütünüyle değiştirildiğinde (`state.form = {...}`) ya da liste satırları yer değiştirdiğinde bağ kopmaz:

```tsx
{state.satirlar.map(satir => <input key={satir.id} x-model={() => satir.ad} />)}
```

Sahip `null`/`undefined` iken (`x-model={() => state.secili?.ad}`) ve üye bir fonksiyon (getter prop) tutarken yazma atlanır. Üye erişimi olmayan bir ifade (`() => a + b`, `() => fn(x)`) yalnızca okunur, tek yönlü kalır; hangi durumun geçerli olduğunu `motif-explain` gösterir.

## `bindings.add` ile belirli özelliğe bağ {#bindings-add}

Hangi DOM özelliğine bağlanacağını kendiniz belirtmek isterseniz `bindings.add` kullanın. Bu bağ **tek yönlüdür** (model → DOM); kullanıcının değişikliğini modele yazmak için bir olay işleyicisi ekleyin:

```tsx
<input
  type="checkbox"
  onconfig={(s) => s.bindings.add('checked', todo, 'completed')}
  onchange={(e) => todo.completed = e.target.checked}
/>
```

## Metin girdisi ve `value` {#text-value}

`<input>` ve `<textarea>` için `value` prop'u özel olarak tanınır; reaktif değer veya getter alabilir:

```tsx
<input value={() => state.query} oninput={(e) => state.query = e.target.value} />
<textarea value={() => state.note} oninput={(e) => state.note = e.target.value} />
```

## `<select>` örneği {#select}

```tsx
const state = reactive({ lang: "tr" });

<select value={() => state.lang} onchange={(e) => state.lang = e.target.value}>
  <option value="tr">Türkçe</option>
  <option value="en">English</option>
</select>
```

## Form gönderimi {#submit}

```tsx
<form onsubmit={(s, e) => {
  e.preventDefault();
  submit(state);
}}>
  <input value={() => state.email} oninput={(e) => state.email = e.target.value} />
  <button type="submit">Gönder</button>
</form>
```

`onsubmit`'te işleyicinin `false` döndürmesi de `preventDefault`'u tetikler.

Eleman metotları JSX prop'u olarak yazıldığında öznitelik yazılmaz, metot çağrılır: `<form requestSubmit={() => state.send}>`, `<input focus={() => state.editing} />` (`false` → `blur()`), `<input setSelectionRange={[0, 5]} />`. `reportValidity`, `checkValidity`, `select`, `reset`, `submit` de bu gruptadır; tam liste ve değer kuralları için [JSX ve Şablonlar](./jsx.md).

## Doğrulama (validation) deseni {#validation}

MotifJS özel bir doğrulama API'si dayatmaz; reaktif alanlarla kolayca kurarsınız:

```tsx
const state = reactive({
  email: "",
  get emailValid() { return /.+@.+\..+/.test(state.email); }
});

<div>
  <input value={() => state.email} oninput={(e) => state.email = e.target.value} />
  <small class="error" x-wait={() => state.emailValid}>Geçersiz e-posta</small>
  <button disabled={() => !state.emailValid}>Kaydet</button>
</div>
```

## Yöntem karşılaştırması {#comparison}

| Yöntem | Ne zaman |
|--------|----------|
| Tek yönlü (`value` + `oninput`) | Değişimde ek mantık (dönüştürme, doğrulama, yan etki) çalıştıracaksanız. |
| `bindings.model` | Basit, iki yönlü senkronizasyon yeterliyse; en az kod. |
| `bindings.add('checked'/'value', ...)` + olay | Bağlanacak özelliği elle seçmek istiyorsanız (tek yönlü; geri yazma olayla). |

## Sonraki adım {#next}

Bileşenlerin yaşam döngüsünü ayrıntılı öğrenmek için [Yaşam Döngüsü](./lifecycle.md) bölümüne geçin.
