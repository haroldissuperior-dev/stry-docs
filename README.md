# stry — Documentation

The official documentation site for **stry**, an all-in-one Discord bot.

![stack](https://img.shields.io/badge/stack-HTML%20%2B%20CSS%20%2B%20JS-8b5cf6) ![deploy](https://img.shields.io/badge/deploy-Vercel-22d3ee) ![license](https://img.shields.io/badge/license-MIT-e879f9)

A fully static, zero-dependency docs site — dark theme, gradient accents, glassmorphism,
client-side search, and mobile-first responsive layout. Deploys to Vercel with **zero configuration**.

---

## 📁 Project structure

```
stry-docs/
├── index.html      # the whole docs page
├── css/style.css   # design system (colors, gradients, layout)
├── js/main.js      # search, nav highlighting, copy buttons, animations
├── assets/logo.png # stry logo
├── .gitignore
└── README.md
```

## 🔗 Before you go live — replace the placeholders

Search the project for these strings and swap in your real values:

| Placeholder | Where | Replace with |
|---|---|---|
| `YOUR_CLIENT_ID` | `index.html` (invite links) | Your bot's application ID from the [Discord Developer Portal](https://discord.com/developers/applications) |
| `YOUR_INVITE_CODE` | `index.html` (support server links) | Your support server's invite code (the part after `discord.gg/`) |

You may also want to tweak the marketing stats in the hero (uptime, latency, command count)
and the command reference to match your bot's real commands.

## 🚀 Deploy to Vercel

### Option A — GitHub (recommended)

1. Create a new repository on [github.com/new](https://github.com/new) named e.g. `stry-docs` (don't add a README — this folder already has one).
2. From this folder, run:

   ```bash
   git remote add origin https://github.com/<your-username>/stry-docs.git
   git push -u origin main
   ```

3. Go to [vercel.com/new](https://vercel.com/new), click **Import Git Repository**, and pick `stry-docs`.
4. Leave every build setting at its default (it's a static site — Vercel auto-detects it) and click **Deploy**.

Every future `git push` to `main` auto-deploys.

### Option B — Vercel CLI (no GitHub)

```bash
npm i -g vercel
vercel          # from inside this folder
```

## 🧑‍💻 Local preview

Any static file server works, e.g.:

```bash
npx serve .
# or
python -m http.server 8080
```

## ✏️ Editing the content

- **Sections** live in `index.html` — each `<section class="doc" id="...">` is one docs page in the sidebar.
- **Colors / gradients / fonts** are CSS variables at the top of `css/style.css` (`:root`).
- **Commands** — each command is a `<div class="cmd">`; `data-search` powers the search box, `data-category` powers the filter chips.
- **Legal wording** — the Terms of Service and Privacy Policy sections are plain HTML; edit freely.

## 📜 Legal

The docs ship with a Terms of Service covering:
- no developer liability for abuse,
- permanent loss of access for anyone manipulating or exploiting the bot.

Not affiliated with Discord Inc.
