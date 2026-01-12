/**
 * Seed Admin Users
 *
 * Creates initial admin users for testing
 */

import { getPrismaClient } from "../server/src/db/prisma";
import bcrypt from "bcrypt";

async function main() {
  const prisma = getPrismaClient();

  console.log("🌱 Seeding admin users...");

  // Hash password
  const passwordHash = await bcrypt.hash("admin123", 10);

  // Create super admin
  const superAdmin = await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      email: "admin@chutea.com",
      name: {
        en: "Super Administrator",
        ru: "Супер Администратор",
        zh: "超级管理员",
      },
      role: "HQ_ADMIN",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(
    `✅ Created super admin: ${superAdmin.username} (${superAdmin.id})`
  );

  // Create org admin
  const orgAdmin = await prisma.adminUser.upsert({
    where: { username: "org_admin" },
    update: {},
    create: {
      username: "org_admin",
      passwordHash,
      email: "org_admin@chutea.com",
      name: {
        en: "Organization Administrator",
        ru: "Администратор Организации",
        zh: "组织管理员",
      },
      role: "ORG_ADMIN",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Created org admin: ${orgAdmin.username} (${orgAdmin.id})`);

  // Create store admin
  const storeAdmin = await prisma.adminUser.upsert({
    where: { username: "store_admin" },
    update: {},
    create: {
      username: "store_admin",
      passwordHash,
      email: "store_admin@chutea.com",
      name: {
        en: "Store Administrator",
        ru: "Администратор Магазина",
        zh: "门店管理员",
      },
      role: "STORE_MANAGER",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(
    `✅ Created store admin: ${storeAdmin.username} (${storeAdmin.id})`
  );

  console.log("\n🎉 Seeding completed!");
  console.log("\nTest credentials:");
  console.log("- Username: admin / Password: admin123 (Super Admin)");
  console.log("- Username: org_admin / Password: admin123 (Org Admin)");
  console.log("- Username: store_admin / Password: admin123 (Store Admin)");

  await prisma.$disconnect();
}

main().catch(error => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
