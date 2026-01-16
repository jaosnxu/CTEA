/*
  Warnings:

  - You are about to drop the column `createdAt` on the `sms_verification_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `sms_verification_logs` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `sms_verification_logs` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `sms_verification_logs` table. All the data in the column will be lost.
  - Added the required column `expires_at` to the `sms_verification_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `sms_verification_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purpose` to the `sms_verification_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `sms_verification_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `verification_code` to the `sms_verification_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `sms_verification_logs` DROP COLUMN `createdAt`,
    DROP COLUMN `createdBy`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `updatedBy`,
    ADD COLUMN `attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `created_by` VARCHAR(191) NULL,
    ADD COLUMN `expires_at` DATETIME(3) NOT NULL,
    ADD COLUMN `geo_city` VARCHAR(100) NULL,
    ADD COLUMN `geo_country` VARCHAR(50) NULL,
    ADD COLUMN `ip_address` VARCHAR(50) NULL,
    ADD COLUMN `phone` VARCHAR(20) NOT NULL,
    ADD COLUMN `provider` VARCHAR(50) NULL,
    ADD COLUMN `purpose` VARCHAR(50) NOT NULL,
    ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'SENT',
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `updated_by` VARCHAR(191) NULL,
    ADD COLUMN `user_agent` VARCHAR(500) NULL,
    ADD COLUMN `verification_code` VARCHAR(10) NOT NULL,
    ADD COLUMN `verified_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `sms_verification_logs_phone_purpose_status_idx` ON `sms_verification_logs`(`phone`, `purpose`, `status`);

-- CreateIndex
CREATE INDEX `sms_verification_logs_expires_at_idx` ON `sms_verification_logs`(`expires_at`);
