
import type { Request, Response } from "express";
import { and, eq, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { inventory, products } from "../db/schema.js";

// CONSTANTS
const MAX_STOCK = 2147483647;

// STOCK QUANTITY VALIDATION
const numericInput = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }

    return value;
  },
  z.number().finite(),
);

// ADD STOCK VALIDATION
const addStockSchema = z.object({
  quantity: numericInput.refine(
    (value) =>
      Number.isSafeInteger(value) &&
      value > 0 &&
      value <= MAX_STOCK,
    "Stock quantity must be a positive whole number.",
  ),
});

// ADJUST STOCK VALIDATION
const adjustStockSchema = z.object({
  newQuantity: numericInput.refine(
    (value) =>
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value <= MAX_STOCK,
    "Stock quantity must be a non-negative whole number.",
  ),
});

// VALIDATE PRODUCT ID
function getValidProductId(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// GET ALL INVENTORY RECORDS
export const getInventory = async (_req: Request, res: Response) => {
  try {
    const inventoryData = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        productName: products.productName,
        category: products.category,
        currentStock: inventory.currentStock,
        reorderLevel: inventory.reorderLevel,
        lastUpdated: inventory.lastUpdated,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id));

    return res.status(200).json({
      success: true,
      message: "Inventory records retrieved successfully!",
      data: inventoryData,
    });
  } catch (error) {
    console.error("Error retrieving inventory:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve inventory records.",
    });
  }
};

// ADD STOCK TO EXISTING INVENTORY
export const addStock = async (req: Request, res: Response) => {
  try {
    const productId = getValidProductId(req.params.productId);

    if (productId === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const validation = addStockSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid stock quantity.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { quantity } = validation.data;

    // UPDATE STOCK ATOMICALLY
    const [updatedInventory] = await db
      .update(inventory)
      .set({
        currentStock: sql`${inventory.currentStock} + ${quantity}`,
        lastUpdated: new Date(),
      })
      .where(
        and(
          eq(inventory.productId, productId),
          lte(inventory.currentStock, MAX_STOCK - quantity),
        ),
      )
      .returning();

    if (!updatedInventory) {
      const [existingInventory] = await db
        .select({ id: inventory.id })
        .from(inventory)
        .where(eq(inventory.productId, productId))
        .limit(1);

      if (!existingInventory) {
        return res.status(404).json({
          success: false,
          message: "Inventory record not found for this product.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Adding this quantity would exceed the maximum stock limit.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Stock added successfully!",
      data: updatedInventory,
    });
  } catch (error) {
    console.error("Error adding stock:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add stock.",
    });
  }
};

// ADJUST STOCK QUANTITY
export const adjustStock = async (req: Request, res: Response) => {
  try {
    const productId = getValidProductId(req.params.productId);

    if (productId === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const validation = adjustStockSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid stock quantity.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { newQuantity } = validation.data;

    const [updatedInventory] = await db
      .update(inventory)
      .set({
        currentStock: newQuantity,
        lastUpdated: new Date(),
      })
      .where(eq(inventory.productId, productId))
      .returning();

    if (!updatedInventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory record not found for this product.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inventory stock adjusted successfully!",
      data: updatedInventory,
    });
  } catch (error) {
    console.error("Error adjusting stock:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to adjust inventory stock.",
    });
  }
};
