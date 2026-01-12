#!/usr/bin/env python3
"""
Fix Prisma schema syntax errors
"""
import re

# Read the generated schema
with open('/home/ubuntu/CTEA/prisma/schema_part2_generated.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: Remove duplicate closing braces before @@map
# Pattern: }\n  @@map("table_name")\n}
fixed_content = re.sub(r'\}\n  @@map\("([^"]+)"\)\n\}', r'  @@map("\1")\n}', content)

# Write fixed version
with open('/home/ubuntu/CTEA/prisma/schema_part2_fixed.prisma', 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print("✅ Fixed Prisma schema syntax errors")
print("📄 Output: prisma/schema_part2_fixed.prisma")
