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
    lead: "Registered, inspection-ready and compliant. We find what's missing, put it right and take the headache off you.",
    art: "/images/ill-education.svg",
    service: "inspection",
    questions: [
      ["Is your Single Central Record complete and up to date for every member of staff?", "Single Central Record has gaps"],
      ["Is safeguarding training up to date for all staff?", "Safeguarding training needs updating"],
      ["Has your fire risk assessment been reviewed in the last 12 months?", "Fire risk assessment needs a review"],
      ["Do you always have enough trained first aiders on site, including paediatric first aid for under-fives?", "First aid cover needs checking"],
      ["Have your policies (safeguarding, health & safety, allergies) been reviewed in the last year?", "Policies are due for review"],
    ],
  },
  landlord: {
    lead: "Every certificate booked, tracked and renewed on time. We find what's missing, put it right and take the headache off you.",
    art: "/images/ill-certificates.svg",
    service: "property",
    questions: [
      ["Do you have a current gas safety record for every property with gas appliances?", "Gas safety record missing or out of date"],
      ["Does every rental have an electrical report (EICR) from the last 5 years?", "EICR missing or out of date"],
      ["Does every property have a valid EPC?", "EPC missing or expired"],
      ["Are there working smoke alarms on every storey, and CO alarms where needed?", "Smoke and CO alarms need checking"],
      ["Do you know exactly when each certificate expires?", "No system for tracking expiry dates"],
    ],
  },
  business: {
    lead: "Safe premises, trained teams and clear contracts. We find what's missing, put it right and take the headache off you.",
    art: "/images/ill-business.svg",
    service: "business",
    questions: [
      ["Do you have a written fire risk assessment that's been reviewed recently?", "Fire risk assessment needs a review"],
      ["Have you assessed the main hazards of your work and shared them with your staff?", "Workplace risk assessments are missing"],
      ["Is staff training (manual handling, first aid, job-specific) recorded?", "Training records are incomplete"],
      ["If you employ staff, is employers' liability insurance in place?", "Employers' liability insurance needs checking"],
      ["Do your contracts set out safety duties, PPE and procedures?", "Contracts don't cover safety duties"],
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
  if (heroLead) heroLead.textContent = a.lead;
  if (heroArt) { heroArt.style.opacity = 0; setTimeout(() => { heroArt.src = a.art; heroArt.style.opacity = 1; }, 180); }
  startQuiz();
  if (scroll) document.getElementById("check")?.scrollIntoView({ behavior: "smooth" });
}

function startQuiz() {
  if (!quizBox) return;
  const a = AUDIENCES[who], answers = [];
  const ask = (i) => {
    if (i >= a.questions.length) return result();
    const [q] = a.questions[i];
    quizBox.innerHTML = `
      <div class="q-progress"><span style="width:${(i / a.questions.length) * 100}%"></span></div>
      <p class="q-step">Question ${i + 1} of ${a.questions.length}</p>
      <h3 class="q-text"></h3>
      <div class="q-answers">
        <button type="button" class="btn btn-primary" data-a="yes">Yes</button>
        <button type="button" class="btn btn-outline" data-a="no">No</button>
        <button type="button" class="btn btn-outline" data-a="unsure">Not sure</button>
      </div>`;
    quizBox.querySelector(".q-text").textContent = q;
    quizBox.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => { answers.push(b.dataset.a); ask(i + 1); }));
  };
  const result = () => {
    const gaps = a.questions.filter((_, i) => answers[i] !== "yes").map(([, g]) => g);
    const score = a.questions.length - gaps.length;
    const msg = gaps.length === 0 ? "Looking good. Want us to double-check?" : gaps.length <= 2 ? `${gaps.length} gap${gaps.length > 1 ? "s" : ""} found` : `${gaps.length} gaps found`;
    const params = new URLSearchParams({ service: a.service, gaps: gaps.join("; ") });
    quizBox.innerHTML = `
      <div class="q-progress"><span style="width:100%"></span></div>
      <div class="q-result">
        <div class="q-score"><strong>${score}<small>/${a.questions.length}</small></strong><span>${msg}</span></div>
        <ul class="q-gaps"></ul>
        <div class="q-answers">
          <a class="btn btn-primary" href="/contact?${params}">${gaps.length ? "Book a consultation to close these gaps" : "Book a free review"} <span class="arrow">→</span></a>
          <button type="button" class="btn btn-outline" data-restart>Start again</button>
        </div>
        <p class="q-note">A quick guide, not a formal assessment.</p>
      </div>`;
    const ul = quizBox.querySelector(".q-gaps");
    gaps.forEach((g) => { const li = document.createElement("li"); li.textContent = g; ul.appendChild(li); });
    if (!gaps.length) ul.remove();
    quizBox.querySelector("[data-restart]").addEventListener("click", startQuiz);
  };
  ask(0);
}

document.querySelectorAll(".who-tab").forEach((t) => t.addEventListener("click", () => setWho(t.dataset.who)));
if (quizBox) startQuiz();

// Contact form: carry the check's gaps into the message box
const gapsParam = new URLSearchParams(location.search).get("gaps");
const msgBox = document.getElementById("message");
if (gapsParam && msgBox && !msgBox.value) msgBox.value = `From the 60-second check, gaps found: ${gapsParam}.\n\n`;

// Hide the sticky phone button while the check is on screen (it has its own buttons)
const checkSec = document.getElementById("check");
if (checkSec && mcta && "IntersectionObserver" in window) {
  new IntersectionObserver(([e]) => mcta.classList.toggle("hide", e.isIntersecting), { threshold: 0.2 }).observe(checkSec);
}
