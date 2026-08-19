import "./load-env.js";
import mysql from "mysql2/promise";
import { applyTurkeyGoldMasterSeed } from "../server/compliance/TrGoldMasterSeed";

async function main() {
  const actorUserId = Number(process.env.TR_GOLD_MASTER_SEED_ACTOR_USER_ID);
  if (!process.env.DATABASE_URL || !Number.isInteger(actorUserId) || actorUserId <= 0) {
    throw new Error("DATABASE_URL and TR_GOLD_MASTER_SEED_ACTOR_USER_ID are required; no default actor is permitted.");
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const result = await applyTurkeyGoldMasterSeed(connection, actorUserId);
    console.log(JSON.stringify(result));
  } finally {
    await connection.end();
  }
}

void main();
