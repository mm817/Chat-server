const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const ROOM = "global";
let connectedUsers = 0;
const MAX_USERS = 5;
let participants = [];

io.on("connection", (socket) => {
  if (connectedUsers >= MAX_USERS) {
    socket.emit("message", "❌ Room is full (only 5 users allowed).");
    socket.disconnect();
    return;
  }

  connectedUsers++;

  socket.on("setName", (name) => {
    socket.nickname = name || "Anonymous";
    participants.push(socket.nickname);

    socket.join(ROOM);
    io.to(ROOM).emit("message", `✅ ${socket.nickname} joined.`);
    io.to(ROOM).emit("participants", participants);
  });

  socket.on("sendMessage", (msg) => {
    if (socket.nickname) {
      io.to(ROOM).emit("message", `${socket.nickname}: ${msg}`);
      io.to(ROOM).emit("typing", { user: socket.nickname, typing: false });
    }
  });

  socket.on("typing", (isTyping) => {
    if (socket.nickname) {
      socket.to(ROOM).emit("typing", { user: socket.nickname, typing: isTyping });
    }
  });

  socket.on("voice", (data) => {
    io.to(ROOM).emit("voice", data);
  });

  socket.on("disconnect", () => {
    if (socket.nickname) {
      connectedUsers--;
      participants = participants.filter((u) => u !== socket.nickname);

      io.to(ROOM).emit("message", `⚠️ ${socket.nickname} left.`);
      io.to(ROOM).emit("participants", participants);
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));