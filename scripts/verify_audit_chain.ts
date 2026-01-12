#!/usr/bin/env tsx
/**
 * Audit Chain Verification Script
 * 
 * Verifies the integrity of the SHA-256 audit chain
 * 
 * Usage:
 *   pnpm tsx scripts/verify_audit_chain.ts
 *   pnpm tsx scripts/verify_audit_chain.ts --from 2026-01-01 --to 2026-01-31
 *   pnpm tsx scripts/verify_audit_chain.ts --event-id M3.4-GLOBAL-COMP-002A-PH3-INIT
 */

import { PrismaClient } from '@prisma/client';
import { AuditLogService } from '../server/src/services/audit-log-service';
import 'dotenv/config';

// Prisma 7.x uses adapter pattern
const prisma = new PrismaClient();
const auditLogService = new AuditLogService(prisma);

interface VerifyOptions {
  fromDate?: Date;
  toDate?: Date;
  eventId?: string;
  orgId?: string;
}

async function parseArgs(): Promise<VerifyOptions> {
  const args = process.argv.slice(2);
  const options: VerifyOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--from':
        if (nextArg) {
          options.fromDate = new Date(nextArg);
          i++;
        }
        break;
      case '--to':
        if (nextArg) {
          options.toDate = new Date(nextArg);
          i++;
        }
        break;
      case '--event-id':
        if (nextArg) {
          options.eventId = nextArg;
          i++;
        }
        break;
      case '--org-id':
        if (nextArg) {
          options.orgId = nextArg;
          i++;
        }
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Audit Chain Verification Script

Usage:
  pnpm tsx scripts/verify_audit_chain.ts [options]

Options:
  --from <date>       Start date (YYYY-MM-DD)
  --to <date>         End date (YYYY-MM-DD)
  --event-id <id>     Specific event ID to verify
  --org-id <id>       Organization ID to filter
  --help, -h          Show this help message

Examples:
  # Verify entire chain
  pnpm tsx scripts/verify_audit_chain.ts

  # Verify specific date range
  pnpm tsx scripts/verify_audit_chain.ts --from 2026-01-01 --to 2026-01-31

  # Verify specific event
  pnpm tsx scripts/verify_audit_chain.ts --event-id M3.4-GLOBAL-COMP-002A-PH3-INIT

  # Verify specific organization
  pnpm tsx scripts/verify_audit_chain.ts --org-id org-123
  `);
}

async function verifySpecificEvent(eventId: string): Promise<void> {
  console.log(`🔍 Verifying specific event: ${eventId}`);
  
  const record = await prisma.auditLog.findFirst({
    where: { eventId }
  });

  if (!record) {
    console.log(`❌ Event not found: ${eventId}`);
    return;
  }

  console.log(`\n📋 Event Details:`);
  console.log(`  ID: ${record.id}`);
  console.log(`  Event ID: ${record.eventId}`);
  console.log(`  Table: ${record.tableName}`);
  console.log(`  Record ID: ${record.recordId}`);
  console.log(`  Action: ${record.action}`);
  console.log(`  Previous Hash: ${record.previousHash || 'GENESIS'}`);
  console.log(`  SHA-256 Hash: ${record.sha256Hash}`);
  console.log(`  Created At: ${record.createdAt.toISOString()}`);

  // Verify hash
  const calculatedHash = calculateHash({
    eventId: record.eventId || '',
    tableName: record.tableName,
    recordId: record.recordId,
    action: record.action,
    diffAfter: record.diffAfter as object,
    previousHash: record.previousHash,
    createdAt: record.createdAt
  });

  if (calculatedHash === record.sha256Hash) {
    console.log(`\n✅ Hash verification: PASSED`);
  } else {
    console.log(`\n❌ Hash verification: FAILED`);
    console.log(`  Expected: ${calculatedHash}`);
    console.log(`  Got: ${record.sha256Hash}`);
  }
}

function calculateHash(data: {
  eventId: string;
  tableName: string;
  recordId: string;
  action: string;
  diffAfter?: object;
  previousHash: string | null;
  createdAt: Date;
}): string {
  const crypto = require('crypto');
  const hashInput = {
    eventId: data.eventId,
    tableName: data.tableName,
    recordId: data.recordId,
    action: data.action,
    diffAfter: data.diffAfter || null,
    previousHash: data.previousHash || 'GENESIS',
    createdAt: data.createdAt.toISOString()
  };

  const hashString = JSON.stringify(hashInput);
  const hash = crypto.createHash('sha256');
  hash.update(hashString);
  return hash.digest('hex');
}

async function main() {
  try {
    console.log('🔍 CTEA Audit Chain Verification');
    console.log('================================\n');

    const options = await parseArgs();

    // If specific event ID is provided, verify that event only
    if (options.eventId) {
      await verifySpecificEvent(options.eventId);
      return;
    }

    // Otherwise, verify the entire chain or filtered range
    console.log('🔍 Verifying audit chain...');
    if (options.fromDate) {
      console.log(`  From: ${options.fromDate.toISOString()}`);
    }
    if (options.toDate) {
      console.log(`  To: ${options.toDate.toISOString()}`);
    }
    if (options.orgId) {
      console.log(`  Organization: ${options.orgId}`);
    }
    console.log('');

    const result = await auditLogService.validateAuditChain({
      fromDate: options.fromDate,
      toDate: options.toDate,
      orgId: options.orgId
    });

    console.log(`📊 Verification Results:`);
    console.log(`  Total Records: ${result.totalRecords}`);
    console.log(`  Valid: ${result.isValid ? 'YES ✅' : 'NO ❌'}`);
    console.log(`  Errors: ${result.errorRecords.length}`);

    if (result.errorRecords.length > 0) {
      console.log(`\n❌ Error Details:`);
      for (const error of result.errorRecords) {
        console.log(`  Record ID: ${error.id}`);
        console.log(`  Event ID: ${error.eventId}`);
        console.log(`  Error: ${error.error}`);
        console.log('');
      }
    }

    if (result.isValid) {
      console.log(`\n✅ Audit chain verification completed successfully!`);
      console.log(`   ${result.totalRecords} records verified, 0 errors`);
      process.exit(0);
    } else {
      console.log(`\n❌ Audit chain verification failed!`);
      console.log(`   ${result.totalRecords} records checked, ${result.errorRecords.length} errors found`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
