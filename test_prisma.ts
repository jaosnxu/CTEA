import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.auditLog.count();
  console.log(`Audit logs: ${count}`);
}

main().then(() => prisma.$disconnect());
