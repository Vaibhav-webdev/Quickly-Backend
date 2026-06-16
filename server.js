import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";

import http from "http";
import { Server } from "socket.io";

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

    socket.join(roomId)
    socket.to(roomId).emit("isOnline", roomId)
  });

  // receive message
  socket.on("message", (data) => {
  const { roomId } = data;

  socket.to(roomId).emit("message", data);
});

  socket.on("typing", (data) => {
    socket.broadcast.emit("typing", data);
  });

  socket.on("stopTyping", (data) => {
    socket.broadcast.emit("stopTyping", data);
  });

  socket.on("send_image", async (data) => {
    socket.broadcast.emit("send_image", data);

  });
  socket.on("leave_room", (data) => {
    const { roomId } = data;
    socket.leave(roomId); // 🔥 User room se bahaar nikal jayega
    socket.to(roomId).emit("isOffline", roomId)
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
  });

});

// IMPORTANT
server.listen(process.env.PORT, () => {
  console.log(`Server running on localhost:${process.env.PORT}`);
});