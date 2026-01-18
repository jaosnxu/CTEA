#!/usr/bin/env tsx
/**
 * Register Initial Audit Event
 *
 * Registers the M3.4-GLOBAL-COMP-002A-PH3-INIT audit event
 * This creates the genesis record in the audit chain
 */

import { PrismaClient } from "@prisma/client";
import { AuditLogService } from "../server/src/services/audit-log-service";
import "dotenv/config";

// Prisma 7.x uses adapter pattern
const prisma = new PrismaClient();
const auditLogService = new AuditLogService(prisma);

async function main() {
  try {
    console.log("🔐 Registering Initial Audit Event");
    console.log("===================================\n");

    // Check if event already exists
    const existing = await prisma.auditLog.findFirst({
      where: { eventId: "M3.4-GLOBAL-COMP-002A-PH3-INIT" },
    });

    if (existing) {
      console.log("✅ Audit event already registered");
      console.log(`   Event ID: ${existing.eventId}`);
      console.log(`   Created At: ${existing.createdAt.toISOString()}`);
      console.log(`   SHA-256 Hash: ${existing.sha256Hash}`);
      return;
    }

    // Register the initial audit event
    await auditLogService.registerAuditEvent("M3.4-GLOBAL-COMP-002A-PH3-INIT", {
      tableName: "_system",
      recordId: "database_initialization",
      action: "INSERT",
      diffAfter: {
        event: "M3.4-GLOBAL-COMP-002A-PH3-INIT",
        type: "db_migration_initialization",
        description: "MySQL + Prisma database initialization completed",
        tables_migrated: 74,
        enums_created: 24,
        migration_id: "20260112124722_init_schema",
        migration_sha256:
          "390dc21de1f1c3b7a5eefa5f3c209548d4723be389378046ab08a49009240f38",
        compliance: {
          "M3.4-GLOBAL-STANDARD-001": "compliant",
          "M3.4-GLOBAL-COMP-002A": "compliant",
        },
      },
      operatorType: "SYSTEM",
      operatorName: "TEA Internal Audit Team",
      reason: "Database initialization and audit chain genesis",
    });

    console.log("✅ Initial audit event registered successfully!");
    console.log("   Event ID: M3.4-GLOBAL-COMP-002A-PH3-INIT");
    console.log("   Type: db_migration_initialization");
    console.log("   Status: Genesis record created");

    // Verify the audit chain
    console.log("\n🔍 Verifying audit chain...");
    const result = await auditLogService.validateAuditChain();

    if (result.isValid) {
      console.log("✅ Audit chain validation: PASSED");
      console.log(`   Total records: ${result.totalRecords}`);
    } else {
      console.log("❌ Audit chain validation: FAILED");
      console.log(`   Errors: ${result.errorRecords.length}`);
    }
  } catch (error) {
    console.error("❌ Failed to register audit event:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
