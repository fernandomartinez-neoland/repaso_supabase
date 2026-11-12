import express from "express";
import {
  registerUserController,
  loginUserController,
  getAllUsersController,
} from "../controllers/user.controller.js";
import { validateUserToken } from "../middleware/token.middleware.js";
import { roleMiddleware } from "../middleware/user.middleware.js";

const router = express.Router();

router.post("/register", registerUserController);
router.post("/login", loginUserController);
router.post("/getallusers", validateUserToken, roleMiddleware, getAllUsersController);

export default router;
