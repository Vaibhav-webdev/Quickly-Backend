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
app.use("/api", userRoutes);

// socket connection
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // receive message
  socket.on("message", (data) => {
    console.log("Message:", data);

    // send to all users
    io.emit("message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected");
  });
});

// IMPORTANT
server.listen(process.env.PORT, () => {
  console.log(`Server running on localhost:${process.env.PORT}`);
});