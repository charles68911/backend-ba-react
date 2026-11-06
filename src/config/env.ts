
import "dotenv/config";

function getRequiredSecret(name: string): string {
  const value = process.env[name];

  if (!value || value.length < 32) {
    throw new Error(
      `${name} is missing or too short. Please configure it in your .env file.`,
    );
  }

  return value;
}

function getDatabaseUrl(): string {
  const value =
    process.env.DATABASE_URL_POOLED ||
    process.env.DATABASE_URL;

  if (!value) {
    throw new Error(
      "DATABASE_URL or DATABASE_URL_POOLED is missing. Please configure your database connection.",
    );
  }

  return value;
}

export const ENV = {
  APP_NAME: process.env.APP_NAME ?? "Central Seafoods Management API",
  PORT: Number(process.env.PORT ?? 7000),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  BACKEND_URL: process.env.BACKEND_URL ?? "http://localhost:7000",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",

  JWT_SECRET: getRequiredSecret("JWT_SECRET"),
  CSRF_SECRET: getRequiredSecret("CSRF_SECRET"),

  DATABASE_URL: process.env.DATABASE_URL ?? "",
  DATABASE_URL_POOLED: process.env.DATABASE_URL_POOLED ?? "",

  get DATABASE_CONNECTION_STRING() {
    return getDatabaseUrl();
  },
};
