const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  getAggregateVotesInPollMessage,
  decryptPollVote,
  makeCacheableSignalKeyStore,
  proto,
} = require("@whiskeysockets/baileys");
const { createHash } = require("crypto");
const QRCode = require("qrcode");
const pino = require("pino");
const path = require("path");

const AUTH_DIR = path.resolve(__dirname, "..", "auth_info");

let sock = null;
let connectionState = "disconnected";
let lastQrBase64 = null;
let pairingCodeRequested = false;
let lastPairingPhone = null;
let ioRef = null;
let prismaRef = null;
let isOnline = false;

const contactNames = new Map();
const dbPersistQueue = new Set();
let dbPersistTimer = null;

function setContactName(jid, name) {
  if (!jid || !name) return;
  contactNames.set(jid, name);

  const isLid = jid.includes("@lid");
  let phoneNum = null;

  if (isLid) {
    const lidNum = jid.replace("@lid", "").replace("@s.whatsapp.net", "");
    phoneNum = lidToPhone.get(jid) || lidToPhone.get(lidNum) || lidToPhone.get(jid.replace("@lid", "@s.whatsapp.net"));
    if (phoneNum) {
      contactNames.set(phoneNum + "@s.whatsapp.net", name);
    }
  } else {
    const stripped = jid.replace("@s.whatsapp.net", "").replace("@c.us", "");
    if (/^\d+$/.test(stripped) && stripped.length >= 7) {
      phoneNum = stripped;
      contactNames.set(phoneNum + "@s.whatsapp.net", name);
    }
  }

  // Persist to DB (batched)
  if (phoneNum) {
    dbPersistQueue.add(JSON.stringify({ phone: phoneNum, name }));
    scheduleDbPersist();
  }
}

function scheduleDbPersist() {
  if (dbPersistTimer) return;
  dbPersistTimer = setTimeout(async () => {
    dbPersistTimer = null;
    if (!prismaRef || dbPersistQueue.size === 0) return;
    const batch = [...dbPersistQueue];
    dbPersistQueue.clear();
    try {
      const entries = batch.map(s => JSON.parse(s));
      const uniqueByPhone = new Map();
      for (const e of entries) uniqueByPhone.set(e.phone, e.name);
      const ops = [...uniqueByPhone.entries()].map(([phone, name]) =>
        prismaRef.contactName.upsert({
          where: { phone },
          update: { name, source: "pushName" },
          create: { phone, name, source: "pushName" },
        })
      );
      await Promise.all(ops);
    } catch (e) {
      console.error("[Contacts] DB persist error:", e.message);
    }
  }, 5000);
}

async function loadContactNamesFromDb() {
  if (!prismaRef) return;
  try {
    const stored = await prismaRef.contactName.findMany();
    for (const c of stored) {
      contactNames.set(c.phone + "@s.whatsapp.net", c.name);
    }
    console.log(`[Contacts] Loaded ${stored.length} names from ContactName table`);

    // Import names from VoteLog (WhatsApp votes contain pushName)
    let imported = 0;
    const voters = await prismaRef.voteLog.findMany({
      where: { voterName: { not: null }, voterPhone: { not: null } },
      distinct: ["voterPhone"],
      select: { voterPhone: true, voterName: true },
      orderBy: { timestamp: "desc" },
    });
    for (const v of voters) {
      if (!v.voterName || !v.voterPhone || v.voterPhone.length < 7) continue;
      const phoneJid = v.voterPhone + "@s.whatsapp.net";
      if (!contactNames.has(phoneJid)) {
        contactNames.set(phoneJid, v.voterName);
        dbPersistQueue.add(JSON.stringify({ phone: v.voterPhone, name: v.voterName }));
        imported++;
      }
    }

    // Import names from WebVoterSession (user-entered names override others)
    const sessions = await prismaRef.webVoterSession.findMany({
      where: { name: { notIn: ["Unknown", ""] } },
      distinct: ["phone"],
      select: { phone: true, name: true },
      orderBy: { lastActiveAt: "desc" },
    });
    for (const s of sessions) {
      if (!s.name || !s.phone || s.phone.length < 7) continue;
      const phoneJid = s.phone + "@s.whatsapp.net";
      // User-entered names take priority
      contactNames.set(phoneJid, s.name);
      dbPersistQueue.add(JSON.stringify({ phone: s.phone, name: s.name }));
      imported++;
    }

    if (imported > 0) {
      scheduleDbPersist();
      console.log(`[Contacts] Imported ${imported} additional names from VoteLog/WebVoterSession (total: ${contactNames.size})`);
    }
  } catch (e) {
    console.error("[Contacts] Failed to load from DB:", e.message);
  }
}

function getContactName(jid) {
  if (!jid) return null;
  return contactNames.get(jid)
    || contactNames.get(jid.replace("@lid", "@s.whatsapp.net"))
    || contactNames.get(jid.replace("@s.whatsapp.net", "@lid"))
    || null;
}

const lidToPhone = new Map();

function mapLidToPhone(lid, phoneJid) {
  if (!lid || !phoneJid) return;
  const phoneNum = phoneJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
  if (!/^\d+$/.test(phoneNum) || phoneNum.length < 7) return;
  lidToPhone.set(lid, phoneNum);
  lidToPhone.set(lid.replace("@lid", "@s.whatsapp.net"), phoneNum);
  const lidNum = lid.replace("@lid", "").replace("@s.whatsapp.net", "");
  lidToPhone.set(lidNum, phoneNum);

  // Back-fill: if we already have a name for this LID, also cache under phone
  const lidName = contactNames.get(lid) || contactNames.get(lidNum + "@lid");
  if (lidName) {
    contactNames.set(phoneNum + "@s.whatsapp.net", lidName);
  }
}

function crossReferenceLidNames() {
  let resolved = 0;
  for (const [lid, phoneNum] of lidToPhone.entries()) {
    if (!phoneNum || !/^\d+$/.test(phoneNum)) continue;
    const phoneJid = phoneNum + "@s.whatsapp.net";
    if (contactNames.has(phoneJid)) continue;

    // Check all variations of LID keys for names
    const lidJid = lid.includes("@") ? lid : lid + "@lid";
    const name = contactNames.get(lid) || contactNames.get(lidJid)
      || contactNames.get(lid.replace("@s.whatsapp.net", "@lid"));
    if (name) {
      contactNames.set(phoneJid, name);
      dbPersistQueue.add(JSON.stringify({ phone: phoneNum, name }));
      resolved++;
    }
  }
  if (resolved > 0) {
    scheduleDbPersist();
    console.log(`[Contacts] Cross-reference: resolved ${resolved} new phone names (total names: ${contactNames.size})`);
  } else {
    console.log(`[Contacts] Cross-reference: no new names resolved (total names: ${contactNames.size}, lidMap: ${lidToPhone.size})`);
  }
}

function isLidNumber(num) {
  return num.length > 14;
}

function jidToPhone(jid) {
  if (!jid) return null;
  const mapped = lidToPhone.get(jid)
    || lidToPhone.get(jid.replace("@s.whatsapp.net", "@lid"))
    || lidToPhone.get(jid.replace("@s.whatsapp.net", "").replace("@lid", ""));
  if (mapped) return mapped;
  const num = jid.replace("@s.whatsapp.net", "").replace("@lid", "").replace("@c.us", "");
  if (/^\d+$/.test(num) && num.length >= 7 && !isLidNumber(num)) return num;
  return null;
}

async function loadGroupParticipantNames(groupJid) {
  if (!sock || !groupJid) return;
  try {
    const meta = await sock.groupMetadata(groupJid);
    if (meta?.participants) {
      for (const p of meta.participants) {
        const name = p.notify || p.verifiedName || p.name;
        const phoneJid = p.jid || (p.id && !p.id.includes("@lid") ? p.id : null);
        const lidJid = p.lid || (p.id && p.id.includes("@lid") ? p.id : null);
        if (name) {
          if (phoneJid) setContactName(phoneJid, name);
          if (lidJid) {
            setContactName(lidJid, name);
            setContactName(lidJid.replace("@lid", "@s.whatsapp.net"), name);
          }
        }
        if (phoneJid && lidJid) {
          mapLidToPhone(lidJid, phoneJid);
        }
      }
      const withNames = meta.participants.filter(p => p.notify || p.verifiedName || p.name).length;
      const withLids = meta.participants.filter(p => p.lid).length;
      console.log(`[Contacts] Loaded ${meta.participants.length} from group ${meta.subject || groupJid} (${withNames} named, ${withLids} LIDs, names: ${contactNames.size}, lidMap: ${lidToPhone.size})`);
    }
  } catch (e) {
    console.error("[Contacts] Failed to load group metadata:", e.message);
  }
}

function getSock() {
  return sock;
}

function getConnectionState() {
  return connectionState;
}

function getLastQr() {
  return lastQrBase64;
}

function sha256(text) {
  return createHash("sha256").update(Buffer.from(text)).digest();
}

async function requestPairingCode(phoneNumber) {
  if (!sock) throw new Error("WhatsApp socket not initialized");
  if (!phoneNumber) throw new Error("Phone number is required");

  const cleaned = phoneNumber.replace(/[^0-9]/g, "");
  if (cleaned.length < 10) throw new Error("Invalid phone number");

  pairingCodeRequested = true;
  lastPairingPhone = cleaned;
  try {
    const code = await sock.requestPairingCode(cleaned);
    console.log("[WA] Pairing code generated for:", cleaned);
    return code;
  } catch (err) {
    console.error("[WA] Pairing code error:", err.message);
    pairingCodeRequested = false;
    lastPairingPhone = null;
    throw err;
  }
}

async function handleHistorySet(data, prisma, io) {
  const { messages, chats, contacts } = data;
  console.log(`[History] Received ${messages?.length || 0} messages, ${chats?.length || 0} chats, ${contacts?.length || 0} contacts`);

  if (contacts && contacts.length > 0) {
    for (const c of contacts) {
      const name = c.notify || c.verifiedName || c.name || c.shortName;
      if (name && c.id) setContactName(c.id, name);
    }
  }

  if (chats && chats.length > 0) {
    for (const chat of chats) {
      if (chat.id && chat.id.endsWith("@g.us")) {
        try {
          await prisma.group.upsert({
            where: { jid: chat.id },
            update: { name: chat.name || chat.id },
            create: { jid: chat.id, name: chat.name || chat.id },
          });
        } catch (e) {}
      }
    }
  }

  const pollCreations = [];
  const pollUpdates = [];

  if (messages && messages.length > 0) {
    for (const msg of messages) {
      if (msg.pushName) {
        const senderJid = msg.key?.participant || msg.key?.remoteJid;
        if (senderJid) setContactName(senderJid, msg.pushName);
      }
      try {
        const created = await processPollCreation(msg, prisma);
        if (created) pollCreations.push(created);
      } catch (e) {}
      if (msg.message?.pollUpdateMessage) pollUpdates.push(msg);
    }
  }

  if (pollUpdates.length > 0) {
    console.log(`[History] Processing ${pollUpdates.length} poll vote messages`);
    for (const msg of pollUpdates) {
      try { await processVoteFromUpsert(msg, prisma, io); } catch (e) {}
    }
  }

  if (pollCreations.length > 0 || pollUpdates.length > 0 || contactNames.size > 0) {
    console.log(`[History] Saved ${pollCreations.length} polls, processed ${pollUpdates.length} votes, contacts cache: ${contactNames.size}`);
  }
  io.emit("history_sync_complete", { timestamp: Date.now() });
}

async function handleGroupsUpsert(groups, prisma, io) {
  for (const group of groups) {
    try {
      await prisma.group.upsert({
        where: { jid: group.id },
        update: { name: group.subject || group.id, profilePicUrl: group.profilePicUrl || null },
        create: { jid: group.id, name: group.subject || group.id, profilePicUrl: group.profilePicUrl || null },
      });
    } catch (e) { console.error("[groups.upsert]", e.message); }
  }
  io.emit("groups_updated", { timestamp: Date.now() });
}

async function handleGroupsUpdate(updates, prisma, io) {
  for (const update of updates) {
    try {
      if (update.id) {
        await prisma.group.upsert({
          where: { jid: update.id },
          update: { name: update.subject || undefined, profilePicUrl: update.profilePicUrl || undefined },
          create: { jid: update.id, name: update.subject || update.id },
        });
      }
    } catch (e) { console.error("[groups.update]", e.message); }
  }
  io.emit("groups_updated", { timestamp: Date.now() });
}

async function handleMessagesUpsert(upsert, prisma, io) {
  const messages = upsert.messages || upsert;
  const type = upsert.type || "unknown";
  if (!messages || !Array.isArray(messages)) return;

  for (const msg of messages) {
    if (msg.pushName) {
      const senderJid = msg.key?.participant || msg.key?.remoteJid;
      if (senderJid) setContactName(senderJid, msg.pushName);
    }

    const msgTypes = Object.keys(msg.message || {}).filter(
      (k) => k !== "messageContextInfo" && k !== "senderKeyDistributionMessage"
    );

    if (type === "notify" || isOnline) {
      if (msgTypes.length > 0) {
        console.log(`[RT] ${type} | ${msgTypes.join(",")} | from: ${msg.key?.remoteJid?.slice(0, 30)}`);
      }
    }

    if (msg.message?.pollUpdateMessage) {
      try {
        const result = await processVoteFromUpsert(msg, prisma, io);
        if (result?.poll) {
          const { poll: dbPoll, voter, selectedOption } = result;
          const aggregated = await getAggregatedVotes(dbPoll.id, prisma);
          io.to(dbPoll.id).emit("poll_vote_received", {
            pollId: dbPoll.id,
            votes: aggregated.options,
            uniqueVoters: aggregated.uniqueVoters,
            voter,
            selectedOption,
            timestamp: Date.now(),
          });
          io.emit("poll_data_changed", { pollId: dbPoll.id, timestamp: Date.now() });
          console.log("[VOTE-SYNC] New vote emitted to UI for poll:", dbPoll.title);
        }
      } catch (e) { console.error("[messages.upsert] Vote error:", e.message); }
    }
    try { await processPollCreation(msg, prisma); } catch (e) {}
  }
}

async function handleMessagesReaction(reactions, prisma, io) {
  if (isOnline) {
    console.log(`[RT] reactions: ${reactions.length}`);
  }
}

async function handleMessagesUpdate(updates, prisma, io) {
  for (const update of updates) {
    try {
      if (isOnline) {
        const keys = update.update ? Object.keys(update.update) : [];
        if (keys.length > 0 && keys[0] !== "status") {
          console.log(`[RT-update] keys: ${keys.join(",")} | from: ${update.key?.remoteJid?.slice(0, 30)}`);
        }
      }
      if (!update.update?.pollUpdates) continue;

      const pollKey = update.key;
      console.log("[Vote] Poll update received for:", pollKey.remoteJid, "id:", pollKey.id);

      const keyVariants = [
        JSON.stringify({ remoteJid: pollKey.remoteJid, id: pollKey.id, participant: pollKey.participant }),
        JSON.stringify({ remoteJid: pollKey.remoteJid, id: pollKey.id, participant: pollKey.participant || undefined }),
        JSON.stringify({ remoteJid: pollKey.remoteJid, id: pollKey.id }),
      ];

      let dbPoll = null;
      for (const keyStr of keyVariants) {
        dbPoll = await prisma.poll.findFirst({ where: { messageKey: keyStr }, include: { options: true } });
        if (dbPoll) break;
      }

      if (!dbPoll) {
        dbPoll = await prisma.poll.findFirst({
          where: { messageKey: { contains: pollKey.id } },
          include: { options: true },
        });
      }

      if (!dbPoll) { console.log("[Vote] Poll not found for id:", pollKey.id); continue; }
      if (dbPoll.isLocked) { console.log("[Vote] Poll is locked, ignoring vote for:", dbPoll.title); continue; }

      console.log("[Vote] Found poll:", dbPoll.title);

      let fullMessage;
      if (dbPoll.messageContent) {
        fullMessage = proto.Message.decode(Buffer.from(dbPoll.messageContent, "base64"));
      }
      if (!fullMessage) { console.log("[Vote] No stored message content for poll:", dbPoll.title); continue; }

      for (const pollUpdate of update.update.pollUpdates) {
        try {
          const votes = getAggregateVotesInPollMessage({ message: fullMessage, pollUpdates: [pollUpdate] });
          console.log("[Vote] Decrypted votes:", JSON.stringify(votes));
          if (!votes || votes.length === 0) continue;

          const rawVoterJid = pollUpdate.pollUpdateMessageKey?.participant || pollUpdate.senderJid || "unknown";
          const voterJid = rawVoterJid.replace("@lid", "@s.whatsapp.net");
          const voterName = getContactName(voterJid) || getContactName(rawVoterJid) || null;
          const voterPhone = jidToPhone(rawVoterJid) || jidToPhone(voterJid) || null;
          const selectedTexts = [];

          for (const vote of votes) {
            if (vote.voters && vote.voters.length > 0) {
              const optionName = vote.name;
              selectedTexts.push(optionName);
              const matchedOption = dbPoll.options.find((o) => o.optionText === optionName);

              for (const voter of vote.voters) {
                const normalizedVoter = (voter || voterJid).replace("@lid", "@s.whatsapp.net");
                await prisma.voteLog.create({
                  data: { pollId: dbPoll.id, optionId: matchedOption?.id || null, voterJid: normalizedVoter, voterName: voterName || getContactName(normalizedVoter), voterPhone: voterPhone || jidToPhone(normalizedVoter), selectedOptionText: optionName },
                });
                console.log(`[Vote] Recorded: ${normalizedVoter} -> "${optionName}" in "${dbPoll.title}"`);
              }
            }
          }

          const selectedOption = selectedTexts.join("|") || null;
          const aggregated = await getAggregatedVotes(dbPoll.id, prisma);
          io.to(dbPoll.id).emit("poll_vote_received", {
            pollId: dbPoll.id,
            votes: aggregated.options,
            uniqueVoters: aggregated.uniqueVoters,
            voter: { name: voterName, jid: voterJid, phone: voterPhone },
            selectedOption,
            timestamp: Date.now(),
          });
          io.emit("poll_data_changed", { pollId: dbPoll.id, timestamp: Date.now() });
        } catch (decryptErr) {
          console.error("[Vote] Decryption/processing error:", decryptErr.message);
        }
      }
    } catch (e) {
      console.error("[messages.update] Error:", e.message);
    }
  }
}

async function initWhatsApp(io, prisma) {
  ioRef = io;
  prismaRef = prisma;
  await loadContactNamesFromDb();
  const logger = pino({ level: "warn" });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  console.log("[WA] Using WA version:", version);

  lastQrBase64 = null;
  const savedPairingPhone = lastPairingPhone;

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    version,
    browser: Browsers.ubuntu("Chrome"),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: true,
    generateHighQualityLinkPreview: false,
    getMessage: async (key) => {
      console.log("[getMessage] Looking up key:", JSON.stringify(key));
      try {
        const keyVariants = [
          JSON.stringify({ remoteJid: key.remoteJid, id: key.id, participant: key.participant }),
          JSON.stringify({ remoteJid: key.remoteJid, id: key.id }),
        ];
        let poll = null;
        for (const keyStr of keyVariants) {
          poll = await prisma.poll.findFirst({ where: { messageKey: keyStr } });
          if (poll) break;
        }
        if (!poll && key.id) {
          poll = await prisma.poll.findFirst({
            where: { messageKey: { contains: key.id } },
          });
        }
        if (poll && poll.messageContent) {
          console.log("[getMessage] Found poll:", poll.title);
          return proto.Message.decode(
            Buffer.from(poll.messageContent, "base64")
          );
        }
        console.log("[getMessage] Poll not found for id:", key.id);
      } catch (e) {
        console.error("[getMessage] Lookup error:", e.message);
      }
      return undefined;
    },
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messaging-history.set", (data) => handleHistorySet(data, prisma, io));
  sock.ev.on("groups.upsert", (data) => handleGroupsUpsert(data, prisma, io));
  sock.ev.on("groups.update", (data) => handleGroupsUpdate(data, prisma, io));
  sock.ev.on("messages.upsert", (data) => handleMessagesUpsert(data, prisma, io));
  sock.ev.on("messages.update", (data) => handleMessagesUpdate(data, prisma, io));

  sock.ev.on("contacts.upsert", (contacts) => {
    let mapped = 0;
    let withNames = 0;
    for (const c of contacts) {
      const name = c.notify || c.verifiedName || c.name || c.shortName;
      const phoneJid = c.jid || (c.id && !c.id.includes("@lid") ? c.id : null);
      const lidJid = c.lid || (c.id && c.id.includes("@lid") ? c.id : null);
      if (name) {
        withNames++;
        if (phoneJid) setContactName(phoneJid, name);
        if (lidJid) setContactName(lidJid, name);
      }
      if (phoneJid && lidJid) {
        mapLidToPhone(lidJid, phoneJid);
        mapped++;
      }
    }
    if (contacts.length > 0) {
      // Log a sample of contacts for debugging (both named and unnamed)
      const samples = contacts.slice(0, 3);
      for (const c of samples) {
        const keys = Object.keys(c).filter(k => c[k] != null && c[k] !== "");
        console.log(`[Contacts] Sample: ${JSON.stringify(Object.fromEntries(keys.map(k => [k, c[k]])))}`);
      }
      console.log(`[Contacts] Cached ${contacts.length} contacts (${withNames} with names, ${mapped} lid-mapped, names: ${contactNames.size}, lidMap: ${lidToPhone.size})`);
    }
  });

  sock.ev.on("contacts.update", (updates) => {
    for (const c of updates) {
      const name = c.notify || c.verifiedName || c.name || c.shortName;
      const phoneJid = c.jid || (c.id && !c.id.includes("@lid") ? c.id : null);
      const lidJid = c.lid || (c.id && c.id.includes("@lid") ? c.id : null);
      if (name) {
        console.log(`[Contacts] Update: ${name} (jid: ${phoneJid || "?"}, lid: ${lidJid || "?"})`);
        if (phoneJid) setContactName(phoneJid, name);
        if (lidJid) setContactName(lidJid, name);
      }
      if (phoneJid && lidJid) {
        mapLidToPhone(lidJid, phoneJid);
      }
    }
  });

  sock.ev.on("messaging-history.set", (data) => {
    let mapped = 0;
    if (data.contacts && data.contacts.length > 0) {
      for (const c of data.contacts) {
        const name = c.notify || c.verifiedName || c.name || c.shortName;
        const phoneJid = c.jid || (c.id && !c.id.includes("@lid") ? c.id : null);
        const lidJid = c.lid || (c.id && c.id.includes("@lid") ? c.id : null);
        if (name && phoneJid) setContactName(phoneJid, name);
        if (name && lidJid) setContactName(lidJid, name);
        if (phoneJid && lidJid) {
          mapLidToPhone(lidJid, phoneJid);
          mapped++;
        }
      }
      console.log(`[Contacts] From history: ${data.contacts.length} contacts (${mapped} lid-mapped, names: ${contactNames.size}, lidMap: ${lidToPhone.size})`);
    }
  });

  console.log("[WA] All event handlers registered");

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      if (savedPairingPhone && !pairingCodeRequested) {
        pairingCodeRequested = true;
        lastPairingPhone = savedPairingPhone;
        try {
          const code = await sock.requestPairingCode(savedPairingPhone);
          console.log("[WA] Auto-regenerated pairing code for:", savedPairingPhone);
          io.emit("pairing_code_response", { success: true, code });
        } catch (err) {
          console.error("[WA] Auto-pairing code error:", err.message);
          pairingCodeRequested = false;
          lastPairingPhone = null;
        }
      }

      if (!pairingCodeRequested) {
        connectionState = "waiting_for_qr";
        try {
          const qrBase64 = await QRCode.toDataURL(qr, { width: 320 });
          lastQrBase64 = qrBase64;
          io.emit("qr_code_update", { qr: qrBase64 });
          io.emit("connection_status", { status: "waiting_for_qr" });
          console.log("[WA] QR code generated and broadcast");
        } catch (err) {
          console.error("[QR] Encoding error:", err.message);
        }
      }
    }

    if (connection === "connecting") {
      connectionState = "connecting";
      io.emit("connection_status", { status: "connecting" });
    }

    if (connection === "open") {
      connectionState = "connected";
      isOnline = true;
      lastQrBase64 = null;
      pairingCodeRequested = false;
      lastPairingPhone = null;
      io.emit("connection_status", { status: "connected" });
      console.log("[WA] Connected successfully, isOnline=true");
      if (sock.user?.id && sock.user?.lid) {
        const myPhone = sock.user.id.split(":")[0] + "@s.whatsapp.net";
        const myLid = sock.user.lid.split(":")[0] + "@lid";
        mapLidToPhone(myLid, myPhone);
        if (sock.user.name) {
          setContactName(myPhone, sock.user.name);
          setContactName(myLid, sock.user.name);
        }
      }

      // Force contacts re-sync from WhatsApp
      setTimeout(async () => {
        try {
          await sock.resyncAppState(["critical_unblock_low", "regular", "regular_high", "regular_low"]);
          console.log("[Contacts] Triggered app state re-sync");
        } catch (e) {
          console.log("[Contacts] App state re-sync error:", e.message);
        }
      }, 3000);

      setTimeout(async () => {
        try {
          const groups = await prisma.group.findMany({
            where: { polls: { some: {} } },
          });
          for (const g of groups) {
            await loadGroupParticipantNames(g.jid);
          }
          // Also load the web voting verification group
          try {
            const verifyGroup = await prisma.appSettings.findUnique({ where: { key: "web_voting_group_jid" } });
            if (verifyGroup?.value) {
              await loadGroupParticipantNames(verifyGroup.value);
            }
          } catch {}
          console.log(`[Contacts] After group load: names=${contactNames.size}, lidMap=${lidToPhone.size}`);
        } catch (e) {
          console.error("[Contacts] Auto-load error:", e.message);
        }
      }, 5000);

      // After 15s, cross-reference all LID names -> phone names
      setTimeout(() => {
        crossReferenceLidNames();
      }, 15000);

    }

    if (connection === "close") {
      const err = lastDisconnect?.error;
      const statusCode = err?.output?.statusCode;
      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut;

      connectionState = "disconnected";
      isOnline = false;
      lastQrBase64 = null;

      if (err?.message) {
        console.log(
          `[WA] Disconnected (code: ${statusCode}), reason: ${err.message}, reconnect: ${shouldReconnect}`
        );
      } else {
        console.log(
          `[WA] Disconnected (code: ${statusCode}), reconnect: ${shouldReconnect}`
        );
      }

      if (shouldReconnect) {
        io.emit("connection_status", { status: "reconnecting" });
        const delay = statusCode === 408 ? 1000 : 3000;
        setTimeout(() => initWhatsApp(io, prisma), delay);
      } else {
        try {
          const fs = require("fs");
          if (fs.existsSync(AUTH_DIR)) {
            const files = fs.readdirSync(AUTH_DIR);
            for (const file of files) {
              const filePath = require("path").join(AUTH_DIR, file);
              fs.rmSync(filePath, { recursive: true, force: true });
            }
            console.log("[WA] Cleared auth_info contents for fresh session");
          }
        } catch (cleanErr) {
          console.error("[WA] Error clearing auth_info:", cleanErr.message);
        }
        if (lastPairingPhone) {
          io.emit("connection_status", { status: "reconnecting" });
          console.log("[WA] Reconnecting with saved pairing phone:", lastPairingPhone);
        } else {
          io.emit("connection_status", { status: "logged_out" });
        }
        setTimeout(() => initWhatsApp(io, prisma), 2000);
      }
    }
  });

  // Event handlers are registered via sock.ev.process() above

  return sock;
}

async function processVoteFromUpsert(msg, prisma, io) {
  const pollUpdateMsg = msg.message?.pollUpdateMessage;
  if (!pollUpdateMsg) return;

  const pollCreationKey = pollUpdateMsg.pollCreationMessageKey;
  if (!pollCreationKey) { console.log("[processVote] No pollCreationMessageKey"); return; }

  

  const keyVariants = [
    JSON.stringify({ remoteJid: pollCreationKey.remoteJid, id: pollCreationKey.id, participant: pollCreationKey.participant }),
    JSON.stringify({ remoteJid: pollCreationKey.remoteJid, id: pollCreationKey.id }),
  ];

  let dbPoll = null;
  for (const keyStr of keyVariants) {
    dbPoll = await prisma.poll.findFirst({ where: { messageKey: keyStr }, include: { options: true } });
    if (dbPoll) break;
  }
  if (!dbPoll) {
    dbPoll = await prisma.poll.findFirst({
      where: { messageKey: { contains: pollCreationKey.id } },
      include: { options: true },
    });
  }

  if (!dbPoll) { console.log("[processVote] Poll NOT found for id:", pollCreationKey.id); return; }
  if (dbPoll.isLocked) { console.log("[processVote] Poll is locked, ignoring vote for:", dbPoll.title); return; }
  if (!dbPoll.messageContent) { console.log("[processVote] No messageContent"); return; }

  const fullMessage = proto.Message.decode(Buffer.from(dbPoll.messageContent, "base64"));
  const pollEncKey = fullMessage.messageContextInfo?.messageSecret;
  if (!pollEncKey) { console.log("[processVote] No messageSecret in stored message"); return; }

  const encVote = pollUpdateMsg.vote;
  if (!encVote || !encVote.encPayload) { console.log("[processVote] No encrypted vote data"); return; }

  const rawVoterJid = msg.key.participant || msg.key.remoteJid || "unknown";
  const voterJid = rawVoterJid.replace("@lid", "@s.whatsapp.net");
  const pollCreatorJid = pollCreationKey.participant || pollCreationKey.remoteJid || "";
  const voterName = msg.pushName || getContactName(voterJid) || getContactName(rawVoterJid) || null;
  const voterPhone = jidToPhone(rawVoterJid) || jidToPhone(voterJid) || null;

  if (voterName) {
    setContactName(voterJid, voterName);
    setContactName(rawVoterJid, voterName);
  }

  try {
    const decryptedVote = decryptPollVote(encVote, {
      pollCreatorJid,
      pollMsgId: pollCreationKey.id,
      pollEncKey,
      voterJid: msg.key.participant || msg.key.remoteJid || "",
    });

    console.log("[processVote] Decrypted selectedOptions count:", decryptedVote.selectedOptions?.length);

    const selectedTexts = [];
    for (const selectedOpt of (decryptedVote.selectedOptions || [])) {
      const buf = Buffer.isBuffer(selectedOpt) ? selectedOpt : Buffer.from(selectedOpt);
      const optHashHex = buf.toString("hex");

      let matchedOption = dbPoll.options.find((o) => o.optionHash === optHashHex);

      if (!matchedOption) {
        for (const opt of dbPoll.options) {
          const computed = sha256(Buffer.from(opt.optionText)).toString("hex");
          if (computed === optHashHex) { matchedOption = opt; break; }
        }
      }

      if (!matchedOption) {
        for (const opt of dbPoll.options) {
          const computed = sha256(opt.optionText);
          if (computed.equals(buf)) { matchedOption = opt; break; }
        }
      }

      selectedTexts.push({
        optionText: matchedOption?.optionText || `unknown(${optHashHex.slice(0, 16)})`,
        optionId: matchedOption?.id || null,
      });
    }

    const latestVote = await prisma.voteLog.findFirst({
      where: { pollId: dbPoll.id, voterJid },
      orderBy: { timestamp: "desc" },
    });

    const newSelection = selectedTexts.map((s) => s.optionText).sort().join("|");
    const oldSelection = latestVote?.selectedOptionText || "";

    if (newSelection === oldSelection) {
      return null;
    }

    if (selectedTexts.length === 0) {
      await prisma.voteLog.create({
        data: {
          pollId: dbPoll.id,
          optionId: null,
          voterJid,
          voterName,
          voterPhone,
          selectedOptionText: "",
        },
      });
      console.log(`[processVote] RETRACTED: ${voterName || voterJid} in "${dbPoll.title}"`);
      return { poll: dbPoll, voter: { name: voterName, jid: voterJid, phone: voterPhone }, selectedOption: null };
    }

    await prisma.voteLog.create({
      data: {
        pollId: dbPoll.id,
        optionId: selectedTexts.length === 1 ? selectedTexts[0].optionId : null,
        voterJid,
        voterName,
        voterPhone,
        selectedOptionText: newSelection,
      },
    });
    console.log(`[processVote] NEW VOTE: ${voterName || voterJid} (phone: ${voterPhone}) -> "${newSelection}" in "${dbPoll.title}"`);
    return {
      poll: dbPoll,
      voter: { name: voterName, jid: voterJid, phone: voterPhone },
      selectedOption: newSelection,
    };
  } catch (e) {
    console.error("[processVote] Decrypt error:", e.message);

    try {
      const decryptedVotes = getAggregateVotesInPollMessage({
        message: fullMessage,
        pollUpdates: [{ pollUpdateMessageKey: msg.key, vote: encVote }],
      });
      for (const dv of decryptedVotes) {
        if (dv.voters && dv.voters.length > 0) {
          const matchedOption = dbPoll.options.find((o) => o.optionText === dv.name);
          for (const voter of dv.voters) {
            const nv = (voter || voterJid).replace("@lid", "@s.whatsapp.net");
            const existing = await prisma.voteLog.findFirst({
              where: { pollId: dbPoll.id, voterJid: nv, selectedOptionText: dv.name },
            });
            if (existing) continue;
            await prisma.voteLog.create({
              data: { pollId: dbPoll.id, optionId: matchedOption?.id || null, voterJid: nv, voterName: getContactName(nv) || voterName, selectedOptionText: dv.name },
            });
            console.log(`[processVote] Fallback SAVED: ${nv} -> "${dv.name}"`);
          }
        }
      }
      return { poll: dbPoll, voter: { name: voterName, jid: voterJid, phone: voterPhone }, selectedOption: null };
    } catch (e2) {
      console.error("[processVote] Fallback also failed:", e2.message);
    }
  }
}

async function processPollCreation(msg, prisma) {
  if (!msg.key?.remoteJid?.endsWith("@g.us")) return null;

  const pollCreation =
    msg.message?.pollCreationMessage ||
    msg.message?.pollCreationMessageV3 ||
    msg.message?.pollCreationMessageV2;

  if (!pollCreation) return null;

  const groupJid = msg.key.remoteJid;
  const pollKeyStr = JSON.stringify({
    remoteJid: msg.key.remoteJid,
    id: msg.key.id,
    participant: msg.key.participant,
  });

  let group = await prisma.group.findUnique({
    where: { jid: groupJid },
  });

  if (!group) {
    group = await prisma.group.create({
      data: { jid: groupJid, name: groupJid },
    });
  }

  const existingPoll = await prisma.poll.findFirst({
    where: { messageKey: pollKeyStr },
  });
  if (existingPoll) return existingPoll;

  let messageContent = null;
  if (msg.message) {
    try {
      messageContent = Buffer.from(
        proto.Message.encode(msg.message).finish()
      ).toString("base64");
    } catch (e) {
      console.error("[Poll] Failed to encode message content:", e.message);
    }
  }

  const options = pollCreation.options || [];
  const selectableCount = pollCreation.selectableOptionsCount ?? 1;
  const poll = await prisma.poll.create({
    data: {
      messageKey: pollKeyStr,
      messageContent,
      title: pollCreation.name || "Untitled Poll",
      description: pollCreation.description || null,
      groupId: group.id,
      selectableCount,
      options: {
        create: options.map((opt) => {
          const text = opt.optionName || opt;
          return {
            optionText: typeof text === "string" ? text : String(text),
            optionHash: sha256(
              typeof text === "string" ? text : String(text)
            ).toString("hex"),
          };
        }),
      },
    },
  });

  console.log(`[Poll] Saved poll "${poll.title}" (selectable: ${selectableCount}) in group ${groupJid}`);
  return poll;
}

async function getAggregatedVotes(pollId, prisma) {
  const options = await prisma.pollOption.findMany({
    where: { pollId },
  });

  let latestVotesPerUser = [];
  try {
    latestVotesPerUser = await prisma.$queryRaw`
      SELECT DISTINCT ON ("voterJid") "voterJid", "voterName", "voterPhone", "selectedOptionText", "timestamp"
      FROM "VoteLog"
      WHERE "pollId" = ${pollId}
      ORDER BY "voterJid", "timestamp" DESC
    `;
  } catch (e) {
    console.error("[Votes] Aggregation query error:", e.message);
  }

  const activeVotes = latestVotesPerUser.filter(
    (v) => v.selectedOptionText && v.selectedOptionText !== ""
  );

  const result = [];
  for (const opt of options) {
    const votersForOption = activeVotes.filter((v) => {
      const selected = v.selectedOptionText.split("|");
      return selected.includes(opt.optionText);
    });

    result.push({
      optionId: opt.id,
      optionText: opt.optionText,
      count: votersForOption.length,
      voters: votersForOption.map((v) => ({
        jid: v.voterJid,
        name: v.voterName || getContactName(v.voterJid) || null,
        phone: v.voterPhone || jidToPhone(v.voterJid) || null,
      })),
    });
  }

  const uniqueVoters = activeVotes.length;
  return { options: result, uniqueVoters };
}

async function resolveContactName(phoneNum) {
  if (!phoneNum) return null;
  const phoneJid = phoneNum + "@s.whatsapp.net";

  // 1. Check in-memory cache (includes DB-loaded, LID-mapped, and live contacts.update names)
  const byPhone = getContactName(phoneJid);
  if (byPhone) return byPhone;

  // 2. Reverse LID lookup
  for (const [lid, mapped] of lidToPhone.entries()) {
    if (mapped === phoneNum) {
      const lidName = getContactName(lid)
        || getContactName(lid.includes("@") ? lid : lid + "@lid");
      if (lidName) {
        setContactName(phoneJid, lidName);
        return lidName;
      }
    }
  }

  // 3. Check persistent DB (ContactName, WebVoterSession, VoteLog)
  if (prismaRef) {
    try {
      // ContactName table
      const dbContact = await prismaRef.contactName.findUnique({ where: { phone: phoneNum } });
      if (dbContact?.name) {
        contactNames.set(phoneJid, dbContact.name);
        return dbContact.name;
      }

      // WebVoterSession (user-entered names - highest trust)
      const session = await prismaRef.webVoterSession.findFirst({
        where: { phone: phoneNum, name: { notIn: ["Unknown", ""] } },
        orderBy: { lastActiveAt: "desc" },
        select: { name: true },
      });
      if (session?.name) {
        setContactName(phoneJid, session.name);
        return session.name;
      }

      // VoteLog (push names from WhatsApp poll votes)
      const vote = await prismaRef.voteLog.findFirst({
        where: { voterPhone: phoneNum, voterName: { not: null } },
        orderBy: { timestamp: "desc" },
        select: { voterName: true },
      });
      if (vote?.voterName) {
        setContactName(phoneJid, vote.voterName);
        return vote.voterName;
      }
    } catch {}
  }

  // 4. Try business profile (WhatsApp Business accounts only)
  if (sock) {
    try {
      const biz = await sock.getBusinessProfile(phoneJid);
      if (biz?.profile?.name) {
        setContactName(phoneJid, biz.profile.name);
        return biz.profile.name;
      }
    } catch {}
  }

  return null;
}

async function checkGroupMembership(groupJid, phoneNumber) {
  if (!sock) throw new Error("WhatsApp not connected");
  if (!groupJid || !phoneNumber) throw new Error("groupJid and phoneNumber required");

  const normalized = phoneNumber.replace(/[^0-9]/g, "");
  if (normalized.length < 7) throw new Error("Invalid phone number");

  // Build candidate list: original, without leading zero, with 972 prefix
  const candidates = [normalized];
  if (normalized.startsWith("0")) {
    const withoutZero = normalized.slice(1);
    candidates.push("972" + withoutZero);
    candidates.push(withoutZero);
  }

  const meta = await sock.groupMetadata(groupJid);
  if (!meta?.participants) throw new Error("Could not fetch group metadata");

  // Helper: check if a phone matches our candidates
  const phoneMatches = (phone) => candidates.includes(phone) || candidates.some(c => phone.endsWith(c) && c.length >= 7);

  for (const p of meta.participants) {
    const rawId = p.id || p.jid || "";
    const isLidId = rawId.includes("@lid");
    const phoneJid = p.jid || (!isLidId ? rawId : null);
    const lidJid = p.lid || (isLidId ? rawId : null);

    // Direct phone match (when participant has phone JID)
    if (phoneJid && !phoneJid.includes("@lid")) {
      const pPhone = phoneJid.split("@")[0];
      if (phoneMatches(pPhone)) {
        const name = p.notify || p.verifiedName || p.name || await resolveContactName(pPhone);
        console.log(`[WebVote] Phone match: ${pPhone}, name: ${name || "(none)"}`);
        return { found: true, name, jid: phoneJid, phone: pPhone };
      }
    }

    // LID-based match: look up mapped phone from LID
    const lidKey = lidJid || (isLidId ? rawId : null);
    if (lidKey) {
      const mappedPhone = lidToPhone.get(lidKey)
        || lidToPhone.get(lidKey.replace("@lid", ""))
        || lidToPhone.get(lidKey.replace("@lid", "@s.whatsapp.net"));
      if (mappedPhone && phoneMatches(mappedPhone)) {
        const name = p.notify || p.verifiedName || p.name || await resolveContactName(mappedPhone);
        console.log(`[WebVote] LID match: ${lidKey} -> phone ${mappedPhone}, name: ${name || "(none)"}`);
        return { found: true, name, jid: mappedPhone + "@s.whatsapp.net", phone: mappedPhone };
      }
    }
  }

  // Fallback: scan lidToPhone map for the phone, verify membership
  for (const [lid, phone] of lidToPhone.entries()) {
    if (!phoneMatches(phone)) continue;
    const isInGroup = meta.participants.some(p => {
      const pId = (p.id || p.jid || "").split("@")[0];
      const pLid = (p.lid || "").split("@")[0];
      const lidNum = lid.split("@")[0];
      return pId === lidNum || pLid === lidNum;
    });
    if (isInGroup) {
      const name = await resolveContactName(phone);
      console.log(`[WebVote] Fallback match: ${lid} -> phone ${phone}, name: ${name || "(none)"}`);
      return { found: true, name, jid: phone + "@s.whatsapp.net", phone };
    }
  }

  return { found: false };
}

async function logoutWhatsApp() {
  try {
    if (sock) {
      await sock.logout();
    }
  } catch (e) {
    console.log("[WA] Logout call error (expected):", e.message);
  }
  try {
    const fs = require("fs");
    if (fs.existsSync(AUTH_DIR)) {
      const files = fs.readdirSync(AUTH_DIR);
      for (const file of files) {
        fs.rmSync(path.join(AUTH_DIR, file), { recursive: true, force: true });
      }
      console.log("[WA] Auth info cleared after logout");
    }
  } catch (e) {
    console.error("[WA] Error clearing auth on logout:", e.message);
  }
  connectionState = "disconnected";
  isOnline = false;
  lastQrBase64 = null;
  pairingCodeRequested = false;
  lastPairingPhone = null;
  sock = null;
  if (ioRef) {
    ioRef.emit("connection_status", { status: "disconnected" });
  }
  console.log("[WA] Logged out and disconnected");
  setTimeout(() => {
    if (ioRef && prismaRef) initWhatsApp(ioRef, prismaRef);
  }, 3000);
}

function getAllContacts() {
  return { contactNames: Object.fromEntries(contactNames), lidToPhone: Object.fromEntries(lidToPhone) };
}

function getAdminPhone() {
  const s = getSock();
  if (!s?.user?.id) return null;
  return s.user.id.split(":")[0].replace("@s.whatsapp.net", "");
}

module.exports = {
  initWhatsApp,
  getSock,
  getConnectionState,
  getLastQr,
  getAggregatedVotes,
  requestPairingCode,
  processVoteFromUpsert,
  getContactName,
  jidToPhone,
  loadGroupParticipantNames,
  logoutWhatsApp,
  checkGroupMembership,
  getAllContacts,
  resolveContactName,
  getAdminPhone,
};
