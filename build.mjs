// Tiny static-site builder: no dependencies.
// src/pages/*.html + src/partials/*.html + site.config.json  ->  dist/
// Each page starts with a JSON comment:  <!--meta {"title": "...", "description": "...", "nav": "home"} -->
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL(".", import.meta.url).pathname;
const out = join(root, "dist");
const cfg = JSON.parse(readFileSync(join(root, "site.config.json"), "utf8"));
cfg.year = String(new Date().getFullYear());

const read = (p) => readFileSync(join(root, p), "utf8");
const layout = read("src/partials/layout.html");
const header = read("src/partials/header.html");
const footer = read("src/partials/footer.html");

// {{#if key}}...{{/if}} blocks, then {{key}} values
const fill = (html, vars) =>
  html
    .replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, k, body) => (vars[k] ? body : ""))
    .replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
if (existsSync(join(root, "public"))) cpSync(join(root, "public"), out, { recursive: true });

const urls = [];
for (const file of readdirSync(join(root, "src/pages")).filter((f) => f.endsWith(".html"))) {
  const raw = read(join("src/pages", file));
  const m = raw.match(/^<!--meta\s+(\{[\s\S]*?\})\s*-->\s*/);
  if (!m) throw new Error(`${file}: missing <!--meta {...} --> header`);
  const meta = JSON.parse(m[1]);
  const slug = file === "index.html" ? "" : file.replace(/\.html$/, "");
  const vars = {
    ...cfg,
    ...meta,
    canonical: `${cfg.domain}/${slug}`,
    ["nav_" + (meta.nav || "none")]: ' aria-current="page"',
  };
  for (const n of ["home", "schools", "property", "business", "certificates", "about", "contact"]) vars["nav_" + n] ??= "";
  const body = fill(raw.slice(m[0].length), vars);
  const html = fill(layout, { ...vars, header: fill(header, vars), footer: fill(footer, vars), body });
  writeFileSync(join(out, file), html);
  if (!meta.noindex) urls.push(vars.canonical);
}

writeFileSync(
  join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`
);
console.log(`Built ${urls.length} indexed pages -> dist/`);
