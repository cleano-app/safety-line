# SafetyLine website — safetyline.uk

Static site for SafetyLine (health & safety, certificates, compliance contracts),
hosted on Cloudflare Pages. No framework and no dependencies.

## Layout

| Path | What it is |
|---|---|
| `site.config.json` | Business details used on every page: email, phone, area, company number. Empty values are hidden. |
| `src/pages/*.html` | Page content. Each starts with a `<!--meta {...} -->` line holding its title and description. |
| `src/partials/` | Shared layout, header and footer. |
| `public/` | Copied as-is: CSS, JS, favicon, `robots.txt`, `_headers` (security headers). |
| `functions/api/contact.js` | Cloudflare Pages Function behind the enquiry form; emails each enquiry via Resend. |
| `build.mjs` | Builds everything into `dist/` and writes `sitemap.xml`. |

```
node build.mjs     # -> dist/
```

## Cloudflare Pages setup

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → `cleano-app/safety-line`.
2. Build command: `node build.mjs` · Build output directory: `dist` · Production branch: `main`.
3. **Custom domains** → add `safetyline.uk` (and `www.safetyline.uk`).

## Enquiry form

Set these under the Pages project → **Settings → Variables and Secrets**, then redeploy:

| Name | Example |
|---|---|
| `RESEND_API_KEY` (secret) | `re_…` from resend.com |
| `CONTACT_TO` | `info@safetyline.uk` (comma-separate for several) |
| `CONTACT_FROM` | `SafetyLine website <website@safetyline.uk>` — domain must be verified in Resend |

Until these are set, the form shows "The form isn't set up yet."
