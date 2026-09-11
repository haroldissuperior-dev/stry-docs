# stry — Documentation

The official documentation site for **stry**, a Discord bot.

![stack](https://img.shields.io/badge/stack-HTML%20%2B%20CSS%20%2B%20JS-111111) ![deploy](https://img.shields.io/badge/deploy-Vercel-555555) ![license](https://img.shields.io/badge/license-MIT-888888)

A fully static, zero-dependency documentation site — light monochrome theme
(black / white / grey gradients), Inter typography, mobile-first responsive layout.
Deploys to Vercel with **zero configuration**.

---

## 📁 Project structure

```
stry-docs/
├── index.html      # all documentation content
├── css/style.css   # design system (colors, gradients, layout)
├── js/main.js      # sidebar highlighting, mobile drawer, reveal animations
├── assets/logo.png # stry logo
├── .gitignore
└── README.md
```

## ✅ Before you go live

The support-server links are already wired to `https://discord.gg/E56wBApKB`.

Still review:

- **Privacy Policy** — an HTML comment in `index.html` marks the section; adjust it to match
  the bot's actual data practices.
- **Terms of Service** — the "no liability" and "permanent removal for manipulation" clauses
  are the core legal requirements; edit the rest to fit.
- **Last updated** dates in the Terms and Privacy sections.

## 🚀 Deploy to Vercel

### Option A — GitHub (recommended)

1. Create a new repository on [github.com/new](https://github.com/new) named e.g. `stry-docs`
   (don't add a README — this folder already has one).
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

- **Sections** live in `index.html` — each `<section class="doc" id="...">` is one page in the sidebar.
- **Colors / gradients** are CSS variables at the top of `css/style.css` (`:root`).
- The theme is intentionally monochrome: `#0a0a0a` black accents on a white base with grey
  gradient washes. The black callout (`.notice--emphasis`) is reserved for the enforcement notice.

## 📜 Legal

The docs ship with a Terms of Service covering:
- no developer liability for abuse or misuse,
- permanent loss of access for anyone manipulating or exploiting the bot.

Not affiliated with Discord Inc.
