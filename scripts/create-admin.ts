
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as readline from "node:readline";
import { stdin, stdout } from "node:process";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Password input terminal-এ দেখাবে না
function askPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    stdout.write(question);

    let password = "";

    const onData = (buffer: Buffer) => {
      for (const char of buffer.toString()) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          stdout.write("\n");
          resolve(password);
          return;
        }

        if (char === "\u0003") {
          stdin.setRawMode?.(false);
          process.exit(130);
        }

        if (char === "\u007f" || char === "\b") {
          password = password.slice(0, -1);
        } else if (char >= " ") {
          password += char;
        }
      }
    };

    if (stdin.isTTY && stdin.setRawMode) {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.on("data", onData);
    } else {
      // Non-interactive terminal fallback
      const rl = readline.createInterface({
        input: stdin,
        output: stdout,
      });
      rl.question("", (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    email.length <= 255;
}

async function main(): Promise<void> {
  try {
    console.log("\n=== Rover UGCK Admin Creator ===\n");

    const existingAdminCount = await prisma.admin.count();
    if (existingAdminCount > 0) {
      throw new Error("Admin account আগে থেকেই আছে। নতুন Sub-Admin কেবল Super Admin dashboard থেকে তৈরি করুন।");
    }

    const name =
      process.env.ADMIN_NAME?.trim() ||
      (await ask("Admin name: "));

    const email = (
      process.env.ADMIN_EMAIL?.trim() ||
      (await ask("Admin email: "))
    ).toLowerCase();

    const password =
      process.env.ADMIN_PASSWORD ||
      (await askPassword("Admin password: "));

    if (name.length < 2 || name.length > 100) {
      throw new Error("Name must be 2–100 characters.");
    }

    if (!isValidEmail(email)) {
      throw new Error("Please enter a valid email address.");
    }

    if (password.length < 8 || password.length > 128) {
      throw new Error("Password must be 8–128 characters.");
    }

    const existing = await prisma.admin.findUnique({
      where: { email },
    });

    if (existing) {
      throw new Error(
        "An Admin with this email already exists. No account was created."
      );
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        passwordHash,
        isSuperAdmin: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    console.log("\nAdmin created successfully!");
    console.log("ID:", admin.id);
    console.log("Name:", admin.name);
    console.log("Email:", admin.email);
    console.log("Created:", admin.createdAt.toISOString());
    console.log("\nKeep your password private.");
  } catch (error) {
    console.error(
      "\nAdmin creation failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
