document.documentElement.classList.add("js");
// Mobile menu
const toggle = document.querySelector(".menu-toggle");
const nav = document.getElementById("nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
}

// Enquiry form: submit without leaving the page (plain POST still works without JS)
const form = document.getElementById("enquiry");
if (form) {
  const status = document.getElementById("form-status");
  const button = form.querySelector("button[type=submit]");
  const show = (cls, msg) => { status.className = "form-status " + cls; status.textContent = msg; status.focus(); };

  // Pre-select the service when arriving from e.g. /contact?service=gas
  const svc = new URLSearchParams(location.search).get("service");
  if (svc && form.service) {
    const opt = [...form.service.options].find((o) => o.value === svc);
    if (opt) form.service.value = svc;
  }
  if (new URLSearchParams(location.search).get("sent") === "1") {
    show("ok", "Thank you — your enquiry has been sent. We'll reply as soon as we can.");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    button.disabled = true;
    const label = button.textContent;
    button.textContent = "Sending…";
    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
      form.reset();
      show("ok", "Thank you — your enquiry has been sent. We'll reply as soon as we can.");
    } catch (err) {
      show("err", `${err.message} Please try again, or email us directly.`);
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
}

// Reveal sections as they scroll into view, draw the timeline, count up facts
const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add("in");
    if (e.target.matches("[data-count]")) countUp(e.target);
    io.unobserve(e.target);
  }
}, { threshold: 0.15 }) : null;
document.querySelectorAll(".reveal, .timeline, [data-count]").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));

function countUp(el) {
  const target = Number(el.dataset.count);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = target; return; }
  const start = performance.now(), dur = 1200;
  const tick = (t) => {
    const p = Math.min(1, (t - start) / dur);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Sticky phone button: show once the first screen has been scrolled past
const mcta = document.querySelector(".mobile-cta");
if (mcta) {
  const onScroll = () => mcta.classList.toggle("show", window.scrollY > window.innerHeight * 0.8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// ---------- "Who are you?" tabs + 60-second inspection-ready check ----------
const AUDIENCES = {
  education: {
    lead: "We find the gaps. We fix them. <strong>You pass the inspection.</strong>",
    art: "/images/ill-education.svg",
    service: "inspection",
    label: "school", page: "/schools", pageLabel: "See school services",
    links: [["/schools#registration", "Ofsted & DfE registration"], ["/schools#inspections", "Mock inspections"], ["/schools#compliance", "SCR & safer recruitment"]],
    questions: [
      ["Is your Single Central Record complete and up to date for every member of staff?", "Single Central Record", "We review your SCR line by line and fix every missing check."],
      ["Is safeguarding training up to date for all staff?", "Safeguarding training", "We arrange safeguarding training and keep the records."],
      ["Has your fire risk assessment been reviewed in the last 12 months?", "Fire risk assessment", "We carry out or review your fire risk assessment and close the actions."],
      ["Do you always have enough trained first aiders on site, including paediatric first aid for under-fives?", "First aid cover", "We check your cover and arrange paediatric first aid training."],
      ["Have your policies (safeguarding, health & safety, allergies) been reviewed in the last year?", "Policies", "We review and update your policies for your setting."],
    ],
  },
  landlord: {
    lead: "We find the gaps. We fix them. <strong>Every certificate stays in date.</strong>",
    art: "/images/ill-certificates.svg",
    service: "property",
    label: "landlord", page: "/certificates", pageLabel: "See landlord services",
    links: [["/certificates", "Gas safety & EICR"], ["/business#property", "Fire safety works"], ["/certificates", "Expiry tracking"]],
    questions: [
      ["Do you have a current gas safety record for every property with gas appliances?", "Gas safety records", "We book Gas Safe engineers and chase access with tenants."],
      ["Does every rental have an electrical report (EICR) from the last 5 years?", "EICR", "We arrange EICRs and any remedial work."],
      ["Does every property have a valid EPC?", "EPC", "We arrange EPCs for every property."],
      ["Are there working smoke alarms on every storey, and CO alarms where needed?", "Smoke and CO alarms", "We check, supply and fit alarms where needed."],
      ["Do you know exactly when each certificate expires?", "Expiry tracking", "We put every certificate on our system and renew before expiry."],
    ],
  },
  business: {
    lead: "We find the gaps. We fix them. <strong>Your team works safely.</strong>",
    art: "/images/ill-business.svg",
    service: "business",
    label: "business", page: "/business", pageLabel: "See business services",
    links: [["/business#premises", "Workplace risk assessments"], ["/business#teams", "High-risk teams"], ["/business#contracts", "Contracts & training"]],
    questions: [
      ["Do you have a written fire risk assessment that's been reviewed recently?", "Fire risk assessment", "We carry out or review your fire risk assessment."],
      ["Have you assessed the main hazards of your work and shared them with your staff?", "Risk assessments", "We write risk assessments for your premises and jobs."],
      ["Is staff training (manual handling, first aid, job-specific) recorded?", "Training records", "We arrange training and set up proper records."],
      ["If you employ staff, is employers' liability insurance in place?", "Liability insurance", "We check your cover is in place and on display."],
      ["Do your contracts set out safety duties, PPE and procedures?", "Contracts", "We set out duties, PPE and procedures clearly in your contracts."],
    ],
  },
};

const quizBox = document.querySelector("[data-quiz]");
const heroLead = document.querySelector("[data-lead]");
const heroArt = document.querySelector(".hero-photo .frame img");
let who = "education";

function setWho(next, { scroll } = {}) {
  who = next;
  document.querySelectorAll(".who-tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.who === who)));
  const a = AUDIENCES[who];
  if (heroLead) heroLead.innerHTML = a.lead;
  const chk = document.querySelector("[data-who-check]"), pg = document.querySelector("[data-who-page]"), lk = document.querySelector("[data-who-links]");
  if (chk) chk.innerHTML = `Take the ${a.label} check <span class="arrow">→</span>`;
  if (pg) { pg.href = a.page; pg.textContent = a.pageLabel; }
  if (lk) {
    lk.replaceChildren(...a.links.map(([href, text]) => { const el = document.createElement("a"); el.href = href; el.textContent = text; return el; }));
    lk.classList.remove("pop"); void lk.offsetWidth; lk.classList.add("pop");
  }
  if (heroArt) { heroArt.style.opacity = 0; setTimeout(() => { heroArt.src = a.art; heroArt.style.opacity = 1; }, 180); }
  startQuiz();
  if (scroll) document.getElementById("check")?.scrollIntoView({ behavior: "smooth" });
}

function startQuiz() {
  if (!quizBox) return;
  const a = AUDIENCES[who], n = a.questions.length, answers = [];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const ask = (i) => {
    if (i >= n) return result();
    const [q] = a.questions[i];
    quizBox.innerHTML = `
      <div class="q-progress"><span style="width:${(i / n) * 100}%"></span></div>
      <div class="q-top"><p class="q-step">Question ${i + 1} of ${n}</p>${i ? '<button type="button" class="q-back" data-back>← Back</button>' : ""}</div>
      <h3 class="q-text">${esc(q)}</h3>
      <div class="q-answers">
        <button type="button" class="btn btn-primary" data-a="yes">Yes</button>
        <button type="button" class="btn btn-outline" data-a="no">No</button>
        <button type="button" class="btn btn-outline" data-a="unsure">Not sure</button>
      </div>`;
    quizBox.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => { answers[i] = b.dataset.a; ask(i + 1); }));
    quizBox.querySelector("[data-back]")?.addEventListener("click", () => ask(i - 1));
  };
  const result = () => {
    const score = answers.filter((x) => x === "yes").length;
    const gaps = a.questions.filter((_, i) => answers[i] !== "yes");
    const rating = score === n ? ["Inspection-ready", "ok"] : score >= 3 ? ["A few gaps", "mid"] : ["Action needed", "bad"];
    const status = { yes: ["In place", "ok"], no: ["Gap", "bad"], unsure: ["To check", "mid"] };
    const summary = a.questions.map(([, t], i) => `${t}: ${status[answers[i]][0]}`).join("; ");
    quizBox.innerHTML = `
      <div class="q-result">
        <div class="q-head">
          <div class="q-ring ${rating[1]}" style="--deg:${Math.round((score / n) * 360)}deg"><strong>${score}<small>/${n}</small></strong></div>
          <div><span class="q-rating ${rating[1]}">${rating[0]}</span>
          <p class="q-sub">${gaps.length ? `${gaps.length} item${gaps.length > 1 ? "s" : ""} to put right. Here's how we'd fix ${gaps.length > 1 ? "them" : "it"}:` : "Everything we asked about is in place. A mock inspection will confirm it."}</p></div>
        </div>
        <ul class="q-recap">${a.questions.map(([, t, fix], i) => {
          const [label, cls] = status[answers[i]];
          return `<li class="${cls}"><span class="q-pill ${cls}">${label}</span><div><strong>${esc(t)}</strong>${cls !== "ok" ? `<span>${esc(fix)}</span>` : ""}</div></li>`;
        }).join("")}</ul>
        <form class="q-lead" novalidate>
          <p class="q-lead-title">Send your results to Safetyline and we'll get back to you about ${gaps.length ? "closing these gaps" : "a double-check"}.</p>
          <div class="q-fields">
            <input name="name" placeholder="Your name" autocomplete="name" required maxlength="120" aria-label="Your name">
            <input name="email" type="email" placeholder="Email" autocomplete="email" required maxlength="200" aria-label="Email">
            <input name="phone" type="tel" placeholder="Phone (optional)" autocomplete="tel" maxlength="40" aria-label="Phone (optional)">
          </div>
          <label class="checkbox small"><input type="checkbox" name="consent" value="yes" required> <span>I agree to Safetyline using these details to reply, as in the <a href="/privacy">privacy notice</a>.</span></label>
          <div class="hp" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
          <div class="q-status" role="status"></div>
          <div class="q-answers">
            <button type="submit" class="btn btn-primary">Send my results <span class="arrow">→</span></button>
            <button type="button" class="btn btn-outline" data-restart>Start again</button>
          </div>
        </form>
        <p class="q-note">A quick guide, not a formal assessment.</p>
      </div>`;
    quizBox.querySelector("[data-restart]").addEventListener("click", startQuiz);
    const f = quizBox.querySelector(".q-lead"), st = f.querySelector(".q-status"), btn = f.querySelector("[type=submit]");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!f.reportValidity()) return;
      const fd = new FormData(f);
      fd.append("service", a.service);
      fd.append("message", `60-second check (${a.label}): ${score}/${n}, ${rating[0]}.\n${summary}.`);
      btn.disabled = true; st.className = "q-status"; st.textContent = "Sending…";
      try {
        const res = await fetch("/api/contact", { method: "POST", headers: { Accept: "application/json" }, body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
        f.innerHTML = `<div class="q-sent"><strong>Thank you. Your results are with us.</strong><span>We'll be in touch soon.</span></div>`;
      } catch (err) {
        st.className = "q-status err";
        st.innerHTML = `${esc(err.message)} Please try again, or <a href="/contact?${new URLSearchParams({ service: a.service, gaps: gaps.map((g) => g[1]).join("; ") })}">use the contact form</a>.`;
        btn.disabled = false;
      }
    });
  };
  ask(0);
}

document.querySelectorAll(".who-tab").forEach((t) => t.addEventListener("click", () => setWho(t.dataset.who)));
// ?who=landlord#check (from other pages) preselects the audience
const whoParam = new URLSearchParams(location.search).get("who");
if (whoParam && AUDIENCES[whoParam]) setWho(whoParam);
else if (quizBox) startQuiz();

// Contact form: carry the check's gaps into the message box
const gapsParam = new URLSearchParams(location.search).get("gaps");
const msgBox = document.getElementById("message");
if (gapsParam && msgBox && !msgBox.value) msgBox.value = `From the 60-second check, gaps found: ${gapsParam}.\n\n`;

// Hide the sticky phone button while the check is on screen (it has its own buttons)
// ...and while any section with its own booking button is on screen
if (mcta && "IntersectionObserver" in window) {
  const covering = new Set();
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? covering.add(e.target) : covering.delete(e.target)));
    mcta.classList.toggle("hide", covering.size > 0);
  }, { threshold: 0.15 });
  document.querySelectorAll("#check, .cta, .site-footer, .hero").forEach((el) => obs.observe(el));
}

// Swipeable service cards on phones: keep the dots in step
document.querySelectorAll("[data-swipe]").forEach((row) => {
  const dots = row.parentElement.querySelectorAll(".swipe-dots span");
  if (!dots.length) return;
  row.addEventListener("scroll", () => {
    const cards = [...row.children];
    const mid = row.scrollLeft + row.clientWidth / 2;
    let best = 0, dist = Infinity;
    cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i; } });
    dots.forEach((d, i) => d.classList.toggle("on", i === best));
  }, { passive: true });
});

// Certificates: renewal date checker
(() => {
  const type = document.getElementById("calc-type"), date = document.getElementById("calc-date");
  if (!type || !date) return;
  const ring = document.querySelector("[data-calc-ring]"), days = document.querySelector("[data-calc-days]"),
    unit = document.querySelector("[data-calc-unit]"), due = document.querySelector("[data-calc-due]"), status = document.querySelector("[data-calc-status]");
  date.max = new Date().toISOString().slice(0, 10);
  const run = () => {
    if (!date.value) return;
    const months = Number(type.value), last = new Date(date.value + "T12:00:00");
    const next = new Date(last); next.setMonth(next.getMonth() + months);
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const left = Math.round((next - today) / 86400000), total = Math.round((next - last) / 86400000);
    const cls = left < 0 ? "over" : left <= 60 ? "soon" : "ok";
    const frac = Math.max(0, Math.min(1, left / total));
    ring.className = "calc-ring " + cls; ring.style.setProperty("--deg", Math.round(frac * 360) + "deg");
    days.textContent = Math.abs(left).toLocaleString("en-GB");
    unit.textContent = left < 0 ? (Math.abs(left) === 1 ? "day overdue" : "days overdue") : (left === 1 ? "day left" : "days left");
    due.textContent = (left < 0 ? "Was due " : "Due ") + next.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    status.className = "calc-status " + cls;
    status.textContent = cls === "over" ? "Overdue: book it now" : cls === "soon" ? "Due soon: time to book" : "In date";
  };
  type.addEventListener("change", run); date.addEventListener("input", run); date.addEventListener("change", run);
})();

// Business: sector picker
document.querySelectorAll(".sector").forEach((box) => {
  const tabs = box.querySelectorAll(".sector-tab"), panels = box.querySelectorAll(".sector-panel");
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    panels.forEach((p) => (p.hidden = p.dataset.panel !== t.dataset.sector));
  }));
});

// Hero headline: typewriter effect, then a looping hand-drawn underline
(() => {
  const h = document.querySelector(".hero-title");
  if (!h || matchMedia("(prefers-reduced-motion: reduce)").matches) { h?.classList.add("typed"); return; }
  h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
  const chars = [];
  const wrap = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        [...n.textContent].forEach((c) => { const s = document.createElement("span"); s.className = "ch"; s.textContent = c; s.setAttribute("aria-hidden", "true"); frag.appendChild(s); chars.push(s); });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) wrap(n);
    });
  };
  wrap(h);
  h.classList.add("typing");
  let i = 0;
  const step = () => {
    if (i > 0) chars[i - 1].classList.remove("cur");
    if (i >= chars.length) { chars[chars.length - 1].classList.add("cur"); h.classList.remove("typing"); h.classList.add("typed"); return; }
    chars[i].classList.add("on", "cur");
    const c = chars[i].textContent; i++;
    setTimeout(step, c === "," || c === "." ? 260 : c === " " ? 70 : 45 + Math.random() * 35);
  };
  setTimeout(step, 350);
})();
