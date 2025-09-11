const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const bcrypt = require("bcrypt");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

const USERS_FILE = "users.json";

// ✅ Ensure users.json exists
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
}
let users = JSON.parse(fs.readFileSync(USERS_FILE));

// Save users to file
function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// --- AUTH API ---
// Register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.status(400).json({ error: "Username already exists" });

  const hashed = await bcrypt.hash(password, 10);
  users[username] = hashed;
  saveUsers();
  res.json({ success: true });
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!users[username]) return res.status(400).json({ error: "User not found" });

  const match = await bcrypt.compare(password, users[username]);
  if (!match) return res.status(400).json({ error: "Wrong password" });

  res.json({ success: true });
});

// --- SOCKET.IO CHAT ---
const roomUsers = {}; // { roomId: [usernames...] }

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("joinRoom", ({ room, username }) => {
    socket.join(room);
    socket.username = username;
    socket.room = room;

    if (!roomUsers[room]) roomUsers[room] = [];
    roomUsers[room].push(username);

    // Notify room
    io.to(room).emit("message", {
      user: "System",
      text: `${username} joined ${room}`
    });

    // Send updated online users
    io.to(room).emit("onlineUsers", roomUsers[room]);
  });

  socket.on("chatMessage", (msg) => {
    io.to(socket.room).emit("message", {
      user: socket.username,
      text: msg
    });
  });

  socket.on("disconnect", () => {
    if (socket.room && socket.username) {
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