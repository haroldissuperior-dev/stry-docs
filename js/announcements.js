/* stry docs — announcements (Discord-gated for Stry Systems admins) */
(() => {
  "use strict";

  const list = document.getElementById("annList");
  const authBox = document.getElementById("annAuth");
  const composer = document.getElementById("annComposer");
  const titleInput = document.getElementById("annTitle");
  const bodyInput = document.getElementById("annBody");
  const postBtn = document.getElementById("annPost");
  const charCount = document.getElementById("annChar");
  const emptyEl = document.getElementById("annEmpty");

  if (!list) return;

  const state = { user: null, announcements: [] };

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);

  const relTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  async function api(url, opts) {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  /* ---------- rendering ---------- */

  function renderAuth() {
    const u = state.user;
    if (!u) {
      authBox.innerHTML = `
        <div class="ann-signin">
          <p>Sign in with Discord to post — available to admins of the <strong>Stry Systems</strong> server.</p>
          <a class="btn btn--primary btn--sm" href="/api/auth/login" id="annLogin">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.029ZM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/></svg>
            Sign in with Discord
          </a>
        </div>`;
      return;
    }

    const badge = u.isAdmin
      ? '<span class="ann-badge">Admin</span>'
      : '<span class="ann-badge ann-badge--muted">Not an admin</span>';

    authBox.innerHTML = `
      <div class="ann-identity">
        <span class="ann__avatar"><img src="${esc(u.avatar)}" alt="" width="40" height="40" /></span>
        <div class="ann__meta">
          <strong>${esc(u.name)}</strong>
          <span class="ann__id">ID ${esc(u.id)}</span>
        </div>
        ${badge}
        <button class="ann-signout" id="annLogout" type="button">Sign out</button>
      </div>
      ${u.isAdmin ? "" : '<p class="ann-note">Only admins of the Stry Systems Discord can post announcements.</p>'}`;

    document.getElementById("annLogout").addEventListener("click", async () => {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      state.user = null;
      composer.hidden = true;
      renderAuth();
    });
  }

  function cardHTML(a) {
    const canDelete = state.user && state.user.isAdmin;
    return `
      <article class="ann" data-id="${esc(a.id)}">
        <div class="ann__head">
          <span class="ann__avatar"><img src="${esc(a.author.avatar)}" alt="" width="42" height="42" loading="lazy" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'" /></span>
          <div class="ann__meta">
            <strong>${esc(a.author.name)}</strong>
            <span class="ann__id">ID ${esc(a.author.id)}</span>
          </div>
          <time class="ann__time" datetime="${esc(a.createdAt)}" title="${esc(new Date(a.createdAt).toLocaleString())}">${esc(relTime(a.createdAt))}</time>
          ${canDelete ? `<button class="ann__delete" type="button" data-id="${esc(a.id)}" aria-label="Delete announcement">Delete</button>` : ""}
        </div>
        <h4 class="ann__title">${esc(a.title)}</h4>
        <p class="ann__body">${esc(a.body)}</p>
      </article>`;
  }

  function renderList(freshId) {
    if (!state.announcements.length) {
      emptyEl.hidden = false;
      list.innerHTML = "";
      list.appendChild(emptyEl);
      return;
    }
    emptyEl.hidden = true;
    list.innerHTML = state.announcements.map(cardHTML).join("");
    list.querySelectorAll(".ann").forEach((el, i) => {
      el.style.animation = `rise 0.5s cubic-bezier(0.2, 0.65, 0.25, 1) ${Math.min(i * 60, 400)}ms both`;
    });
    if (freshId) {
      const fresh = list.querySelector(`[data-id="${CSS.escape(freshId)}"]`);
      if (fresh) fresh.classList.add("ann--fresh");
    }
    list.querySelectorAll(".ann__delete").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (!window.confirm("Delete this announcement?")) return;
        btn.disabled = true;
        try {
          await api(`/api/announcements?id=${encodeURIComponent(btn.dataset.id)}`, { method: "DELETE" });
          state.announcements = state.announcements.filter((a) => a.id !== btn.dataset.id);
          renderList();
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      })
    );
  }

  /* ---------- actions ---------- */

  async function load() {
    const hashQuery = location.hash.split("?")[1];
    const hashError = hashQuery ? new URLSearchParams(hashQuery).get("error") : null;
    if (hashError) {
      history.replaceState(null, "", "/#announcements");
    }

    /* skeleton shimmer while the feed loads */
    list.innerHTML = `
      <div class="ann-skeleton"><div class="sk-row"><span class="sk-avatar"></span><span class="sk-bar" style="width:120px"></span></div><span class="sk-bar" style="width:55%"></span><span class="sk-bar" style="width:88%"></span></div>
      <div class="ann-skeleton"><div class="sk-row"><span class="sk-avatar"></span><span class="sk-bar" style="width:100px"></span></div><span class="sk-bar" style="width:48%"></span><span class="sk-bar" style="width:76%"></span></div>`;

    try {
      const [me, feed] = await Promise.all([
        api("/api/auth/me"),
        api("/api/announcements"),
      ]);
      state.user = me.user;
      state.announcements = feed.announcements || [];
    } catch (err) {
      state.announcements = [];
    }
    renderAuth();
    if (hashError) {
      const messages = {
        state: "Sign-in session expired — please try again.",
        token: "Discord rejected the sign-in. Please try again.",
        user: "Couldn't read your Discord profile. Please try again.",
        not_configured: "Discord login isn't configured on this deployment yet.",
      };
      authBox.insertAdjacentHTML(
        "afterbegin",
        `<div class="ann-error">${esc(messages[hashError] || "Sign-in failed — please try again.")}</div>`
      );
    }
    renderList();
    composer.hidden = !(state.user && state.user.isAdmin);
  }

  function setPosting(posting) {
    postBtn.disabled = posting;
    postBtn.textContent = posting ? "Posting…" : "Post announcement";
  }

  postBtn.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    if (!title || !body) return;
    setPosting(true);
    try {
      const data = await api("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      state.announcements.unshift(data.announcement);
      titleInput.value = "";
      bodyInput.value = "";
      charCount.textContent = "0 / 2000";
      renderList(data.announcement.id);
    } catch (err) {
      alert(err.message);
    }
    setPosting(false);
  });

  bodyInput.addEventListener("input", () => {
    charCount.textContent = `${bodyInput.value.length} / 2000`;
  });

  load();
})();
