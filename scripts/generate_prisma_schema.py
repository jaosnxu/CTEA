#!/usr/bin/env python3
"""
智能 Drizzle MySQL Schema 到 Prisma PostgreSQL Schema 转换器
按照 M3.4-GLOBAL-COMP-002A 指令要求
"""
import re
import json

# 已手工完成的表（跳过）
MANUAL_TABLES = {
    'organizations', 'stores', 'adminUsers', 'auditLogs', 'systemConfigs',
    'permissionRules', 'depositAccounts', 'settlementRules', 'crossStoreLedger',
    'settlementBatches', 'refundRecords', 'financialReports'
}

# 类型映射
TYPE_MAPPING = {
    'int': 'Int',
    'bigint': 'BigInt',
    'varchar': 'String',
    'text': 'String',
    'boolean': 'Boolean',
    'decimal': 'Decimal',
    'json': 'Json',
    'timestamp': 'DateTime',
}

# Enum 定义收集器
ENUMS = {}

def pascal_case(snake_str):
    """Convert snake_case to PascalCase"""
    components = snake_str.split('_')
    return ''.join(x.title() for x in components)

def extract_enum_values(field_def):
    """Extract enum values from mysqlEnum definition"""
    match = re.search(r'mysqlEnum\("(\w+)",\s*\[([^\]]+)\]\)', field_def)
    if match:
        enum_name = match.group(1)
        values_str = match.group(2)
        values = [v.strip().strip('"').strip("'") for v in values_str.split(',')]
        return enum_name, values
    return None, None

def convert_field_type(field_name, field_def, table_name):
    """Convert Drizzle field definition to Prisma field definition"""
    
    # Check if it's a primary key
    is_primary = 'primaryKey()' in field_def
    is_auto_increment = 'autoincrement()' in field_def
    is_not_null = '.notNull()' in field_def
    is_unique = '.unique()' in field_def
    
    # Extract default value
    default_match = re.search(r'\.default\(([^)]+)\)', field_def)
    default_value = default_match.group(1) if default_match else None
    
    # Determine base type
    prisma_type = None
    prisma_attrs = []
    
    # Primary key handling - use UUID instead of auto-increment
    if is_primary:
        if is_auto_increment:
            # For BigInt IDs (like audit logs), keep auto-increment
            if field_def.startswith('bigint('):
                prisma_type = 'BigInt'
                prisma_attrs.append('@id @default(autoincrement())')
            else:
                # For regular IDs, use UUID
                prisma_type = 'String'
                prisma_attrs.append('@id @default(uuid())')
        else:
            prisma_type = 'String'
            prisma_attrs.append('@id')
        return f"{prisma_type} {' '.join(prisma_attrs)}"
    
    # Int types
    if field_def.startswith('int('):
        prisma_type = 'Int'
        if default_value and default_value.isdigit():
            prisma_attrs.append(f'@default({default_value})')
    
    # BigInt types
    elif field_def.startswith('bigint('):
        prisma_type = 'BigInt'
    
    # Varchar types
    elif field_def.startswith('varchar('):
        prisma_type = 'String'
        length_match = re.search(r'varchar\(\{\s*length:\s*(\d+)\s*\}\)', field_def)
        if length_match:
            prisma_attrs.append(f'@db.VarChar({length_match.group(1)})')
        if default_value:
            clean_default = default_value.strip('"').strip("'")
            prisma_attrs.append(f'@default("{clean_default}")')
        if is_unique:
            prisma_attrs.append('@unique')
    
    # Text types
    elif field_def.startswith('text('):
        prisma_type = 'String'
    
    # Boolean types
    elif field_def.startswith('boolean('):
        prisma_type = 'Boolean'
        if default_value:
            prisma_attrs.append(f'@default({default_value})')
    
    # Decimal types
    elif field_def.startswith('decimal('):
        prisma_type = 'Decimal'
        precision_match = re.search(r'precision:\s*(\d+),\s*scale:\s*(\d+)', field_def)
        if precision_match:
            prisma_attrs.append(f'@db.Decimal({precision_match.group(1)}, {precision_match.group(2)})')
        if default_value:
            clean_default = default_value.strip('"').strip("'")
            prisma_attrs.append(f'@default({clean_default})')
    
    # JSON types
    elif field_def.startswith('json('):
        prisma_type = 'Json'
    
    # Timestamp types
    elif field_def.startswith('timestamp('):
        prisma_type = 'DateTime'
        if '.defaultNow()' in field_def:
            if '.onUpdateNow()' in field_def:
                prisma_attrs.append('@default(now()) @updatedAt')
            else:
                prisma_attrs.append('@default(now())')
    
    # Enum types
    elif field_def.startswith('mysqlEnum('):
        enum_name, enum_values = extract_enum_values(field_def)
        if enum_name and enum_values:
            # Store enum definition
            enum_type_name = pascal_case(enum_name)
            ENUMS[enum_type_name] = enum_values
            prisma_type = enum_type_name
            if default_value:
                clean_default = default_value.strip('"').strip("'")
                prisma_attrs.append(f'@default({clean_default})')
    
    # Fallback
    if not prisma_type:
        prisma_type = 'String'
    
    # Handle nullable
    if not is_not_null and '@id' not in ' '.join(prisma_attrs):
        prisma_type += '?'
    
    return f"{prisma_type} {' '.join(prisma_attrs)}".strip()

def parse_table_definition(table_content):
    """Parse a single table definition"""
    # Extract table name
    match = re.search(r'export const (\w+) = mysqlTable\("(\w+)",\s*\{', table_content)
    if not match:
        return None
    
    const_name = match.group(1)
    table_name = match.group(2)
    model_name = pascal_case(const_name)
    
    # Skip manually created tables
    if const_name in MANUAL_TABLES:
        return None
    
    # Extract fields
    fields_match = re.search(r'mysqlTable\("[^"]+",\s*\{([^}]+)\}', table_content, re.DOTALL)
    if not fields_match:
        return None
    
    fields_content = fields_match.group(1)
    
    # Parse individual fields
    fields = []
    for line in fields_content.split('\n'):
        line = line.strip()
        if not line or line.startswith('//'):
            continue
        
        field_match = re.match(r'(\w+):\s*(.+?)(?:,\s*//|,?\s*$)', line)
        if field_match:
            field_name = field_match.group(1)
            field_def = field_match.group(2).rstrip(',')
            
            # Convert field
            prisma_field = convert_field_type(field_name, field_def, table_name)
            fields.append((field_name, prisma_field))
    
    # Extract indexes
    indexes = []
    index_section = re.search(r'\},\s*\(table\)\s*=>\s*\(\{([^}]+)\}\)', table_content, re.DOTALL)
    if index_section:
        index_content = index_section.group(1)
        for line in index_content.split('\n'):
            line = line.strip()
            if 'index(' in line or 'uniqueIndex(' in line:
                indexes.append(line)
    
    return {
        'const_name': const_name,
        'table_name': table_name,
        'model_name': model_name,
        'fields': fields,
        'indexes': indexes
    }

def generate_prisma_model(table_def):
    """Generate Prisma model from table definition"""
    model_name = table_def['model_name']
    table_name = table_def['table_name']
    fields = table_def['fields']
    
    lines = [f"\n/// {model_name}"]
    lines.append(f"model {model_name} {{")
    
    # Add fields
    for field_name, field_type in fields:
        lines.append(f"  {field_name:<20} {field_type}")
    
    # Add audit fields if not present
    has_created_at = any(f[0] == 'createdAt' for f in fields)
    has_updated_at = any(f[0] == 'updatedAt' for f in fields)
    has_created_by = any(f[0] == 'createdBy' for f in fields)
    has_updated_by = any(f[0] == 'updatedBy' for f in fields)
    
    if not has_created_at:
        lines.append(f"  {'createdAt':<20} DateTime @default(now())")
    if not has_updated_at:
        lines.append(f"  {'updatedAt':<20} DateTime @updatedAt")
    if not has_created_by:
        lines.append(f"  {'createdBy':<20} String?")
    if not has_updated_by:
        lines.append(f"  {'updatedBy':<20} String?")
    
    lines.append(f"}}")
    lines.append(f"  @@map(\"{table_name}\")")
    lines.append(f"}}")
    
    return '\n'.join(lines)

def main():
    # Read Drizzle schema
    with open('/home/ubuntu/CTEA/drizzle/schema.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by table definitions
    tables = re.split(r'(?=export const \w+ = mysqlTable)', content)
    
    # Parse all tables
    table_defs = []
    for table_content in tables[1:]:  # Skip header
        table_def = parse_table_definition(table_content)
        if table_def:
            table_defs.append(table_def)
    
    # Generate Prisma models
    prisma_models = []
    for table_def in table_defs:
        model = generate_prisma_model(table_def)
        prisma_models.append(model)
    
    # Generate enum definitions
    enum_defs = []
    for enum_name, enum_values in sorted(ENUMS.items()):
        enum_def = f"\nenum {enum_name} {{\n"
        for value in enum_values:
            enum_def += f"  {value}\n"
        enum_def += "}"
        enum_defs.append(enum_def)
    
    # Write output
    output = f"""// ============================================================================
// CTEA Platform - Prisma Schema (Auto-generated Part)
// ============================================================================
// Generated by: generate_prisma_schema.py
// Audit Event: M3.4-GLOBAL-COMP-002A
// Tables: {len(table_defs)} (excluding {len(MANUAL_TABLES)} manual tables)
// ============================================================================

// Enums
{''.join(enum_defs)}

// Models
{''.join(prisma_models)}
"""
    
    with open('/home/ubuntu/CTEA/prisma/schema_part2_generated.prisma', 'w', encoding='utf-8') as f:
        f.write(output)
    
    print(f"✅ Generated {len(table_defs)} Prisma models")
    print(f"✅ Generated {len(ENUMS)} enum types")
    print(f"📄 Output: prisma/schema_part2_generated.prisma")
    
    # Print table list
    print("\n📋 Generated tables:")
    for i, td in enumerate(table_defs, 1):
        print(f"  {i:2d}. {td['model_name']:<30} ({td['table_name']})")

if __name__ == "__main__":
    main()
