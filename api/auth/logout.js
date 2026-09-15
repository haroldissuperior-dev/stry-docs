const { COOKIE_NAME } = require("../_lib");

module.exports = async (req, res) => {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=0`
  );
  res.status(200).json({ ok: true });
};
