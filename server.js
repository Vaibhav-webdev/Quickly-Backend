import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";

import http from "http";
import { Server } from "socket.io";
import { rootCertificates } from "tls";

dotenv.config();

const app = express();

// create http server
const server = http.createServer(app);

// create socket server
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(express.json());

// connect database
connectDB();

// normal routes
app.get('/', (req, res) => {
  res.send("<h2>Page Not Found!!</h2>")
})
app.use("/api", userRoutes);
// socket connection
io.on("connection", (socket) => {

  socket.on("join_room", ({ roomId }) => {
    socket.join(roomId);

    // Room ke baaki members ko batao ki ye user online aa gaya
    socket.to(roomId).emit("isOnline", roomId);

    // 🆕 Agar room mein already koi dusra user maujood hai, to isi naye joiner ko bhi batao
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    if (roomSockets && roomSockets.size > 1) {
      socket.emit("isOnline", roomId);
    }
  });

  // receive message
  socket.on("message", (data) => {
    const { roomId } = data;
    socket.to(roomId).emit("message", data);
  });

  // 🔧 ab room-scoped (pehle sabko broadcast ho raha tha)
  socket.on("typing", (data) => {
    const { roomId } = data;
    socket.to(roomId).emit("typing", data);
  });

  socket.on("stopTyping", (data) => {
    const { roomId } = data;
    socket.to(roomId).emit("stopTyping", data);
  });

  socket.on("send_image", async (data) => {
    const { roomId } = data;
    socket.to(roomId).emit("send_image", data);
  });

  socket.on("leave_room", (data) => {
    const { roomId } = data;
    socket.leave(roomId);
    socket.to(roomId).emit("isOffline", roomId);
  });

  // 🆕 "disconnecting" — disconnect se thik pehle fire hota hai, jab socket.rooms abhi bhi populated hote hain
  socket.on("disconnecting", () => {
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("isOffline", roomId);
      }
    });
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
  });

});

server.listen(process.env.PORT, () => {
  console.log(`Server running on localhost:${process.env.PORT}`);
});