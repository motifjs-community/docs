# motifjs.com

The MotifJS website and documentation. The site is a MotifJS app built with Vite; an ASP.NET Core
server (`server/MotifJs.Docs`) hosts it and serves the docs from a SQLite database that is filled from
the markdown files in `content/docs`.

Requires Node.js and the .NET 10 SDK.

**Running your own docs site?** See [SELF-HOSTING.md](SELF-HOSTING.md): configuring a fork with
`site.config.json`, adding languages, and deploying to Linux, Windows or GitHub Pages.

## Development

```sh
npm install
npm run docs:sync   # markdown -> server/MotifJs.Docs/App_Data/docs.db
npm run server      # API on http://localhost:5125
npm run dev         # site with hot reload; /api is proxied to the server
```

## Writing docs

The docs are built from `content/docs` alone: one folder per language listed in `site.config.json`
(sub-folders allowed, any file names), and
`content/docs/categories.json` for the categories, their order and their title in each language.
Every language folder stands on its own: languages do not need the same pages.

```md
---
slug: routing
title: Routing
description: Define nested routes, layouts, parameters, and navigation.
category: application
order: 2
redirectFrom: [router]
---

## Route layouts {#route-layouts}

See [the lifecycle](./08-lifecycle.md#hooks).
```

- `slug` is the address (`/docs/routing`, Turkish under `/tr/docs/routing`). Without it the file name is used.
  Pages with the same slug are the same page in different languages: switching the language stays on it,
  and search engines are told about the other language. When the other language has no such page,
  switching leads to its docs home.
- Link to other pages of the same language by their file, as you would between markdown files: the link
  works in an editor or on GitHub, and the sync turns it into a site link. A link to a missing file stops
  the sync; a `#section` the target page does not have is reported as a warning.
- A category needs a title for every language that uses it.
- The title comes from front matter, so sections start at `##`. `{#id}` keeps an anchor the same in every
  language, which links from other pages rely on.
- Code fences take `file=` for the label. Fences with the same `file=` in a row form one example; give each
  a `variant=` to follow the reader's code preference, made of the choices in `codeOptions`
  (`site.config.json`): `declarative/class`, just `class` (both writing styles) or just `declarative` (all
  component styles). Every combination needs an example; one block can cover several with a comma, e.g.
  `variant=function,options` when a style cannot be written another way. When blocks overlap, the one
  naming the most choices is shown.

Run `npm run docs:sync` after editing. It checks every file first and changes nothing if one has a
problem, printing the file and line. Otherwise it builds a new database from scratch and swaps it in; the
site can keep running.

Addresses never break: the only thing a sync keeps from the old database is its address history. When a
page disappears from a language, its old address there redirects (301) to the page that lists it in
`redirectFrom`, to the same file's new address if only the `slug` changed, or else to that language's docs home.

## Release

```sh
npm run release     # builds the site, syncs the docs, publishes the server to ./publish
npm run export      # or: the whole site as static files in ./dist (GitHub Pages and the like)
```

`publish/` contains everything the host needs, including `wwwroot` and `App_Data/docs.db`. Hosting it on
Linux (systemd + nginx) or Windows (IIS) is described in [SELF-HOSTING.md](SELF-HOSTING.md#release-build).
