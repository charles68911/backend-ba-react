
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { products, inventory, sales } from "../db/schema.js";

// NUMERIC INPUT VALIDATION
const numericInput = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }

    return value;
  },
  z.number().finite(),
);

// PRODUCT VALIDATION
const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required.").max(150),

  category: z.enum([
    "Fish",
    "Shellfish",
    "Crustaceans",
    "Processed",
    "Others",
  ]),

  price: numericInput.refine(
    (value) => value > 0 && value <= 99999999.99,
    "Selling price must be greater than zero and within the allowed limit.",
  ),

  cost: numericInput.refine(
    (value) => value >= 0 && value <= 99999999.99,
    "Cost price must be zero or higher and within the allowed limit.",
  ),

  stock: numericInput.refine(
    (value) =>
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 2147483647,
    "Stock must be a non-negative whole number.",
  ),

  reorderPoint: numericInput.refine(
    (value) =>
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 2147483647,
    "Reorder point must be a non-negative whole number.",
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

// CUSTOM HTTP ERROR
class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
  }
}

// GET ALL PRODUCTS
export const getProducts = async (_req: Request, res: Response) => {
  try {
    const productData = await db.select().from(products);

    return res.status(200).json({
      success: true,
      message: "Products retrieved successfully!",
      data: productData,
    });
  } catch (error) {
    console.error("Error retrieving products:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve products.",
    });
  }
};

// CREATE PRODUCT
export const createProduct = async (req: Request, res: Response) => {
  try {
    const validation = productSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid product information.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const {
      name,
      category,
      price,
      cost,
      stock,
      reorderPoint,
    } = validation.data;

    const result = await db.transaction(async (tx) => {
      const [newProduct] = await tx
        .insert(products)
        .values({
          productName: name,
          category,
          unitPrice: price.toFixed(2),
          costPrice: cost.toFixed(2),
        })
        .returning();

      const [newInventory] = await tx
        .insert(inventory)
        .values({
          productId: newProduct.id,
          currentStock: stock,
          reorderLevel: reorderPoint,
          lastUpdated: new Date(),
        })
        .returning();

      return {
        product: newProduct,
        inventory: newInventory,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Product added successfully!",
      data: result,
    });
  } catch (error) {
    console.error("Error creating product:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add product.",
    });
  }
};

// UPDATE PRODUCT
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const productId = getValidProductId(req.params.id);

    if (productId === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const validation = productSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid product information.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const {
      name,
      category,
      price,
      cost,
      stock,
      reorderPoint,
    } = validation.data;

    const result = await db.transaction(async (tx) => {
      const [updatedProduct] = await tx
        .update(products)
        .set({
          productName: name,
          category,
          unitPrice: price.toFixed(2),
          costPrice: cost.toFixed(2),
        })
        .where(eq(products.id, productId))
        .returning();

      if (!updatedProduct) {
        throw new HttpError("Product not found.", 404);
      }

      const [updatedInventory] = await tx
        .update(inventory)
        .set({
          currentStock: stock,
          reorderLevel: reorderPoint,
          lastUpdated: new Date(),
        })
        .where(eq(inventory.productId, productId))
        .returning();

      if (!updatedInventory) {
        const [newInventory] = await tx
          .insert(inventory)
          .values({
            productId,
            currentStock: stock,
            reorderLevel: reorderPoint,
            lastUpdated: new Date(),
          })
          .returning();

        return {
          product: updatedProduct,
          inventory: newInventory,
        };
      }

      return {
        product: updatedProduct,
        inventory: updatedInventory,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully!",
      data: result,
    });
  } catch (error) {
    console.error("Error updating product:", error);

    const statusCode =
      error instanceof HttpError ? error.statusCode : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        error instanceof HttpError
          ? error.message
          : "Failed to update product.",
    });
  }
};

// DELETE PRODUCT
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const productId = getValidProductId(req.params.id);

    if (productId === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    await db.transaction(async (tx) => {
      const [existingProduct] = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!existingProduct) {
        throw new HttpError("Product not found.", 404);
      }

      const [existingSale] = await tx
        .select({ id: sales.id })
        .from(sales)
        .where(eq(sales.productId, productId))
        .limit(1);

      if (existingSale) {
        throw new HttpError(
          "This product cannot be deleted because it has existing sales records.",
          409,
        );
      }

      await tx
        .delete(inventory)
        .where(eq(inventory.productId, productId));

      await tx
        .delete(products)
        .where(eq(products.id, productId));
    });

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting product:", error);

    const statusCode =
      error instanceof HttpError ? error.statusCode : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        error instanceof HttpError
          ? error.message
          : "Failed to delete product.",
    });
  }
};
