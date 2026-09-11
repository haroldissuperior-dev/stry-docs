/* stry docs — interactivity */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

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

  /* ---------- hero phone parallax (desktop pointers only) ---------- */
  const hero = $(".hero");
  const parallaxLayers = $$(".phone-parallax");
  if (
    hero &&
    parallaxLayers.length &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    hero.addEventListener("mousemove", (e) => {
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
