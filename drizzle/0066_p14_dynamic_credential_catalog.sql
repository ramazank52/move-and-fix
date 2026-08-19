-- P14-04: Source-provenanced provider credential requirements. The full key
-- intentionally includes jurisdiction, canonical service, capability and
-- reviewed provider operating type; application code resolves only exact rows.
CREATE TABLE IF NOT EXISTS `credential_requirement_catalog` (
  `id` int AUTO_INCREMENT NOT NULL,
  `jurisdictionId` int NOT NULL,
  `categoryId` int NOT NULL,
  `subcategoryId` int NOT NULL,
  `capabilityId` int NOT NULL,
  `providerType` enum('employee','self_employed','sole_trader','company_owner','company_worker') NOT NULL,
  `credentialType` varchar(160) NOT NULL,
  `requirementState` enum('required','conditional','not_required','prohibited','unknown') NOT NULL DEFAULT 'unknown',
  `minimumAssurance` enum('A','B','C','D','E','F') NOT NULL DEFAULT 'F',
  `requiresHumanReview` int NOT NULL DEFAULT 1,
  `officialSourceId` int,
  `sourceReferenceIdsJson` json NOT NULL,
  `sourceVersion` varchar(160) NOT NULL,
  `ruleVersion` varchar(64) NOT NULL,
  `provenanceJson` json NOT NULL,
  `isActive` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `credential_requirement_catalog_pk` PRIMARY KEY (`id`),
  CONSTRAINT `credential_requirement_catalog_key_unique` UNIQUE (`jurisdictionId`,`categoryId`,`subcategoryId`,`capabilityId`,`providerType`,`credentialType`,`ruleVersion`),
  INDEX `credential_requirement_catalog_lookup_idx` (`jurisdictionId`,`categoryId`,`subcategoryId`,`capabilityId`,`providerType`,`isActive`),
  INDEX `credential_requirement_catalog_source_idx` (`officialSourceId`,`ruleVersion`)
);

ALTER TABLE `service_requests`
  ADD COLUMN `credentialRequirementsJson` json NULL AFTER `requiresCredentialHumanReview`;
