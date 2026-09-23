/* stry docs — interactivity */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- motion preference (site toggle overrides OS setting) ---------- */
  const motion = {
    on: document.documentElement.dataset.motion !== "off",
  };

  /* ---------- footer year ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- theme toggle ---------- */
  const root = document.documentElement;
  const themeToggle = $("#themeToggle");
  const metaTheme = $("#metaTheme");

  const applyTheme = (t) => {
    root.dataset.theme = t;
    try { localStorage.setItem("stry-theme", t); } catch (e) {}
    if (metaTheme) metaTheme.setAttribute("content", t === "dark" ? "#0a0a0c" : "#ffffff");
    if (themeToggle) themeToggle.setAttribute("aria-pressed", String(t === "dark"));
  };
  applyTheme(root.dataset.theme === "dark" ? "dark" : "light");

  if (themeToggle) {
    themeToggle.addEventListener("click", (e) => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // circular reveal from the toggle (View Transitions API)
      if (document.startViewTransition && !reduceMotion) {
        const x = e.clientX || window.innerWidth - 40;
        const y = e.clientY || 32;
        const radius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
        );
        const transition = document.startViewTransition(() => applyTheme(next));
        transition.ready.then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${radius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 480,
              easing: "cubic-bezier(0.3, 0.7, 0.3, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        });
        return;
      }

      // cross-fade fallback
      root.classList.add("theming");
      applyTheme(next);
      setTimeout(() => root.classList.remove("theming"), 450);
    });
  }

  /* ---------- scroll progress + smart topbar + back-to-top ---------- */
  const progress = $("#progress");
  const header = $(".topbar");
  const toTop = $("#toTop");
  let lastY = window.scrollY;

  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    if (progress) progress.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + "%";

    if (header) {
      header.classList.toggle("is-scrolled", doc.scrollTop > 8);
      const delta = doc.scrollTop - lastY;
      if (Math.abs(delta) > 4) {
        header.classList.toggle("is-hidden", delta > 0 && doc.scrollTop > 300);
        lastY = doc.scrollTop;
      }
    }

    if (toTop) toTop.classList.toggle("is-visible", doc.scrollTop > 600);

    if (!motion.on) return;

    const aurora = $(".aurora");
    if (aurora) aurora.style.transform = `translateY(${(doc.scrollTop * -0.05).toFixed(1)}px)`;

    /* hero parallax — whole section drifts and fades on scroll */
    const hero = $(".hero");
    if (hero && doc.scrollTop < 900) {
      hero.style.transform = `translateY(${(doc.scrollTop * 0.12).toFixed(1)}px)`;
      hero.style.opacity = Math.max(0, 1 - doc.scrollTop / 780).toFixed(2);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }

  /* ---------- staggered reveals ---------- */
  $$(".steps, .explore, .support-grid, .faq").forEach((group) => {
    $$(".reveal", group).forEach((el, i) =>
      el.style.setProperty("--d", `${i * 80}ms`)
    );
  });
  $$(".reveal").forEach((el) =>
    el.addEventListener("transitionend", () => el.style.removeProperty("--d"), { once: true })
  );

  /* ---------- incident timeline cascade ---------- */
  const incident = $("#incident");
  if (incident) {
    new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            incident.classList.add("is-live");
            obs.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    ).observe(incident);
  }

  /* ---------- reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -30px 0px", threshold: 0.05 }
  );
  $$(".reveal").forEach((el) => revealObserver.observe(el));

  /* ---------- active section highlighting ---------- */
  const sections = $$("[data-section]");
  const navLinks = $$(".sidenav__link");

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach((link) =>
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + id)
        );
        if (window.positionSidenavIndicator) window.positionSidenavIndicator();
      });
    },
    { rootMargin: "-25% 0px -65% 0px", threshold: 0 }
  );
  sections.forEach((s) => sectionObserver.observe(s));

  /* ---------- mobile: topbar nav toggle ---------- */
  const navToggle = $("#navToggle");
  const topbar = $(".topbar");
  if (navToggle && topbar) {
    navToggle.addEventListener("click", () => {
      const open = topbar.classList.toggle("is-nav-open");
      navToggle.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
    });
    $$(".topbar__nav a").forEach((a) =>
      a.addEventListener("click", () => {
        topbar.classList.remove("is-nav-open");
        navToggle.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ---------- mobile: sidebar drawer ---------- */
  const sidebar = $("#sidebar");

  const ensureBackdrop = () => {
    let backdrop = $(".sidebar-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "sidebar-backdrop";
      backdrop.style.cssText =
        "position:fixed;inset:0;top:" +
        getComputedStyle(document.documentElement).getPropertyValue("--topbar-h") +
        ";background:rgba(0,0,0,.32);z-index:870;opacity:0;transition:opacity .25s;";
      document.body.appendChild(backdrop);
    }
    return backdrop;
  };

  const closeSidebar = () => {
    if (!sidebar) return;
    sidebar.classList.remove("is-open");
    const backdrop = $(".sidebar-backdrop");
    if (backdrop) {
      backdrop.style.opacity = "0";
      setTimeout(() => backdrop.remove(), 250);
    }
  };

  const openSidebar = () => {
    if (!sidebar) return;
    sidebar.classList.add("is-open");
    const backdrop = ensureBackdrop();
    requestAnimationFrame(() => (backdrop.style.opacity = "1"));
    backdrop.addEventListener("click", closeSidebar, { once: true });
  };

  if (sidebar) {
    const drawerToggle = document.createElement("button");
    drawerToggle.className = "drawer-toggle";
    drawerToggle.setAttribute("aria-label", "Open documentation menu");
    drawerToggle.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg><span>On this page</span>';
    drawerToggle.addEventListener("click", () =>
      sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar()
    );
    $(".docs")?.prepend(drawerToggle);

    $$(".sidenav__link", sidebar).forEach((a) =>
      a.addEventListener("click", closeSidebar)
    );
  }

  /* ---------- pointer effects: spotlight, tilt, magnetic, ripple, glow ---------- */
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  if (finePointer) {
    /* cursor glow — soft light trailing the pointer */
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    document.body.appendChild(glow);
    let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy, glowOn = false;
    document.addEventListener("mousemove", (e) => {
      if (!motion.on) { glow.style.opacity = "0"; glowOn = false; return; }
      tx = e.clientX; ty = e.clientY;
      if (!glowOn) { glowOn = true; glow.style.opacity = "1"; }
    }, { passive: true });
    (function glowLoop() {
      gx += (tx - gx) * 0.1;
      gy += (ty - gy) * 0.1;
      glow.style.transform = `translate(${gx.toFixed(1)}px, ${gy.toFixed(1)}px)`;
      requestAnimationFrame(glowLoop);
    })();

    /* delegated spotlight + 3D tilt on cards (works with re-rendered nodes) */
    const TILT_SEL = ".explore-card, .support-card";
    const SPOT_SEL = ".explore-card, .support-card, .step, .ann";
    let tilted = null;
    const resetTilt = (el) => { el.style.transform = ""; };
    document.addEventListener("mousemove", (e) => {
      const spot = e.target.closest(SPOT_SEL);
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${(e.clientX - r.left).toFixed(0)}px`);
        spot.style.setProperty("--my", `${(e.clientY - r.top).toFixed(0)}px`);
      }
      if (!motion.on) return;
      const tiltEl = e.target.closest(TILT_SEL);
      if (tilted && tilted !== tiltEl) { resetTilt(tilted); tilted = null; }
      if (tiltEl) {
        const r = tiltEl.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tiltEl.style.transform =
          `perspective(800px) rotateY(${(px * 7).toFixed(2)}deg) rotateX(${(-py * 7).toFixed(2)}deg) translateY(-2px)`;
        tilted = tiltEl;
      }
    }, { passive: true });
    document.addEventListener("mouseout", (e) => {
      if (tilted && !e.relatedTarget?.closest?.(TILT_SEL)) { resetTilt(tilted); tilted = null; }
    }, { passive: true });

    /* magnetic buttons */
    $$(".btn, .theme-toggle").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        if (!motion.on) return;
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) / r.width;
        const dy = (e.clientY - r.top - r.height / 2) / r.height;
        btn.style.transform = `translate(${(dx * 7).toFixed(1)}px, ${(dy * 6).toFixed(1)}px)`;
      });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    });

    /* ripple on primary buttons */
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn--primary");
      if (!btn || !motion.on) return;
      const r = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      const size = Math.max(r.width, r.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - r.left - size / 2}px`;
      ripple.style.top = `${e.clientY - r.top - size / 2}px`;
      btn.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
    });
  }

  /* ---------- sidebar floating indicator ---------- */
  const sidenav = $("#sidenav");
  if (sidenav) {
    const indicator = document.createElement("span");
    indicator.className = "sidenav__indicator";
    sidenav.appendChild(indicator);
    window.positionSidenavIndicator = () => {
      const active = sidenav.querySelector(".sidenav__link.is-active");
      if (!active) { indicator.style.opacity = "0"; return; }
      indicator.style.opacity = "1";
      indicator.style.top = `${active.offsetTop + 4}px`;
      indicator.style.height = `${active.offsetHeight - 8}px`;
    };
    window.addEventListener("resize", () => window.positionSidenavIndicator());
  }

  /* ---------- hero phone parallax (desktop pointers only) ---------- */
  const hero = $(".hero");
  const parallaxLayers = $$(".phone-parallax");
  if (hero && parallaxLayers.length && window.matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("mousemove", (e) => {
      if (!motion.on) return;
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      parallaxLayers.forEach((layer) => {
        const depth = parseFloat(layer.dataset.depth || "10");
        layer.style.transform = `translate(${(x * depth).toFixed(1)}px, ${(y * depth).toFixed(1)}px)`;
      });
    });
    hero.addEventListener("mouseleave", () => {
      parallaxLayers.forEach((layer) => (layer.style.transform = ""));
    });
  }

  /* ---------- animations toggle (overrides OS reduced-motion) ---------- */
  const motionToggle = $("#motionToggle");
  if (motionToggle) {
    const syncToggle = () =>
      motionToggle.setAttribute("aria-pressed", String(motion.on));
    syncToggle();
    motionToggle.addEventListener("click", () => {
      motion.on = !motion.on;
      document.documentElement.dataset.motion = motion.on ? "on" : "off";
      try { localStorage.setItem("stry-motion", motion.on ? "on" : "off"); } catch (e) {}
      syncToggle();
      if (!motion.on) {
        $$(".phone-parallax, .explore-card, .support-card").forEach((el) => (el.style.transform = ""));
        const hero = $(".hero");
        if (hero) { hero.style.transform = ""; hero.style.opacity = ""; }
      }
    });
  }

  /* ---------- drawer toggle styles (injected) ---------- */
  const style = document.createElement("style");
  style.textContent = `
    .drawer-toggle {
      display: none;
      align-items: center;
      gap: 8px;
      font-family: var(--font);
      font-weight: 500;
      font-size: 14px;
      color: var(--text);
      background: var(--bg);
      border: 1px solid var(--border-strong);
      border-radius: 10px;
      padding: 10px 16px;
      cursor: pointer;
    }
    @media (max-width: 1024px) {
      .drawer-toggle { display: inline-flex; }
      .docs { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
})();
