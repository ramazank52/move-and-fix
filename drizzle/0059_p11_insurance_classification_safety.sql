CREATE TABLE `provider_insurance_policies` (
  `id` int AUTO_INCREMENT NOT NULL,
  `providerId` int NOT NULL,
  `insurer` varchar(200) NOT NULL,
  `policyType` varchar(120) NOT NULL,
  `policyReferenceHash` varchar(128) NOT NULL,
  `coverageScopeJson` json NOT NULL,
  `insuredEntityType` enum('person','vehicle','company','other') NOT NULL,
  `insuredVehicleReference` varchar(128) NULL,
  `jurisdictionCode` varchar(16) NOT NULL,
  `issueDate` timestamp NULL,
  `expiryDate` timestamp NOT NULL,
  `verificationStatus` enum('unverified','pending','verified','rejected','expired','manual_approved') NOT NULL DEFAULT 'unverified',
  `verificationSource` varchar(200) NULL,
  `lastCheckedAt` timestamp NULL,
  `documentMediaId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `provider_insurance_policies_id` PRIMARY KEY(`id`),
  CONSTRAINT `provider_insurance_policies_provider_ref_unique` UNIQUE(`providerId`,`policyReferenceHash`)
);
CREATE INDEX `provider_insurance_policies_provider_status_idx` ON `provider_insurance_policies` (`providerId`,`verificationStatus`,`expiryDate`);
CREATE INDEX `provider_insurance_policies_jurisdiction_idx` ON `provider_insurance_policies` (`jurisdictionCode`,`verificationStatus`);
CREATE TABLE `provider_operating_models` (
  `id` int AUTO_INCREMENT NOT NULL,
  `providerId` int NOT NULL,
  `jurisdictionCode` varchar(16) NOT NULL,
  `operatingModel` enum('employee','self_employed','sole_trader','company_owner','company_worker','unresolved') NOT NULL DEFAULT 'unresolved',
  `classificationMetadataJson` json NULL,
  `reviewStatus` enum('pending','verified','needs_legal_review','rejected') NOT NULL DEFAULT 'pending',
  `reviewedByUserId` int NULL,
  `reviewedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `provider_operating_models_id` PRIMARY KEY(`id`),
  CONSTRAINT `provider_operating_models_provider_jurisdiction_unique` UNIQUE(`providerId`,`jurisdictionCode`)
);
CREATE INDEX `provider_operating_models_review_idx` ON `provider_operating_models` (`jurisdictionCode`,`reviewStatus`);
CREATE TABLE `job_safety_rules` (
  `id` int AUTO_INCREMENT NOT NULL,
  `jurisdictionCode` varchar(16) NOT NULL,
  `categoryId` int NULL,
  `serviceKey` varchar(120) NULL,
  `activityStatus` enum('allowed','restricted','high_risk','prohibited','emergency_only') NOT NULL,
  `riskAttributesJson` json NOT NULL,
  `prerequisitesJson` json NOT NULL,
  `version` varchar(64) NOT NULL,
  `status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `job_safety_rules_id` PRIMARY KEY(`id`),
  CONSTRAINT `job_safety_rules_scope_version_unique` UNIQUE(`jurisdictionCode`,`categoryId`,`serviceKey`,`version`)
);
CREATE INDEX `job_safety_rules_active_lookup_idx` ON `job_safety_rules` (`jurisdictionCode`,`categoryId`,`status`);

