
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { customers, sales } from "../db/schema.js";

// CUSTOMER VALIDATION
const customerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required.").max(150),
  type: z.string().trim().min(1, "Customer type is required.").max(50),
  address: z.string().trim().min(1, "Location is required.").max(150),
  contactNumber: z
    .string()
    .trim()
    .max(30, "Contact number must not exceed 30 characters.")
    .nullable()
    .optional(),
});

// VALIDATE CUSTOMER ID
function getValidCustomerId(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// GET ALL CUSTOMERS
export const getCustomers = async (_req: Request, res: Response) => {
  try {
    const customerData = await db.select().from(customers);

    return res.status(200).json({
      success: true,
      message: "Customers retrieved successfully!",
      data: customerData,
    });
  } catch (error) {
    console.error("Error retrieving customers:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve customers.",
    });
  }
};

// CREATE CUSTOMER
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const validation = customerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer information.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { name, type, address, contactNumber } = validation.data;

    const [newCustomer] = await db
      .insert(customers)
      .values({
        customerName: name,
        customerType: type,
        location: address,
        contactNumber: contactNumber || null,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Customer added successfully!",
      data: newCustomer,
    });
  } catch (error) {
    console.error("Error creating customer:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add customer.",
    });
  }
};

// UPDATE CUSTOMER
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const id = getValidCustomerId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const validation = customerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer information.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { name, type, address, contactNumber } = validation.data;

    const [updatedCustomer] = await db
      .update(customers)
      .set({
        customerName: name,
        customerType: type,
        location: address,
        contactNumber: contactNumber || null,
      })
      .where(eq(customers.id, id))
      .returning();

    if (!updatedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully!",
      data: updatedCustomer,
    });
  } catch (error) {
    console.error("Error updating customer:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer.",
    });
  }
};

// DELETE CUSTOMER
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const id = getValidCustomerId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const [existingCustomer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const [existingSale] = await db
      .select({ id: sales.id })
      .from(sales)
      .where(eq(sales.customerId, id))
      .limit(1);

    if (existingSale) {
      return res.status(409).json({
        success: false,
        message:
          "This customer cannot be deleted because they have existing sales records.",
      });
    }

    await db.delete(customers).where(eq(customers.id, id));

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting customer:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete customer.",
    });
  }
};
