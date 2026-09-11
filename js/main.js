/* stry docs — interactivity */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- footer year ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- scroll progress bar ---------- */
  const progress = $("#progress");
  const updateProgress = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    progress.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + "%";
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

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
    { rootMargin: "0px 0px -40px 0px", threshold: 0.05 }
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

  /* ---------- copy buttons ---------- */
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.closest(".code-block").querySelector("pre code").innerText;
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      const original = btn.textContent;
      btn.textContent = "Copied!";
      btn.classList.add("is-copied");
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("is-copied");
      }, 1600);
    });
  });

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
        ";background:rgba(0,0,0,.55);backdrop-filter:blur(3px);z-index:870;opacity:0;transition:opacity .25s;";
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
    drawerToggle.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg><span>Menu</span>';
    drawerToggle.setAttribute("aria-label", "Open documentation menu");
    drawerToggle.addEventListener("click", () =>
      sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar()
    );
    $(".docs")?.prepend(drawerToggle);

    $$(".sidenav__link", sidebar).forEach((a) =>
      a.addEventListener("click", closeSidebar)
    );
  }

  /* ---------- search + category filter ---------- */
  const searchInput = $("#search");
  const commands = $$(".cmd");
  const groups = $$(".cmd-group");
  const noResults = $("#noResults");
  const filterChips = $$(".filter-chip");
  let activeFilter = "all";

  const applyFilters = () => {
    if (!searchInput || commands.length === 0) return;
    const q = searchInput.value.trim().toLowerCase();
    let visible = 0;

    commands.forEach((cmd) => {
      const matchesQuery =
        !q ||
        cmd.dataset.search.includes(q) ||
        cmd.textContent.toLowerCase().includes(q);
      const matchesFilter =
        activeFilter === "all" || cmd.dataset.category === activeFilter;
      const show = matchesQuery && matchesFilter;
      cmd.hidden = !show;
      if (show) visible++;
    });

    groups.forEach((g) => {
      const anyVisible = $$(".cmd", g.parentElement).some(
        (c) => c.dataset.category === g.dataset.group && !c.hidden
      );
      g.hidden = !anyVisible;
    });

    if (noResults) noResults.hidden = visible > 0;
  };

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);

    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) {
        e.preventDefault();
        searchInput.focus();
        if (window.innerWidth <= 1024) openSidebar();
      }
      if (e.key === "Escape") {
        searchInput.blur();
        closeSidebar();
      }
    });
  }

  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filterChips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      activeFilter = chip.dataset.filter;
      applyFilters();
    });
  });

  /* ---------- drawer toggle styles (injected, keeps CSS lean) ---------- */
  const style = document.createElement("style");
  style.textContent = `
    .drawer-toggle {
      display: none;
      align-items: center;
      gap: 9px;
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 14px;
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 11px;
      padding: 10px 16px;
      cursor: pointer;
      margin-bottom: 4px;
      grid-column: 1 / -1;
    }
    @media (max-width: 1024px) {
      .drawer-toggle { display: inline-flex; }
      .docs { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
})();
