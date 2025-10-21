import express from "express"

import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import { connectDb } from "./db/database.js";
import jwt from "jsonwebtoken"
import userRouter from "./routes/auth/userRoute.js";

connectDb();

///**********   ROUTES   ******** */



dotenv.config();

const app = express();

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

// Error handling
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ status: false, message: "Internal server error" });
});





// Start server
const port = process.env.PORT || 8080;

app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);

})
































