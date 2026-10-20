-- Navkar City – leads database
-- Run once:  mysql -u root < database/schema.sql
CREATE DATABASE IF NOT EXISTS `navkar_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `navkar_db`;

CREATE TABLE IF NOT EXISTS `leads` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(80)     NOT NULL,
  `country_code`  VARCHAR(6)      NOT NULL DEFAULT '91',
  `phone`         VARCHAR(20)     NOT NULL,
  `email`         VARCHAR(120)    NOT NULL,
  `message`       TEXT            NULL,
  `source`        ENUM('brochure_popup','enquiry_form') NOT NULL DEFAULT 'enquiry_form',
  `page_url`      VARCHAR(255)    NULL,
  `ip_address`    VARCHAR(45)     NULL,
  `user_agent`    VARCHAR(255)    NULL,
  `consent`       TINYINT(1)      NOT NULL DEFAULT 0,
  `consented_at`  DATETIME        NULL,
  `email_status`  ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
  `email_error`   VARCHAR(255)    NULL,
  `emailed_at`    DATETIME        NULL,
  `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_created` (`created_at`),
  KEY `idx_phone`   (`phone`),
  KEY `idx_email`   (`email`),
  KEY `idx_status`  (`email_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;