
import { Router } from "express";

import {
  login,
  getCurrentAdmin,
  logout,
} from "../controllers/auth-controller.js";

const router = Router();

// Admin login
router.post("/login", login);

// Get current authenticated admin
router.get("/me", getCurrentAdmin);

// Admin logout
router.post("/logout", logout);

export default router;
