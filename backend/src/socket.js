function setupSocketHandlers(io, prisma) {
  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    const { getConnectionState, getLastQr } = require("./whatsapp");
    const status = getConnectionState();
    socket.emit("connection_status", { status });

    const lastQr = getLastQr();
    if (lastQr && status === "waiting_for_qr") {
      socket.emit("qr_code_update", { qr: lastQr });
      console.log(`[Socket] Sent cached QR to ${socket.id}`);
    }

    socket.on("subscribe_to_poll", async (data) => {
      const { pollId } = data;
      if (!pollId) return;

      const currentRooms = [...socket.rooms].filter((r) => r !== socket.id);
      for (const room of currentRooms) {
        socket.leave(room);
      }

      socket.join(pollId);
      console.log(`[Socket] ${socket.id} joined room: ${pollId}`);

      try {
        const { getAggregatedVotes } = require("./whatsapp");
        const votes = await getAggregatedVotes(pollId, prisma);
        socket.emit("poll_vote_received", {
          pollId,
          votes,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error("[Socket] Error fetching initial votes:", e.message);
      }
    });

    socket.on("unsubscribe_from_poll", (data) => {
      const { pollId } = data;
      if (pollId) {
        socket.leave(pollId);
        console.log(`[Socket] ${socket.id} left room: ${pollId}`);
      }
    });

    socket.on("request_connection_status", () => {
      const { getConnectionState, getLastQr } = require("./whatsapp");
      const currentStatus = getConnectionState();
      socket.emit("connection_status", { status: currentStatus });
      const qr = getLastQr();
      if (qr && currentStatus === "waiting_for_qr") {
        socket.emit("qr_code_update", { qr });
      }
    });

    socket.on("request_pairing_code", async (data) => {
      const { phoneNumber } = data || {};
      try {
        const { requestPairingCode } = require("./whatsapp");
        const code = await requestPairingCode(phoneNumber);
        socket.emit("pairing_code_response", { success: true, code });
      } catch (err) {
        socket.emit("pairing_code_response", {
          success: false,
          error: err.message,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocketHandlers };
