---
slug: collections
title: Koleksiyonlar
description: "@motifx/core ile gelen List, Dictionary, NameValuePair ve LinkedList yapılarının API'si ve davranışı."
category: reference
order: 3
---

Çekirdek üç küçük koleksiyon sınıfı dışa aktarır. Reaktif değildirler; reaktif liste için `reactive([])` kullanın ([Reaktivite](./reactivity.md)). Sorgulama için [Koleksiyon Sorguları](./query.md).

## `List<T>` {#list}

Ekleme/çıkarma olayları veren, `Set` destekli üyelik denetimi yapan dizi sarmalayıcısı.

```ts
import { List } from "@motifx/core";

const list = new List<string>();
list.ItemAdded = (x) => console.log('eklendi', x);
list.Add('a');            // 0 — eklenen öğenin dizini
list.AddBefore('z');      // başa ekler
list.Insert(1, 'm');      // dizine ekler
list.has('a');            // true
list.item(0);             // 'z'
list.count;               // 3
list.items;               // iç dizi (kopya değil)
```

| Üye | Açıklama |
|-----|----------|
| `Add(item)` | Sona ekler, dizini döndürür; `ItemAdded(item)` çağrılır. |
| `AddBefore(item)` | Başa ekler; `ItemAddedBefore(item)` çağrılır. Dönüş değeri `yeniUzunluk − 1`'dir (eklenen öğenin dizini değil). |
| `Insert(index, item)` | Verilen dizine ekler; `ItemSplice(index, item)` çağrılır. `splice`'ın döndürdüğü boş diziyi döndürür. |
| `remove(item)` | Öğeyi çıkarır ve çıkarılanı tek elemanlı dizi olarak döndürür; öğe listede yoksa hiçbir şey yapmaz ve boş dizi döndürür. |
| `removeIndex(index)` | Dizindeki öğeyi çıkarır; çıkarılanları dizi olarak döndürür. |
| `clear()` | Hepsini çıkarır; yeni boş iç diziyi döndürür. |
| `has(item)` / `indexOf(item)` / `item(index)` | Üyelik (`Set`, O(1)) / dizin / dizine göre öğe. |
| `FindFromKey(key, value)` | `öğe[key] === value` olan öğeler. |
| `forEach(fn)` / `filter(fn)` | Dizi karşılıkları; `filter` yeni dizi döndürür. |
| `ReverseClone()` | Öğelerin ters sıralı **kopyasını** döndürür; listenin sırası değişmez. |
| `items` / `count` | İç dizi / uzunluk. |
| `Dispose()` | İç diziyi boşaltır (`Set` korunur). |
| `ItemAdded`, `ItemAddedBefore`, `ItemSplice` | Atanabilir geri çağrılar; ilgili ekleme sonrası çağrılır. |

Çıkarma işlemleri olay vermez. `items` iç diziyi verir; dışarıdan değiştirilirse `has` ile tutarsızlaşır.

## `Dictionary<K, V>` ve `NameValuePair<K, V>` {#dictionary}

`NameValuePair` çiftlerini bir `List` içinde tutan anahtar-değer sözlüğü. Anahtar karşılaştırması `==` iledir, arama doğrusaldır.

```ts
import { Dictionary } from "@motifx/core";

const d = new Dictionary<string, number>();
d.OnItemAdded = (k, v) => console.log(k, v);
d.Add('a', 1);
d.has('a');              // true
d.item('a');             // NameValuePair { Key: 'a', value: 1 }
d.item('a')?.value;      // 1
d.remove('a');
```

| Üye | Açıklama |
|-----|----------|
| `Add(key, value)` | Çift ekler (aynı anahtar yinelenebilir; denetim yok), `List.Add`'in dizinini döndürür; `OnItemAdded(key, value)` çağrılır. |
| `has(key)` | Anahtar var mı (`==`). |
| `item(key)` | İlk eşleşen `NameValuePair` ya da `undefined`. |
| `remove(key)` | Anahtarı eşleşen **bütün** çiftleri çıkarır. |
| `removeIndex(index)` | Dizindeki çifti (0 tabanlı) çıkarır; çıkarılanları dizi olarak döndürür. |
| `clear()` | Hepsini çıkarır. |
| `forEach(fn)` / `filter(fn)` / `find(fn)` | `NameValuePair` üzerinde dolaşma, süzme, bulma. |
| `values` | Altındaki `List<NameValuePair<K, V>>`. |
| `OnItemAdded` | Atanabilir geri çağrı. |

`NameValuePair<K, V>` iki alanlı düz bir sınıftır: `Key` (büyük K) ve `value`.

## `LinkedList<T>` {#linked-list}

Çift yönlü, halkalı bağlı liste. Ekleme işlemleri **bağı koparan bir fonksiyon** döndürür; bu, dinleyici listeleri gibi "ekle, sonra elindeki tutamaçla çıkar" kalıpları için tasarlanmıştır.

```ts
import { LinkedList } from "@motifx/core";

const l = new LinkedList<() => void>();
const unlinkA = l.push(a);     // sona
const unlinkB = l.unshift(b);  // başa
for (const fn of l) fn();      // b, a
unlinkA();                     // a çıkar; ikinci çağrı etkisiz
l.size;                        // 1
```

| Üye | Açıklama |
|-----|----------|
| `push(value)` / `unshift(value)` | Sona / başa ekler; o düğümü çıkaran fonksiyon döndürür (yinelenen çağrı etkisizdir). |
| `pop()` / `shift()` | Sondan / baştan çıkarır ve değeri döndürür; boşsa `undefined`. |
| `clear()` | Hepsini çıkarır; daha önce alınan çıkarma fonksiyonları etkisizleşir. |
| `size` / `isEmpty()` | Eleman sayısı / boş mu. |
| `[Symbol.iterator]` | Baştan sona dolaşır (`for…of`, yayma). Dolaşırken çıkarma güvenlidir; eklenen öğe o dolaşımda görülebilir. |

Dizine erişim yoktur; dizine göre erişim gerekiyorsa `List` ya da düz dizi kullanın.

## Bkz. {#see-also}

[API Referansı](./api-reference.md#common), [Koleksiyon Sorguları](./query.md).
