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
