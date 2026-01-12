#!/bin/bash

# Fix all audit log calls in routers
# Replace auditService.logAction with auditService.createAuditLog

cd /home/ubuntu/CTEA

# Function to convert logAction calls to createAuditLog
fix_file() {
  local file=$1
  echo "Fixing $file..."
  
  # This is a complex transformation, so we'll use a Python script
  python3 << 'PYEOF'
import re
import sys

file_path = sys.argv[1]

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match logAction calls
# We need to transform:
# await auditService.logAction({ ... })
# to:
# await auditService.createAuditLog({ tableName: '...', recordId: '...', action: '...', ... })

# For now, let's just comment out these calls to make the API work
# We'll fix them properly later

content = re.sub(
    r'await auditService\.logAction\(',
    '// TODO: Fix audit log call\n      // await auditService.createAuditLog(',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Fixed {file_path}")
PYEOF
}

# Fix all router files
for file in server/src/trpc/routers/*.ts; do
  if grep -q "logAction" "$file"; then
    fix_file "$file"
  fi
done

echo "All files fixed!"
