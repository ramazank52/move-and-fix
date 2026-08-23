import "./load-env.js";

import { readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

async function main() {
  const migrationPath = process.argv[2];
  if (!migrationPath) throw new Error("Usage: pnpm tsx scripts/apply-manual-migration.ts <migration.sql>");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const fromArgument = process.argv.find((argument) => argument.startsWith("--from="));
  const fromStatement = fromArgument ? Number.parseInt(fromArgument.slice("--from=".length), 10) : 1;
  if (!Number.isInteger(fromStatement) || fromStatement < 1) throw new Error("--from must be a positive statement number");

  const raw = await readFile(path.resolve(migrationPath), "utf8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.replace(/^--.*$/gm, "").trim().length > 0);

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    for (const [index, statement] of statements.entries()) {
      if (index + 1 < fromStatement) continue;
      try {
        await connection.query(statement);
        console.log(`manual-migration: applied statement ${index + 1}/${statements.length}`);
      } catch (error) {
        const preview = statement.replace(/\s+/g, " ").slice(0, 240);
        throw new Error(`manual-migration failed at statement ${index + 1}/${statements.length}: ${preview}\n${String(error)}`);
      }
    }
  } finally {
    await connection.end();
  }
}

void main();
