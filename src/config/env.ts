import "dotenv/config";

export const ENV = {
  APP_NAME: process.env.APP_NAME ?? "Backend BA React API",
  PORT: Number(process.env.PORT ?? 7000),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  BACKEND_URL: process.env.BACKEND_URL ?? "http://localhost:7000",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
  JWT_SECRET: process.env.JWT_SECRET ?? "change_this_to_a_long_random_secret",
  CSRF_SECRET: process.env.CSRF_SECRET ?? "replace_with_a_separate_random_secret",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
};
