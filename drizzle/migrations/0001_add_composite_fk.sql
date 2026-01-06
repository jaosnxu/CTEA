-- Migration: Add composite foreign key for product_option_group.default_item_id
-- This ensures default_item_id belongs to the same group

-- Step 1: Create unique index on option_item(group_id, id) for composite FK reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_option_item_group_id_composite 
ON option_item(group_id, id);

-- Step 2: Add composite foreign key constraint
-- Note: This requires default_item_id to reference an item that belongs to the same group
ALTER TABLE product_option_group
ADD CONSTRAINT fk_product_option_group_default_item
FOREIGN KEY (group_id, default_item_id) 
REFERENCES option_item(group_id, id)
DEFERRABLE INITIALLY DEFERRED;

-- Step 3: Add GIN index for coupon_instance.tags (JSON array search)
-- Note: JSON type requires explicit operator class for GIN
-- Using json_array_ops for array containment queries
-- If tags is JSONB, use: USING GIN (tags jsonb_path_ops)
-- For JSON type, we skip GIN index as it's not directly supported
-- Alternative: Create a functional index or convert to JSONB
-- CREATE INDEX IF NOT EXISTS idx_coupon_instance_tags_gin 
-- ON coupon_instance USING GIN (tags::jsonb jsonb_path_ops);

-- Step 4: Add comment for documentation
COMMENT ON CONSTRAINT fk_product_option_group_default_item ON product_option_group 
IS 'Ensures default_item_id belongs to the same option_group as group_id';
