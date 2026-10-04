# motifjs.com

The MotifJS website and documentation. The site is a MotifJS app built with Vite; an ASP.NET Core
server (`server/MotifJs.Docs`) hosts it and serves the docs from a SQLite database that is filled from
the markdown files in `content/docs`.

Requires Node.js and the .NET 10 SDK.

## Development

```sh
npm install
npm run docs:sync   # markdown -> server/MotifJs.Docs/App_Data/docs.db
npm run server      # API on http://localhost:5125
npm run dev         # site with hot reload; /api is proxied to the server
```

## Writing docs

Each page is `content/docs/<locale>/<slug>.md`; the file name is the URL (`/docs/<slug>`, Turkish under
`/tr/docs/<slug>`). English pages decide which pages exist; a page without a Turkish file is shown in
English on the Turkish site. Categories and their order live in `content/docs/categories.json`.

```md
---
title: Routing
description: Define nested routes, layouts, parameters, and navigation.
category: application
order: 2
---

## Route layouts {#route-layouts}

Text with [links to other pages](/docs/lifecycle).
```

- The title comes from front matter, so sections start at `##`. `{#id}` keeps an anchor the same in every language.
- Code fences take `file=` for the label. Fences with the same `file=` in a row form one example; give each
  a `variant=` to follow the reader's code preference: `declarative/class`, just `class` (both writing
  styles) or just `declarative` (all component styles). Every combination needs an example.

Run `npm run docs:sync` after editing. It checks every file first and changes nothing if one has a
problem, printing the file and line.

## Release

```sh
npm run release     # builds the site, syncs the docs, publishes the server to ./publish
```

`publish/` contains everything the host needs, including `wwwroot` and `App_Data/docs.db`.
