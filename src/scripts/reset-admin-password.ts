
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

async function resetAdminPassword() {
  try {
    console.log("\n=== Reset Administrator Password ===\n");

    const identifier = (
      await rl.question("Administrator username or email: ")
    ).trim().toLowerCase();

    const newPassword = await rl.question("New password: ");
    const confirmPassword = await rl.question(
      "Confirm new password: ",
    );

    if (!identifier || !newPassword || !confirmPassword) {
      throw new Error("All fields are required.");
    }

    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const [admin] = await db
      .select({
        id: admins.id,
        username: admins.username,
        email: admins.email,
      })
      .from(admins)
      .where(
        or(
          eq(admins.username, identifier),
          eq(admins.email, identifier),
        ),
      )
      .limit(1);

    if (!admin) {
      throw new Error("Administrator account not found.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(admins)
      .set({ passwordHash })
      .where(eq(admins.id, admin.id));

    console.log("\nPassword reset successfully!");
    console.log(`Username: ${admin.username}`);
    console.log(`Email: ${admin.email}`);
    console.log("New password: Securely hashed and saved.");
  } catch (error) {
    console.error(
      "\nFailed to reset password:",
      error instanceof Error ? error.message : error,
    );

    process.exitCode = 1;
  } finally {
    rl.close();
    await pool.end();
  }
}

resetAdminPassword();
