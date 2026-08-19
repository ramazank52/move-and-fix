-- P14-02: canonical service identities remain in service_categories and
-- service_subcategories. This table records only explicit audited aliases;
-- application code never infers a category from a display name.
CREATE TABLE `service_catalog_aliases` (
  `id` int AUTO_INCREMENT NOT NULL,
  `namespace` enum('legacy_category','external_service','approved_source_service','request_service_type') NOT NULL,
  `alias` varchar(160) NOT NULL,
  `categoryId` int NOT NULL,
  `subcategoryId` int NOT NULL DEFAULT 0,
  `isActive` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `service_catalog_aliases_id` PRIMARY KEY (`id`),
  CONSTRAINT `service_catalog_aliases_namespace_alias_target_unique` UNIQUE(`namespace`,`alias`,`categoryId`,`subcategoryId`),
  INDEX `service_catalog_aliases_lookup_idx` (`namespace`,`alias`,`isActive`),
  INDEX `service_catalog_aliases_target_idx` (`categoryId`,`subcategoryId`,`isActive`)
);

-- These are explicit migration-owned compatibility and approved-source aliases.
-- If a target catalog row is absent, no alias is inserted and resolution blocks.
INSERT INTO `service_catalog_aliases` (`namespace`, `alias`, `categoryId`, `subcategoryId`, `isActive`)
SELECT 'legacy_category', aliases.alias, categories.id, 0, 1
FROM `service_categories` categories
JOIN (
  SELECT 'plumbing' AS category_slug, 'plumbing' AS alias UNION ALL
  SELECT 'plumbing', 'su-tesisati' UNION ALL
  SELECT 'electrical', 'electrical' UNION ALL
  SELECT 'electrical', 'elektrik' UNION ALL
  SELECT 'painting', 'painting' UNION ALL
  SELECT 'painting', 'boya-badana' UNION ALL
  SELECT 'moving', 'moving' UNION ALL
  SELECT 'moving', 'tasima' UNION ALL
  SELECT 'cleaning', 'cleaning' UNION ALL
  SELECT 'cleaning', 'temizlik' UNION ALL
  SELECT 'towing', 'towing' UNION ALL
  SELECT 'towing', 'cekici' UNION ALL
  SELECT 'roadside', 'roadside' UNION ALL
  SELECT 'roadside', 'yol-yardimi' UNION ALL
  SELECT 'courier', 'courier' UNION ALL
  SELECT 'courier', 'kurye'
) aliases ON aliases.category_slug COLLATE utf8mb4_unicode_ci = categories.slug COLLATE utf8mb4_unicode_ci
ON DUPLICATE KEY UPDATE `isActive` = VALUES(`isActive`);

INSERT INTO `service_catalog_aliases` (`namespace`, `alias`, `categoryId`, `subcategoryId`, `isActive`)
SELECT 'approved_source_service', aliases.alias, categories.id, 0, 1
FROM `service_categories` categories
JOIN (
  SELECT 'plumbing' AS category_slug, 'plumbing' AS alias UNION ALL
  SELECT 'electrical', 'electrical' UNION ALL
  SELECT 'painting', 'painting' UNION ALL
  SELECT 'moving', 'moving' UNION ALL
  SELECT 'cleaning', 'cleaning' UNION ALL
  SELECT 'towing', 'towing' UNION ALL
  SELECT 'roadside', 'roadside_assistance' UNION ALL
  SELECT 'courier', 'courier' UNION ALL
  SELECT 'hvac', 'air_conditioning' UNION ALL
  SELECT 'hvac', 'heating'
) aliases ON aliases.category_slug COLLATE utf8mb4_unicode_ci = categories.slug COLLATE utf8mb4_unicode_ci
ON DUPLICATE KEY UPDATE `isActive` = VALUES(`isActive`);

INSERT INTO `service_catalog_aliases` (`namespace`, `alias`, `categoryId`, `subcategoryId`, `isActive`)
SELECT 'request_service_type', aliases.alias, categories.id, 0, 1
FROM `service_categories` categories
JOIN (
  SELECT 'painting' AS category_slug, 'painting' AS alias UNION ALL
  SELECT 'electrical', 'electrical' UNION ALL
  SELECT 'plumbing', 'plumbing' UNION ALL
  SELECT 'cleaning', 'cleaning' UNION ALL
  SELECT 'moving', 'moving' UNION ALL
  SELECT 'courier', 'courier' UNION ALL
  SELECT 'towing', 'tow-truck' UNION ALL
  SELECT 'roadside', 'roadside'
) aliases ON aliases.category_slug COLLATE utf8mb4_unicode_ci = categories.slug COLLATE utf8mb4_unicode_ci
ON DUPLICATE KEY UPDATE `isActive` = VALUES(`isActive`);
