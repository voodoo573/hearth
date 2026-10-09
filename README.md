# Hearth — Netlify deploy bundle

A complete static deployment of Hearth, the D&D companion app, with a
landing page and Progressive Web App (PWA) installation.

## What's in here

```
/
├── index.html              The landing page
├── app/
│   └── index.html          The Hearth app itself
├── icons/
│   ├── icon.png            Master icon source (the Hearth flame)
│   ├── icon-192.png        Android icon (small)
│   ├── icon-512.png        High-res icon (Android/desktop)
│   ├── icon-maskable-512.png   Adaptive icon (Android)
│   ├── apple-touch-icon.png    iOS home screen icon
│   ├── icon-180.png            iOS 180x180
│   └── favicon-32.png      Browser tab icon
├── manifest.webmanifest    PWA manifest (name, icons, theme)
├── sw.js                   Service worker (offline support)
├── netlify.toml            Headers + caching config
├── _redirects              SPA fallback
└── README.md               This file
```

## Deploying

### Drag & drop

1. Zip this folder.
2. Go to [app.netlify.com](https://app.netlify.com).
3. Drag the zip onto the Sites page.
4. Netlify gives you a URL.

### Via CLI

```bash
npm install -g netlify-cli
cd this-folder
netlify deploy --prod
```

### Via Git

Push the folder to GitHub, then in Netlify: Add new site → Import from
Git → pick repo. Publish directory = `.` (no build command needed).

## How users install Hearth as an app

The landing page (`/`) explains it, but in short:

- **iPhone (Safari):** tap Share → Add to Home Screen
- **Android (Chrome):** tap ⋮ menu → Install app
- **Desktop (Chrome/Edge):** the address bar will show an install icon
  on the Hearth page after the service worker is registered

Once installed, Hearth opens like a native app — full screen, no
browser chrome, offline.

## Updating the app

1. Get the new `hearth-vX.Y.Z.html` file.
2. Replace `app/index.html` with it.
3. Bump the `CACHE_VERSION` constant in `sw.js` to match (e.g. change
   `'hearth-v0.20.72'` to `'hearth-v0.20.73'`). This forces the service
   worker to re-cache.
4. Re-deploy.

Installed users get the new version on their next launch.

## Data

Hearth stores all character data in the browser's `localStorage`.
Nothing is sent anywhere. Each browser/device is its own
storage — characters don't sync between devices.

## Custom domain

In Netlify: Site settings → Domain management. DNS instructions are
auto-generated. The PWA manifest works correctly under any origin —
no changes needed when you add a custom domain.

## Automatic deploys (GitHub → Netlify)

This repo deploys hearthdnd.org automatically through GitHub Actions (`.github/workflows/netlify.yml`):

- A push to `main` deploys to production at hearthdnd.org.
- A pull request deploys a preview at `https://pr-<number>--inquisitive-daffodil-dcf270.netlify.app`, leaving the live site alone.
- To roll back, open Netlify → Deploys and publish an earlier deploy.

The repo secrets `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` hold the Netlify credentials.
