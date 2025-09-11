const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow Netlify frontend
    methods: ["GET", "POST"]
  }
});

let users = {}; // {username: password}
let rooms = {}; // {roomId: [usernames]}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Register
  socket.on("register", ({ username, password }, callback) => {
    if (users[username]) {
      return callback({ success: false, message: "Username already exists" });
    }
    users[username] = password;
    return callback({ success: true, message: "Registered successfully" });
  });

  // Login
  socket.on("login", ({ username, password }, callback) => {
    if (users[username] && users[username] === password) {
      socket.username = username;
      return callback({ success: true, message: "Login successful" });
    }
    return callback({ success: false, message: "Invalid username or password" });
  });

  // Join room
  socket.on("joinRoom", ({ roomId }, callback) => {
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.username);
    socket.join(roomId);

    io.to(roomId).emit("participants", rooms[roomId]);
    callback({ success: true, message: `Joined room ${roomId}` });
  });

  // Chat message
  socket.on("chatMessage", ({ roomId, message }) => {
    io.to(roomId).emit("chatMessage", { sender: socket.username, message });
  });

  // Typing
  socket.on("typing", ({ roomId }) => {
    socket.to(roomId).emit("typing", { user: socket.username });
  });

  // Disconnect
  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(u => u !== socket.username);
      io.to(roomId).emit("participants", rooms[roomId]);
    }
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));& socket.username) {
      // Remove user from room list
      roomUsers[socket.room] = roomUsers[socket.room].filter(
        (u) => u !== socket.username
      );

      io.to(socket.room).emit("message", {
        user: "System",
        text: `${socket.username} left`
      });

      // Update online users list
      io.to(socket.room).emit("onlineUsers", roomUsers[socket.room]);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));