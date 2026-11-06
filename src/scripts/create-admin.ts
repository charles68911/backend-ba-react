
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcrypt";
import { eq, or } from "drizzle-orm";

import { db, pool } from "../db/index.js";
import { admins } from "../db/schema.js";

const rl = createInterface({
  input: stdin,
  output: stdout,
});

async function createAdmin() {
  try {
    console.log("\n=== Create Administrator Account ===\n");

    const name = (await rl.question("Administrator name: ")).trim();
    const username = (
      await rl.question("Username: ")
    ).trim().toLowerCase();
    const email = (
      await rl.question("Email: ")
    ).trim().toLowerCase();
    const password = await rl.question("Password: ");

    if (!name || !username || !email || !password) {
      throw new Error("All fields are required.");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const [existingAdmin] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(
        or(
          eq(admins.username, username),
          eq(admins.email, email),
        ),
      )
      .limit(1);

    if (existingAdmin) {
      throw new Error(
        "An administrator with this username or email already exists.",
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.insert(admins).values({
      name,
      username,
      email,
      passwordHash,
      role: "Administrator",
    });

    console.log("\nAdministrator account created successfully!");
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log("Role: Administrator");
    console.log("Password: Securely hashed and saved.");
  } catch (error) {
    console.error(
      "\nFailed to create administrator:",
      error instanceof Error ? error.message : error,
    );

    process.exitCode = 1;
  } finally {
    rl.close();
    await pool.end();
  }
}

createAdmin();
