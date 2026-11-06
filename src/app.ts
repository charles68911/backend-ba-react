
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import hpp from "hpp";
import { doubleCsrf } from "csrf-csrf";

import { ENV } from "./config/env.js";

import customerRoutes from "./routes/customer-routes.js";
import productRoutes from "./routes/product-routes.js";
import salesRoutes from "./routes/sales-routes.js";
import transactionRoutes from "./routes/transaction-routes.js";
import inventoryRoutes from "./routes/inventory-routes.js";
import authRoutes from "./routes/auth-routes.js";

import { authenticateAdmin } from "./middlewares/auth-middlewares.js";

const app = express();

// SECURITY MIDDLEWARE
app.use(helmet());

app.use(
  cors({
    origin: ENV.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(hpp());

// CSRF CONFIGURATION
const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => ENV.CSRF_SECRET,

  getSessionIdentifier: (req) =>
    req.cookies?.cs_auth_token ?? "anonymous",

  cookieName: "cs_token",

  cookieOptions: {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },

  getCsrfTokenFromRequest: (req) =>
    req.headers["x-csrf-token"] as string | undefined,
});

// GET CSRF TOKEN
app.get("/api/csrf-token", (req, res) => {
  const csrfToken = generateCsrfToken(req, res);

  return res.status(200).json({
    success: true,
    csrfToken,
  });
});

// APPLY CSRF PROTECTION
app.use(doubleCsrfProtection);

// AUTH ROUTES
app.use("/api/auth", authRoutes);

// PROTECTED API ROUTES
app.use("/api/customers", authenticateAdmin, customerRoutes);
app.use("/api/products", authenticateAdmin, productRoutes);
app.use("/api/sales", authenticateAdmin, salesRoutes);
app.use("/api/transactions", authenticateAdmin, transactionRoutes);
app.use("/api/inventory", authenticateAdmin, inventoryRoutes);

// ROOT
app.get("/", (_req, res) => {
  res.status(200).json({
    status: "success",
    message: `${ENV.APP_NAME} is running`,
    timestamp: new Date().toISOString(),
  });
});

// HEALTH CHECK
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is healthy",
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;
