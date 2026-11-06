
import { Router } from "express";

import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customer-controller.js";

const router = Router();

// Get all customers
router.get("/", getCustomers);

// Add a customer
router.post("/", createCustomer);

// Update a customer
router.put("/:id", updateCustomer);

// Delete a customer
router.delete("/:id", deleteCustomer);

export default router;
