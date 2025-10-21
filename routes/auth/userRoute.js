import express from "express";
import { forgotPassword, login, logout, refresh, resetPassword, signup } from "../../controllers/auth/userController.js";

const userRouter = express.Router();


userRouter.post('/signup', signup);
userRouter.post('/login', login);
userRouter.post('/refresh', refresh);
userRouter.post('/logout', logout);

userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/reset-password', resetPassword);
export default userRouter;