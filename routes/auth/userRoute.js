import express from "express";
import { changePassword, dashboard, editProfile, forgotPassword, login, logout, refresh, resetPassword, signup } from "../../controllers/auth/userController.js";
import { authenticateToken } from "../../resources/functions.js";

const userRouter = express.Router();


userRouter.post('/signup', signup);
userRouter.post('/login', login);
userRouter.post('/refresh', refresh);
userRouter.post('/logout', logout);

userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/reset-password', resetPassword);

userRouter.post('/change-password', changePassword);
userRouter.put("/edit", editProfile)
userRouter.get('/dashboard', authenticateToken, dashboard); 
export default userRouter;