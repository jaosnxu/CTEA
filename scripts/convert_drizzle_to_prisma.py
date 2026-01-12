#!/usr/bin/env python3
"""
Convert Drizzle MySQL schema to Prisma PostgreSQL schema
按照 M3.4-GLOBAL-COMP-002A 指令要求
"""
import re
import sys

def convert_drizzle_to_prisma(drizzle_schema_path, output_path):
    """Convert Drizzle schema to Prisma schema"""
    
    with open(drizzle_schema_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract all table definitions
    table_pattern = r'export const (\w+) = mysqlTable\("(\w+)",\s*\{([^}]+)\}'
    tables = re.findall(table_pattern, content, re.DOTALL)
    
    prisma_models = []
    
    for const_name, table_name, fields_content in tables:
        model_name = const_name[0].upper() + const_name[1:]  # PascalCase
        
        prisma_model = f"\nmodel {model_name} {{\n"
        
        # Parse fields
        field_lines = [line.strip() for line in fields_content.split('\n') if line.strip() and not line.strip().startswith('//')]
        
        for field_line in field_lines:
            if ':' not in field_line:
                continue
                
            # Extract field name and definition
            field_match = re.match(r'(\w+):\s*(.+?)(?:,\s*//|$)', field_line)
            if not field_match:
                continue
                
            field_name, field_def = field_match.groups()
            
            # Convert field types
            prisma_type = convert_field_type(field_def, field_name)
            prisma_model += f"  {field_name} {prisma_type}\n"
        
        prisma_model += "}\n"
        prisma_models.append(prisma_model)
    
    # Generate Prisma schema
    prisma_schema = """// Prisma Schema for CTEA Platform
// Generated from Drizzle MySQL schema
// Architecture: PostgreSQL 14+ with Prisma ORM
// Audit Event: M3.4-GLOBAL-COMP-002A

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

"""
    
    prisma_schema += "\n".join(prisma_models)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(prisma_schema)
    
    print(f"✅ Converted {len(prisma_models)} tables to Prisma schema")
    print(f"📄 Output: {output_path}")

def convert_field_type(field_def, field_name):
    """Convert Drizzle field type to Prisma field type"""
    
    # Primary key
    if 'primaryKey()' in field_def:
        if 'autoincrement()' in field_def:
            return "Int @id @default(autoincrement())"
        return "Int @id"
    
    # Int types
    if field_def.startswith('int('):
        if '.notNull()' in field_def:
            if '.default(' in field_def:
                default_match = re.search(r'\.default\((\d+)\)', field_def)
                if default_match:
                    return f"Int @default({default_match.group(1)})"
            return "Int"
        return "Int?"
    
    # BigInt types
    if field_def.startswith('bigint('):
        if '.notNull()' in field_def:
            return "BigInt"
        return "BigInt?"
    
    # Varchar types
    if field_def.startswith('varchar('):
        is_required = '.notNull()' in field_def
        is_unique = '.unique()' in field_def
        has_default = '.default(' in field_def
        
        attrs = []
        if has_default:
            default_match = re.search(r'\.default\("([^"]+)"\)', field_def)
            if default_match:
                attrs.append(f'@default("{default_match.group(1)}")')
        if is_unique:
            attrs.append('@unique')
        
        type_str = "String" if is_required else "String?"
        return f"{type_str} {' '.join(attrs)}".strip()
    
    # Text types
    if field_def.startswith('text('):
        return "String" if '.notNull()' in field_def else "String?"
    
    # Boolean types
    if field_def.startswith('boolean('):
        if '.default(true)' in field_def:
            return "Boolean @default(true)"
        elif '.default(false)' in field_def:
            return "Boolean @default(false)"
        return "Boolean?" if '.notNull()' not in field_def else "Boolean"
    
    # Decimal types
    if field_def.startswith('decimal('):
        if '.default(' in field_def:
            default_match = re.search(r'\.default\("([^"]+)"\)', field_def)
            if default_match:
                return f"Decimal @default({default_match.group(1)})"
        return "Decimal" if '.notNull()' in field_def else "Decimal?"
    
    # JSON types
    if field_def.startswith('json('):
        return "Json" if '.notNull()' in field_def else "Json?"
    
    # Timestamp types
    if field_def.startswith('timestamp('):
        if '.defaultNow()' in field_def:
            if '.onUpdateNow()' in field_def:
                return "DateTime @default(now()) @updatedAt"
            return "DateTime @default(now())"
        return "DateTime" if '.notNull()' in field_def else "DateTime?"
    
    # Enum types (MySQL enum -> PostgreSQL enum)
    if field_def.startswith('mysqlEnum('):
        enum_match = re.search(r'mysqlEnum\("(\w+)",\s*\[([^\]]+)\]\)', field_def)
        if enum_match:
            enum_name = enum_match.group(1)
            # For now, use String type (enums need to be defined separately)
            if '.default(' in field_def:
                default_match = re.search(r'\.default\("([^"]+)"\)', field_def)
                if default_match:
                    return f'String @default("{default_match.group(1)}")'
            return "String" if '.notNull()' in field_def else "String?"
    
    # Default fallback
    return "String?"

if __name__ == "__main__":
    drizzle_path = "/home/ubuntu/CTEA/drizzle/schema.ts"
    prisma_path = "/home/ubuntu/CTEA/prisma/schema.prisma"
    
    convert_drizzle_to_prisma(drizzle_path, prisma_path)
