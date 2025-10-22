import express from "express"

import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import { connectDb } from "./db/database.js";
import jwt from "jsonwebtoken"
import { createServer } from "http";
import { setupChat } from "./controllers/Job/ReportController.js";
import { Server } from "socket.io";
import userRouter from "./routes/auth/userRoute.js";
import jobRouter from "./routes/job/jobRoutes.js";
import reportRouter from "./routes/job/reportRoutes.js";

connectDb();

///**********   ROUTES   ******** */



dotenv.config();

const app = express();

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://your-app.com",
        methods: ["GET", "POST"]
    }
});

// configureHelmet(app)

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});





// Middleware
app.use(express.json({ limit: "10mb" }));
app.use((req, res, next) => {
    req.io = io; 
    next();
});

app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(morgan("dev"));






// Routes
app.get("/", (req, res) => {
  res.send("Wheetin backend is listening on port....");
});



app.use("/api/auth", userRouter)
app.use("api/jobs", jobRouter)
app.use("/api/reports", reportRouter)

// Error handling
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ status: false, message: "Internal server error" });
});





// Start server
const PORT = process.env.PORT || 8080;

// app.listen(port, async () => {
//   console.log(`Server is running on port ${port}`);

// })


server.listen(PORT, () => console.log(`Server running on port ${PORT}`));














































