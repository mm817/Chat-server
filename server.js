const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const MAX_USERS = 5;
const rooms = {}; // roomId -> [usernames]

const usersFile = path.join(__dirname, "users.json");

// Load users or create empty
let users = {};
if (fs.existsSync(usersFile)) {
  users = JSON.parse(fs.readFileSync(usersFile));
} else {
  fs.writeFileSync(usersFile, JSON.stringify({}));
}

io.on("connection", (socket) => {

  socket.on("joinRoom", ({ roomId, username, password }) => {
    if (!roomId || !username || !password) return;

    // Check username/password
    if (users[username]) {
      if (users[username] !== password) {
        socket.emit("loginError", "❌ Wrong password for this username");
        return;
      }
    } else {
      users[username] = password;
      fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    }

    if (!rooms[roomId]) rooms[roomId] = [];
    if (rooms[roomId].length >= MAX_USERS) {
      socket.emit("message", "❌ This room is full (max 5 users)");
      return;
    }

    socket.username = username;
    socket.roomId = roomId;
    rooms[roomId].push(username);
    socket.join(roomId);

    io.to(roomId).emit("message", `✅ ${username} joined room ${roomId}`);
    io.to(roomId).emit("participants", rooms[roomId]);
  });

  socket.on("sendMessage", (msg) => {
    if (socket.roomId && socket.username) {
      io.to(socket.roomId).emit("message", `${socket.username}: ${msg}`);
      io.to(socket.roomId).emit("typing", { user: socket.username, typing: false });
    }
  });

  socket.on("typing", (isTyping) => {
    if (socket.roomId && socket.username) {
      socket.to(socket.roomId).emit("typing", { user: socket.username, typing: isTyping });
    }
  });

  socket.on("voice", (data) => {
    if (socket.roomId) io.to(socket.roomId).emit("voice", data);
  });

  socket.on("disconnect", () => {
    if (socket.roomId && socket.username) {
      rooms[socket.roomId] = rooms[socket.roomId].filter(u => u !== socket.username);
      io.to(socket.roomId).emit("message", `⚠️ ${socket.username} left.`);
      io.to(socket.roomId).emit("participants", rooms[socket.roomId]);
      if (rooms[socket.roomId].length === 0) delete rooms[socket.roomId];
    }
  });

});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));