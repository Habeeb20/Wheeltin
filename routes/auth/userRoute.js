import express from "express";
import { login, logout, refresh, signup } from "../../controllers/auth/userController.js";

const userRouter = express.Router();


userRouter.post('/signup', signup);
userRouter.post('/login', login);
userRouter.post('/refresh', refresh);
userRouter.post('/logout', logout);


export default userRouter;