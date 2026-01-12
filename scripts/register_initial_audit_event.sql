-- Register Initial Audit Event: M3.4-GLOBAL-COMP-002A-PH3-INIT
-- This creates the genesis record in the audit chain

INSERT INTO audit_logs (
  "tableName",
  "recordId",
  action,
  "diffAfter",
  "operatorType",
  "operatorName",
  reason,
  "eventId",
  "previousHash",
  "sha256Hash",
  "createdAt"
) VALUES (
  '_system',
  'database_initialization',
  'INSERT',
  '{
    "event": "M3.4-GLOBAL-COMP-002A-PH3-INIT",
    "type": "db_migration_initialization",
    "description": "PostgreSQL + Prisma database initialization completed",
    "tables_migrated": 74,
    "enums_created": 24,
    "migration_id": "20260112124722_init_schema",
    "migration_sha256": "390dc21de1f1c3b7a5eefa5f3c209548d4723be389378046ab08a49009240f38",
    "compliance": {
      "M3.4-GLOBAL-STANDARD-001": "compliant",
      "M3.4-GLOBAL-COMP-002A": "compliant"
    }
  }'::jsonb,
  'SYSTEM',
  'TEA Internal Audit Team',
  'Database initialization and audit chain genesis',
  'M3.4-GLOBAL-COMP-002A-PH3-INIT',
  NULL,
  encode(sha256(convert_to('{"eventId":"M3.4-GLOBAL-COMP-002A-PH3-INIT","tableName":"_system","recordId":"database_initialization","action":"INSERT","diffAfter":{"event":"M3.4-GLOBAL-COMP-002A-PH3-INIT","type":"db_migration_initialization"},"previousHash":"GENESIS","createdAt":"' || NOW()::text || '"}', 'UTF8')), 'hex'),
  NOW()
);

-- Verify the record was created
SELECT 
  id,
  "eventId",
  "tableName",
  "recordId",
  action,
  "previousHash",
  "sha256Hash",
  "createdAt"
FROM audit_logs
WHERE "eventId" = 'M3.4-GLOBAL-COMP-002A-PH3-INIT';
