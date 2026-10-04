# Running your own docs site

This repository is the MotifJS website, and it is also a small documentation system that can be
forked and run for any project. You need to change three things: one settings file, your interface
texts, and your markdown pages. This guide covers configuring a copy, working on it, and hosting it:
with its .NET server on Linux or Windows, or as static files on GitHub Pages and similar hosts.

- [How it fits together](#how-it-fits-together)
- [Requirements](#requirements)
- [Configure: `site.config.json`](#configure-siteconfigjson)
- [Languages](#languages)
- [Content](#content)
- [Development](#development)
- [Two ways to host](#two-ways-to-host)
- [Static hosting: GitHub Pages](#static-hosting-github-pages)
- [Release build](#release-build)
- [Hosting on Linux](#hosting-on-linux)
- [Hosting on Windows](#hosting-on-windows)
- [Updating a running site](#updating-a-running-site)
- [Server settings](#server-settings)
- [Troubleshooting](#troubleshooting)

## How it fits together

```text
site.config.json        name, address, logo, languages, links: the one file a fork edits
public/                 static files: logo.svg, favicon.svg
src/                    the site, a MotifJS app built with Vite
  content/locales/      interface texts, one {code}.json per language
content/docs/           the documentation: categories.json and one folder of .md files per language
server/MotifJs.Docs/    ASP.NET Core (.NET 10) server: hosts the site, serves the docs API
```

1. `npm run build` builds the site into `server/MotifJs.Docs/wwwroot`.
2. `npm run docs:sync` reads `content/docs` and builds a SQLite database,
   `server/MotifJs.Docs/App_Data/docs.db`.
3. The server serves the site and reads the docs from that database. It never reads the markdown files.

The site renders in the browser. For search engines and link previews, the server adds the page's
title, description, canonical and language links, and a plain HTML copy of the article to every docs
page it sends.

A production server only needs the published folder. Node.js and the markdown files stay on your
machine or your CI. A static host needs no server at all: see [Two ways to host](#two-ways-to-host).

## Requirements

| | For | Version |
|---|---|---|
| Node.js | building the site | a current LTS (22 or newer) |
| .NET SDK | building the server, syncing docs | 10.0 |
| ASP.NET Core Runtime | running the published server | 10.0 (included in the SDK) |

## Configure: `site.config.json`

The file sits in the repository root. Both the site build and the server read it. The build also
copies it next to the server, so the server needs no other copy.

```json
{
  "name": "MotifJS",
  "url": "https://motifjs.com",
  "logo": {
    "mark": "public/logo.svg",
    "wordmark": "motif",
    "wordmarkAccent": "js"
  },
  "defaultLocale": "en",
  "locales": [
    { "code": "en", "label": "English" },
    { "code": "tr", "label": "Türkçe" }
  ],
  "links": {
    "repository": "https://github.com/motifjsdev/motifjs",
    "issues": "https://github.com/motifjsdev/motifjs/issues"
  }
}
```

| Key | What it does |
|---|---|
| `name` | Shown in tab titles (`Routing — MotifJS`) and link previews. |
| `url` | The public address, without a trailing slash. Canonical links and `sitemap.xml` use it. Leave it empty (`""`) to use the address of each request; that is fine locally, but set it in production, especially behind a reverse proxy. |
| `logo.mark` | An SVG file, relative to the repository root. It is inlined into the page, so a logo drawn without its own `fill` takes the theme's colour and follows light and dark mode; one with its own colours keeps them. It needs a `viewBox`. |
| `logo.wordmark`, `logo.wordmarkAccent` | The text next to the mark; the accent part is shown in the accent colour (`motif` + `js`). Leave out `wordmarkAccent` for a single colour. |
| `defaultLocale` | The language served at the root (`/docs/routing`). The others live under their code (`/tr/docs/routing`). Must be one of `locales`. |
| `locales` | The languages: `code` is used in addresses and file names, `label` is shown in the language menu. |
| `links.repository`, `links.issues` | Targets of the GitHub links in the header, footer and home page. |

Mistakes stop the build with a message naming what to fix, for example a language without a texts
file or a logo that does not exist.

Also replace `public/favicon.svg`, and `theme-color` in `index.html` if you change the colours.
The colours themselves are design tokens in `src/styles/tokens.css`.

## Languages

A language needs three things:

1. An entry in `locales` in `site.config.json`.
2. Its interface texts in `src/content/locales/{code}.json`. `en.json` is the reference and lists
   every key. A missing key falls back to the default language's text, so a translation can be
   filled in gradually.
3. Its pages in `content/docs/{code}/`, plus a title for each category it uses in
   `content/docs/categories.json`.

Languages are independent: they do not need the same pages. Pages with the same `slug` are treated as
the same page in two languages, so switching languages stays on that page and search engines are told
about the translation. If the other language has no such page, switching goes to that language's docs
home.

To remove a language, take it out of `locales` and delete its folder and texts file.

## Content

See [Writing docs](README.md#writing-docs) in the README for the markdown format: front matter, links
between files, code examples per component style, and redirects.

Run `npm run docs:sync` after every change. It checks every file first and changes nothing if one has a
problem. Otherwise it builds a new database from scratch and swaps it in. The one thing it carries over
from the old database is the address history, so the address of a deleted or renamed page keeps working
as a redirect.

## Development

```sh
npm install
npm run docs:sync   # markdown -> server/MotifJs.Docs/App_Data/docs.db
npm run server      # server on http://localhost:5125
npm run dev         # site with hot reload on http://localhost:3040; /api goes to the server
```

Edits under `src/` reload the browser. After changing `site.config.json`, restart both `npm run dev`
and `npm run server`; restart the server after changing server code.

To serve the built site from the server alone, as in production, run `npm run build` and open
<http://localhost:5125>.

## Two ways to host

Both use the same content, settings and design; pick per site.

| | .NET server | Static files |
|---|---|---|
| Where | a VPS, IIS, any machine with the ASP.NET Core runtime | GitHub Pages, Netlify, Cloudflare Pages, any web server |
| Build | `npm run release` → `publish/` | `npm run export` → `dist/` |
| New content | swap `docs.db` or sync on the server; no rebuild | build again and upload; CI can do it on every push |
| Old addresses | permanent redirect (301) | a small page that forwards at once; crawlers follow it, though less surely than a 301 |
| Address of the site | anywhere | the root of a domain (see below) |

## Static hosting: GitHub Pages

```sh
npm run export
```

This builds the site, syncs the docs and writes the whole site to `dist/`:

- one `.html` file per page and language (`docs/routing.html`, `tr/docs/routing.html`), which static
  hosts serve at the address without `.html`
- `api/docs/{code}/nav.json` and `api/docs/{code}/pages/{slug}.json`: the same answers the server gives,
  so the site reads its docs the same way
- `sitemap.xml`, `robots.txt`, `404.html`
- a forwarding page at every old address

Two requirements:

- `url` in `site.config.json` must be set: a static file has no request to take the address from, and
  the export stops without it.
- The site must be served at the root of its domain. GitHub Pages serves a project repository under
  `/<repository>/`, which the site does not support yet. Use a custom domain, or a repository named
  `<user>.github.io`.

To look at the result locally, serve `dist/` with a server that maps `/page` to `page.html`, for
example `npx serve dist`.

### Publish with GitHub Actions

Add `.github/workflows/pages.yml`, then pick **GitHub Actions** as the source under
**Settings → Pages**. If you use a custom domain, set it on the same page. Every push to `main` then
rebuilds and publishes the site.

```yaml
name: Publish docs

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: 10.0.x
      # Keeps the address history between runs (see below).
      - uses: actions/cache@v4
        with:
          path: server/MotifJs.Docs/App_Data/docs.db
          key: docs-db-${{ github.run_id }}
          restore-keys: docs-db-
      - run: npm ci
      - run: npm run export
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Removed and renamed pages.** The sync creates redirects for addresses that disappeared by comparing
with the previous `docs.db`. A CI run starts from a clean checkout, so the workflow keeps the database
in the Actions cache. GitHub drops caches that go unused for a week, though, so when you rename or
remove a page, also list the old address in `redirectFrom` (see [Writing docs](README.md#writing-docs)).
Those redirects come from the markdown itself and survive any build.

### Other static hosts

Upload `dist/` to any host that serves `page.html` at `/page`. Netlify and Cloudflare Pages do this by
default. Building there needs the .NET SDK, so it is usually simpler to build in GitHub Actions as above
and deploy the folder. With your own nginx:

```nginx
server {
    listen 80;
    server_name docs.example.com;
    root /var/www/docs;

    location / {
        try_files $uri $uri.html $uri/ =404;
    }
    error_page 404 /404.html;
}
```

## Release build

```sh
npm run release
```

This builds the site, syncs the docs and publishes the server to `publish/`. That folder is the whole
site:

```text
publish/
  MotifJs.Docs.dll      the server
  site.config.json      settings
  appsettings.json      server settings (see below)
  wwwroot/              the built site
  App_Data/docs.db      the docs
  web.config            used by IIS only
  runtimes/             SQLite for each operating system
```

The output is framework-dependent: the host needs the ASP.NET Core 10 runtime, and the same folder runs
on Windows, Linux and macOS. To ship a build that needs no runtime, publish for one platform instead:

```sh
dotnet publish server/MotifJs.Docs -c Release -r linux-x64 --self-contained -o publish
```

Run `npm run build` and `npm run docs:sync` first; `npm run release` does both.

The server reads `wwwroot` and `App_Data` relative to the folder it is **started from**, so always
start it from inside the published folder, or set that folder as the working directory.

## Hosting on Linux

The server runs as a service, with nginx in front of it for HTTPS. These steps are for Ubuntu or Debian.

#### 1. Install the runtime

```sh
sudo apt-get update
sudo apt-get install -y aspnetcore-runtime-10.0
```

If your release does not have the package yet, follow
[Install .NET on Linux](https://learn.microsoft.com/dotnet/core/install/linux).

#### 2. Copy the release

```sh
sudo mkdir -p /var/www/docs
sudo rsync -a --delete publish/ /var/www/docs/
sudo chown -R www-data:www-data /var/www/docs
```

#### 3. Run it as a service: `/etc/systemd/system/docs.service`

```ini
[Unit]
Description=Docs site
After=network.target

[Service]
WorkingDirectory=/var/www/docs
ExecStart=/usr/bin/dotnet /var/www/docs/MotifJs.Docs.dll --urls http://127.0.0.1:5125
Restart=always
RestartSec=5
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_NOLOGO=1

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now docs
sudo systemctl status docs
journalctl -u docs -f        # logs
```

`WorkingDirectory` matters: it is where the server looks for `wwwroot` and `App_Data`.

#### 4. Put nginx in front: `/etc/nginx/sites-available/docs`

```nginx
server {
    listen 80;
    server_name docs.example.com;

    location / {
        proxy_pass         http://127.0.0.1:5125;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

```sh
sudo ln -s /etc/nginx/sites-available/docs /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d docs.example.com     # HTTPS with Let's Encrypt
```

Set `url` in `site.config.json` to the public `https://` address. The server only sees the proxy's
plain HTTP request, so without `url` canonical links and the sitemap would point to
`http://127.0.0.1:5125`.

## Hosting on Windows

### IIS

1. Install the **ASP.NET Core 10 Hosting Bundle** from the
   [.NET download page](https://dotnet.microsoft.com/download/dotnet/10.0). It contains the runtime and
   the IIS module. Restart IIS afterwards (`iisreset`).
2. Copy `publish\` to the server, for example `C:\inetpub\docs`.
3. In IIS Manager, add a website whose physical path is that folder. Set its application pool's
   **.NET CLR version** to **No Managed Code**.
4. If you will sync on the server (see below), give the application pool's identity
   (`IIS AppPool\<pool name>`) **Modify** permission on `App_Data`. Otherwise read access is enough.

`web.config` from the publish output is already set up: IIS starts the server in-process and the
working directory is the site folder. To see startup errors, set `stdoutLogEnabled="true"` in
`web.config` and create a `logs` folder; turn it off again afterwards.

### Without IIS

From the published folder:

```powershell
cd C:\sites\docs
dotnet MotifJs.Docs.dll --urls http://0.0.0.0:5125
```

This is enough for testing or for a machine behind another proxy. For a long-running site, use IIS, or
a service wrapper that starts the command above with the published folder as working directory.

## Updating a running site

**Code or design changes:** run `npm run release` again, copy `publish/` over the old folder, then
restart (`sudo systemctl restart docs`; on IIS, recycle the application pool or touch `web.config`).

**Content only:** the database is just a file, and the server opens it per request, so swapping
it in needs no restart. Choose one of these:

- Build `docs.db` locally (`npm run docs:sync`) and upload it next to the old one, then rename it into place:

  ```sh
  scp server/MotifJs.Docs/App_Data/docs.db host:/var/www/docs/App_Data/docs.db.upload
  ssh host 'mv /var/www/docs/App_Data/docs.db.upload /var/www/docs/App_Data/docs.db'
  ```

  Do not copy straight over the live file: a request could read it half written. A rename swaps it in one step.
- Or keep the markdown on the server and sync there, from the published folder:

  ```sh
  cd /var/www/docs
  sudo -u www-data dotnet MotifJs.Docs.dll sync --Docs:ContentPath=/srv/docs-content
  ```

  `/srv/docs-content` is a copy of `content/docs` (with `categories.json` and the language folders), for
  example a git checkout. The sync builds the new database next to the old one and swaps it in itself.

Keep the old `docs.db` around (or sync where the previous one is): it holds the address history, and
redirects for removed pages are only created when the sync can compare with it.

## Server settings

`appsettings.json` in the published folder holds the settings that belong to the host, not to the site:

| Setting | Default | |
|---|---|---|
| `Docs:ContentPath` | `../../content/docs` | Where the sync reads markdown, relative to the working directory. Only the sync uses it. |
| `Docs:DatabasePath` | `App_Data/docs.db` | The database the server reads and the sync writes. |
| `Site:Url` | (none) | Overrides `url` from `site.config.json`, for example on a staging host. |

Settings can also come from the command line (`--Docs:DatabasePath=/data/docs.db`) or the environment
(`Docs__DatabasePath=/data/docs.db`, `Site__Url=https://staging.example.com`). The listening address is
set with `--urls` or `ASPNETCORE_URLS`.

## Troubleshooting

| Symptom | Cause |
|---|---|
| "The site has not been built yet" | `wwwroot` is missing: run `npm run build`, or the server was started from another folder (check the working directory). |
| Docs pages are empty or 404 | No database, or an empty one: run `npm run docs:sync` and check its output for problems. |
| "site.config.json was not found next to the server" | The server was built before the file existed; build it again. |
| "built by an older version; run npm run docs:sync" | The database comes from an older server version. Sync again. |
| Sync says the database "is in use and could not be replaced" | An older server version keeps the file open. Restart the server with the current version. |
| Canonical links or the sitemap show `localhost` or `http://` | Set `url` in `site.config.json` (or `Site:Url`) to the public address. |
| Build stops with `site.config.json: ...` | The message names the problem, e.g. a language without `src/content/locales/{code}.json`. |
| Export stops: "set url" or "has a path" | Set `url` in `site.config.json` to the root address of the site, e.g. `https://docs.example.com`. |
| Static site: pages work from the start page but reloading one shows 404 | The host does not serve `page.html` at `/page`; see [Other static hosts](#other-static-hosts). |
