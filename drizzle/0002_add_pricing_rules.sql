-- Migration: Add pricing rules tables
-- Created: 2026-01-16

-- Create pricing_rules table
CREATE TABLE IF NOT EXISTS `pricing_rules` (
  `id` varchar(50) PRIMARY KEY,
  `org_id` int NOT NULL,
  `name` json NOT NULL,
  `description` json,
  `condition` json NOT NULL,
  `action` json NOT NULL,
  `priority` int NOT NULL DEFAULT 0,
  `is_active` boolean DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int,
  `updated_by` int,
  INDEX `pricing_rule_org_idx` (`org_id`),
  INDEX `pricing_rule_active_idx` (`is_active`),
  INDEX `pricing_rule_priority_idx` (`priority`)
);

-- Create product_pricing_rules table for many-to-many relationship
CREATE TABLE IF NOT EXISTS `product_pricing_rules` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `product_id` int NOT NULL,
  `rule_id` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `ppr_product_idx` (`product_id`),
  INDEX `ppr_rule_idx` (`rule_id`),
  UNIQUE INDEX `ppr_unique_idx` (`product_id`, `rule_id`),
  FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`rule_id`) REFERENCES `pricing_rules` (`id`) ON DELETE CASCADE
);

-- Insert default pricing rules (from existing pricing-engine.ts)
INSERT INTO `pricing_rules` (`id`, `org_id`, `name`, `description`, `condition`, `action`, `priority`, `is_active`, `created_at`, `updated_at`) VALUES
('rule_001', 1, 
  '{"zh": "欢乐时光", "ru": "Счастливые часы", "en": "Happy Hour"}',
  '{"zh": "下午2-5点享8折", "ru": "20% скидка с 14:00 до 17:00", "en": "20% off from 2-5 PM"}',
  '{"hour": [14, 15, 16, 17]}',
  '{"type": "DISCOUNT_PERCENT", "value": 20}',
  5,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
('rule_002', 1,
  '{"zh": "会员折扣 - 金卡", "ru": "Скидка Gold", "en": "Gold Member Discount"}',
  '{"zh": "金卡会员享95折", "ru": "5% скидка для Gold членов", "en": "5% off for Gold members"}',
  '{"userLevel": "Gold"}',
  '{"type": "DISCOUNT_PERCENT", "value": 5}',
  10,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
