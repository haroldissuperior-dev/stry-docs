const { getSession } = require("../_lib");

module.exports = async (req, res) => {
  const session = getSession(req);
  res.setHeader("Cache-Control", "no-store");
  if (!session) return res.status(200).json({ user: null });
  res.status(200).json({
    user: {
      id: session.id,
      name: session.name,
      avatar: session.avatar,
      isAdmin: Boolean(session.isAdmin),
    },
  });
};
