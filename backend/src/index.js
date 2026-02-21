const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const { initWhatsApp } = require("./whatsapp");
const { setupSocketHandlers } = require("./socket");
const apiRoutes = require("./routes/api");

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.set("io", io);
app.use("/api", apiRoutes(prisma));

setupSocketHandlers(io, prisma);

const PORT = process.env.BACKEND_PORT || 3001;

async function main() {
  try {
    await prisma.$connect();
    console.log("[DB] PostgreSQL connected via Prisma");

    server.listen(PORT, () => {
      console.log(`[Server] Listening on port ${PORT}`);
      initWhatsApp(io, prisma);
    });
  } catch (err) {
    console.error("[Fatal] Startup failed:", err);
    process.exit(1);
  }
}

main();

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
