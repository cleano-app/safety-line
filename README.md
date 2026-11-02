# SafetyLine website — safetyline.uk

Static site for SafetyLine (health & safety, certificates, compliance contracts),
hosted as a Cloudflare Worker with static assets. No framework and no dependencies.

## Layout

| Path | What it is |
|---|---|
| `site.config.json` | Business details used on every page: email, phone, area, company number. Empty values are hidden. |
| `src/pages/*.html` | Page content. Each starts with a `<!--meta {...} -->` line holding its title and description. |
| `src/partials/` | Shared layout, header and footer. |
| `public/` | Copied as-is: CSS, JS, favicon, `robots.txt`, `_headers` (security headers). |
| `worker/index.js` | Worker entry: `/api/*` runs code, everything else is served from `dist/`. |
| `worker/contact.js` | `POST /api/contact` behind the enquiry form; emails each enquiry via Resend. |
| `wrangler.jsonc` | Worker config (name `safety-line`, assets from `dist/`). |
| `build.mjs` | Builds everything into `dist/` and writes `sitemap.xml`. |

```
node build.mjs     # -> dist/
```

## Deploying

The `safety-line` Worker in Cloudflare is connected to this repo (Workers Builds):
every push to `main` runs `npm run build` then `npx wrangler deploy`.

Custom domain: Worker → **Settings → Domains & Routes → Add → Custom domain** → `safetyline.uk`
(and `www.safetyline.uk`).

## Enquiry form

Set these under the Worker → **Settings → Variables and Secrets** (runtime, not build variables):

| Name | Example |
|---|---|
| `RESEND_API_KEY` (secret) | `re_…` from resend.com |
| `CONTACT_TO` | `info@safetyline.uk` (comma-separate for several) |
| `CONTACT_FROM` | `SafetyLine website <website@safetyline.uk>` — domain must be verified in Resend |

Until these are set, the form shows "The form isn't set up yet."
