-- Migration: Add layout_configs table for SDUI system
-- Created: 2026-01-16

CREATE TABLE IF NOT EXISTS `layout_configs` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `page` varchar(50) NOT NULL,
  `config` json NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `is_active` boolean DEFAULT true,
  `created_by` varchar(255),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `layout_page_idx` (`page`),
  INDEX `layout_active_idx` (`is_active`),
  UNIQUE INDEX `layout_page_version_idx` (`page`, `version`)
);
