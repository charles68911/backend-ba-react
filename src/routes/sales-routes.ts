
import { Router } from "express";
import {
  getSales,
  createSale,
} from "../controllers/sales-controller.js";

const router = Router();

// Get all sales records
router.get("/", getSales);

// Create a new sale
router.post("/", createSale);

export default router;
