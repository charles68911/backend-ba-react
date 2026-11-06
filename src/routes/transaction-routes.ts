
import { Router } from "express";

import {
  getTransactions,
  recordPayment,
  updatePaymentStatus,
} from "../controllers/transaction-controller.js";

const router = Router();

// Get all transaction records
router.get("/", getTransactions);

// Record an additional payment for an existing sale
router.post("/payment", recordPayment);

// Update transaction payment status
router.patch("/:id/status", updatePaymentStatus);

export default router;
