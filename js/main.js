/* stry docs — interactivity */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- footer year ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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
      background: #ffffff;
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
