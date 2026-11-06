
import type { Request, Response } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { transactions, sales, customers } from "../db/schema.js";

// PAYMENT STATUS VALIDATION
const paymentStatusSchema = z.object({
  paymentStatus: z.enum([
    "Paid",
    "Pending",
    "Partial",
    "Refunded",
  ]),
});

// RECORD PAYMENT VALIDATION
const numericInput = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }

    return value;
  },
  z.number().finite(),
);

const recordPaymentSchema = z.object({
  saleId: numericInput.refine(
    (value) => Number.isSafeInteger(value) && value > 0,
    "Invalid sale ID.",
  ),

  paymentMethod: z.enum([
    "Cash",
    "GCash",
    "Bank Transfer",
    "Credit",
  ]),

  amountPaid: numericInput.refine(
    (value) =>
      value > 0 &&
      value <= 9999999999.99,
    "Payment amount must be greater than zero.",
  ),
});

// VALIDATE TRANSACTION ID
function getValidTransactionId(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
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

// GET ALL TRANSACTIONS
export const getTransactions = async (
  _req: Request,
  res: Response,
) => {
  try {
    const transactionData = await db
      .select({
        id: transactions.id,
        saleId: transactions.saleId,
        customerId: sales.customerId,
        customerName: customers.customerName,
        paymentMethod: transactions.paymentMethod,
        paymentStatus: transactions.paymentStatus,
        amountPaid: transactions.amountPaid,
        transactionDate: transactions.transactionDate,
      })
      .from(transactions)
      .leftJoin(sales, eq(transactions.saleId, sales.id))
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .orderBy(desc(transactions.transactionDate));

    return res.status(200).json({
      success: true,
      message: "Transactions retrieved successfully!",
      data: transactionData,
    });
  } catch (error) {
    console.error("Error retrieving transactions:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve transactions.",
    });
  }
};

// RECORD ADDITIONAL PAYMENT
export const recordPayment = async (
  req: Request,
  res: Response,
) => {
  try {
    const validation = recordPaymentSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment information.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { saleId, paymentMethod, amountPaid } = validation.data;

    const result = await db.transaction(async (tx) => {
      const [sale] = await tx
        .select()
        .from(sales)
        .where(eq(sales.id, saleId))
        .limit(1);

      if (!sale) {
        throw new HttpError("Sale not found.", 404);
      }

      const existingPayments = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.saleId, saleId));

      const hasRefund = existingPayments.some(
        (payment) => payment.paymentStatus === "Refunded",
      );

      if (hasRefund) {
        throw new HttpError(
          "Payments cannot be added to a refunded sale.",
          400,
        );
      }

      const currentAmountPaid = existingPayments.reduce(
        (total, payment) =>
          total + Number(payment.amountPaid),
        0,
      );

      const totalAmount = Number(sale.totalAmount);

      const currentBalance = Number(
        (totalAmount - currentAmountPaid).toFixed(2),
      );

      const roundedPayment =
        Math.round(amountPaid * 100) / 100;

      if (roundedPayment > currentBalance) {
        throw new HttpError(
          `Payment exceeds the remaining balance of ${currentBalance.toFixed(2)}.`,
          400,
        );
      }

      const newAmountPaid = Number(
        (currentAmountPaid + roundedPayment).toFixed(2),
      );

      const paymentStatus = getPaymentStatus(
        newAmountPaid,
        totalAmount,
      );

      const [createdTransaction] = await tx
        .insert(transactions)
        .values({
          saleId,
          paymentMethod,
          paymentStatus,
          amountPaid: roundedPayment.toFixed(2),
        })
        .returning();

      return {
        transaction: createdTransaction,
        paymentSummary: {
          saleId,
          totalAmount,
          previousAmountPaid: Number(
            currentAmountPaid.toFixed(2),
          ),
          currentPayment: roundedPayment,
          totalPaid: newAmountPaid,
          remainingBalance: Number(
            (totalAmount - newAmountPaid).toFixed(2),
          ),
          paymentStatus,
        },
      };
    });

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully!",
      data: result,
    });
  } catch (error) {
    console.error("Error recording payment:", error);

    const statusCode =
      error instanceof HttpError ? error.statusCode : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        error instanceof HttpError
          ? error.message
          : "Failed to record payment.",
    });
  }
};

// UPDATE TRANSACTION PAYMENT STATUS
export const updatePaymentStatus = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = getValidTransactionId(req.params.id);

    if (id === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID.",
      });
    }

    const validation = paymentStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { paymentStatus } = validation.data;

    const updatedTransaction = await db.transaction(async (tx) => {
      // FIND TRANSACTION
      const [transaction] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, id))
        .limit(1);

      if (!transaction) {
        throw new HttpError("Transaction not found.", 404);
      }

      let amountPaid = transaction.amountPaid;

      // COMPLETE THE REMAINING BALANCE WHEN MARKED AS PAID
      if (paymentStatus === "Paid") {
        const [sale] = await tx
          .select()
          .from(sales)
          .where(eq(sales.id, transaction.saleId))
          .limit(1);

        if (!sale) {
          throw new HttpError("Related sale not found.", 404);
        }

        const otherPayments = await tx
          .select()
          .from(transactions)
          .where(eq(transactions.saleId, transaction.saleId));

        const otherAmountPaid = otherPayments.reduce(
          (total, payment) => {
            if (
              payment.id === transaction.id ||
              payment.paymentStatus === "Refunded"
            ) {
              return total;
            }

            return total + Number(payment.amountPaid);
          },
          0,
        );

        const remainingBalance = Number(
          (Number(sale.totalAmount) - otherAmountPaid).toFixed(2),
        );

        if (remainingBalance <= 0) {
          throw new HttpError(
            "This sale has already been fully paid.",
            400,
          );
        }

        amountPaid = remainingBalance.toFixed(2);
      }

      const [updated] = await tx
        .update(transactions)
        .set({
          paymentStatus,
          amountPaid,
        })
        .where(eq(transactions.id, id))
        .returning();

      return updated;
    });

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully!",
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);

    const statusCode =
      error instanceof HttpError ? error.statusCode : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        error instanceof HttpError
          ? error.message
          : "Failed to update payment status.",
    });
  }
};
