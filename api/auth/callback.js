const { DISCORD_API, GUILD_ID, ADMIN_BIT, sign, sessionCookie, clearStateCookie, parseCookies, redirectUri, avatarUrl, STATE_COOKIE, appConfigured } = require("../../_lib");

module.exports = async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookies(req);

  const fail = (reason) => {
    res.setHeader("Set-Cookie", clearStateCookie());
    res.writeHead(302, { Location: `/#announcements?error=${reason}` });
    res.end();
  };

  if (!appConfigured()) return fail("not_configured");
  if (!code || !state || cookies[STATE_COOKIE] !== state) return fail("state");

  try {
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(req),
      }),
    });
    if (!tokenRes.ok) return fail("token");
    const token = await tokenRes.json();

    const auth = { Authorization: `Bearer ${token.access_token}` };

    const meRes = await fetch(`${DISCORD_API}/users/@me`, { headers: auth });
    if (!meRes.ok) return fail("user");
    const me = await meRes.json();

    let isAdmin = false;
    const memberRes = await fetch(`${DISCORD_API}/users/@me/guilds/${GUILD_ID}/member`, { headers: auth });
    if (memberRes.ok) {
      const member = await memberRes.json();
      try {
        isAdmin = (BigInt(member.permissions || "0") & ADMIN_BIT) !== 0n;
      } catch {
        isAdmin = false;
      }
    }

    const session = {
      id: me.id,
      name: me.global_name || me.username,
      avatar: avatarUrl(me.id, me.avatar),
      isAdmin,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    res.setHeader("Set-Cookie", [sessionCookie(sign(session)), clearStateCookie()]);
    res.writeHead(302, { Location: "/#announcements" });
    res.end();
  } catch {
    fail("server");
  }
};
