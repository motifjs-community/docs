# MotifJS brand files

The mark is four chevrons on a diamond; the top one carries the accent: the one node that changed.
Colours are the design system's Tactile tokens (ink `#1d1c1a` / paper `#f8f7f3`, accent `#c24523` light /
`#ff8f66` dark, tile `#e4572e`). The wordmark is Archivo, width 112, weight 500, outlined: "JS" continues
"Motif" with no gap, in the muted text colour.

| File | Use |
| --- | --- |
| `../logo.svg` | The mark for inlining: the ink paths inherit `fill`, the accent chevron reads `--color-brand-accent` (falls back to the light accent). This is what the site header uses. |
| `logo-light.svg`, `logo-dark.svg` | The mark with fixed colours, for `<img>` on a light or dark background (READMEs, slides). |
| `mark-small.svg` | The solid ring for 16 px and single-colour places; inherits `fill`. |
| `favicon.svg` | The ring with its top half in the accent, for 16 px: the favicon (same file as `../favicon.svg`). Its colours follow the system theme through a media query inside the file. |
| `icon-tile.svg` | The accent tile with the white ring, for places that want a filled square: app icon, social avatar. |
| `wordmark.svg`, `wordmark-dark.svg` | Mark + "MotifJS", fixed colours, for a light or dark background. |

In a README, pick the file by theme:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://motifjs.com/brand/wordmark-dark.svg">
  <img src="https://motifjs.com/brand/wordmark.svg" alt="MotifJS" width="320">
</picture>
```
