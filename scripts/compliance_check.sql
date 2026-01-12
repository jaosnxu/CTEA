-- M3.4-GLOBAL-COMP-002A-PH3-4-AUDIT
-- Compliance Check Script
-- Verifies M3.4-GLOBAL-STANDARD-001 and M3.4-GLOBAL-COMP-002A compliance

\echo '================================================================================'
\echo 'CTEA Platform - Compliance Check'
\echo '================================================================================'
\echo 'Audit Event: M3.4-GLOBAL-COMP-002A-PH3-4-AUDIT'
\echo 'Mode: Deep Integrity Audit'
\echo 'Date: 2026-01-12'
\echo '================================================================================'
\echo ''

\echo '1. M3.4-GLOBAL-STANDARD-001: Database Technology Stack'
\echo '--------------------------------------------------------------------------------'
\echo 'Requirement: PostgreSQL 14+'
SELECT version();
\echo ''

\echo '2. M3.4-GLOBAL-STANDARD-001: Table Count'
\echo '--------------------------------------------------------------------------------'
\echo 'Requirement: 74 tables'
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name != '_prisma_migrations';
\echo ''

\echo '3. M3.4-GLOBAL-STANDARD-001: Enum Types'
\echo '--------------------------------------------------------------------------------'
\echo 'Requirement: 24+ enum types'
SELECT COUNT(*) as enum_count 
FROM pg_type 
WHERE typtype = 'e';
\echo ''

\echo '4. M3.4-GLOBAL-STANDARD-001: UUID Primary Keys'
\echo '--------------------------------------------------------------------------------'
\echo 'Requirement: UUID v4 for business tables, BigInt for log tables'
SELECT 
  data_type,
  COUNT(*) as count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'id'
  AND table_name NOT IN ('_prisma_migrations')
GROUP BY data_type
ORDER BY data_type;
\echo ''

\echo '5. M3.4-GLOBAL-STANDARD-001: Audit Fields (createdAt, updatedAt)'
\echo '--------------------------------------------------------------------------------'
\echo 'Requirement: All tables must have createdAt and updatedAt'
SELECT COUNT(*) as tables_with_audit_fields
FROM (
  SELECT table_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name NOT IN ('_prisma_migrations', 'audit_logs')
  GROUP BY table_name
  HAVING 
    COUNT(CASE WHEN column_name = 'createdAt' THEN 1 END) > 0
    AND COUNT(CASE WHEN column_name = 'updatedAt' THEN 1 END) > 0
) t;
\echo ''

\echo '6. M3.4-GLOBAL-STANDARD-001: Multi-Tenant Isolation'
\echo '--------------------------------------------------------------------------------'
\echo 'Requirement: orgId or storeId fields for tenant isolation'
SELECT COUNT(*) as tables_with_tenant_fields
FROM (
  SELECT table_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name NOT IN ('_prisma_migrations', 'audit_logs')
    AND (column_name = 'orgId' OR column_name = 'storeId')
  GROUP BY table_name
) t;
\echo ''

\echo '7. M3.4-GLOBAL-COMP-002A: Audit Log Table'
\echo '--------------------------------------------------------------------------------'
\echo 'Requirement: audit_logs table with SHA-256 chain fields'
SELECT 
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'audit_logs'
  AND column_name IN ('eventId', 'previousHash', 'sha256Hash')
ORDER BY column_name;
\echo ''

\echo '8. M3.4-GLOBAL-COMP-002A: Audit Chain Genesis Record'
\echo '--------------------------------------------------------------------------------'
\echo 'Requirement: M3.4-GLOBAL-COMP-002A-PH3-INIT genesis record'
SELECT 
  "eventId",
  "tableName",
  "recordId",
  "previousHash" IS NULL as is_genesis,
  LENGTH("sha256Hash") as hash_length,
  "createdAt"
FROM audit_logs
WHERE "eventId" = 'M3.4-GLOBAL-COMP-002A-PH3-INIT';
\echo ''

\echo '9. M3.4-GLOBAL-COMP-002A: Audit Chain Uniqueness'
\echo '--------------------------------------------------------------------------------'
\echo 'Requirement: All eventId values must be unique'
SELECT 
  CASE 
    WHEN COUNT(DISTINCT "eventId") = COUNT(*) 
    THEN 'PASS: All eventId values are unique'
    ELSE 'FAIL: Duplicate eventId values found'
  END as uniqueness_check
FROM audit_logs
WHERE "eventId" IS NOT NULL;
\echo ''

\echo '10. M3.4-GLOBAL-COMP-002A: Audit Log Indexes'
\echo '--------------------------------------------------------------------------------'
\echo 'Requirement: Indexes on eventId, orgId, tableName, createdAt'
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'audit_logs'
ORDER BY indexname;
\echo ''

\echo '================================================================================'
\echo 'Compliance Check Completed'
\echo '================================================================================'
