import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";

const app = express();
dotenv.config(); // VERY IMPORTANT — upar rakho, sabse pehle
app.use(express.json());

// connect database
connectDB();

// routes
app.use("/api", userRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on localhost:${process.env.PORT}`);
});