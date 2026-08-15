CREATE TABLE `capability_jurisdiction_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packageId` int NOT NULL,
	`capabilityId` int NOT NULL,
	`sourceId` int,
	`requiredCredentialType` varchar(120),
	`minimumAssurance` enum('A','B','C','D','E','F') NOT NULL DEFAULT 'F',
	`requiresHumanReview` int NOT NULL DEFAULT 1,
	`ruleStatus` enum('unknown','required','not_required','prohibited') NOT NULL DEFAULT 'unknown',
	`rationale` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `capability_jurisdiction_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `capability_jurisdiction_rules_package_capability_unique` UNIQUE(`packageId`,`capabilityId`)
);
--> statement-breakpoint
CREATE TABLE `jurisdiction_compliance_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jurisdictionId` int NOT NULL,
	`version` varchar(64) NOT NULL,
	`status` enum('draft','legal_review','approved','enabled','blocked','retired') NOT NULL DEFAULT 'draft',
	`summary` text,
	`legalApprovedByUserId` int,
	`legalApprovedAt` timestamp,
	`effectiveFrom` timestamp,
	`effectiveTo` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jurisdiction_compliance_packages_id` PRIMARY KEY(`id`),
	CONSTRAINT `jurisdiction_compliance_packages_version_unique` UNIQUE(`jurisdictionId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `jurisdiction_launch_gates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jurisdictionId` int NOT NULL,
	`packageId` int,
	`status` enum('blocked','review','ready','enabled','suspended') NOT NULL DEFAULT 'blocked',
	`checklistJson` text NOT NULL,
	`blockingReason` text,
	`evaluatedByUserId` int,
	`evaluatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jurisdiction_launch_gates_id` PRIMARY KEY(`id`),
	CONSTRAINT `jurisdiction_launch_gates_jurisdiction_unique` UNIQUE(`jurisdictionId`)
);
--> statement-breakpoint
CREATE TABLE `jurisdictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryCode` varchar(2) NOT NULL,
	`regionCode` varchar(16),
	`displayName` varchar(160) NOT NULL,
	`status` enum('draft','active','suspended') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jurisdictions_id` PRIMARY KEY(`id`),
	CONSTRAINT `jurisdictions_country_region_unique` UNIQUE(`countryCode`,`regionCode`)
);
--> statement-breakpoint
CREATE TABLE `official_compliance_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jurisdictionId` int NOT NULL,
	`authorityName` varchar(200) NOT NULL,
	`sourceUrl` varchar(2048) NOT NULL,
	`sourceVersion` varchar(120) NOT NULL,
	`sourcePublishedAt` timestamp,
	`retrievedAt` timestamp NOT NULL DEFAULT (now()),
	`checksum` varchar(128),
	`status` enum('draft','verified','superseded','revoked') NOT NULL DEFAULT 'draft',
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `official_compliance_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `provider_capability_appeals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerCapabilityStatusId` int NOT NULL,
	`providerId` int NOT NULL,
	`type` enum('appeal','resubmission') NOT NULL,
	`statement` text NOT NULL,
	`status` enum('submitted','under_review','accepted','rejected','withdrawn') NOT NULL DEFAULT 'submitted',
	`resolvedByUserId` int,
	`resolutionNote` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provider_capability_appeals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `provider_capability_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerCapabilityStatusId` int NOT NULL,
	`credentialId` int,
	`decision` enum('verified','limited_scope','manual_review','rejected','suspended') NOT NULL,
	`reviewerUserId` int NOT NULL,
	`rationale` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `provider_capability_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `provider_capability_statuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`capabilityId` int NOT NULL,
	`jurisdictionId` int NOT NULL,
	`status` enum('VERIFIED','VERIFIED_LIMITED_SCOPE','MANUAL_REVIEW','REJECTED','EXPIRED_OR_SUSPENDED','LEGAL_REVIEW_REQUIRED') NOT NULL DEFAULT 'LEGAL_REVIEW_REQUIRED',
	`assuranceLevel` enum('A','B','C','D','E','F') NOT NULL DEFAULT 'F',
	`ruleVersion` varchar(64),
	`scopeNote` varchar(500),
	`evaluatedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`nextCheckAt` timestamp,
	`lastCredentialId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provider_capability_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_capability_statuses_scope_unique` UNIQUE(`providerId`,`capabilityId`,`jurisdictionId`)
);
--> statement-breakpoint
CREATE TABLE `provider_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`jurisdictionId` int NOT NULL,
	`documentId` int,
	`credentialType` varchar(120) NOT NULL,
	`credentialReferenceHash` varchar(128),
	`assuranceLevel` enum('A','B','C','D','E','F') NOT NULL DEFAULT 'F',
	`status` enum('submitted','verified','rejected','expired','suspended','revoked') NOT NULL DEFAULT 'submitted',
	`issuingAuthority` varchar(200),
	`issuedAt` timestamp,
	`expiresAt` timestamp,
	`verifiedAt` timestamp,
	`nextCheckAt` timestamp,
	`reviewedByUserId` int,
	`reviewNote` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provider_credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_capabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(120) NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`categoryId` int,
	`subcategoryId` int,
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_capabilities_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_capabilities_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE INDEX `capability_jurisdiction_rules_capability_idx` ON `capability_jurisdiction_rules` (`capabilityId`,`ruleStatus`);--> statement-breakpoint
CREATE INDEX `jurisdiction_compliance_packages_status_idx` ON `jurisdiction_compliance_packages` (`jurisdictionId`,`status`);--> statement-breakpoint
CREATE INDEX `jurisdiction_launch_gates_status_idx` ON `jurisdiction_launch_gates` (`status`);--> statement-breakpoint
CREATE INDEX `jurisdictions_status_idx` ON `jurisdictions` (`status`);--> statement-breakpoint
CREATE INDEX `official_compliance_sources_jurisdiction_idx` ON `official_compliance_sources` (`jurisdictionId`,`status`);--> statement-breakpoint
CREATE INDEX `official_compliance_sources_reviewer_idx` ON `official_compliance_sources` (`reviewedByUserId`);--> statement-breakpoint
CREATE INDEX `provider_capability_appeals_provider_idx` ON `provider_capability_appeals` (`providerId`,`status`);--> statement-breakpoint
CREATE INDEX `provider_capability_appeals_status_idx` ON `provider_capability_appeals` (`providerCapabilityStatusId`,`status`);--> statement-breakpoint
CREATE INDEX `provider_capability_reviews_status_idx` ON `provider_capability_reviews` (`providerCapabilityStatusId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `provider_capability_reviews_reviewer_idx` ON `provider_capability_reviews` (`reviewerUserId`);--> statement-breakpoint
CREATE INDEX `provider_capability_statuses_matching_idx` ON `provider_capability_statuses` (`capabilityId`,`jurisdictionId`,`status`);--> statement-breakpoint
CREATE INDEX `provider_capability_statuses_recheck_idx` ON `provider_capability_statuses` (`nextCheckAt`);--> statement-breakpoint
CREATE INDEX `provider_credentials_provider_status_idx` ON `provider_credentials` (`providerId`,`status`);--> statement-breakpoint
CREATE INDEX `provider_credentials_recheck_idx` ON `provider_credentials` (`status`,`nextCheckAt`);--> statement-breakpoint
CREATE INDEX `provider_credentials_jurisdiction_type_idx` ON `provider_credentials` (`jurisdictionId`,`credentialType`);--> statement-breakpoint
CREATE INDEX `service_capabilities_catalog_idx` ON `service_capabilities` (`categoryId`,`subcategoryId`,`status`);