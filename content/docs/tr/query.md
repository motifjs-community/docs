---
slug: query
title: Koleksiyon Sorguları (Query)
description: Query.from ile LINQ tarzı where/select/orderBy/groupBy zincirleri, sonuç üreten metotlar ve reaktivite ile kullanım.
category: reference
order: 2
---

`Query<T>`, bir diziyi ya da herhangi bir yinelenebilir (iterable) kaynağı LINQ tarzında sorgulamak için kullanılan küçük bir sarmalayıcıdır. Filtreleme, dönüştürme, sıralama, gruplama gibi adımları tek bir zincirde okunur biçimde yazmanızı sağlar.

```tsx
import { Query } from "@motifx/core";

const adults = Query.from(people)
  .where(p => p.age >= 18)
  .orderBy(p => p.name)
  .select(p => p.name)
  .toArray();
```

`Query` isteğe bağlıdır: yalnızca import ettiğinizde pakete girer ve `Array.prototype` dahil global hiçbir nesneyi değiştirmez. Sorgu her zaman `Query.from(...)` ile başlar.

## Sorgu oluşturma {#creating}

| Yazım | Açıklama |
|-------|----------|
| `Query.from(kaynak)` | Kaynaktan sorgu üretir. |
| `new Query(kaynak)` | `Query.from` ile aynıdır. |

`kaynak` bir dizi ya da herhangi bir `Iterable<T>` olabilir: `Set`, `Map.keys()`, `Map.values()`, üreteç (generator) fonksiyonlar, reaktif diziler.

```tsx
Query.from(new Set(["a", "b"]));
Query.from(map.values());
Query.from(state.items);          // reaktif dizi
```

Kaynak bir diziyse kopyalanmaz, doğrudan okunur; diğer yinelenebilirler `Query.from` anında bir diziye kopyalanır. Kaynak dizi hiçbir adımda değiştirilmez.

## Zincirlenen adımlar {#chaining}

Bu metotlar yeni bir `Query` döndürür; arkasına başka bir adım eklenebilir.

| Metot | Açıklama |
|-------|----------|
| `where(predicate)` | Koşulu sağlayan öğeleri bırakır. `predicate(öğe, indeks)`. |
| `select(selector)` | Her öğeyi dönüştürür. `selector(öğe, indeks)`. |
| `orderBy(keySelector)` | Anahtara göre artan sıralar. |
| `orderByDescending(keySelector)` | Anahtara göre azalan sıralar. |
| `distinctBy(keySelector)` | Aynı anahtara sahip öğelerden yalnızca ilkini bırakır. |
| `groupBy(keySelector)` | Öğeleri `{ key, items }` gruplarına ayırır; sonuç `Query<Group<TKey, T>>` olur. |

## Sonuç üreten metotlar {#terminal}

Bu metotlar zinciri bitirir ve bir değer döndürür.

| Metot | Dönüş | Açıklama |
|-------|-------|----------|
| `toArray()` | `T[]` | Sonucu yeni bir diziye kopyalar. |
| `first()` | `T` | İlk öğe; sorgu boşsa `MotifError` (`MJX601`) fırlatır. |
| `firstOrDefault()` | `T \| undefined` | İlk öğe; sorgu boşsa `undefined`. |
| `any(predicate?)` | `boolean` | Koşul verilmezse "en az bir öğe var mı", verilirse "koşulu sağlayan öğe var mı". |
| `all(predicate)` | `boolean` | Tüm öğeler koşulu sağlıyor mu. |
| `aggregate(seed, func)` | `TResult` | `seed` başlangıç değeriyle öğeleri tek değere indirger. |

`Query` yinelenebilir olduğu için `toArray()` çağırmadan da doğrudan dolaşılabilir:

```tsx
for (const name of Query.from(people).select(p => p.name)) {
  console.log(name);
}

const names = [...Query.from(people).select(p => p.name)];
```

## Örnekler {#examples}

### Sıralama {#sorting}

```tsx
const byAge = Query.from(people)
  .orderByDescending(p => p.age)
  .toArray();
```

Sıralama kararlıdır: anahtarı eşit olan öğeler kaynaktaki sıralarını korur. Anahtarlar `<` ve `>` ile karşılaştırılır; sayı, dizge ve `Date` anahtarları beklendiği gibi çalışır. Dizgeler karakter koduna göre sıralanır; Türkçe alfabe sırası gerekiyorsa sonucu kendiniz sıralayın:

```tsx
const byName = Query.from(people).toArray().sort((a, b) => a.name.localeCompare(b.name, "tr"));
```

### Gruplama {#grouping}

```tsx
const byCity = Query.from(people)
  .groupBy(p => p.city)
  .select(g => ({ city: g.key, count: g.items.length }))
  .toArray();
```

Gruplar, anahtarın kaynakta ilk göründüğü sırayla gelir. Anahtar eşitliği `Map` kurallarıyla belirlenir; nesne anahtarları değere göre değil referansa göre gruplanır.

### Toplama {#aggregation}

```tsx
const total = Query.from(order.lines).aggregate(0, (sum, line) => sum + line.price * line.qty);
const hasOverdue = Query.from(invoices).any(i => i.dueDate < today);
```

## Reaktivite ile kullanım {#reactivity}

`Query` reaktif dizileri sıradan dizi metotlarıyla okur; bu yüzden bir getter, `createComputed` ya da `effect` içinde kullanıldığında kaynağa bağımlılık kurulur ve kaynak değiştiğinde sonuç yeniden hesaplanır.

Listelerde sorguyu bir getter'a koyun ve çizimi her zamanki `.map` yazımıyla yapın. Derleyici `this.visible.map(...)` (fonksiyonda `visible().map(...)`) ifadesini `bindings.list`'e çevirir; satırlar öğe nesnesiyle eşleşir, aynı nesnenin DOM düğümleri yeniden kullanılır (`key` bu eşleşmeye katılmaz, öğeyi tanımlar) ([Koşullu Gösterim ve Listeler](./conditionals-and-lists.md)).

```tsx file=src/PeopleList.tsx variant=class
import { Component, Query, reactive } from "@motifx/core";

export class PeopleList extends Component {
  state = reactive({ people: [] as Person[], filter: "" });

  get visible() {
    return Query.from(this.state.people)
      .where(p => p.name.includes(this.state.filter))
      .orderBy(p => p.name)
      .toArray();
  }

  view() {
    return (
      <ul>
        {this.visible.map(p => <li key={p.id}>{p.name}</li>)}
      </ul>
    );
  }
}
```
```tsx file=src/PeopleList.tsx variant=function
import { Query, reactive } from "@motifx/core";

export function PeopleList() {
  const state = reactive({ people: [] as Person[], filter: "" });
  const visible = () => Query.from(state.people)
    .where(p => p.name.includes(state.filter))
    .orderBy(p => p.name)
    .toArray();

  return (
    <ul>
      {visible().map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}
```
```tsx file=src/PeopleList.tsx variant=options
import { Query, reactive } from "@motifx/core";

export const PeopleList = () => ({
  el: 'div',
  data: reactive({ people: [] as Person[], filter: "" }),

  visible() {
    return Query.from(this.data.people)
      .where(p => p.name.includes(this.data.filter))
      .orderBy(p => p.name)
      .toArray();
  },

  view() {
    return (
      <ul>
        {this.visible().map(p => <li key={p.id}>{p.name}</li>)}
      </ul>
    );
  },
});
```

Options nesnesinde `get visible()` yazmayın: nesnenin alanları bileşene kopyalanırken getter bir kez değerlenir ve sonucu düz bir dizi olarak kopyalanır; metot (`visible()`) her okumada yeniden çalışır.

`people` dizisi ya da `filter` değiştiğinde zincir baştan çalışır ve liste yalnızca farkı DOM'a uygular. Çok büyük listelerde [Sanal Listeler](./virtualization.md) bölümündeki `Virtualization` bileşenini kullanın.

## Bilinmesi gerekenler {#notes}

- **Değerlendirme hemen yapılır.** Her zincir adımı kendi ara dizisini üretir; LINQ'teki gibi tembel (lazy) değerlendirme yoktur. Birkaç bin öğeye kadar bunun maliyeti önemsizdir.
- **Kaynak değişmez.** `orderBy` ve `orderByDescending` kaynağın kopyasını sıralar; `toArray()` her çağrıda yeni bir dizi döndürür.
- **Sonuç anlık görüntüdür.** Her adım çağrıldığı anda çalışır; kaynağa sonradan eklenen öğeler daha önce hesaplanmış adım sonuçlarına yansımaz. (Adım uygulanmamış `Query.from(dizi)` diziyi kopyalamadığı için dizinin güncel hâlini okur; dizi olmayan kaynak ise `from` anında kopyalanır.) Güncel sonuç için zinciri bir getter içinde kurun ve her okumada yeniden çalıştırın.
- **Zincir `Query` döndürür.** `where`, `select`, `groupBy` gibi adımların sonucu dizi değil `Query`'dir (`groupBy` → `Query<Group<TKey, T>>`); dizi gereken yerde sonuna `toArray()` ekleyin.

Bkz: [Reaktivite](./reactivity.md), [API Referansı](./api-reference.md).
