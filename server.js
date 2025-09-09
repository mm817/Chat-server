const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const ROOM = "global";
let connectedUsers = 0;
const MAX_USERS = 5;

io.on("connection", (socket) => {
  if (connectedUsers >= MAX_USERS) {
    socket.emit("message", "❌ Room is full (only 5 users allowed).");
    socket.disconnect();
    return;
  }

  connectedUsers++;
  socket.join(ROOM);

  io.to(ROOM).emit("message", `✅ A user joined. Total: ${connectedUsers}/5`);

  socket.on("sendMessage", (msg) => {
    io.to(ROOM).emit("message", msg);
  });

  socket.on("disconnect", () => {
    connectedUsers--;
    io.to(ROOM).emit("message", `⚠️ A user left. Total: ${connectedUsers}/5`);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));