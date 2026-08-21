-- Faz 8-A Blok 1: provider-entered capability profiles are separate from
-- credential-evaluation statuses. The FK keeps profile ownership bound to the
-- existing providers table; activation gating remains application-owned because
-- TiDB does not support trigger-based policy enforcement.
CREATE TABLE `provider_capability_profiles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `providerId` int NOT NULL,
  `capabilityKey` varchar(120) NOT NULL,
  `jurisdictionCode` varchar(2) NOT NULL,
  `operatingModel` enum('individual','company') NOT NULL,
  `vehicleType` varchar(120),
  `profileStatus` enum('draft','pending_legal_review','source_unverified','legal_approved','active','suspended') NOT NULL DEFAULT 'draft',
  `legalSourceApprovalRef` varchar(160),
  `productReleaseApprovalRef` varchar(160),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `provider_capability_profiles_id` PRIMARY KEY(`id`),
  CONSTRAINT `provider_capability_profiles_provider_fk`
    FOREIGN KEY (`providerId`) REFERENCES `providers`(`id`) ON DELETE CASCADE,
  CONSTRAINT `provider_capability_profiles_scope_unique`
    UNIQUE(`providerId`,`capabilityKey`,`jurisdictionCode`)
);
--> statement-breakpoint
CREATE INDEX `provider_capability_profiles_status_idx`
  ON `provider_capability_profiles` (`providerId`,`profileStatus`);
--> statement-breakpoint
CREATE INDEX `provider_capability_profiles_capability_idx`
  ON `provider_capability_profiles` (`jurisdictionCode`,`capabilityKey`,`profileStatus`);
