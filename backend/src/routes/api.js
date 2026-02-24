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

  async function getViewerSettings() {
    try {
      const pollSetting = await prisma.appSettings.findUnique({ where: { key: "viewer_poll_id" } });
      const templateSetting = await prisma.appSettings.findUnique({ where: { key: "viewer_template" } });
      const effectSetting = await prisma.appSettings.findUnique({ where: { key: "viewer_effect" } });
      const profileImageSetting = await prisma.appSettings.findUnique({ where: { key: "viewer_profile_image" } });
      const displayNameSetting = await prisma.appSettings.findUnique({ where: { key: "viewer_display_name" } });
      return {
        pollId: pollSetting?.value || null,
        template: templateSetting?.value || "classic",
        effect: effectSetting?.value || "confetti",
        profileImage: profileImageSetting?.value || null,
        displayName: displayNameSetting?.value || null,
      };
    } catch {
      return { pollId: null, template: "classic", effect: "confetti", profileImage: null, displayName: null };
    }
  }

  async function saveViewerSettings(pollId, template, effect) {
    try {
      if (pollId !== undefined) {
        if (pollId) {
          await prisma.appSettings.upsert({ where: { key: "viewer_poll_id" }, update: { value: pollId }, create: { id: "viewer_poll_id", key: "viewer_poll_id", value: pollId } });
        } else {
          await prisma.appSettings.deleteMany({ where: { key: "viewer_poll_id" } });
        }
      }
      if (template) {
        await prisma.appSettings.upsert({ where: { key: "viewer_template" }, update: { value: template }, create: { id: "viewer_template", key: "viewer_template", value: template } });
      }
      if (effect) {
        await prisma.appSettings.upsert({ where: { key: "viewer_effect" }, update: { value: effect }, create: { id: "viewer_effect", key: "viewer_effect", value: effect } });
      }
    } catch (e) {
      console.error("[API] Failed to save viewer settings:", e.message);
    }
  }

  router.get("/viewer-poll", async (req, res) => {
    try {
      const settings = await getViewerSettings();
      const { pollId, template, effect, profileImage, displayName } = settings;

      if (!pollId) {
        return res.json({ poll: null, group: null, template, effect, profileImage, displayName });
      }

      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: true, group: true },
      });
      if (!poll) {
        await saveViewerSettings(null, undefined, undefined);
        return res.json({ poll: null, group: null, template, effect, profileImage, displayName });
      }
      res.json({ poll, group: poll.group, template, effect, profileImage, displayName });
    } catch (err) {
      console.error("[API] /viewer-poll error:", err.message);
      res.status(500).json({ error: "Failed to fetch viewer poll" });
    }
  });

  router.post("/viewer-poll", async (req, res) => {
    const { pollId, template, effect } = req.body;
    await saveViewerSettings(pollId || null, template || undefined, effect || undefined);
    console.log(`[API] Viewer poll set to: ${pollId || null}, template: ${template || "unchanged"}, effect: ${effect || "unchanged"}`);
    const io = req.app.get("io");
    if (io) {
      io.emit("viewer_poll_changed", { pollId: pollId || null, template, effect });
    }
    res.json({ success: true, pollId: pollId || null, template, effect });
  });

  router.post("/viewer-template", async (req, res) => {
    const { template } = req.body;
    if (!template) return res.status(400).json({ error: "template required" });
    await saveViewerSettings(undefined, template, undefined);
    console.log(`[API] Viewer template set to: ${template}`);
    const io = req.app.get("io");
    if (io) {
      io.emit("viewer_template_changed", { template });
    }
    res.json({ success: true, template });
  });

  router.post("/viewer-effect", async (req, res) => {
    const { effect } = req.body;
    if (!effect) return res.status(400).json({ error: "effect required" });
    await saveViewerSettings(undefined, undefined, effect);
    console.log(`[API] Viewer effect set to: ${effect}`);
    const io = req.app.get("io");
    if (io) {
      io.emit("viewer_effect_changed", { effect });
    }
    res.json({ success: true, effect });
  });

  router.post("/viewer-profile-image", async (req, res) => {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "image required" });
    try {
      await prisma.appSettings.upsert({
        where: { key: "viewer_profile_image" },
        update: { value: image },
        create: { id: "viewer_profile_image", key: "viewer_profile_image", value: image },
      });
      console.log("[API] Viewer profile image updated");
      const io = req.app.get("io");
      if (io) io.emit("viewer_profile_image_changed", { profileImage: image });
      res.json({ success: true });
    } catch (err) {
      console.error("[API] /viewer-profile-image error:", err.message);
      res.status(500).json({ error: "Failed to save profile image" });
    }
  });

  router.delete("/viewer-profile-image", async (req, res) => {
    try {
      await prisma.appSettings.deleteMany({ where: { key: "viewer_profile_image" } });
      console.log("[API] Viewer profile image removed");
      const io = req.app.get("io");
      if (io) io.emit("viewer_profile_image_changed", { profileImage: null });
      res.json({ success: true });
    } catch (err) {
      console.error("[API] DELETE /viewer-profile-image error:", err.message);
      res.status(500).json({ error: "Failed to delete profile image" });
    }
  });

  router.post("/viewer-display-name", async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "name required" });
    try {
      await prisma.appSettings.upsert({
        where: { key: "viewer_display_name" },
        update: { value: name.trim() },
        create: { id: "viewer_display_name", key: "viewer_display_name", value: name.trim() },
      });
      console.log(`[API] Viewer display name set to: ${name.trim()}`);
      const io = req.app.get("io");
      if (io) io.emit("viewer_display_name_changed", { displayName: name.trim() });
      res.json({ success: true });
    } catch (err) {
      console.error("[API] /viewer-display-name error:", err.message);
      res.status(500).json({ error: "Failed to save display name" });
    }
  });

  router.post("/viewer-dice-roll", (req, res) => {
    const { options, winner, pollId } = req.body;
    if (!options || !winner) return res.status(400).json({ error: "options and winner required" });
    console.log(`[API] Dice roll broadcast: ${options.join(" vs ")} → winner: ${winner}`);
    const io = req.app.get("io");
    if (io) {
      io.emit("viewer_dice_roll", { options, winner, pollId });
    }
    res.json({ success: true });
  });

  router.post("/viewer-announce-winner", (req, res) => {
    const { winner } = req.body;
    if (!winner) return res.status(400).json({ error: "winner required" });
    console.log(`[API] Announce winner: ${winner}`);
    const io = req.app.get("io");
    if (io) {
      io.emit("viewer_announce_winner", { winner });
    }
    res.json({ success: true, winner });
  });

  router.post("/polls/:pollId/declare-winner", async (req, res) => {
    const { winner } = req.body;
    if (!winner) return res.status(400).json({ error: "winner required" });
    try {
      const poll = await prisma.poll.update({
        where: { id: req.params.pollId },
        data: { isLocked: true, winnerOption: winner },
      });
      console.log(`[API] Poll "${poll.title}" locked with winner: ${winner}`);
      const io = req.app.get("io");
      if (io) {
        io.emit("viewer_announce_winner", { winner });
        io.emit("poll_locked", { pollId: poll.id, winner, isLocked: true });
      }
      res.json({ success: true, pollId: poll.id, winner, isLocked: true });
    } catch (err) {
      console.error("[API] /polls/:pollId/declare-winner error:", err.message);
      res.status(500).json({ error: "Failed to declare winner" });
    }
  });

  router.post("/polls/:pollId/reopen", async (req, res) => {
    try {
      const poll = await prisma.poll.update({
        where: { id: req.params.pollId },
        data: { isLocked: false, winnerOption: null },
      });
      console.log(`[API] Poll "${poll.title}" reopened`);
      const io = req.app.get("io");
      if (io) {
        io.emit("poll_reopened", { pollId: poll.id, isLocked: false });
      }
      res.json({ success: true, pollId: poll.id, isLocked: false });
    } catch (err) {
      console.error("[API] /polls/:pollId/reopen error:", err.message);
      res.status(500).json({ error: "Failed to reopen poll" });
    }
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
      console.log(`[API] Sync: Cleared ${deletedVotes.count} vote logs, reconnecting to re-sync...`);

      const io = req.app.get("io");
      const { getSock } = require("../whatsapp");
      const sock = getSock();
      if (sock) {
        sock.end(new Error("Resync requested"));
      }
      if (io) io.emit("history_sync_complete", { timestamp: Date.now() });

      const pollCount = await prisma.poll.count();
      res.json({ success: true, polls: pollCount });
    } catch (err) {
      console.error("[API] /admin/sync error:", err.message);
      res.status(500).json({ success: false, error: "Failed to sync" });
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

  router.get("/groups/:groupId/profile-pic", async (req, res) => {
    try {
      const group = await prisma.group.findUnique({ where: { id: req.params.groupId } });
      if (!group) return res.status(404).json({ error: "Group not found" });

      const { getSock } = require("../whatsapp");
      const sock = getSock();
      if (sock) {
        for (const type of ["image", "preview"]) {
          try {
            const url = await sock.profilePictureUrl(group.jid, type);
            if (url) {
              console.log(`[API] Profile pic found for ${group.name} (${type}): ${url.substring(0, 80)}...`);
              await prisma.group.update({ where: { id: group.id }, data: { profilePicUrl: url } });
              return res.json({ url });
            }
          } catch (e) {
            console.log(`[API] Profile pic ${type} failed for ${group.name}: ${e.message || e}`);
          }
        }
      }

      if (group.profilePicUrl) {
        return res.json({ url: group.profilePicUrl });
      }
      res.json({ url: null });
    } catch (err) {
      console.error("[API] /groups/:groupId/profile-pic error:", err.message);
      res.status(500).json({ error: "Failed to fetch profile picture" });
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
