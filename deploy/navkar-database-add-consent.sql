-- Run ONLY if the leads table already exists (adds the consent columns).
ALTER TABLE `leads`  ADD COLUMN `consent` TINYINT(1) NOT NULL DEFAULT 0 AFTER `user_agent`,  ADD COLUMN `consented_at` DATETIME NULL AFTER `consent`;
 