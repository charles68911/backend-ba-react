
import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { ENV } from "../config/env.js";

export function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.cs_auth_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    const decoded = jwt.verify(
      token,
      ENV.JWT_SECRET,
    ) as JwtPayload & { role?: string };

    if (
      !decoded.sub ||
      decoded.role !== "Administrator"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Administrator access required.",
      });
    }

    res.locals.adminId = decoded.sub;
    res.locals.adminRole = decoded.role;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Your session is invalid or expired. Please log in again.",
    });
  }
}
