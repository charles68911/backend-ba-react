
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { admins } from "../db/schema.js";
import { ENV } from "../config/env.js";

const COOKIE_NAME = "cs_auth_token";

const cookieOptions = {
  httpOnly: true,
  secure: ENV.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

// ADMIN LOGIN
export async function login(req: Request, res: Response) {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required.",
      });
    }

    const { identifier, password } = validation.data;
    const normalizedIdentifier = identifier.toLowerCase();

    const [admin] = await db
      .select()
      .from(admins)
      .where(
        or(
          eq(admins.username, normalizedIdentifier),
          eq(admins.email, normalizedIdentifier),
        ),
      )
      .limit(1);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      admin.passwordHash,
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password.",
      });
    }

    const token = jwt.sign(
      { role: admin.role },
      ENV.JWT_SECRET,
      {
        subject: String(admin.id),
        expiresIn: "1d",
      },
    );

    // Session cookie: no persistent maxAge.
    res.cookie(COOKIE_NAME, token, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: {
          id: String(admin.id),
          name: admin.name,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to sign in. Please try again.",
    });
  }
}

// GET CURRENTLY AUTHENTICATED ADMIN
export async function getCurrentAdmin(req: Request, res: Response) {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated.",
      });
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);

    if (typeof decoded === "string" || !decoded.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const adminId = Number(decoded.sub);

    if (!Number.isInteger(adminId) || adminId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const [admin] = await db
      .select({
        id: admins.id,
        name: admins.name,
        username: admins.username,
        email: admins.email,
        role: admins.role,
      })
      .from(admins)
      .where(eq(admins.id, adminId))
      .limit(1);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Administrator account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          ...admin,
          id: String(admin.id),
        },
      },
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: "Your session has expired. Please sign in again.",
    });
  }
}

// ADMIN LOGOUT
export function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Logout successful.",
  });
}

