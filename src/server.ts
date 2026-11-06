import app from "./app.js";
import { ENV } from "./config/env.js";
import { pool } from "./db/index.js";

async function startServer() {
  try {
    await pool.query("SELECT NOW()");

    console.log("Successfully connected to Neon PostgreSQL!");

    app.listen(ENV.PORT, () => {
      console.log(`${ENV.APP_NAME} running at ${ENV.BACKEND_URL}`);
      console.log(`Environment: ${ENV.NODE_ENV}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

startServer();