
import { Router } from "express";
import {
  getInventory,
  addStock,
  adjustStock,
} from "../controllers/inventory-controller.js";

const router = Router();

// Get all inventory records
router.get("/", getInventory);

// Add stock
router.post("/:productId/stock-in", addStock);

// Adjust stock quantity
router.patch("/:productId/adjust", adjustStock);

export default router;
