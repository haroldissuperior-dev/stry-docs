const crypto = require("node:crypto");
const { getSession, readAnnouncements, writeAnnouncements } = require("./_lib");

const MAX_ANNOUNCEMENTS = 100;

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const { list } = await readAnnouncements();
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ announcements: list });
    }

    const session = getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Sign in with Discord first." });
    }
    if (!session.isAdmin) {
      return res.status(403).json({
        error: "Only admins of the Stry Systems Discord can post announcements.",
      });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const title = String(body.title || "").trim();
      const text = String(body.body || "").trim();
      if (!title || title.length > 120) {
        return res.status(400).json({ error: "Title must be 1–120 characters." });
      }
      if (!text || text.length > 2000) {
        return res.status(400).json({ error: "Message must be 1–2000 characters." });
      }

      const { list, sha } = await readAnnouncements();
      const entry = {
        id: crypto.randomUUID(),
        title,
        body: text,
        author: { id: session.id, name: session.name, avatar: session.avatar },
        createdAt: new Date().toISOString(),
      };
      await writeAnnouncements([entry, ...list].slice(0, MAX_ANNOUNCEMENTS), sha);
      return res.status(201).json({ announcement: entry });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url, "http://localhost");
      const id = url.searchParams.get("id");
      if (!id) return res.status(400).json({ error: "Missing id." });
      const { list, sha } = await readAnnouncements();
      const next = list.filter((a) => a.id !== id);
      if (next.length === list.length) {
        return res.status(404).json({ error: "Announcement not found." });
      }
      await writeAnnouncements(next, sha);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error("announcements error:", err.message);
    return res.status(500).json({ error: "Storage error — announcement not saved." });
  }
};
