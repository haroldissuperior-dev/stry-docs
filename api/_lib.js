/**
 * Shared helpers for the stry-docs API — Discord OAuth sessions and
 * announcement storage (GitHub Contents API, same repo the dashboard
 * and bot use for config sync).
 */
const crypto = require("node:crypto");

const GUILD_ID = "1548536475342340126"; // Stry Systems
const COOKIE_NAME = "stry_sess";
const STATE_COOKIE = "stry_oauth_state";
const DISCORD_API = "https://discord.com/api/v10";
const GH_API = "https://api.github.com";
const ANNOUNCEMENTS_PATH = "announcements.json";
const ADMIN_BIT = 8n;

function b64u(buf) {
  return Buffer.from(buf).toString("base64url");
}

function secret() {
  return process.env.AUTH_SECRET || "stry-docs-unconfigured-secret";
}

function sign(payload) {
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token) return null;
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function getSession(req) {
  const cookies = parseCookies(req);
  return cookies[COOKIE_NAME] ? verify(cookies[COOKIE_NAME]) : null;
}

function sessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

function stateCookie(state) {
  return `${STATE_COOKIE}=${state}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=600`;
}

function clearStateCookie() {
  return `${STATE_COOKIE}=; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=0`;
}

function redirectUri(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}/api/auth/callback`;
}

function appConfigured() {
  return Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
}

function avatarUrl(id, avatar) {
  return avatar
    ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${(BigInt(id || "0") % 6n).toString()}.png`;
}

/* ---------- announcement storage (GitHub Contents API) ---------- */

async function gh(path, opts = {}) {
  return fetch(`${GH_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "stry-docs",
      ...(opts.headers || {}),
    },
  });
}

async function readAnnouncements() {
  const repo = process.env.GITHUB_CONFIG_REPO;
  if (!repo || !process.env.GITHUB_TOKEN) return { list: [], sha: null };
  const res = await gh(`/repos/${repo}/contents/${ANNOUNCEMENTS_PATH}`);
  if (res.status === 404) return { list: [], sha: null };
  if (!res.ok) throw new Error(`github read failed (${res.status})`);
  const data = await res.json();
  const list = JSON.parse(Buffer.from(data.content, "base64").toString("utf8"));
  return { list: Array.isArray(list) ? list : [], sha: data.sha };
}

async function writeAnnouncements(list, sha) {
  const repo = process.env.GITHUB_CONFIG_REPO;
  if (!repo || !process.env.GITHUB_TOKEN) throw new Error("storage not configured");
  const res = await gh(`/repos/${repo}/contents/${ANNOUNCEMENTS_PATH}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `docs announcement update — ${new Date().toISOString()}`,
      content: Buffer.from(JSON.stringify(list, null, 2)).toString("base64"),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) throw new Error(`github write failed (${res.status})`);
}

module.exports = {
  GUILD_ID,
  COOKIE_NAME,
  STATE_COOKIE,
  DISCORD_API,
  ADMIN_BIT,
  sign,
  verify,
  parseCookies,
  getSession,
  sessionCookie,
  stateCookie,
  clearStateCookie,
  redirectUri,
  appConfigured,
  avatarUrl,
  readAnnouncements,
  writeAnnouncements,
};
