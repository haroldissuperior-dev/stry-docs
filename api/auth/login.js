const crypto = require("node:crypto");
const { GUILD_ID, stateCookie, redirectUri, appConfigured } = require("../_lib");

module.exports = async (req, res) => {
  if (!appConfigured()) {
    return res.status(500).json({
      error:
        "Discord login is not configured on this deployment yet (missing DISCORD_CLIENT_SECRET).",
    });
  }
  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "identify guilds.members.read",
    guild_id: GUILD_ID,
    state,
  });
  res.setHeader("Set-Cookie", stateCookie(state));
  res.writeHead(302, { Location: `https://discord.com/oauth2/authorize?${params}` });
  res.end();
};
