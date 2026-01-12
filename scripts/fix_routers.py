#!/usr/bin/env python3
"""
Fix all broken router files by restoring audit log calls
"""

import re
import sys

def fix_router_file(filepath):
    print(f"Fixing {filepath}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match broken audit log calls
    # // TODO: Fix audit log
    # // await auditService.createAuditLog({
    #   tableName: ...
    
    # Replace with correct format
    content = re.sub(
        r'//\s*TODO:\s*Fix audit log\s*\n\s*//\s*await auditService\.createAuditLog\(',
        'await auditService.logAction(',
        content,
        flags=re.MULTILINE
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Fixed {filepath}")

if __name__ == '__main__':
    routers = [
        'server/src/trpc/routers/member.router.ts',
        'server/src/trpc/routers/order.router.ts',
        'server/src/trpc/routers/rbac.router.ts',
        'server/src/trpc/routers/store.router.ts',
    ]
    
    for router in routers:
        fix_router_file(router)
    
    print("\nAll routers fixed!")
