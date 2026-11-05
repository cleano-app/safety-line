// POST /api/contact: emails each enquiry to you via Resend (https://resend.com, free tier).
// Set these in the Worker's Settings > Variables and Secrets:
//   RESEND_API_KEY  (secret)  e.g. re_xxx
//   CONTACT_TO                where enquiries go, e.g. info@safetyline.uk
//   CONTACT_FROM              a sender on a domain verified in Resend, e.g. "SafetyLine website <website@safetyline.uk>"

const SERVICES = {
  registration: "Registration (Ofsted / DfE / local authority)",
  inspection: "Mock inspection / inspection support",
  schools: "School compliance",
  training: "Safeguarding, first aid or allergy training",
  property: "Property compliance / council letter",
  certificate: "Safety certificate(s)",
  "new-build": "New build / conversion completion documents",
  "risk-assessment": "Workplace risk assessment",
  business: "Business compliance / high-risk work",
  contracts: "Contracts & safe working procedures",
  plan: "Full compliance package",
  other: "Something else",
  // older links
  gas: "Gas Safety Certificate (CP12)",
  eicr: "EICR (electrical)",
  fra: "Fire risk assessment",
  "health-safety": "Health & safety support",
  contract: "Compliance plan",
};

const LIMITS = { name: 120, company: 120, email: 200, phone: 40, postcode: 12, message: 5000 };
const EMAIL_RE = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/;

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export async function handleContact(request, env) {
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");
  const reply = (status, ok, error) =>
    wantsJson
      ? Response.json(ok ? { ok: true } : { ok: false, error }, { status })
      : ok
        ? Response.redirect(new URL("/contact?sent=1", request.url).toString(), 303)
        : new Response(`${error} Please go back and try again.`, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(400, false, "We couldn't read the form.");
  }

  const get = (k) => String(form.get(k) ?? "").trim();
  // Honeypot: bots fill the hidden "website" field. Pretend success.
  if (get("website")) return reply(200, true);

  const data = {};
  for (const [k, max] of Object.entries(LIMITS)) {
    data[k] = get(k);
    if (data[k].length > max) return reply(400, false, `The ${k} field is too long.`);
  }
  const service = SERVICES[get("service")];
  if (!data.name || !data.message) return reply(400, false, "Please fill in your name and details.");
  if (!EMAIL_RE.test(data.email)) return reply(400, false, "Please enter a valid email address.");
  if (!service) return reply(400, false, "Please choose what you need.");
  if (get("consent") !== "yes") return reply(400, false, "Please tick the box to agree to the privacy notice.");

  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
    console.error("Contact form is not configured: set RESEND_API_KEY, CONTACT_TO and CONTACT_FROM");
    return reply(503, false, "The form isn't set up yet.");
  }

  const rows = [
    ["Name", data.name],
    ["Company", data.company],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Service", service],
    ["Postcode", data.postcode],
  ].filter(([, v]) => v);

  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\n${data.message}\n`;
  const html =
    `<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif">` +
    rows.map(([k, v]) => `<tr><td style="color:#5a6776">${k}</td><td><strong>${esc(v)}</strong></td></tr>`).join("") +
    `</table><p style="font-family:Arial,sans-serif;white-space:pre-wrap">${esc(data.message)}</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: env.CONTACT_TO.split(",").map((s) => s.trim()),
      reply_to: data.email,
      subject: `Website enquiry: ${service} from ${data.name}`.replace(/[\r\n]+/g, " "),
      text,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend error", res.status, await res.text().catch(() => ""));
    return reply(502, false, "Sorry, we couldn't send your enquiry just now.");
  }
  return reply(200, true);
}

