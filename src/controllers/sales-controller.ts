
import type { Request, Response } from "express";
import { and, eq, gte, sql, desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import {
  sales,
  customers,
  products,
  inventory,
  transactions,
} from "../db/schema.js";

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

// SALE VALIDATION
const saleSchema = z.object({
  customerId: numericInput.refine(
    (value) => Number.isSafeInteger(value) && value > 0,
    "Please select a valid customer.",
  ),

  productId: numericInput.refine(
    (value) => Number.isSafeInteger(value) && value > 0,
    "Please select a valid product.",
  ),

  quantity: numericInput.refine(
    (value) =>
      Number.isSafeInteger(value) &&
      value > 0 &&
      value <= 2147483647,
    "Quantity must be a positive whole number.",
  ),

  paymentMethod: z.enum([
    "Cash",
    "GCash",
    "Bank Transfer",
    "Credit",
  ]),

  amountPaid: numericInput.refine(
    (value) =>
      value >= 0 &&
      value <= 9999999999.99,
    "Please enter a valid payment amount.",
  ),
});

// CUSTOM HTTP ERROR
class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// DETERMINE PAYMENT STATUS
function getPaymentStatus(
  amountPaid: number,
  totalAmount: number,
): "Pending" | "Partial" | "Paid" {
  if (amountPaid <= 0) {
    return "Pending";
  }

  if (amountPaid >= totalAmount) {
    return "Paid";
  }

  return "Partial";
}

// GET ALL SALES
export const getSales = async (_req: Request, res: Response) => {
  try {
    // Retrieve each sale only once.
    const salesData = await db
      .select({
        id: sales.id,
        customerId: sales.customerId,
        customerName: customers.customerName,
        productId: sales.productId,
        productName: products.productName,
        unitPrice: products.unitPrice,
        quantity: sales.quantity,
        totalAmount: sales.totalAmount,
        saleDate: sales.saleDate,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(products, eq(sales.productId, products.id))
      .orderBy(desc(sales.createdAt));

    // Retrieve all payment records.
    const transactionData = await db
      .select({
        saleId: transactions.saleId,
        paymentMethod: transactions.paymentMethod,
        paymentStatus: transactions.paymentStatus,
        amountPaid: transactions.amountPaid,
        transactionDate: transactions.transactionDate,
      })
      .from(transactions);

    // Group payments by sale.
    const paymentsBySale = new Map<
      number,
      typeof transactionData
    >();

    for (const transaction of transactionData) {
      const existing =
        paymentsBySale.get(transaction.saleId) ?? [];

      existing.push(transaction);

      paymentsBySale.set(transaction.saleId, existing);
    }

    // Calculate payment totals and statuses.
    const formattedSales = salesData.map((sale) => {
      const salePayments = (
        paymentsBySale.get(sale.id) ?? []
      ).sort(
        (a, b) =>
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime(),
      );

      // Exclude refunded payments from the paid amount.
      const amountPaid = salePayments.reduce(
        (total, payment) => {
          if (payment.paymentStatus === "Refunded") {
            return total;
          }

          return total + Number(payment.amountPaid);
        },
        0,
      );

      const totalAmount = Number(sale.totalAmount);

      const hasRefund = salePayments.some(
        (payment) => payment.paymentStatus === "Refunded",
      );

      const remainingBalance = Math.max(
        0,
        Number((totalAmount - amountPaid).toFixed(2)),
      );

      const paymentStatus = hasRefund
        ? "Refunded"
        : getPaymentStatus(amountPaid, totalAmount);

      const latestPayment = salePayments[0];

      return {
        ...sale,
        totalAmount,
        amountPaid: Number(amountPaid.toFixed(2)),
        remainingBalance,
        paymentMethod: latestPayment?.paymentMethod ?? "Cash",
        paymentStatus,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Sales records retrieved successfully!",
      data: formattedSales,
    });
  } catch (error) {
    console.error("Error retrieving sales:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve sales records.",
    });
  }
};

// CREATE SALE
export const createSale = async (req: Request, res: Response) => {
  try {
    const validation = saleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale information.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const {
      customerId,
      productId,
      quantity,
      paymentMethod,
      amountPaid,
    } = validation.data;

    // GET CURRENT DATE IN PHILIPPINES
    const saleDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const result = await db.transaction(async (tx) => {
      // CHECK CUSTOMER
      const [customer] = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1);

      if (!customer) {
        throw new HttpError("Customer not found.", 404);
      }

      // CHECK PRODUCT
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        throw new HttpError("Product not found.", 404);
      }

      // CHECK INVENTORY
      const [stockRecord] = await tx
        .select()
        .from(inventory)
        .where(eq(inventory.productId, productId))
        .limit(1);

      if (!stockRecord) {
        throw new HttpError(
          `Inventory record for ${product.productName} not found.`,
          404,
        );
      }

      if (stockRecord.currentStock < quantity) {
        throw new HttpError(
          `Not enough stock for ${product.productName}. Available stock: ${stockRecord.currentStock}.`,
          400,
        );
      }

      // CALCULATE TOTAL AMOUNT
      const unitPrice = Number(product.unitPrice);

      const totalAmount =
        Math.round(unitPrice * quantity * 100) / 100;

      if (
        !Number.isFinite(totalAmount) ||
        totalAmount <= 0 ||
        totalAmount > 9999999999.99
      ) {
        throw new HttpError("Invalid sale amount.", 400);
      }

      // VALIDATE INITIAL PAYMENT
      if (amountPaid > totalAmount) {
        throw new HttpError(
          "The initial payment cannot exceed the total sale amount.",
          400,
        );
      }

      const roundedAmountPaid =
        Math.round(amountPaid * 100) / 100;

      const remainingBalance = Number(
        (totalAmount - roundedAmountPaid).toFixed(2),
      );

      // DETERMINE INITIAL PAYMENT STATUS
      const paymentStatus = getPaymentStatus(
        roundedAmountPaid,
        totalAmount,
      );

      // DEDUCT STOCK SAFELY
      const updatedStock = await tx
        .update(inventory)
        .set({
          currentStock: sql`${inventory.currentStock} - ${quantity}`,
          lastUpdated: new Date(),
        })
        .where(
          and(
            eq(inventory.productId, productId),
            gte(inventory.currentStock, quantity),
          ),
        )
        .returning();

      if (updatedStock.length === 0) {
        throw new HttpError(
          `Not enough stock for ${product.productName}.`,
          400,
        );
      }

      // CREATE ONE SALE RECORD FOR ONE PRODUCT
      const [createdSale] = await tx
        .insert(sales)
        .values({
          customerId,
          productId,
          quantity,
          totalAmount: totalAmount.toFixed(2),
          saleDate,
        })
        .returning();

      // CREATE INITIAL PAYMENT TRANSACTION
      const [createdTransaction] = await tx
        .insert(transactions)
        .values({
          saleId: createdSale.id,
          paymentMethod,
          paymentStatus,
          amountPaid: roundedAmountPaid.toFixed(2),
        })
        .returning();

      return {
        sales: [createdSale],
        transaction: createdTransaction,
        paymentSummary: {
          totalAmount,
          amountPaid: roundedAmountPaid,
          remainingBalance,
          paymentStatus,
        },
      };
    });

    return res.status(201).json({
      success: true,
      message: "Sale recorded successfully!",
      data: result,
    });
  } catch (error) {
    console.error("Error creating sale:", error);

    const statusCode =
      error instanceof HttpError ? error.statusCode : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        error instanceof HttpError
          ? error.message
          : "Failed to record sale.",
    });
  }
};
