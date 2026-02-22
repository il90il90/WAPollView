const express = require("express");
const crypto = require("crypto");

function hashPassword(pw) {
  return crypto.createHash("sha256").update(pw).digest("hex");
}

module.exports = function (prisma) {
  const router = express.Router();

  router.get("/admin/setup-status", async (req, res) => {
    try {
      const setting = await prisma.appSettings.findUnique({ where: { key: "admin_password" } });
      res.json({ isConfigured: !!setting });
    } catch {
      res.json({ isConfigured: false });
    }
  });

  router.post("/admin/setup", async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, error: "Password must be at least 4 characters" });
    }
    try {
      const existing = await prisma.appSettings.findUnique({ where: { key: "admin_password" } });
      if (existing) {
        return res.status(400).json({ success: false, error: "Password already configured. Use change-password instead." });
      }
      await prisma.appSettings.create({ data: { key: "admin_password", value: hashPassword(password) } });
      res.json({ success: true });
    } catch (err) {
      console.error("[API] /admin/setup error:", err.message);
      res.status(500).json({ success: false, error: "Setup failed" });
    }
  });

  router.post("/admin/login", async (req, res) => {
    const { password } = req.body;
    try {
      const setting = await prisma.appSettings.findUnique({ where: { key: "admin_password" } });
      if (!setting) {
        return res.status(400).json({ success: false, error: "Password not configured yet" });
      }
      if (setting.value === hashPassword(password)) {
        return res.json({ success: true });
      }
      return res.status(401).json({ success: false, error: "Wrong password" });
    } catch (err) {
      console.error("[API] /admin/login error:", err.message);
      return res.status(500).json({ success: false, error: "Login failed" });
    }
  });

  router.post("/admin/change-password", async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ success: false, error: "New password must be at least 4 characters" });
    }
    try {
      const setting = await prisma.appSettings.findUnique({ where: { key: "admin_password" } });
      if (!setting) {
        return res.status(400).json({ success: false, error: "Password not configured" });
      }
      if (setting.value !== hashPassword(currentPassword)) {
        return res.status(401).json({ success: false, error: "Current password is wrong" });
      }
      await prisma.appSettings.update({ where: { key: "admin_password" }, data: { value: hashPassword(newPassword) } });
      res.json({ success: true });
    } catch (err) {
      console.error("[API] /admin/change-password error:", err.message);
      res.status(500).json({ success: false, error: "Failed to change password" });
    }
  });

  router.get("/groups", async (req, res) => {
    try {
      const groups = await prisma.group.findMany({
        include: {
          polls: {
            include: {
              options: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { name: "asc" },
      });

      const pollIds = groups.flatMap((g) => g.polls.map((p) => p.id));
      let voterCounts = {};
      if (pollIds.length > 0) {
        const counts = await prisma.$queryRaw`
          SELECT sub."pollId", COUNT(*)::int AS "uniqueVoters"
          FROM (
            SELECT DISTINCT ON ("voterJid") "pollId", "voterJid", "selectedOptionText"
            FROM "VoteLog"
            WHERE "pollId" = ANY(${pollIds})
            ORDER BY "voterJid", "timestamp" DESC
          ) sub
          WHERE sub."selectedOptionText" != ''
          GROUP BY sub."pollId"
        `;
        for (const row of counts) {
          voterCounts[row.pollId] = row.uniqueVoters;
        }
      }

      const result = groups.map((g) => ({
        ...g,
        polls: g.polls.map((p) => ({
          ...p,
          _count: { votes: voterCounts[p.id] || 0 },
        })),
      }));

      res.json(result);
    } catch (err) {
      console.error("[API] /groups error:", err.message);
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  router.get("/polls/:pollId", async (req, res) => {
    try {
      const poll = await prisma.poll.findUnique({
        where: { id: req.params.pollId },
        include: {
          options: true,
          group: true,
        },
      });
      if (!poll) return res.status(404).json({ error: "Poll not found" });
      res.json(poll);
    } catch (err) {
      console.error("[API] /polls/:id error:", err.message);
      res.status(500).json({ error: "Failed to fetch poll" });
    }
  });

  router.get("/polls/:pollId/votes", async (req, res) => {
    try {
      const { getAggregatedVotes } = require("../whatsapp");
      const aggregated = await getAggregatedVotes(req.params.pollId, prisma);
      res.json(aggregated);
    } catch (err) {
      console.error("[API] /polls/:id/votes error:", err.message);
      res.status(500).json({ error: "Failed to fetch votes" });
    }
  });

  router.get("/polls/:pollId/vote-log", async (req, res) => {
    try {
      const logs = await prisma.voteLog.findMany({
        where: { pollId: req.params.pollId },
        include: { option: true },
        orderBy: { timestamp: "desc" },
        take: 500,
      });
      res.json(logs);
    } catch (err) {
      console.error("[API] /polls/:id/vote-log error:", err.message);
      res.status(500).json({ error: "Failed to fetch vote log" });
    }
  });

  router.get("/polls/:pollId/voters", async (req, res) => {
    try {
      const { getAggregatedVotes } = require("../whatsapp");
      const aggregated = await getAggregatedVotes(req.params.pollId, prisma);
      res.json(aggregated);
    } catch (err) {
      console.error("[API] /polls/:id/voters error:", err.message);
      res.status(500).json({ error: "Failed to fetch voters" });
    }
  });

  router.post("/polls/create", async (req, res) => {
    try {
      const { getSock } = require("../whatsapp");
      const sock = getSock();
      if (!sock) {
        return res.status(503).json({ error: "WhatsApp not connected" });
      }

      const { groupJid, title, description, options, selectableCount } = req.body;
      if (!groupJid || !title || !options || options.length < 2) {
        return res.status(400).json({
          error: "groupJid, title, and at least 2 options required",
        });
      }

      const selCount = Math.max(0, Math.min(selectableCount ?? 1, options.length));
      const sentMsg = await sock.sendMessage(groupJid, {
        poll: {
          name: title,
          values: options,
          selectableCount: selCount,
        },
      });

      const { proto } = require("@whiskeysockets/baileys");
      const { createHash } = require("crypto");

      const pollKeyStr = JSON.stringify({
        remoteJid: sentMsg.key.remoteJid,
        id: sentMsg.key.id,
        participant: sentMsg.key.participant,
      });

      let messageContent = null;
      if (sentMsg.message) {
        try {
          messageContent = Buffer.from(
            proto.Message.encode(sentMsg.message).finish()
          ).toString("base64");
        } catch (e) {
          console.error("[API] Failed to encode sent message:", e.message);
        }
      }

      let group = await prisma.group.findUnique({
        where: { jid: groupJid },
      });
      if (!group) {
        group = await prisma.group.create({
          data: { jid: groupJid, name: groupJid },
        });
      }

      const poll = await prisma.poll.create({
        data: {
          messageKey: pollKeyStr,
          messageContent,
          title,
          description: description || null,
          groupId: group.id,
          selectableCount: selCount,
          options: {
            create: options.map((optText) => ({
              optionText: optText,
              optionHash: createHash("sha256")
                .update(Buffer.from(optText))
                .digest("hex"),
            })),
          },
        },
        include: { options: true, group: true },
      });

      console.log(`[API] Poll created: "${title}" in ${groupJid}`);
      res.json(poll);
    } catch (err) {
      console.error("[API] /polls/create error:", err.message);
      res.status(500).json({ error: "Failed to create poll" });
    }
  });

  let activeViewerPollId = null;
  let activeViewerTemplate = "classic";

  router.get("/viewer-poll", async (req, res) => {
    if (!activeViewerPollId) {
      return res.json({ poll: null, group: null, template: activeViewerTemplate });
    }
    try {
      const poll = await prisma.poll.findUnique({
        where: { id: activeViewerPollId },
        include: { options: true, group: true, _count: { select: { votes: true } } },
      });
      if (!poll) {
        activeViewerPollId = null;
        return res.json({ poll: null, group: null, template: activeViewerTemplate });
      }
      res.json({ poll, group: poll.group, template: activeViewerTemplate });
    } catch (err) {
      console.error("[API] /viewer-poll error:", err.message);
      res.status(500).json({ error: "Failed to fetch viewer poll" });
    }
  });

  router.post("/viewer-poll", (req, res) => {
    const { pollId, template } = req.body;
    activeViewerPollId = pollId || null;
    if (template) activeViewerTemplate = template;
    console.log(`[API] Viewer poll set to: ${activeViewerPollId}, template: ${activeViewerTemplate}`);
    const io = req.app.get("io");
    if (io) {
      io.emit("viewer_poll_changed", { pollId: activeViewerPollId, template: activeViewerTemplate });
    }
    res.json({ success: true, pollId: activeViewerPollId, template: activeViewerTemplate });
  });

  router.post("/viewer-template", (req, res) => {
    const { template } = req.body;
    if (!template) return res.status(400).json({ error: "template required" });
    activeViewerTemplate = template;
    console.log(`[API] Viewer template set to: ${activeViewerTemplate}`);
    const io = req.app.get("io");
    if (io) {
      io.emit("viewer_template_changed", { template: activeViewerTemplate });
    }
    res.json({ success: true, template: activeViewerTemplate });
  });

  router.post("/admin/delete-polls", async (req, res) => {
    const { password } = req.body;
    try {
      const setting = await prisma.appSettings.findUnique({ where: { key: "admin_password" } });
      if (!setting) {
        return res.status(400).json({ success: false, error: "Password not configured" });
      }
      if (setting.value !== hashPassword(password)) {
        return res.status(401).json({ success: false, error: "Wrong password" });
      }
      const deletedVotes = await prisma.voteLog.deleteMany({});
      const deletedOptions = await prisma.pollOption.deleteMany({});
      const deletedPolls = await prisma.poll.deleteMany({});
      console.log(`[API] Deleted ${deletedPolls.count} polls, ${deletedOptions.count} options, ${deletedVotes.count} votes`);
      const io = req.app.get("io");
      if (io) io.emit("polls_deleted", { timestamp: Date.now() });
      res.json({ success: true, deleted: deletedPolls.count });
    } catch (err) {
      console.error("[API] /admin/delete-polls error:", err.message);
      res.status(500).json({ success: false, error: "Failed to delete polls" });
    }
  });

  router.post("/admin/wa-logout", async (req, res) => {
    try {
      const { logoutWhatsApp } = require("../whatsapp");
      await logoutWhatsApp();
      res.json({ success: true });
    } catch (err) {
      console.error("[API] /admin/wa-logout error:", err.message);
      res.status(500).json({ success: false, error: "Failed to disconnect" });
    }
  });

  router.get("/connection-status", (req, res) => {
    const { getConnectionState } = require("../whatsapp");
    res.json({ status: getConnectionState() });
  });

  router.post("/polls/:pollId/sync", async (req, res) => {
    try {
      const { getSock } = require("../whatsapp");
      const sock = getSock();
      if (!sock) return res.status(503).json({ error: "WhatsApp not connected" });

      const poll = await prisma.poll.findUnique({
        where: { id: req.params.pollId },
        include: { options: true, group: true },
      });
      if (!poll) return res.status(404).json({ error: "Poll not found" });

      const msgKey = JSON.parse(poll.messageKey);

      const messages = await sock.fetchMessagesFromWA(msgKey.remoteJid, 50);
      let processedVotes = 0;

      if (messages && messages.length > 0) {
        const { processVoteFromUpsert: processVote, getAggregatedVotes } = require("../whatsapp");
        for (const msg of messages) {
          if (msg.message?.pollUpdateMessage) {
            try {
              const result = await processVote(msg, prisma, req.app.get("io"));
              if (result) processedVotes++;
            } catch (e) {}
          }
        }
      }

      const { getAggregatedVotes } = require("../whatsapp");
      const aggregated = await getAggregatedVotes(poll.id, prisma);
      res.json({ success: true, processedVotes, votes: aggregated.options, uniqueVoters: aggregated.uniqueVoters });
    } catch (err) {
      console.error("[API] sync error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/pairing-code", async (req, res) => {
    try {
      const { requestPairingCode } = require("../whatsapp");
      const { phoneNumber } = req.body;
      const code = await requestPairingCode(phoneNumber);
      res.json({ success: true, code });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  return router;
};
