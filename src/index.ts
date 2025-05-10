import express from "express";
import userRouter from "./router/user";
import cors from "cors";
import { walletAuthMiddleware } from "./middleware";
const app = express();

app.use(express.json());
app.use(cors());

// Public routes
app.get("/", (req, res) => {
    res.send("Dair API");
});

// Authentication route (no middleware)
app.use("/api/v1/user/", userRouter);
app.use("/api/v1/user/verify-token", userRouter);

// Protected routes (require wallet authentication)
app.use("/api/v1/", walletAuthMiddleware, userRouter);

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});