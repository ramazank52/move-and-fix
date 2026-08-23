-- US-CA-LOS_ANGELES v2 research scaffold. All seed records are default-off.
-- This migration does not alter Turkey, Berlin, provider profiles, users, or production feature flags.
CREATE TABLE `country_rule_pack_versions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `jurisdictionNodeId` int NOT NULL,
  `version` varchar(80) NOT NULL,
  `researchSeedHash` varchar(128) NOT NULL,
  `state` enum('AI_RESEARCHED_UNVERIFIED','SOURCE_REVIEW','LEGAL_REVIEW','APPROVED','REVOKED') NOT NULL DEFAULT 'AI_RESEARCHED_UNVERIFIED',
  `legalApprovalLedgerId` int NULL,
  `activatedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `country_rule_pack_versions_id` PRIMARY KEY(`id`),
  CONSTRAINT `country_rule_pack_versions_scope_unique` UNIQUE(`countryDeploymentId`,`jurisdictionNodeId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `country_service_coverage` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `jurisdictionNodeId` int NOT NULL,
  `canonicalCategoryId` int NOT NULL,
  `canonicalSubcategoryId` int NOT NULL,
  `researchRowId` varchar(240) NOT NULL,
  `researchRulePackVersion` varchar(80) NOT NULL,
  `researchRowHash` varchar(128) NOT NULL,
  `mappingState` enum('MAPPED_BLOCKED','UNMAPPED_SERVICE_BLOCKED') NOT NULL DEFAULT 'UNMAPPED_SERVICE_BLOCKED',
  `sourceState` enum('AI_RESEARCHED_UNVERIFIED','SOURCE_UNVERIFIED','SOURCE_VERIFIED') NOT NULL DEFAULT 'AI_RESEARCHED_UNVERIFIED',
  `legalState` enum('NOT_REVIEWED','PENDING','APPROVED','REVOKED','EXPIRED') NOT NULL DEFAULT 'NOT_REVIEWED',
  `connectorState` enum('NOT_IMPLEMENTED_OR_NOT_AUTHORIZED','PENDING','AUTHORIZED','OPERATIONAL','REVOKED') NOT NULL DEFAULT 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED',
  `productionState` enum('BLOCKED_PENDING_GATES','NO_GO','POLICY_ELIGIBLE','ACTIVE') NOT NULL DEFAULT 'BLOCKED_PENDING_GATES',
  `riskLevel` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  `mandatoryEvidenceJson` json NOT NULL,
  `intakeQuestionsJson` json NOT NULL,
  `sourceIdsJson` json NOT NULL,
  `conditionalTriggerSummary` text NULL,
  `missingEvidenceDecision` varchar(120) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `country_service_coverage_id` PRIMARY KEY(`id`),
  CONSTRAINT `country_service_coverage_scope_subservice_unique` UNIQUE(`countryDeploymentId`,`jurisdictionNodeId`,`canonicalSubcategoryId`),
  CONSTRAINT `country_service_coverage_research_row_unique` UNIQUE(`countryDeploymentId`,`researchRowId`,`researchRulePackVersion`)
);
--> statement-breakpoint
CREATE TABLE `country_requirement_bundles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `rulePackVersionId` int NOT NULL,
  `bundleKey` varchar(160) NOT NULL,
  `title` varchar(320) NOT NULL,
  `riskLevel` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  `sourceState` enum('AI_RESEARCHED_UNVERIFIED','SOURCE_UNVERIFIED','SOURCE_VERIFIED') NOT NULL DEFAULT 'AI_RESEARCHED_UNVERIFIED',
  `legalState` enum('NOT_REVIEWED','PENDING','APPROVED','REVOKED','EXPIRED') NOT NULL DEFAULT 'NOT_REVIEWED',
  `decisionIfMissing` varchar(120) NOT NULL,
  `triggerDescription` text NOT NULL,
  `verificationDescription` text NOT NULL,
  `requiredEvidenceJson` json NOT NULL,
  `subjectTypesJson` json NOT NULL,
  `note` text NULL,
  `researchHash` varchar(128) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `country_requirement_bundles_id` PRIMARY KEY(`id`),
  CONSTRAINT `country_requirement_bundles_scope_unique` UNIQUE(`countryDeploymentId`,`rulePackVersionId`,`bundleKey`)
);
--> statement-breakpoint
CREATE TABLE `country_coverage_bundle_bindings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `coverageId` int NOT NULL,
  `bundleId` int NOT NULL,
  `bindingKind` enum('MANDATORY','CONDITIONAL') NOT NULL,
  `conditionSummary` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `country_coverage_bundle_bindings_id` PRIMARY KEY(`id`),
  CONSTRAINT `country_coverage_bundle_binding_unique` UNIQUE(`coverageId`,`bundleId`,`bindingKind`)
);
--> statement-breakpoint
CREATE TABLE `country_requirement_subject_bindings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `bundleId` int NOT NULL,
  `subjectType` enum('PERSON','BUSINESS','QUALIFIED_MANAGER','DRIVER','VEHICLE','SITE','OPERATOR','PROJECT','CUSTOMER_AUTHORITY','POLICY','QUALIFIER') NOT NULL,
  `required` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `country_requirement_subject_bindings_id` PRIMARY KEY(`id`),
  CONSTRAINT `country_requirement_subject_binding_unique` UNIQUE(`bundleId`,`subjectType`)
);
--> statement-breakpoint
CREATE TABLE `country_source_archives` (
  `id` int AUTO_INCREMENT NOT NULL,
  `officialSourceId` int NOT NULL,
  `retrievalHash` varchar(128) NOT NULL,
  `archiveReference` varchar(512) NOT NULL,
  `sectionReference` varchar(320) NULL,
  `effectiveDateText` varchar(160) NULL,
  `exceptionText` text NULL,
  `researchState` enum('AI_RESEARCHED_UNVERIFIED','SOURCE_UNVERIFIED','SOURCE_VERIFIED','SUPERSEDED') NOT NULL DEFAULT 'AI_RESEARCHED_UNVERIFIED',
  `retrievedAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `country_source_archives_id` PRIMARY KEY(`id`),
  CONSTRAINT `country_source_archives_source_hash_unique` UNIQUE(`officialSourceId`,`retrievalHash`)
);
--> statement-breakpoint
CREATE TABLE `country_requirement_source_bindings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `bundleId` int NOT NULL,
  `officialSourceId` int NOT NULL,
  `sourceArchiveId` int NOT NULL,
  `requirementReference` varchar(320) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `country_requirement_source_bindings_id` PRIMARY KEY(`id`),
  CONSTRAINT `country_requirement_source_binding_unique` UNIQUE(`bundleId`,`officialSourceId`)
);
--> statement-breakpoint
CREATE TABLE `country_coverage_policy_decisions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `coverageId` int NOT NULL,
  `rulePackVersionId` int NOT NULL,
  `decision` enum('BLOCKED','PROFILE_INCOMPLETE','LEGAL_REVIEW_REQUIRED','PENDING_OFFICIAL_VERIFICATION','AUTHORITY_VERIFIED','POLICY_ELIGIBLE','VERIFIED_LIMITED_SCOPE','REJECTED','EXPIRED_OR_SUSPENDED','NO_GO') NOT NULL DEFAULT 'BLOCKED',
  `assuranceLevel` enum('SELF_ASSERTED','DOCUMENT_UPLOADED','DOCUMENT_EXTRACTED','ISSUER_SIGNATURE_VERIFIED','REGISTRY_MATCHED','REGISTRY_STATUS_ACTIVE','REVOCATION_MONITORED') NOT NULL DEFAULT 'SELF_ASSERTED',
  `sourceState` enum('AI_RESEARCHED_UNVERIFIED','SOURCE_UNVERIFIED','SOURCE_VERIFIED') NOT NULL DEFAULT 'AI_RESEARCHED_UNVERIFIED',
  `connectorState` enum('NOT_IMPLEMENTED_OR_NOT_AUTHORIZED','PENDING','AUTHORIZED','OPERATIONAL','REVOKED') NOT NULL DEFAULT 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED',
  `legalApprovalState` enum('NOT_REVIEWED','PENDING','APPROVED','REVOKED','EXPIRED') NOT NULL DEFAULT 'NOT_REVIEWED',
  `productReleaseState` enum('PENDING','APPROVED','REVOKED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `stateVersion` int NOT NULL DEFAULT 1,
  `reasonCodesJson` json NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `country_coverage_policy_decisions_id` PRIMARY KEY(`id`),
  CONSTRAINT `country_coverage_policy_decisions_coverage_unique` UNIQUE(`coverageId`)
);
--> statement-breakpoint
CREATE TABLE `country_coverage_policy_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `coveragePolicyDecisionId` int NOT NULL,
  `eventType` enum('SEEDED','REVIEW_REQUESTED','SUSPENDED','REVOKED','EVIDENCE_REJECTED') NOT NULL,
  `actorUserId` int NULL,
  `reasonCode` varchar(160) NOT NULL,
  `evidenceHash` varchar(128) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `country_coverage_policy_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `country_active_provider_transitions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `coverageId` int NOT NULL,
  `providerId` int NOT NULL,
  `state` enum('NOT_APPLICABLE','PENDING_OWNER_APPROVAL','WINDOW_APPROVED','NOTIFIED','BLOCKED','EXPIRED_OR_SUSPENDED') NOT NULL DEFAULT 'NOT_APPLICABLE',
  `transitionWindowEndsAt` timestamp NULL,
  `ownerApprovalLedgerId` int NULL,
  `notificationEvidenceHash` varchar(128) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `country_active_provider_transitions_id` PRIMARY KEY(`id`),
  CONSTRAINT `country_active_provider_transition_unique` UNIQUE(`coverageId`,`providerId`)
);
--> statement-breakpoint
ALTER TABLE `country_rule_pack_versions` ADD CONSTRAINT `fk_country_rule_pack_deployment` FOREIGN KEY (`countryDeploymentId`) REFERENCES `country_deployments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_rule_pack_versions` ADD CONSTRAINT `fk_country_rule_pack_jurisdiction` FOREIGN KEY (`jurisdictionNodeId`) REFERENCES `jurisdiction_nodes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_rule_pack_versions` ADD CONSTRAINT `fk_country_rule_pack_legal_ledger` FOREIGN KEY (`legalApprovalLedgerId`) REFERENCES `approval_ledger`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_service_coverage` ADD CONSTRAINT `fk_country_service_coverage_deployment` FOREIGN KEY (`countryDeploymentId`) REFERENCES `country_deployments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_service_coverage` ADD CONSTRAINT `fk_country_service_coverage_jurisdiction` FOREIGN KEY (`jurisdictionNodeId`) REFERENCES `jurisdiction_nodes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_service_coverage` ADD CONSTRAINT `fk_country_service_coverage_category` FOREIGN KEY (`canonicalCategoryId`) REFERENCES `service_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_service_coverage` ADD CONSTRAINT `fk_country_service_coverage_subcategory` FOREIGN KEY (`canonicalSubcategoryId`) REFERENCES `service_subcategories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_requirement_bundles` ADD CONSTRAINT `fk_country_requirement_bundle_deployment` FOREIGN KEY (`countryDeploymentId`) REFERENCES `country_deployments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_requirement_bundles` ADD CONSTRAINT `fk_country_requirement_bundle_rule_pack` FOREIGN KEY (`rulePackVersionId`) REFERENCES `country_rule_pack_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_coverage_bundle_bindings` ADD CONSTRAINT `fk_country_coverage_bundle_coverage` FOREIGN KEY (`coverageId`) REFERENCES `country_service_coverage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_coverage_bundle_bindings` ADD CONSTRAINT `fk_country_coverage_bundle_bundle` FOREIGN KEY (`bundleId`) REFERENCES `country_requirement_bundles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_requirement_subject_bindings` ADD CONSTRAINT `fk_country_requirement_subject_bundle` FOREIGN KEY (`bundleId`) REFERENCES `country_requirement_bundles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_source_archives` ADD CONSTRAINT `fk_country_source_archive_source` FOREIGN KEY (`officialSourceId`) REFERENCES `official_sources`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_requirement_source_bindings` ADD CONSTRAINT `fk_country_requirement_source_bundle` FOREIGN KEY (`bundleId`) REFERENCES `country_requirement_bundles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_requirement_source_bindings` ADD CONSTRAINT `fk_country_requirement_source_source` FOREIGN KEY (`officialSourceId`) REFERENCES `official_sources`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_requirement_source_bindings` ADD CONSTRAINT `fk_country_requirement_source_archive` FOREIGN KEY (`sourceArchiveId`) REFERENCES `country_source_archives`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_coverage_policy_decisions` ADD CONSTRAINT `fk_country_coverage_policy_coverage` FOREIGN KEY (`coverageId`) REFERENCES `country_service_coverage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_coverage_policy_decisions` ADD CONSTRAINT `fk_country_coverage_policy_rule_pack` FOREIGN KEY (`rulePackVersionId`) REFERENCES `country_rule_pack_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_coverage_policy_events` ADD CONSTRAINT `fk_country_coverage_policy_event_decision` FOREIGN KEY (`coveragePolicyDecisionId`) REFERENCES `country_coverage_policy_decisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_coverage_policy_events` ADD CONSTRAINT `fk_country_coverage_policy_event_actor` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_active_provider_transitions` ADD CONSTRAINT `fk_country_active_provider_transition_coverage` FOREIGN KEY (`coverageId`) REFERENCES `country_service_coverage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_active_provider_transitions` ADD CONSTRAINT `fk_country_active_provider_transition_provider` FOREIGN KEY (`providerId`) REFERENCES `providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE `country_active_provider_transitions` ADD CONSTRAINT `fk_country_active_provider_transition_ledger` FOREIGN KEY (`ownerApprovalLedgerId`) REFERENCES `approval_ledger`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
CREATE INDEX `country_service_coverage_policy_idx` ON `country_service_coverage` (`countryDeploymentId`,`productionState`,`mappingState`);
--> statement-breakpoint
CREATE INDEX `country_requirement_bundles_state_idx` ON `country_requirement_bundles` (`countryDeploymentId`,`sourceState`,`legalState`);
--> statement-breakpoint
CREATE INDEX `country_coverage_policy_decisions_decision_idx` ON `country_coverage_policy_decisions` (`decision`,`sourceState`,`connectorState`);
--> statement-breakpoint
CREATE INDEX `country_coverage_policy_events_decision_idx` ON `country_coverage_policy_events` (`coveragePolicyDecisionId`,`createdAt`);
--> statement-breakpoint
--> statement-breakpoint
INSERT INTO jurisdiction_nodes (countryDeploymentId,parentId,nodeCode,displayName,nodeType,state,locale,currency,timeZone,addressProfile)
SELECT deployment.id, root.id, 'US-CA-CALIFORNIA', 'California', 'state', 'SCAFFOLD_ONLY', 'en-US', 'USD', 'America/Los_Angeles', 'UNKNOWN'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes root ON root.countryDeploymentId = deployment.id AND root.nodeCode = 'US'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO jurisdiction_nodes (countryDeploymentId,parentId,nodeCode,displayName,nodeType,state,locale,currency,timeZone,addressProfile)
SELECT deployment.id, california.id, 'US-CA-LOS_ANGELES', 'Los Angeles', 'city', 'SCAFFOLD_ONLY', 'en-US', 'USD', 'America/Los_Angeles', 'UNKNOWN'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes california ON california.countryDeploymentId = deployment.id AND california.nodeCode = 'US-CA-CALIFORNIA'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_rule_pack_versions (countryDeploymentId,jurisdictionNodeId,version,researchSeedHash,state)
SELECT deployment.id, los_angeles.id, '2.0.0-research', 'fdfd86c0dc97bfbacd0f46f3a03490d1aa67aafa7de6a9040d25bad744ef0fd6', 'AI_RESEARCHED_UNVERIFIED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'G-NIST-IAL', 'NIST', 'https://pages.nist.gov/800-63-4/sp800-63a.html', 'v2-research-2026-08-22', '0243178194af89282fbb010fe139f4f404b8efc2d03ecfeb4a147254d3e4c96c', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '0243178194af89282fbb010fe139f4f404b8efc2d03ecfeb4a147254d3e4c96c', 'mf5-v2-research:G-NIST-IAL:0243178194af89282fbb010fe139f4f404b8efc2d03ecfeb4a147254d3e4c96c', 'Research source: NIST SP 800-63A — Identity Proofing', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'G-NIST-IAL' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_G-NIST-IAL', 'Research candidate — NIST', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'G-NIST-IAL'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'G-W3C-VC', 'W3C', 'https://www.w3.org/TR/vc-data-model-2.0/', 'v2-research-2026-08-22', '154b2cb06b5ad2701de94008f8fcac872d9479302413e473b0b09b60a4b1e5ec', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '154b2cb06b5ad2701de94008f8fcac872d9479302413e473b0b09b60a4b1e5ec', 'mf5-v2-research:G-W3C-VC:154b2cb06b5ad2701de94008f8fcac872d9479302413e473b0b09b60a4b1e5ec', 'Research source: Verifiable Credentials Data Model 2.0', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'G-W3C-VC' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_G-W3C-VC', 'Research candidate — W3C', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'G-W3C-VC'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-BAR-ARD', 'California Bureau of Automotive Repair', 'https://www.bar.ca.gov/apply', 'v2-research-2026-08-22', '5860b1f4bd6947d9b26e300bdd05d45f376fe70ff6b47030cb5c87804f7c55df', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '5860b1f4bd6947d9b26e300bdd05d45f376fe70ff6b47030cb5c87804f7c55df', 'mf5-v2-research:US-BAR-ARD:5860b1f4bd6947d9b26e300bdd05d45f376fe70ff6b47030cb5c87804f7c55df', 'Research source: Apply for an Automotive Repair Dealer registration', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-BAR-ARD' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-BAR-ARD', 'Research candidate — California Bureau of Automotive Repair', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BAR-ARD'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-BAR-LOOKUP', 'California BAR', 'https://bar.ca.gov/public-records', 'v2-research-2026-08-22', 'fd237a7190860fc98f28c18d96a6fb9e2f8cfd105f56c3b174c55bc6874d8e9e', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'fd237a7190860fc98f28c18d96a6fb9e2f8cfd105f56c3b174c55bc6874d8e9e', 'mf5-v2-research:US-BAR-LOOKUP:fd237a7190860fc98f28c18d96a6fb9e2f8cfd105f56c3b174c55bc6874d8e9e', 'Research source: Public records and licence lookup', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-BAR-LOOKUP' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-BAR-LOOKUP', 'Research candidate — California BAR', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BAR-LOOKUP'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-BC-LICENSE', 'California Board of Barbering and Cosmetology', 'https://www.barbercosmo.ca.gov/licensees/', 'v2-research-2026-08-22', 'da816e7114feadd3d287f14132fe2e0a02c7c115a39b85b4314ec7d17d0d0423', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'da816e7114feadd3d287f14132fe2e0a02c7c115a39b85b4314ec7d17d0d0423', 'mf5-v2-research:US-BC-LICENSE:da816e7114feadd3d287f14132fe2e0a02c7c115a39b85b4314ec7d17d0d0423', 'Research source: Licensee scope', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-BC-LICENSE' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-BC-LICENSE', 'Research candidate — California Board of Barbering and Cosmetology', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BC-LICENSE'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-BC-PSP', 'California Board of Barbering and Cosmetology', 'https://barbercosmo.ca.gov/licensees/psp_info.shtml', 'v2-research-2026-08-22', 'c3d28576478f8ce2a5289c0c1bdba894e5742ca13824d701a9de70784fb26b91', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'c3d28576478f8ce2a5289c0c1bdba894e5742ca13824d701a9de70784fb26b91', 'mf5-v2-research:US-BC-PSP:c3d28576478f8ce2a5289c0c1bdba894e5742ca13824d701a9de70784fb26b91', 'Research source: Personal Service Permit', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-BC-PSP' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-BC-PSP', 'Research candidate — California Board of Barbering and Cosmetology', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BC-PSP'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-BHGS-MOVER', 'California BHGS', 'https://www.bhgs.dca.ca.gov/licensee/hhm_faqs.shtml', 'v2-research-2026-08-22', 'be4c3f629910b8d818f67458899e5230cd7f3f6d66683ccdeb8f011098f17070', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'be4c3f629910b8d818f67458899e5230cd7f3f6d66683ccdeb8f011098f17070', 'mf5-v2-research:US-BHGS-MOVER:be4c3f629910b8d818f67458899e5230cd7f3f6d66683ccdeb8f011098f17070', 'Research source: Household movers FAQ', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-BHGS-MOVER' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-BHGS-MOVER', 'Research candidate — California BHGS', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BHGS-MOVER'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-BHGS-REPAIR', 'California BHGS', 'https://bhgs.dca.ca.gov/licensee/bear_faqs.shtml', 'v2-research-2026-08-22', 'e8c3ed7007aef646c63968185d504557004443b45529739dc5d31447d90efadf', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'e8c3ed7007aef646c63968185d504557004443b45529739dc5d31447d90efadf', 'mf5-v2-research:US-BHGS-REPAIR:e8c3ed7007aef646c63968185d504557004443b45529739dc5d31447d90efadf', 'Research source: Electronic/Appliance Service Dealer FAQ', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-BHGS-REPAIR' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-BHGS-REPAIR', 'Research candidate — California BHGS', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BHGS-REPAIR'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-BPC-7048', 'California Legislature', 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7048.', 'v2-research-2026-08-22', '2f84256b59faed7c48e6bc052fb30448ef127f15c66854e2d0e5a1909fbc636f', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '2f84256b59faed7c48e6bc052fb30448ef127f15c66854e2d0e5a1909fbc636f', 'mf5-v2-research:US-BPC-7048:2f84256b59faed7c48e6bc052fb30448ef127f15c66854e2d0e5a1909fbc636f', 'Research source: Business and Professions Code §7048', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-BPC-7048' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-BPC-7048', 'Research candidate — California Legislature', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BPC-7048'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-BSIS-ALARM', 'California BSIS', 'https://www.bsis.ca.gov/forms_pubs/alarm_fact.shtml', 'v2-research-2026-08-22', '2dbedc40316e44f430dcaec65be861a03ae5f974246e3e75c017dea4e5135553', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '2dbedc40316e44f430dcaec65be861a03ae5f974246e3e75c017dea4e5135553', 'mf5-v2-research:US-BSIS-ALARM:2dbedc40316e44f430dcaec65be861a03ae5f974246e3e75c017dea4e5135553', 'Research source: Alarm company operator facts', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-BSIS-ALARM' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-BSIS-ALARM', 'Research candidate — California BSIS', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BSIS-ALARM'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-BSIS-LOCK', 'California BSIS', 'https://www.bsis.ca.gov/forms_pubs/locksmith_fact.shtml', 'v2-research-2026-08-22', '03d57cf303aea724ed64822fd669fe8c97ee697d33876d71c88dd92c7cf47663', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '03d57cf303aea724ed64822fd669fe8c97ee697d33876d71c88dd92c7cf47663', 'mf5-v2-research:US-BSIS-LOCK:03d57cf303aea724ed64822fd669fe8c97ee697d33876d71c88dd92c7cf47663', 'Research source: Locksmith company and employee facts', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-BSIS-LOCK' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-BSIS-LOCK', 'Research candidate — California BSIS', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BSIS-LOCK'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-BSIS-VERIFY', 'California BSIS', 'https://www.bsis.ca.gov/forms_pubs/online_services/verify_license.shtml', 'v2-research-2026-08-22', 'e6488a6f04e957163973216f5f4ffe0908eae258280c8fc0f4b1ec626f53c0e5', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'e6488a6f04e957163973216f5f4ffe0908eae258280c8fc0f4b1ec626f53c0e5', 'mf5-v2-research:US-BSIS-VERIFY:e6488a6f04e957163973216f5f4ffe0908eae258280c8fc0f4b1ec626f53c0e5', 'Research source: Verify a license', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-BSIS-VERIFY' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-BSIS-VERIFY', 'Research candidate — California BSIS', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BSIS-VERIFY'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-CAMTC', 'California Massage Therapy Council', 'https://www.camtc.org/faqs/', 'v2-research-2026-08-22', '294a315c27fe25a9558170b3fbae732ff868faf476370e7b6b1fc910d827361f', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '294a315c27fe25a9558170b3fbae732ff868faf476370e7b6b1fc910d827361f', 'mf5-v2-research:US-CAMTC:294a315c27fe25a9558170b3fbae732ff868faf476370e7b6b1fc910d827361f', 'Research source: Certification FAQ', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-CAMTC' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-CAMTC', 'Research candidate — California Massage Therapy Council', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-CAMTC'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-CSLB-CLASS', 'California CSLB', 'https://www2.cslb.ca.gov/about_us/library/licensing_classifications/', 'v2-research-2026-08-22', '40495eac84c80c8cb4b11aeb95ecfa12effafffc5cdaca4f115b36499b01b7ef', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '40495eac84c80c8cb4b11aeb95ecfa12effafffc5cdaca4f115b36499b01b7ef', 'mf5-v2-research:US-CSLB-CLASS:40495eac84c80c8cb4b11aeb95ecfa12effafffc5cdaca4f115b36499b01b7ef', 'Research source: Contractor licence classifications', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-CSLB-CLASS' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-CSLB-CLASS', 'Research candidate — California CSLB', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-CSLB-CLASS'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-CSLB-TRIGGER', 'California CSLB', 'https://www.cslb.ca.gov/Consumers/Hire_A_Contractor/What_Kind_Of_Contractor.aspx', 'v2-research-2026-08-22', 'c95d549b74d05050b44a27b3d8abc457ef18f1bf6691c588271cd9e054063aca', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'c95d549b74d05050b44a27b3d8abc457ef18f1bf6691c588271cd9e054063aca', 'mf5-v2-research:US-CSLB-TRIGGER:c95d549b74d05050b44a27b3d8abc457ef18f1bf6691c588271cd9e054063aca', 'Research source: What Kind of Contractor Do You Need?', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-CSLB-TRIGGER' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-CSLB-TRIGGER', 'Research candidate — California CSLB', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-CSLB-TRIGGER'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-CSLB-VERIFY', 'California CSLB', 'https://www.cslb.ca.gov/Onlineservices/DataPortal/ListByClassification.aspx', 'v2-research-2026-08-22', '0975dde4b8f3e893d641d17b477d75a6600c16d76509add477b825ff26c64d28', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '0975dde4b8f3e893d641d17b477d75a6600c16d76509add477b825ff26c64d28', 'mf5-v2-research:US-CSLB-VERIFY:0975dde4b8f3e893d641d17b477d75a6600c16d76509add477b825ff26c64d28', 'Research source: Contractor data portal', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-CSLB-VERIFY' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-CSLB-VERIFY', 'Research candidate — California CSLB', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-CSLB-VERIFY'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-DCA-LOOKUP', 'California DCA', 'https://search.dca.ca.gov/', 'v2-research-2026-08-22', 'da8882518c9b5f0edd1ae73b08245c468c7319a9b42b38a01ced40b43643dc2a', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'da8882518c9b5f0edd1ae73b08245c468c7319a9b42b38a01ced40b43643dc2a', 'mf5-v2-research:US-DCA-LOOKUP:da8882518c9b5f0edd1ae73b08245c468c7319a9b42b38a01ced40b43643dc2a', 'Research source: License search', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-DCA-LOOKUP' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-DCA-LOOKUP', 'Research candidate — California DCA', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-DCA-LOOKUP'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-DIR-ASBESTOS', 'California DIR', 'https://www.dir.ca.gov/dosh/asbestos.html', 'v2-research-2026-08-22', 'fa552dff0b985fc061761c97a176dd99d365f1c7eefb777db40b2b1ed5b9072a', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'fa552dff0b985fc061761c97a176dd99d365f1c7eefb777db40b2b1ed5b9072a', 'mf5-v2-research:US-DIR-ASBESTOS:fa552dff0b985fc061761c97a176dd99d365f1c7eefb777db40b2b1ed5b9072a', 'Research source: Asbestos registration', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-DIR-ASBESTOS' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-DIR-ASBESTOS', 'Research candidate — California DIR', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-DIR-ASBESTOS'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-DMV-CDL', 'California DMV', 'https://www.dmv.ca.gov/portal/driver-licenses-identification-cards/commercial-driver-licenses-cdl/commercial-driver-license-classes-certifications/', 'v2-research-2026-08-22', 'c64227c168cb624ecfd611e813cc565317543bf72ef0b93b299d67671019c7de', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'c64227c168cb624ecfd611e813cc565317543bf72ef0b93b299d67671019c7de', 'mf5-v2-research:US-DMV-CDL:c64227c168cb624ecfd611e813cc565317543bf72ef0b93b299d67671019c7de', 'Research source: Commercial driver licence classes', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-DMV-CDL' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-DMV-CDL', 'Research candidate — California DMV', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-DMV-CDL'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-DMV-MCP', 'California DMV', 'https://www.dmv.ca.gov/portal/vehicle-industry-services/motor-carrier-services-mcs/motor-carrier-permits/', 'v2-research-2026-08-22', '616027d6221b84bbc0b8c2d436f640f802ce3b6167d8cb44d8ba0cc7537bed2b', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '616027d6221b84bbc0b8c2d436f640f802ce3b6167d8cb44d8ba0cc7537bed2b', 'mf5-v2-research:US-DMV-MCP:616027d6221b84bbc0b8c2d436f640f802ce3b6167d8cb44d8ba0cc7537bed2b', 'Research source: Motor Carrier Permits', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-DMV-MCP' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-DMV-MCP', 'Research candidate — California DMV', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-DMV-MCP'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-DMV-TTD', 'California DMV', 'https://www.dmv.ca.gov/portal/driver-education-and-safety/dmv-safety-guidelines-actions/driver-license-certificates-and-endorsements/', 'v2-research-2026-08-22', '645e5daa014dbb85ca5ed71cbfa5020418d5ce63fdfffb63c71a9820251dde6d', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '645e5daa014dbb85ca5ed71cbfa5020418d5ce63fdfffb63c71a9820251dde6d', 'mf5-v2-research:US-DMV-TTD:645e5daa014dbb85ca5ed71cbfa5020418d5ce63fdfffb63c71a9820251dde6d', 'Research source: Driver licence certificates and endorsements', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-DMV-TTD' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-DMV-TTD', 'Research candidate — California DMV', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-DMV-TTD'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-DPR-PEST', 'California DPR', 'https://apps.cdpr.ca.gov/docs/license/currlic.cfm', 'v2-research-2026-08-22', '1551d009f2dc46b0aaf2bb2fa7d20aafa6378d79d3e50fd44b0151004188742b', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '1551d009f2dc46b0aaf2bb2fa7d20aafa6378d79d3e50fd44b0151004188742b', 'mf5-v2-research:US-DPR-PEST:1551d009f2dc46b0aaf2bb2fa7d20aafa6378d79d3e50fd44b0151004188742b', 'Research source: Current licence lists', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-DPR-PEST' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-DPR-PEST', 'Research candidate — California DPR', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-DPR-PEST'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-EPA-608', 'US EPA', 'https://www.epa.gov/section608/section-608-technician-certification-requirements', 'v2-research-2026-08-22', '85d0f527f246912a98e18bd3c246e04604b299d3276267639f96f76d4fc9fe2e', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '85d0f527f246912a98e18bd3c246e04604b299d3276267639f96f76d4fc9fe2e', 'mf5-v2-research:US-EPA-608:85d0f527f246912a98e18bd3c246e04604b299d3276267639f96f76d4fc9fe2e', 'Research source: Section 608 Technician Certification', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-EPA-608' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-EPA-608', 'Research candidate — US EPA', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-EPA-608'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-EPA-RRP', 'US EPA', 'https://www.epa.gov/lead/renovation-repair-and-painting-program-contractors', 'v2-research-2026-08-22', 'a18e806414ceaab279fc19c83443a842d66a3a23f6699d5bb890ff162a4fb8e8', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'a18e806414ceaab279fc19c83443a842d66a3a23f6699d5bb890ff162a4fb8e8', 'mf5-v2-research:US-EPA-RRP:a18e806414ceaab279fc19c83443a842d66a3a23f6699d5bb890ff162a4fb8e8', 'Research source: Renovation, Repair and Painting Program', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-EPA-RRP' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-EPA-RRP', 'Research candidate — US EPA', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-EPA-RRP'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-FMCSA-AUTH', 'FMCSA', 'https://www.fmcsa.dot.gov/registration/get-mc-number-authority-operate', 'v2-research-2026-08-22', '9ee401195852c4d7df7872f35280ebe95a48b1469d9adc46043f94b424381bd7', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, '9ee401195852c4d7df7872f35280ebe95a48b1469d9adc46043f94b424381bd7', 'mf5-v2-research:US-FMCSA-AUTH:9ee401195852c4d7df7872f35280ebe95a48b1469d9adc46043f94b424381bd7', 'Research source: Operating authority', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-FMCSA-AUTH' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-FMCSA-AUTH', 'Research candidate — FMCSA', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-FMCSA-AUTH'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-FMCSA-MOVER', 'FMCSA', 'https://www.fmcsa.dot.gov/protect-your-move/search-mover', 'v2-research-2026-08-22', 'fc6ad1e18019b08d1b35d9241c801257ca28fdd63e43ed1e035d69ceba3dbdba', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'fc6ad1e18019b08d1b35d9241c801257ca28fdd63e43ed1e035d69ceba3dbdba', 'mf5-v2-research:US-FMCSA-MOVER:fc6ad1e18019b08d1b35d9241c801257ca28fdd63e43ed1e035d69ceba3dbdba', 'Research source: Search for a registered mover', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-FMCSA-MOVER' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-FMCSA-MOVER', 'Research candidate — FMCSA', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-FMCSA-MOVER'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-LA-BTRC', 'City of Los Angeles Office of Finance', 'https://finance.lacity.gov/tax-education/new-business-registration/how-register-btrc', 'v2-research-2026-08-22', 'd068f5b2be7ea22fffb2955336ef2344dd21db397a51fea5c300f3954f97002e', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'd068f5b2be7ea22fffb2955336ef2344dd21db397a51fea5c300f3954f97002e', 'mf5-v2-research:US-LA-BTRC:d068f5b2be7ea22fffb2955336ef2344dd21db397a51fea5c300f3954f97002e', 'Research source: Business Tax Registration Certificate', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-LA-BTRC' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-LA-BTRC', 'Research candidate — City of Los Angeles Office of Finance', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-LA-BTRC'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO official_sources (countryDeploymentId,jurisdictionNodeId,sourceKey,authorityName,sourceUrl,sourceVersion,sourceHash,sourceStatus,retrievalMethod)
SELECT deployment.id, los_angeles.id, 'US-LA-TOW', 'Los Angeles Police Department', 'https://www.lapdonline.org/permit-requirements-for-tow-unit-operator/', 'v2-research-2026-08-22', 'ddb351446b4378ae7c0e11f5de7b9458125d8c27e5504570773fe45f1dacc715', 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_source_archives (officialSourceId,retrievalHash,archiveReference,sectionReference,effectiveDateText,exceptionText,researchState,retrievedAt)
SELECT source.id, 'ddb351446b4378ae7c0e11f5de7b9458125d8c27e5504570773fe45f1dacc715', 'mf5-v2-research:US-LA-TOW:ddb351446b4378ae7c0e11f5de7b9458125d8c27e5504570773fe45f1dacc715', 'Research source: Tow Unit Operator permit requirements', NULL, NULL, 'AI_RESEARCHED_UNVERIFIED', CURRENT_TIMESTAMP
FROM official_sources source INNER JOIN country_deployments deployment ON deployment.id = source.countryDeploymentId
WHERE deployment.countryCode = 'US' AND source.sourceKey = 'US-LA-TOW' AND source.sourceVersion = 'v2-research-2026-08-22';
--> statement-breakpoint
INSERT INTO verification_connectors (countryDeploymentId,jurisdictionNodeId,connectorKey,displayName,status,assuranceLevel,forbiddenScraping,authorizationEvidenceHash,officialSourceId)
SELECT deployment.id, los_angeles.id, 'US_V2_CANDIDATE_US-LA-TOW', 'Research candidate — Los Angeles Police Department', 'NOT_CONFIGURED', 'NONE', 1, NULL, source.id
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-LA-TOW'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'GLOBAL-EVIDENCE-CHAIN', 'Belge–veren kurum–sicil–kapsam doğrulama zinciri', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Her zorunlu credential', 'Yetkili API/sicil, issuer doğrulaması, kriptografik QR/imza veya yetkili manuel cevap', '["Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları"]', '["PERSON","BUSINESS","VEHICLE","SITE","OPERATOR"]', 'Belge fotoğrafı, OCR ve fraud skoru AUTHORITY_VERIFIED üretemez.', '13616f4c495b56be3c17a03e881120e6bbf3d2d649f2a67eaae44a8b4e75b47a'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:GLOBAL-EVIDENCE-CHAIN', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: GLOBAL-EVIDENCE-CHAIN', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'G-W3C-VC'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'PERSON', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'VEHICLE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'SITE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'OPERATOR', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: G-W3C-VC'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'G-W3C-VC'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'GLOBAL-IDENTITY-ENTITY', 'Kimlik, işletme ve vergi öznesi eşlemesi', 'MEDIUM', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_BLOCKED', 'Her sağlayıcı', 'Kimlik/işletme sicili veya yetkili doğrulama; OCR yalnız alan çıkarır', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı"]', '["PERSON","BUSINESS"]', 'İşletme lisansı ile işi fiilen yapan kişinin kimliği ve rolü ayrı doğrulanır.', 'e4e25daa169ff1a2b43047ff3f79e02085c835aba49148b51ffbfd4740b1f684'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:GLOBAL-IDENTITY-ENTITY', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: GLOBAL-IDENTITY-ENTITY', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'G-NIST-IAL'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'PERSON', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: G-NIST-IAL'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'G-NIST-IAL'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'GLOBAL-LOCAL-LAW-TEXT', 'Yerel hukuk, dil ve yayın onayı', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Her rule-pack ve kullanıcı metni', 'İki ayrı onay kaydı; AI veya aynı kişi kendi çıktısını onaylayamaz', '["Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri"]', '["POLICY"]', 'Makine çevirisi DRAFT_MACHINE kalır ve production yüzeyine çıkamaz.', 'ffb44b425122796cb44135a67b157ab5d567b2cb45e73d4ccd0818ca37bf58e4'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:GLOBAL-LOCAL-LAW-TEXT', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: GLOBAL-LOCAL-LAW-TEXT', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = ''
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'POLICY', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-ALARM', 'Alarm company/operator/agent paketi', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Güvenlik alarmını satma, kurma, izleme, servis veya yanıt', 'BSIS + CSLB resmî sorguları', '["Alarm Company Operator licence","Qualified Manager","Alarm Agent registration","gerekiyorsa C-7/C-10/C-28 CSLB sınıfı"]', '["BUSINESS","PERSON"]', '', 'b71bc9c8bac0cbc3e8d1016dec3dc6f09e8cedb140b26a68478f8d95f959c0b2'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-ALARM', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-ALARM', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BSIS-ALARM'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-ALARM';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'PERSON', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-ALARM';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-BSIS-ALARM'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-BSIS-ALARM'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-ALARM';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-BSIS-VERIFY'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-BSIS-VERIFY'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-ALARM';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-CLASS'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-CLASS'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-ALARM';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-APPLIANCE', 'Appliance/Electronic Service Dealer', 'HIGH', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Beyaz eşya, bilgisayar, telefon veya consumer electronic repair', 'BHGS lookup/status', '["Her service location için aktif Appliance Service Dealer veya Electronic Service Dealer registration"]', '["BUSINESS","SITE"]', '', '4ba533e3af44e3cf6e9fd0e5d26372d653d12e349a20dfd22a20581c7fcb0ba0'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-APPLIANCE', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-APPLIANCE', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BHGS-REPAIR'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-APPLIANCE';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'SITE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-APPLIANCE';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-BHGS-REPAIR'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-BHGS-REPAIR'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-APPLIANCE';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-ARD', 'Automotive Repair Dealer registration', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Ücretli diagnose, service veya repair; mobile/referral/sublet dahil', 'BAR resmî lookup/status/discipline', '["Aktif BAR ARD registration","mobil ise araç plakası ve mobile ARD kayıt bağı","işletme adı/numara/telefon reklam gösterimi"]', '["BUSINESS","SITE","VEHICLE"]', '', '0b7507fad80112f59e5435e07a5dc91cba8106f2ce60b07ef1a89d77738c2175'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-ARD', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-ARD', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BAR-ARD'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-ARD';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'SITE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-ARD';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'VEHICLE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-ARD';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-BAR-ARD'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-BAR-ARD'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-ARD';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-BAR-LOOKUP'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-BAR-LOOKUP'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-ARD';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-ASBESTOS', 'Asbestos contractor registration', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger', 'DIR/CSLB sicilleri ve proje dokümanı', '["California asbestos registration","uygun contractor classification","işçi eğitim/medical/safety kanıtları","survey ve iş miktarı"]', '["BUSINESS","PERSON","SITE"]', '', '05f5dbccb69172d2f9899936dccc78134588f06910f5ab07e96f2a94a2d3c802'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-ASBESTOS', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-ASBESTOS', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-DIR-ASBESTOS'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-ASBESTOS';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'PERSON', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-ASBESTOS';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'SITE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-ASBESTOS';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-DIR-ASBESTOS'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-DIR-ASBESTOS'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-ASBESTOS';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-VERIFY'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-VERIFY'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-ASBESTOS';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-C10', 'C-10 Electrical Contractor', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Elektrik tesisatı/onarımı', 'CSLB registry class/status match', '["Aktif CSLB C-10"]', '["BUSINESS","QUALIFIER"]', '', '44ad29b3bea1168b2c47fe62c0d86924708f12003333eccc6213832f8f48d862'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-C10', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-C10', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-CSLB-CLASS'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-C10';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'QUALIFIER', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-C10';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-CLASS'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-CLASS'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-C10';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-VERIFY'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-VERIFY'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-C10';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-C20-C38', 'C-20 HVAC / C-38 Refrigeration Contractor', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Klima, ısıtma veya refrigeration işi', 'CSLB registry class/status match', '["İş kapsamına uygun aktif C-20 ve/veya C-38"]', '["BUSINESS","QUALIFIER"]', '', '22c938a3f6bec289e4a52f59fa6b7be671f799e0ffa39a6cd6ab011ab34b9c5f'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-C20-C38', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-C20-C38', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-CSLB-CLASS'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-C20-C38';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'QUALIFIER', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-C20-C38';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-CLASS'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-CLASS'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-C20-C38';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-VERIFY'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-VERIFY'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-C20-C38';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-C36', 'C-36 Plumbing Contractor', 'HIGH', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Plumbing işinde contractor tetikleri veya platform ilanı', 'CSLB registry class/status match', '["Aktif CSLB C-36"]', '["BUSINESS","QUALIFIER"]', '', '55e8c2c63d567b235149ca9d8b229544eb5c32c4c5d81eba933f5690b58cc403'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-C36', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-C36', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-CSLB-CLASS'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-C36';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'QUALIFIER', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-C36';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-CLASS'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-CLASS'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-C36';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-VERIFY'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-VERIFY'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-C36';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-CLEAN-ORDINARY', 'Standart temizlik profili', 'MEDIUM', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_BLOCKED', 'Yalnız standart ev/ofis/taşınma temizliği; biyosidal, asbestos, tehlikeli atık ve dış cephe hariç', 'İşletme/vergi kaydı; meslek belgesi uydurma yok', '["US-CA-LA-BASE kanıtları","çalışan varsa workers’ compensation/payroll yükümlülüğü"]', '["BUSINESS"]', '', '249745d2aabc5c76ab74bb65324bee4f425757198ea7311c59239c0cb0650bf3'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-CLEAN-ORDINARY', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-CLEAN-ORDINARY', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-LA-BTRC'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-CLEAN-ORDINARY';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-LA-BTRC'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-LA-BTRC'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-CLEAN-ORDINARY';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-CONTRACTOR-CLASS', 'CSLB doğru contractor sınıfı', 'HIGH', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir', 'CSLB resmî license check/data portal; ad, lisans, sınıf, durum, bond ve çalışan sigortası eşleşmesi', '["Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption"]', '["BUSINESS","QUALIFIER"]', 'MoveFix reklam/listing modeli nedeniyle güvenli varsayılan lisans istemektir; daha dar minor-work istisnası yalnız California counsel’ın yazılı profile onayıyla açılır.', '34654f229fcf5c26df0505ce136ff5520641e979efe4571f5e7762688ba81c5b'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-CONTRACTOR-CLASS', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-CONTRACTOR-CLASS', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-CSLB-TRIGGER'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'QUALIFIER', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-TRIGGER'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-TRIGGER'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-BPC-7048'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-BPC-7048'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-CLASS'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-CLASS'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-VERIFY'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-VERIFY'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-GARDEN', 'Landscape/tree contractor ve pest-control paketleri', 'HIGH', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Peyzaj, sulama, budama veya profesyonel pestisit uygulaması', 'CSLB + DPR resmî sicil eşleşmesi', '["C-27 landscaping/irrigation","C-49 tree and palm service, tetiklenirse","DPR pest-control business ve uygun Qualified Applicator, pestisit uygulanırsa"]', '["BUSINESS","QUALIFIER","PERSON"]', '', '52e4ceafbec2afb92120194d991018b03d9d20ce4d4616f65613a608f7158925'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-GARDEN', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-GARDEN', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-CSLB-CLASS'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-GARDEN';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'QUALIFIER', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-GARDEN';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'PERSON', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-GARDEN';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-CLASS'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-CLASS'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-GARDEN';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-VERIFY'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-VERIFY'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-GARDEN';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-DPR-PEST'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-DPR-PEST'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-GARDEN';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-HHG-MOVER', 'California intrastate household goods mover', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'California içinde household goods taşıma', 'BHGS resmî mover search + DMV/insurer yetkili doğrulama', '["Aktif BHGS household mover permit/licence","tarife/insurance kayıtları","uygun sürücü belgesi","araç tescil/insurance"]', '["BUSINESS","VEHICLE","DRIVER"]', '', '185379bff4b5631b4cb5c52a4d1bdb4576e5508de664a105a76041c54fb408e8'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-HHG-MOVER', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-HHG-MOVER', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BHGS-MOVER'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-HHG-MOVER';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'VEHICLE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-HHG-MOVER';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'DRIVER', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-HHG-MOVER';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-BHGS-MOVER'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-BHGS-MOVER'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-HHG-MOVER';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-DMV-CDL'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-DMV-CDL'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-HHG-MOVER';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-HOME-REPAIR', 'Home repair doğru contractor classification', 'HIGH', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Mobilya sabitleme/imalat, drywall, kapı-pencere veya general handyman işi contractor kapsamına giriyorsa', 'CSLB registry ve deterministic task-class mapping', '["İşe göre B/B-2, C-6, C-9, C-17 veya başka aktif CSLB classification"]', '["BUSINESS","QUALIFIER"]', '', 'c06f70119468623782db4b5f98c690ea3d178f70fa7ce631493dbda8ce0ce67d'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-HOME-REPAIR', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-HOME-REPAIR', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-CSLB-TRIGGER'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-HOME-REPAIR';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'QUALIFIER', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-HOME-REPAIR';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-TRIGGER'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-TRIGGER'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-HOME-REPAIR';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-BPC-7048'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-BPC-7048'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-HOME-REPAIR';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-CLASS'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-CLASS'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-HOME-REPAIR';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-VERIFY'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-VERIFY'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-HOME-REPAIR';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-LA-BASE', 'California/Los Angeles sağlayıcı tabanı', 'MEDIUM', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_BLOCKED', 'Los Angeles’ta her ticari sağlayıcı', 'Kimlik ve resmî işletme/vergi kanalı; BTRC için şehir kaydı veya yetkili manuel teyit', '["Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu"]', '["PERSON","BUSINESS"]', 'I-9, bağımsız yüklenici için evrensel bir onboarding belgesi değildir; çalışma modeli hukukçu tarafından sınıflandırılır.', 'a67dda3020284ef2544270d5b490a97cfb5434b7b7f5184eb86405257e9531e5'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-LA-BASE', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-LA-BASE', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-LA-BTRC'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'PERSON', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-LA-BASE';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-LA-BASE';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-LA-BTRC'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-LA-BTRC'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-LA-BASE';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-LOCKSMITH', 'Locksmith company + employee registration', 'HIGH', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Kapı/araç açma veya kilit işi', 'BSIS resmî sorgu + kimlik/işveren bağı + iş öncesi customer authority kanıtı', '["Aktif BSIS Locksmith Company licence","işi yapan kişi için Locksmith Employee registration","yerel business permit gerekiyorsa","müşterinin mülk/araç erişim yetkisi"]', '["BUSINESS","PERSON","CUSTOMER_AUTHORITY"]', '', '128bb45761f63cb48cdb06d60f6955093424306648f45f3afbde085c3f1c907a'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-LOCKSMITH', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-LOCKSMITH', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BSIS-LOCK'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-LOCKSMITH';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'PERSON', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-LOCKSMITH';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'CUSTOMER_AUTHORITY', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-LOCKSMITH';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-BSIS-LOCK'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-BSIS-LOCK'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-LOCKSMITH';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-BSIS-VERIFY'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-BSIS-VERIFY'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-LOCKSMITH';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-MASSAGE', 'California/Los Angeles masaj hukuki rota', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Massage/therapeutic bodywork', 'CAMTC + LAPD/yerel permit birimi yetkili teyidi', '["CAMTC certification veya Los Angeles’ın kabul ettiği bireysel massage permit rotası","massage establishment/business permit gerekiyorsa","kimlik ve işyeri bağı"]', '["PERSON","BUSINESS","SITE"]', 'US-LA-TOW kaynağı LAPD permit yüzeyini temsil eder; exact massage permit URL/citation Los Angeles counsel tarafından SOURCE_VERIFIED yapılmadan açılmaz.', '5de29d5447fd223a9275cc477b71c7cd23c9b3ca8d8d98696b8257650da7442f'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-MASSAGE', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-MASSAGE', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-CAMTC'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'PERSON', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-MASSAGE';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-MASSAGE';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'SITE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-MASSAGE';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CAMTC'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CAMTC'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-MASSAGE';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-LA-TOW'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-LA-TOW'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-MASSAGE';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-MCP', 'California for-hire property motor carrier', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Ücret karşılığı müşteri malı taşıma; motorcycle courier dahil', 'DMV active carrier/MCP kanalı + insurer/DMV yetkili kontrolü', '["CA#","aktif Motor Carrier Permit","liability insurance","workers’ compensation/exemption","EPN requester/driver monitoring, tetiklenirse","uygun driver licence/endorsement","commercial vehicle registration"]', '["BUSINESS","VEHICLE","DRIVER"]', '', '89a84871c19fb252623a311a74f87a4caf0579a7851ed0b508f23397b0b8d043'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-MCP', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-MCP', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-DMV-MCP'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-MCP';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'VEHICLE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-MCP';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'DRIVER', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-MCP';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-DMV-MCP'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-DMV-MCP'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-MCP';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-DMV-CDL'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-DMV-CDL'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-MCP';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-PAINT', 'Painting/plaster/wall covering contractor sınıfları', 'HIGH', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Boya, sıva veya duvar kaplama contractor işi', 'CSLB registry scope/status match', '["C-33 painting için aktif lisans","C-35 plastering için aktif lisans","wallpaper için işe uygun D-29 veya hukukçu onaylı classification"]', '["BUSINESS","QUALIFIER"]', '', 'd47cad47104d71af9e9feb70ed8944d84060283ecc9ee30562404cd45dfd7f65'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-PAINT', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-PAINT', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-CSLB-CLASS'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-PAINT';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'QUALIFIER', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-PAINT';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-CLASS'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-CLASS'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-PAINT';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-CSLB-VERIFY'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-CSLB-VERIFY'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-PAINT';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-PERSONAL', 'California beauty person/establishment/offsite paketi', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Saç, makyaj, tırnak veya Board kapsamındaki beauty service', 'DCA/Board resmî licence search; licence category/scope/status/expiry match', '["Hizmete uygun aktif person licence: cosmetologist/hairstylist/esthetician/manicurist","işletme mekânı varsa establishment licence","müşteri evi/otel ise Personal Service Permit"]', '["PERSON","BUSINESS","SITE"]', '', '95841156cc6c49af8ac5037731a1e30c1b9f91dfa8b5e1b36d368da187ddcce8'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-PERSONAL', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-PERSONAL', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-BC-LICENSE'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'PERSON', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-PERSONAL';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-PERSONAL';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'SITE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-PERSONAL';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-BC-LICENSE'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-BC-LICENSE'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-PERSONAL';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-BC-PSP'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-BC-PSP'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-PERSONAL';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-DCA-LOOKUP'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-DCA-LOOKUP'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-PERSONAL';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-ROAD-BASIC', 'Yalnız repair olmayan yol yardımı', 'HIGH', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Sadece jump-start, güvenli lastik değişimi veya sınırlı yakıt teslimi; teşhis/onarım/towing yok', 'DMV/insurer ve task declaration', '["US-CA-LA-BASE","sürücü belgesi","servis aracı tescil/sigorta","yakıt taşıma miktarı için hazmat sonucu"]', '["BUSINESS","VEHICLE","DRIVER"]', 'Repair başlarsa ARD; tow başlarsa US-CA-TOW; tehlikeli madde eşiği varsa hazmat paketi AND ile eklenir.', '774065f9e889226f30c4a91e5ab1740ee5845cb7d6585bdaef4c4b03df902a38'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-ROAD-BASIC', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-ROAD-BASIC', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-DMV-CDL'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-ROAD-BASIC';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'VEHICLE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-ROAD-BASIC';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'DRIVER', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-ROAD-BASIC';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-DMV-CDL'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-DMV-CDL'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-ROAD-BASIC';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-CA-TOW', 'California/Los Angeles towing paketi', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Ücretli towing/vehicle transport', 'DMV/CHP + LAPD permit birimi + insurer yetkili teyidi; belge fotoğrafı tek başına yetmez', '["CA#/MCP, kapsam gerektiriyorsa","uygun California DL/CDL","Tow Truck Driver Certificate/Clearance","çekici tescili ve sigortası","Los Angeles Tow Unit Operator police permit","işletme/tow permit; rotation/OPG ise ayrı onay"]', '["BUSINESS","DRIVER","VEHICLE"]', '', '71448799562543cf6422a3ddbe377b681e0bfb5ac9c26f8b430d367987269409'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-CA-TOW', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-CA-TOW', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-DMV-MCP'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-TOW';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'DRIVER', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-TOW';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'VEHICLE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-CA-TOW';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-DMV-MCP'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-DMV-MCP'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-TOW';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-DMV-CDL'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-DMV-CDL'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-TOW';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-DMV-TTD'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-DMV-TTD'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-TOW';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-LA-TOW'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-LA-TOW'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-CA-TOW';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-EPA-608', 'EPA Section 608 kişi sertifikası', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal', 'Issuer kaydı/kriptografik kanıt veya yetkili manuel teyit; EPA’nın kendisi kart issuer’ı değildir', '["EPA-approved testing organization tarafından verilen uygun Type I/II/III/Universal sertifika"]', '["PERSON"]', '', '9f975e4756bc26161f7731722b166277772c7c00c84b937d3394340eb6cd4081'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-EPA-608', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-EPA-608', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-EPA-608'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'PERSON', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-EPA-608';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-EPA-608'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-EPA-608'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-EPA-608';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-EPA-RRP', 'EPA RRP firma + certified renovator', 'HIGH', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', '1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır', 'EPA firm lookup ve training provider/credential teyidi', '["Aktif EPA-certified firm","certified renovator","bina yaşı ve yüzey bozma alanı kanıtı"]', '["BUSINESS","PERSON","SITE"]', '', 'c91c6efa450b839439e3f76bb58de7d87c607d6ffad291408a088be1d1844be5'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-EPA-RRP', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-EPA-RRP', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-EPA-RRP'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-EPA-RRP';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'PERSON', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-EPA-RRP';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'SITE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-EPA-RRP';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-EPA-RRP'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-EPA-RRP'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-EPA-RRP';
--> statement-breakpoint
INSERT INTO country_requirement_bundles (countryDeploymentId,rulePackVersionId,bundleKey,title,riskLevel,sourceState,legalState,decisionIfMissing,triggerDescription,verificationDescription,requiredEvidenceJson,subjectTypesJson,note,researchHash)
SELECT deployment.id, rule_pack.id, 'US-FMCSA-MOVER', 'Interstate household goods mover', 'CRITICAL', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'CAPABILITY_NO_GO', 'Eyaletler arası household goods taşıma', 'FMCSA Protect Your Move/SAFER + DMV/insurer doğrulaması', '["USDOT number","aktif FMCSA operating authority","insurance filing","uygun sürücü belgesi/medical card/CDL, araç profiline göre"]', '["BUSINESS","VEHICLE","DRIVER"]', '', '2b09f9ad2b04d7a77851eb782d1be54baef89999581e112f30cf8d176343b6c6'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.countryDeploymentId = deployment.id AND rule_pack.jurisdictionNodeId = los_angeles.id AND rule_pack.version = '2.0.0-research'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO legal_requirements (countryDeploymentId,jurisdictionNodeId,capabilityDefinitionId,requirementKey,requirementVersion,requirementState,authoritative,sourceStatus,legalApprovalState,officialSourceId,sourceReference,blockingReasonCode)
SELECT deployment.id, los_angeles.id, NULL, 'US-CA-LA:US-FMCSA-MOVER', '2.0.0-research', 'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.id, 'AI_RESEARCHED_UNVERIFIED bundle: US-FMCSA-MOVER', 'LOCAL_COUNSEL_AND_SOURCE_REVIEW_REQUIRED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
LEFT JOIN official_sources source ON source.countryDeploymentId = deployment.id AND source.sourceKey = 'US-FMCSA-MOVER'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'BUSINESS', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-FMCSA-MOVER';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'VEHICLE', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-FMCSA-MOVER';
--> statement-breakpoint
INSERT INTO country_requirement_subject_bindings (bundleId,subjectType,required)
SELECT bundle.id, 'DRIVER', 1 FROM country_requirement_bundles bundle WHERE bundle.bundleKey = 'US-FMCSA-MOVER';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-FMCSA-MOVER'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-FMCSA-MOVER'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-FMCSA-MOVER';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-FMCSA-AUTH'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-FMCSA-AUTH'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-FMCSA-MOVER';
--> statement-breakpoint
INSERT INTO country_requirement_source_bindings (bundleId,officialSourceId,sourceArchiveId,requirementReference)
SELECT bundle.id, source.id, archive.id, 'Bundle research source: US-DMV-CDL'
FROM country_requirement_bundles bundle INNER JOIN official_sources source ON source.sourceKey = 'US-DMV-CDL'
INNER JOIN country_source_archives archive ON archive.officialSourceId = source.id
WHERE bundle.bundleKey = 'US-FMCSA-MOVER';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 1, 15, 'US-CA-LOS_ANGELES:plumbing:leak-repair', '2.0.0-research', 'cfe287e88f27b4b948c5440e863a8303f5a9abc5deea16c9e145df62b7ea3231', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","Aktif CSLB C-36"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Su/kanal/gaz/ısıtma şebekesine fiziksel bağlantı var mı?","Permit/proje bedeli/çalışan kullanımı var mı?","Basınçlı sistem, kazan veya gazlı cihaz var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:leak-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:leak-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:leak-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:leak-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:leak-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:leak-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:leak-repair';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:leak-repair';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'ff9ba2cb05ec7f35e127a272d5e50fb92a8f0504ae38d3775c2c5cbe5e660a9c'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:leak-repair';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 1, 28, 'US-CA-LOS_ANGELES:plumbing:clogged-drain', '2.0.0-research', '2bdc2ae1255df4ac8a0f3ed690a97e07b95b078f392e8af8a282e1de68e6701a', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","Aktif CSLB C-36"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Su/kanal/gaz/ısıtma şebekesine fiziksel bağlantı var mı?","Permit/proje bedeli/çalışan kullanımı var mı?","Basınçlı sistem, kazan veya gazlı cihaz var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:clogged-drain';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:clogged-drain';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:clogged-drain';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:clogged-drain';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:clogged-drain';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:clogged-drain';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:clogged-drain';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:clogged-drain';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'c2bdfd63ca9e004314091049b6d3fd40464ad3b9b96a46694d2e04c992cd590e'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:clogged-drain';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 1, 52, 'US-CA-LOS_ANGELES:plumbing:faucet-installation', '2.0.0-research', 'e72add535ae18f8f54b880ff4443224675e7549c656fdab1a88dc893c4a9db82', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","Aktif CSLB C-36"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Su/kanal/gaz/ısıtma şebekesine fiziksel bağlantı var mı?","Permit/proje bedeli/çalışan kullanımı var mı?","Basınçlı sistem, kazan veya gazlı cihaz var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:faucet-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:faucet-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:faucet-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:faucet-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:faucet-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:faucet-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:faucet-installation';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:faucet-installation';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '09dc0fe6b93e3db3c4654e05f2e29833dd0e7b4845543a69111f4f60e4ba443a'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:faucet-installation';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 1, 40, 'US-CA-LOS_ANGELES:plumbing:boiler-piping', '2.0.0-research', '4700d93408d3b31d7264f3dd54fffd1aa53398135afcd1d33d5bc676a14a7004', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","Aktif CSLB C-36"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Su/kanal/gaz/ısıtma şebekesine fiziksel bağlantı var mı?","Permit/proje bedeli/çalışan kullanımı var mı?","Basınçlı sistem, kazan veya gazlı cihaz var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi | US-CA-C10: Elektrik tesisatı/onarımı', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:boiler-piping';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:boiler-piping';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:boiler-piping';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:boiler-piping';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:boiler-piping';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:boiler-piping';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:boiler-piping';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C20-C38'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:boiler-piping';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:boiler-piping';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:boiler-piping';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'e912be6ae3a620540547047a8b8bf9d01a1f244c8b489af89912c6c9eddf737c'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:plumbing:boiler-piping';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 2, 1, 'US-CA-LOS_ANGELES:electrical:fault-repair', '2.0.0-research', '081f3d978716d60878c5fd8eeb0ac157086ae8d7c07df9256f020caffac02a83', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","Aktif CSLB C-10"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Voltaj ve tesis türü nedir?","Pano/sayaç/şebeke bağlantısı veya yalnız plug-in cihaz işi mi?","Alarm, yangın, security veya fixed low-voltage wiring var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fault-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fault-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fault-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fault-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fault-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fault-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fault-repair';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fault-repair';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'ac49388d254ca7c2f89f191feffe73f614188d5026905c4bfdb380c9680cbda2'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fault-repair';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 2, 2, 'US-CA-LOS_ANGELES:electrical:fixture-installation', '2.0.0-research', '025d5bfae53c03b0765b94151f59049cf14715b5820b7fd9606d05beccefe270', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","Aktif CSLB C-10"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Voltaj ve tesis türü nedir?","Pano/sayaç/şebeke bağlantısı veya yalnız plug-in cihaz işi mi?","Alarm, yangın, security veya fixed low-voltage wiring var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fixture-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fixture-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fixture-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fixture-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fixture-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fixture-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fixture-installation';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fixture-installation';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '99cb0bdda68c6970bc85188348514142f9746ae30123a7bfca3005e8cb57642c'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:fixture-installation';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 2, 3, 'US-CA-LOS_ANGELES:electrical:panel-renewal', '2.0.0-research', '5a51ec397f7d6036721c98aa8af4e7b2073d8201ed99844287ca4c163115bb3b', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","Aktif CSLB C-10"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Voltaj ve tesis türü nedir?","Pano/sayaç/şebeke bağlantısı veya yalnız plug-in cihaz işi mi?","Alarm, yangın, security veya fixed low-voltage wiring var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:panel-renewal';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:panel-renewal';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:panel-renewal';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:panel-renewal';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:panel-renewal';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:panel-renewal';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:panel-renewal';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:panel-renewal';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '92d08fdf8966936d814653db8a322d66063e33c509fd3766d8ed58e970e71df6'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:panel-renewal';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 2, 16, 'US-CA-LOS_ANGELES:electrical:smart-home-electrical', '2.0.0-research', '8fcd46e2145b93d610999112cc283410aed0f5e9bbd2c3584df00e67badcff8e', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","Aktif CSLB C-10"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Voltaj ve tesis türü nedir?","Pano/sayaç/şebeke bağlantısı veya yalnız plug-in cihaz işi mi?","Alarm, yangın, security veya fixed low-voltage wiring var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-BSIS-ALARM","US-BSIS-VERIFY","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:smart-home-electrical';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:smart-home-electrical';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:smart-home-electrical';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:smart-home-electrical';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:smart-home-electrical';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:smart-home-electrical';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:smart-home-electrical';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ALARM'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:smart-home-electrical';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:smart-home-electrical';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '3d3031d0161d08a5ac1fdb758d5e12e1d3fda4055d3f00ba4c09f4364fa9399d'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:electrical:smart-home-electrical';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 3, 4, 'US-CA-LOS_ANGELES:cleaning:home-cleaning', '2.0.0-research', '51c200fb3bf2817db7ba8f3f5347b9874463330c7d80c489a90ba66b7bfa1a12', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","US-CA-LA-BASE kanıtları","çalışan varsa workers’ compensation/payroll yükümlülüğü"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Yalnız standart temizlik mi?","Dezenfeksiyon, pestisit, asbestos, tehlikeli atık, sanayi veya high-rise dış cephe var mı?","Yapıda renovation/yüzey bozma var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-CSLB-CLASS","US-CSLB-VERIFY","US-DIR-ASBESTOS","US-DPR-PEST","US-EPA-RRP","US-LA-BTRC"]', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:home-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:home-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:home-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:home-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CLEAN-ORDINARY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:home-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ASBESTOS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:home-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:home-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-GARDEN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:home-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:home-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '69f429615167f9842e627ca26b5a42917bb771e2f7b7d5dd6dab0d56f9069c25'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:home-cleaning';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 3, 29, 'US-CA-LOS_ANGELES:cleaning:office-cleaning', '2.0.0-research', '367b5cd73c244d5024c2e2674bd4e6890bb38dde4adc3146d0cfa73fa0e553f6', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","US-CA-LA-BASE kanıtları","çalışan varsa workers’ compensation/payroll yükümlülüğü"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Yalnız standart temizlik mi?","Dezenfeksiyon, pestisit, asbestos, tehlikeli atık, sanayi veya high-rise dış cephe var mı?","Yapıda renovation/yüzey bozma var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-CSLB-CLASS","US-CSLB-VERIFY","US-DIR-ASBESTOS","US-DPR-PEST","US-EPA-RRP","US-LA-BTRC"]', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:office-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:office-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:office-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:office-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CLEAN-ORDINARY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:office-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ASBESTOS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:office-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:office-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-GARDEN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:office-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:office-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '9fa1f7001533a3cdb85680f356acfed5d6eac245452603f7490588ccea74e5e2'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:office-cleaning';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 3, 17, 'US-CA-LOS_ANGELES:cleaning:move-cleaning', '2.0.0-research', '1a67d5f2bfbc01fffa60f648c6343a18639bde9ff9745b4508b0adaa89306e7e', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","US-CA-LA-BASE kanıtları","çalışan varsa workers’ compensation/payroll yükümlülüğü"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Yalnız standart temizlik mi?","Dezenfeksiyon, pestisit, asbestos, tehlikeli atık, sanayi veya high-rise dış cephe var mı?","Yapıda renovation/yüzey bozma var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-CSLB-CLASS","US-CSLB-VERIFY","US-DIR-ASBESTOS","US-DPR-PEST","US-EPA-RRP","US-LA-BTRC"]', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:move-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:move-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:move-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:move-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CLEAN-ORDINARY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:move-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ASBESTOS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:move-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:move-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-GARDEN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:move-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:move-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '598982fe6c729c08ea765346199f0666fab77ed257a83228c313576987ecc87b'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:move-cleaning';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 3, 41, 'US-CA-LOS_ANGELES:cleaning:deep-cleaning', '2.0.0-research', '87e7b7deebe2d7852a932e5c5d713b154b4d1bbf3672a4d1ab44e811e0bc73a1', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","US-CA-LA-BASE kanıtları","çalışan varsa workers’ compensation/payroll yükümlülüğü"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Yalnız standart temizlik mi?","Dezenfeksiyon, pestisit, asbestos, tehlikeli atık, sanayi veya high-rise dış cephe var mı?","Yapıda renovation/yüzey bozma var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-CSLB-CLASS","US-CSLB-VERIFY","US-DIR-ASBESTOS","US-DPR-PEST","US-EPA-RRP","US-LA-BTRC"]', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:deep-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:deep-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:deep-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:deep-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CLEAN-ORDINARY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:deep-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ASBESTOS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:deep-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:deep-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-GARDEN: Peyzaj, sulama, budama veya profesyonel pestisit uygulaması'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-GARDEN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:deep-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:deep-cleaning';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'cec2222f4287ea8eef7ffc8a30d544b364f7eeaf20df79b0d0c37b404a28642f'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:cleaning:deep-cleaning';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 4, 5, 'US-CA-LOS_ANGELES:hvac:ac-installation', '2.0.0-research', '4bb3c6c9c881be9132b6c7d33858b08584413cac234848f9a78055959e173dbe', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","İş kapsamına uygun aktif C-20 ve/veya C-38"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Cihaz commercial mı household mu?","Soğutucu devre açılacak/doldurulacak mı ve refrigerant türü ne?","Gaz, elektrik, su bağlantısı, kaynak veya yüksekte çalışma var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-EPA-608","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C20-C38'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-608'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-installation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-installation';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-installation';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'ee80a674fd2b267257f3836d2040e9177972ee7d96b1f77ce14e59e89e197e14'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-installation';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 4, 53, 'US-CA-LOS_ANGELES:hvac:ac-maintenance', '2.0.0-research', '2c1d6927c2f6ff0bfa156fe051519db8b1e3e30b857c8106cdfa2e989e075535', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","İş kapsamına uygun aktif C-20 ve/veya C-38"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Cihaz commercial mı household mu?","Soğutucu devre açılacak/doldurulacak mı ve refrigerant türü ne?","Gaz, elektrik, su bağlantısı, kaynak veya yüksekte çalışma var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-EPA-608","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C20-C38'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-608'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '430512203b530ad549b5271d4d8d7d4e96bd964c6ef2762da2871664da52e379'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:ac-maintenance';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 4, 30, 'US-CA-LOS_ANGELES:hvac:boiler-maintenance', '2.0.0-research', '7f1a19eb9b434df706f291986e4ea78b9982f619e16858ff51f93713255fa18c', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","İş kapsamına uygun aktif C-20 ve/veya C-38"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Cihaz commercial mı household mu?","Soğutucu devre açılacak/doldurulacak mı ve refrigerant türü ne?","Gaz, elektrik, su bağlantısı, kaynak veya yüksekte çalışma var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-EPA-608","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:boiler-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:boiler-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:boiler-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:boiler-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:boiler-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C20-C38'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:boiler-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-608'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:boiler-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:boiler-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:boiler-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:boiler-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:boiler-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '9cf7d9901e03dc2676e14b34c7f90f96d77d39fe43780edac8ddad1bac548f41'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:boiler-maintenance';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 4, 18, 'US-CA-LOS_ANGELES:hvac:radiator-heating', '2.0.0-research', '2138907b152093bc5458be379a4ddb410935ba6f47caa8b80c55da249e8cc048', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","İş kapsamına uygun aktif C-20 ve/veya C-38"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Cihaz commercial mı household mu?","Soğutucu devre açılacak/doldurulacak mı ve refrigerant türü ne?","Gaz, elektrik, su bağlantısı, kaynak veya yüksekte çalışma var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-EPA-608","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:radiator-heating';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:radiator-heating';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:radiator-heating';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:radiator-heating';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:radiator-heating';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C20-C38'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:radiator-heating';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-608'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:radiator-heating';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:radiator-heating';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:radiator-heating';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:radiator-heating';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:radiator-heating';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'c525a20de2b1157012e80b1af94323a35420b2e2921f16466edd018c78c3692c'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:hvac:radiator-heating';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 5, 42, 'US-CA-LOS_ANGELES:locksmith:door-opening', '2.0.0-research', '92f87b120edb687b5a4f3dc3d6e3e5e20050d4a364927e66cfaeff4417518e8e', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif BSIS Locksmith Company licence","işi yapan kişi için Locksmith Employee registration","yerel business permit gerekiyorsa","müşterinin mülk/araç erişim yetkisi"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Müşteri mülk/araç erişim yetkisini nasıl kanıtlıyor?","Sadece açma mı; kilit/güvenlik/alarm kurulumu da var mı?","Bina/araç türü ve exact work scope nedir?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-BSIS-ALARM","US-BSIS-LOCK","US-BSIS-VERIFY","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-LA-BTRC"]', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:door-opening';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:door-opening';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:door-opening';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:door-opening';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LOCKSMITH'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:door-opening';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:door-opening';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ALARM'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:door-opening';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:door-opening';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '1c6c0c737a1c15acd49cf3b6d526321492d929f767219f3a924cd7c333e50d28'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:door-opening';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 5, 6, 'US-CA-LOS_ANGELES:locksmith:lock-replacement', '2.0.0-research', 'a1fcd919029d2e2d8a3be4938ccfb9c120e2c337ca8cc8171dab8382ad44f5c9', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif BSIS Locksmith Company licence","işi yapan kişi için Locksmith Employee registration","yerel business permit gerekiyorsa","müşterinin mülk/araç erişim yetkisi"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Müşteri mülk/araç erişim yetkisini nasıl kanıtlıyor?","Sadece açma mı; kilit/güvenlik/alarm kurulumu da var mı?","Bina/araç türü ve exact work scope nedir?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-BSIS-ALARM","US-BSIS-LOCK","US-BSIS-VERIFY","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-LA-BTRC"]', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:lock-replacement';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:lock-replacement';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:lock-replacement';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:lock-replacement';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LOCKSMITH'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:lock-replacement';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:lock-replacement';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ALARM'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:lock-replacement';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:lock-replacement';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'e11be781585a30095d3208a9b1b3b57563c9a07a576783ec61c0ba3fa44d7a7a'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:lock-replacement';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 5, 54, 'US-CA-LOS_ANGELES:locksmith:car-locksmith', '2.0.0-research', '872e5c5e7f9cdbed45d233939c30615adc39f8aa8a2ab63e9470fe0994b51947', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif BSIS Locksmith Company licence","işi yapan kişi için Locksmith Employee registration","yerel business permit gerekiyorsa","müşterinin mülk/araç erişim yetkisi"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Müşteri mülk/araç erişim yetkisini nasıl kanıtlıyor?","Sadece açma mı; kilit/güvenlik/alarm kurulumu da var mı?","Bina/araç türü ve exact work scope nedir?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-BSIS-ALARM","US-BSIS-LOCK","US-BSIS-VERIFY","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-LA-BTRC"]', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:car-locksmith';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:car-locksmith';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:car-locksmith';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:car-locksmith';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LOCKSMITH'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:car-locksmith';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:car-locksmith';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ALARM'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:car-locksmith';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:car-locksmith';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '61b7c245c5b16f7c494ee87114f90fe131e126c9e22f169c5406799536c91fb9'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:locksmith:car-locksmith';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 6, 31, 'US-CA-LOS_ANGELES:painting:interior-painting', '2.0.0-research', '0342e13a1bce81efa61a3670ffba275fa390f6fe5e8c21c4f30dbb7ff0e6b0b8', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","C-33 painting için aktif lisans","C-35 plastering için aktif lisans","wallpaper için işe uygun D-29 veya hukukçu onaylı classification"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Proje bedeli/permit/çalışan var mı?","Bina yılı ve lead/asbestos riski nedir?","Dış cephe/iskele/yüksekte çalışma var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-DIR-ASBESTOS","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:interior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:interior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:interior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:interior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:interior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-PAINT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:interior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:interior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ASBESTOS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:interior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:interior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '10e941d4ba2c0acf3217d5901db30872ff34e4bc023282e398659f51ca1d24ba'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:interior-painting';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 6, 19, 'US-CA-LOS_ANGELES:painting:exterior-painting', '2.0.0-research', 'c7c2a0849719a04f3ce84faab0641c76b7d7d434fe3729a3af18b3c1abffdfe3', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","C-33 painting için aktif lisans","C-35 plastering için aktif lisans","wallpaper için işe uygun D-29 veya hukukçu onaylı classification"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Proje bedeli/permit/çalışan var mı?","Bina yılı ve lead/asbestos riski nedir?","Dış cephe/iskele/yüksekte çalışma var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-DIR-ASBESTOS","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:exterior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:exterior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:exterior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:exterior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:exterior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-PAINT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:exterior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:exterior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ASBESTOS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:exterior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:exterior-painting';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '2ae0ad351715f27f97eb5836b6c773dd7e481b0f82074a2a74165923ab364d6f'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:exterior-painting';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 6, 43, 'US-CA-LOS_ANGELES:painting:wallpaper', '2.0.0-research', '40085c468c9127e1d8125a8cabe865c29b4d0e158426ba18439b7ee2c570601b', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","C-33 painting için aktif lisans","C-35 plastering için aktif lisans","wallpaper için işe uygun D-29 veya hukukçu onaylı classification"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Proje bedeli/permit/çalışan var mı?","Bina yılı ve lead/asbestos riski nedir?","Dış cephe/iskele/yüksekte çalışma var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-DIR-ASBESTOS","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:wallpaper';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:wallpaper';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:wallpaper';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:wallpaper';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:wallpaper';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-PAINT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:wallpaper';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:wallpaper';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ASBESTOS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:wallpaper';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:wallpaper';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'd61edf8fcb4d390aa663669ae9fb6bb0906575b3a9cef0e4377ababef47dbdae'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:wallpaper';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 6, 7, 'US-CA-LOS_ANGELES:painting:plastering', '2.0.0-research', '438e9b04dff23cbbf63e081a0a336f71908951e7af9f269b1924066e46e4f7c1', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","C-33 painting için aktif lisans","C-35 plastering için aktif lisans","wallpaper için işe uygun D-29 veya hukukçu onaylı classification"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Proje bedeli/permit/çalışan var mı?","Bina yılı ve lead/asbestos riski nedir?","Dış cephe/iskele/yüksekte çalışma var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-DIR-ASBESTOS","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:plastering';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:plastering';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:plastering';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:plastering';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:plastering';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-PAINT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:plastering';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:plastering';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ASBESTOS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:plastering';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:plastering';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'e703b6554fc7f3c4583daad26101cade5c553e546f905b30d7a0d78cbc310f0c'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:painting:plastering';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 7, 55, 'US-CA-LOS_ANGELES:gardening:garden-maintenance', '2.0.0-research', 'ad49c904cb1fe05718cd54266e38e9991b62b9f9ea26cbb422ca72da68e63a2e', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","C-27 landscaping/irrigation","C-49 tree and palm service, tetiklenirse","DPR pest-control business ve uygun Qualified Applicator, pestisit uygulanırsa"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Sadece bakım mı yoksa construction/landscaping/irrigation mı?","Pestisit/bitki koruma ürünü kullanılacak mı?","Ağaç yüksekliği, motorlu testere veya utility bağlantısı var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-DPR-PEST","US-LA-BTRC"]', '', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:garden-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:garden-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:garden-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:garden-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:garden-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-GARDEN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:garden-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:garden-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'e4fdb47bbe7b12d6f6493310aa619924612d83328c98f740ca62a4a7ca8be4cc'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:garden-maintenance';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 7, 32, 'US-CA-LOS_ANGELES:gardening:landscaping', '2.0.0-research', '3db48d878f9b1acd560660712ee58e065f2fbbedabcb8f5dc3827024a69bb2e5', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","C-27 landscaping/irrigation","C-49 tree and palm service, tetiklenirse","DPR pest-control business ve uygun Qualified Applicator, pestisit uygulanırsa"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Sadece bakım mı yoksa construction/landscaping/irrigation mı?","Pestisit/bitki koruma ürünü kullanılacak mı?","Ağaç yüksekliği, motorlu testere veya utility bağlantısı var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-DPR-PEST","US-LA-BTRC"]', '', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:landscaping';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:landscaping';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:landscaping';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:landscaping';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:landscaping';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-GARDEN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:landscaping';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:landscaping';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '44067cc1274bb100ff9258af9bbe3699fda8e09ac24792e2256a543ce8711fd0'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:landscaping';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 7, 20, 'US-CA-LOS_ANGELES:gardening:pruning', '2.0.0-research', '7e8f281f982d99703cf6754930e630b1fe6e7d47440440e145e83886c7f0718b', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","C-27 landscaping/irrigation","C-49 tree and palm service, tetiklenirse","DPR pest-control business ve uygun Qualified Applicator, pestisit uygulanırsa"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Sadece bakım mı yoksa construction/landscaping/irrigation mı?","Pestisit/bitki koruma ürünü kullanılacak mı?","Ağaç yüksekliği, motorlu testere veya utility bağlantısı var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-DPR-PEST","US-LA-BTRC"]', '', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:pruning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:pruning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:pruning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:pruning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:pruning';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-GARDEN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:pruning';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:pruning';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '4d0efc876d89ec1edffd328c13fc0820e12bd66f890b65ca203a5e1dbcf2eb86'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:pruning';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 7, 44, 'US-CA-LOS_ANGELES:gardening:irrigation', '2.0.0-research', 'a1a8b81728ea033e5beea75ea2367642f1642165f99132b1a61a144d5e67f3c3', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","C-27 landscaping/irrigation","C-49 tree and palm service, tetiklenirse","DPR pest-control business ve uygun Qualified Applicator, pestisit uygulanırsa"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Sadece bakım mı yoksa construction/landscaping/irrigation mı?","Pestisit/bitki koruma ürünü kullanılacak mı?","Ağaç yüksekliği, motorlu testere veya utility bağlantısı var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-DPR-PEST","US-LA-BTRC"]', 'US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:irrigation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:irrigation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:irrigation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:irrigation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:irrigation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-GARDEN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:irrigation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:irrigation';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-C10: Elektrik tesisatı/onarımı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:irrigation';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:irrigation';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '7027183ebcee125070182193065d78c105c2ea7fde737976d58c6b696bda497a'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:gardening:irrigation';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 8, 8, 'US-CA-LOS_ANGELES:moving:house-moving', '2.0.0-research', '9ed64d4bbb9cdba707bff2c32c8d606ee13cd369ab6e1febf62299dba2c1c54b', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif BHGS household mover permit/licence","tarife/insurance kayıtları","uygun sürücü belgesi","araç tescil/insurance"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Household goods mı office/commercial goods mı?","Araç GVWR/GVM ve plaka/owner bilgisi nedir?","Intracity/intercity/interstate/cross-border rota mı?","For-hire mı, dangerous/oversize cargo var mı?","MoveFix taşıyıcı mı broker/forwarder mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BHGS-MOVER","US-DMV-CDL","US-DMV-MCP","US-FMCSA-AUTH","US-FMCSA-MOVER","US-LA-BTRC"]', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-MCP: Ücret karşılığı müşteri malı taşıma; motorcycle courier dahil', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:house-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:house-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:house-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:house-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-HHG-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:house-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-MCP: Ücret karşılığı müşteri malı taşıma; motorcycle courier dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-FMCSA-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:house-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-MCP: Ücret karşılığı müşteri malı taşıma; motorcycle courier dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-MCP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:house-moving';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:house-moving';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '24ffa142ca35ac4f2cb73a811e5c58a053ad38dfddc5294b358a25919b35b8c2'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:house-moving';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 8, 56, 'US-CA-LOS_ANGELES:moving:office-moving', '2.0.0-research', '9c1691cfc43f9d3ea9a5dbb0ff2a8dd008b478ae90ca4b2371d49ad3c35a3446', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif BHGS household mover permit/licence","tarife/insurance kayıtları","uygun sürücü belgesi","araç tescil/insurance"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Household goods mı office/commercial goods mı?","Araç GVWR/GVM ve plaka/owner bilgisi nedir?","Intracity/intercity/interstate/cross-border rota mı?","For-hire mı, dangerous/oversize cargo var mı?","MoveFix taşıyıcı mı broker/forwarder mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BHGS-MOVER","US-DMV-CDL","US-DMV-MCP","US-FMCSA-AUTH","US-FMCSA-MOVER","US-LA-BTRC"]', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-MCP: Ücret karşılığı müşteri malı taşıma; motorcycle courier dahil', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:office-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:office-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:office-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:office-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-HHG-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:office-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-MCP: Ücret karşılığı müşteri malı taşıma; motorcycle courier dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-FMCSA-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:office-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-MCP: Ücret karşılığı müşteri malı taşıma; motorcycle courier dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-MCP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:office-moving';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:office-moving';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '4de34b880f23e8eb193a6f0c5a12ab2034aef9f7cb28077e73962241d6ac9317'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:office-moving';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 8, 33, 'US-CA-LOS_ANGELES:moving:single-item-moving', '2.0.0-research', '3591127b34e577681e8f7e09335f314ff05224d228ded0386fdc11274ccec2a6', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif BHGS household mover permit/licence","tarife/insurance kayıtları","uygun sürücü belgesi","araç tescil/insurance"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Household goods mı office/commercial goods mı?","Araç GVWR/GVM ve plaka/owner bilgisi nedir?","Intracity/intercity/interstate/cross-border rota mı?","For-hire mı, dangerous/oversize cargo var mı?","MoveFix taşıyıcı mı broker/forwarder mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BHGS-MOVER","US-DMV-CDL","US-DMV-MCP","US-FMCSA-AUTH","US-FMCSA-MOVER","US-LA-BTRC"]', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-MCP: Ücret karşılığı müşteri malı taşıma; motorcycle courier dahil', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:single-item-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:single-item-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:single-item-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:single-item-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-HHG-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:single-item-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-MCP: Ücret karşılığı müşteri malı taşıma; motorcycle courier dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-FMCSA-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:single-item-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-MCP: Ücret karşılığı müşteri malı taşıma; motorcycle courier dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-MCP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:single-item-moving';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:single-item-moving';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '0096dec14bca24e29db206be1ab95c98e2ac208a3cf1d11c9943642f8f09163a'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:single-item-moving';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 8, 21, 'US-CA-LOS_ANGELES:moving:intercity-moving', '2.0.0-research', 'fe4f51ad7241e3a4bd8ab7fd4f062566c039388f98a494d7ed09ebc67efdad6c', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif BHGS household mover permit/licence","tarife/insurance kayıtları","uygun sürücü belgesi","araç tescil/insurance"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Household goods mı office/commercial goods mı?","Araç GVWR/GVM ve plaka/owner bilgisi nedir?","Intracity/intercity/interstate/cross-border rota mı?","For-hire mı, dangerous/oversize cargo var mı?","MoveFix taşıyıcı mı broker/forwarder mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BHGS-MOVER","US-DMV-CDL","US-DMV-MCP","US-FMCSA-AUTH","US-FMCSA-MOVER","US-LA-BTRC"]', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-MCP: Ücret karşılığı müşteri malı taşıma; motorcycle courier dahil', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:intercity-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:intercity-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:intercity-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:intercity-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-HHG-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:intercity-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-MCP: Ücret karşılığı müşteri malı taşıma; motorcycle courier dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-FMCSA-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:intercity-moving';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-MCP: Ücret karşılığı müşteri malı taşıma; motorcycle courier dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-MCP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:intercity-moving';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:intercity-moving';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '9dc8343ed1e3d6a6d5033259133c7148dfc76e5a2811bb7118ee65227326255d'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:moving:intercity-moving';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 9, 45, 'US-CA-LOS_ANGELES:appliance:washing-machine', '2.0.0-research', '373ac1685f6c55fc2b504148499d1978d5ed726c8da50f7a0c38575d779aea0e', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Her service location için aktif Appliance Service Dealer veya Electronic Service Dealer registration"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Plug-in bench repair mi yoksa bina elektriği/su/gaz bağlantısı mı?","Refrigerant circuit açılacak mı?","“Yetkili servis” iddiası var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BHGS-REPAIR","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-LA-BTRC"]', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:washing-machine';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:washing-machine';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:washing-machine';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:washing-machine';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-APPLIANCE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:washing-machine';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:washing-machine';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:washing-machine';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:washing-machine';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:washing-machine';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'c623655769d7ec0e67491c33eac5c6d4cd8c4cb2b1c26faddf6822106f6b57f3'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:washing-machine';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 9, 9, 'US-CA-LOS_ANGELES:appliance:dishwasher', '2.0.0-research', 'bdbd919915f10509581576111fa6df3ef053e147af38cd6be1ad5a7e43baaa24', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Her service location için aktif Appliance Service Dealer veya Electronic Service Dealer registration"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Plug-in bench repair mi yoksa bina elektriği/su/gaz bağlantısı mı?","Refrigerant circuit açılacak mı?","“Yetkili servis” iddiası var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BHGS-REPAIR","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-LA-BTRC"]', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:dishwasher';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:dishwasher';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:dishwasher';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:dishwasher';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-APPLIANCE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:dishwasher';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:dishwasher';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:dishwasher';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:dishwasher';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:dishwasher';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '6d01cce72e8d038ad52c0d3c4d8d765bfbdff65a375416826828a88f91127f6d'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:dishwasher';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 9, 57, 'US-CA-LOS_ANGELES:appliance:refrigerator', '2.0.0-research', 'd8af1179247acfa2a7acf9dc5089da927f4671560c1985eec0f05e16b10d9dd9', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Her service location için aktif Appliance Service Dealer veya Electronic Service Dealer registration"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Plug-in bench repair mi yoksa bina elektriği/su/gaz bağlantısı mı?","Refrigerant circuit açılacak mı?","“Yetkili servis” iddiası var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BHGS-REPAIR","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-EPA-608","US-LA-BTRC"]', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:refrigerator';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:refrigerator';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:refrigerator';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:refrigerator';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-APPLIANCE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:refrigerator';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:refrigerator';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:refrigerator';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:refrigerator';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-608'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:refrigerator';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-EPA-608: Soğutucu devreyi açma, dolum, geri kazanım, servis veya disposal | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C20-C38'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:refrigerator';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:refrigerator';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '0297be977cf932f691a706765a970cb394b662ede6e20d653a15280a30618377'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:refrigerator';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 9, 34, 'US-CA-LOS_ANGELES:appliance:oven-cooker', '2.0.0-research', 'a65e3c56f953dfb8d008ad8aa10d17ccdda8606d36d6023d4aaa17b21bdc7af8', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Her service location için aktif Appliance Service Dealer veya Electronic Service Dealer registration"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Plug-in bench repair mi yoksa bina elektriği/su/gaz bağlantısı mı?","Refrigerant circuit açılacak mı?","“Yetkili servis” iddiası var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BHGS-REPAIR","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-LA-BTRC"]', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:oven-cooker';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:oven-cooker';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:oven-cooker';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:oven-cooker';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-APPLIANCE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:oven-cooker';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:oven-cooker';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:oven-cooker';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:oven-cooker';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı | US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-C20-C38: Klima, ısıtma veya refrigeration işi'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C20-C38'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:oven-cooker';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:oven-cooker';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '3c2a4922aa547817fcceb08fcc27728c58336d6e452ca61dd4114960b324abdc'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:appliance:oven-cooker';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 13, 22, 'US-CA-LOS_ANGELES:towing:breakdown-tow', '2.0.0-research', 'f5437ca9c2d2a5c53437b9a830e1b0a51e9975d9d0a944ae7428c329b31f4640', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","CA#/MCP, kapsam gerektiriyorsa","uygun California DL/CDL","Tow Truck Driver Certificate/Clearance","çekici tescili ve sigortası","Los Angeles Tow Unit Operator police permit","işletme/tow permit; rotation/OPG ise ayrı onay"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Araç hasarlı/bozuk mu yoksa sağlam vehicle transport mu?","Tow vehicle class/weight/route nedir?","Private tow, police rotation, impound veya roadside recovery hangisi?","Onarım da yapılacak mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BAR-ARD","US-BAR-LOOKUP","US-DMV-CDL","US-DMV-MCP","US-DMV-TTD","US-FMCSA-AUTH","US-FMCSA-MOVER","US-LA-BTRC","US-LA-TOW"]', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-ARD: Ücretli diagnose, service veya repair; mobile/referral/sublet dahil', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:breakdown-tow';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:breakdown-tow';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:breakdown-tow';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:breakdown-tow';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-TOW'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:breakdown-tow';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-ARD: Ücretli diagnose, service veya repair; mobile/referral/sublet dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-FMCSA-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:breakdown-tow';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-ARD: Ücretli diagnose, service veya repair; mobile/referral/sublet dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ARD'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:breakdown-tow';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:breakdown-tow';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '3b25ea5cc626de1cc632992b062bf652ac65f473ad1749d867f055f4b53ee8f1'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:breakdown-tow';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 13, 46, 'US-CA-LOS_ANGELES:towing:accident-tow', '2.0.0-research', '7d27682fa59b310bad2db1df1dea5894709e63868d505d7296efc32262e774f2', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","CA#/MCP, kapsam gerektiriyorsa","uygun California DL/CDL","Tow Truck Driver Certificate/Clearance","çekici tescili ve sigortası","Los Angeles Tow Unit Operator police permit","işletme/tow permit; rotation/OPG ise ayrı onay"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Araç hasarlı/bozuk mu yoksa sağlam vehicle transport mu?","Tow vehicle class/weight/route nedir?","Private tow, police rotation, impound veya roadside recovery hangisi?","Onarım da yapılacak mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BAR-ARD","US-BAR-LOOKUP","US-DMV-CDL","US-DMV-MCP","US-DMV-TTD","US-FMCSA-AUTH","US-FMCSA-MOVER","US-LA-BTRC","US-LA-TOW"]', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-ARD: Ücretli diagnose, service veya repair; mobile/referral/sublet dahil', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:accident-tow';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:accident-tow';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:accident-tow';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:accident-tow';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-TOW'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:accident-tow';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-ARD: Ücretli diagnose, service veya repair; mobile/referral/sublet dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-FMCSA-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:accident-tow';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-ARD: Ücretli diagnose, service veya repair; mobile/referral/sublet dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ARD'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:accident-tow';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:accident-tow';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '59ad0dfa2c7c973e1adb5f2fe81461a44d0eebcc93616e38b8d816a226988c09'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:accident-tow';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 13, 10, 'US-CA-LOS_ANGELES:towing:vehicle-transport', '2.0.0-research', '6f509f928c41298524a662c38881decd5d541591020c38e80b977edc879bc5c6', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","CA#/MCP, kapsam gerektiriyorsa","uygun California DL/CDL","Tow Truck Driver Certificate/Clearance","çekici tescili ve sigortası","Los Angeles Tow Unit Operator police permit","işletme/tow permit; rotation/OPG ise ayrı onay"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Araç hasarlı/bozuk mu yoksa sağlam vehicle transport mu?","Tow vehicle class/weight/route nedir?","Private tow, police rotation, impound veya roadside recovery hangisi?","Onarım da yapılacak mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BAR-ARD","US-BAR-LOOKUP","US-DMV-CDL","US-DMV-MCP","US-DMV-TTD","US-FMCSA-AUTH","US-FMCSA-MOVER","US-LA-BTRC","US-LA-TOW"]', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-ARD: Ücretli diagnose, service veya repair; mobile/referral/sublet dahil', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:vehicle-transport';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:vehicle-transport';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:vehicle-transport';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:vehicle-transport';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-TOW'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:vehicle-transport';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-ARD: Ücretli diagnose, service veya repair; mobile/referral/sublet dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-FMCSA-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:vehicle-transport';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma | US-CA-ARD: Ücretli diagnose, service veya repair; mobile/referral/sublet dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ARD'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:vehicle-transport';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:vehicle-transport';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '5fecde044d72897ffbf45349543321070cafb38be90b3f19c877e77abc8c8dbf'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:towing:vehicle-transport';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 14, 58, 'US-CA-LOS_ANGELES:courier:document-courier', '2.0.0-research', '333cc7f9e653677f22a6f04e73f2d90c404ff759c3743f2cf971d54deab4bb94', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","CA#","aktif Motor Carrier Permit","liability insurance","workers’ compensation/exemption","EPN requester/driver monitoring, tetiklenirse","uygun driver licence/endorsement","commercial vehicle registration"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Yaya/bisiklet/motosiklet/kei/van/truck hangisi?","Araç ağırlığı ve route scope nedir?","Express operator mı yalnız subcontracted delivery mi?","Dangerous/restricted cargo var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-DMV-CDL","US-DMV-MCP","US-FMCSA-AUTH","US-FMCSA-MOVER","US-LA-BTRC"]', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:document-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:document-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:document-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:document-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-MCP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:document-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-FMCSA-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:document-courier';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:document-courier';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'e2b2b7867beb9117fa2d81fb5f0467c0dabebe02afc50175d35ebdd64c0d1dfb'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:document-courier';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 14, 35, 'US-CA-LOS_ANGELES:courier:parcel-courier', '2.0.0-research', '0e1611d9424c278cec6e227c31e64db6b1c4f6115ceeab36e8e4fd6d23762908', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","CA#","aktif Motor Carrier Permit","liability insurance","workers’ compensation/exemption","EPN requester/driver monitoring, tetiklenirse","uygun driver licence/endorsement","commercial vehicle registration"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Yaya/bisiklet/motosiklet/kei/van/truck hangisi?","Araç ağırlığı ve route scope nedir?","Express operator mı yalnız subcontracted delivery mi?","Dangerous/restricted cargo var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-DMV-CDL","US-DMV-MCP","US-FMCSA-AUTH","US-FMCSA-MOVER","US-LA-BTRC"]', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:parcel-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:parcel-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:parcel-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:parcel-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-MCP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:parcel-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-FMCSA-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:parcel-courier';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:parcel-courier';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '8fa462cdbfdfd856da6933160367a23074d81a9a887b04c821979be04bc3edb9'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:parcel-courier';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 14, 23, 'US-CA-LOS_ANGELES:courier:moto-courier', '2.0.0-research', '99f4b9166250d1edc0af279c308db1d6ed2d510f5cd70bc6866c5896f7de11b6', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","CA#","aktif Motor Carrier Permit","liability insurance","workers’ compensation/exemption","EPN requester/driver monitoring, tetiklenirse","uygun driver licence/endorsement","commercial vehicle registration"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Yaya/bisiklet/motosiklet/kei/van/truck hangisi?","Araç ağırlığı ve route scope nedir?","Express operator mı yalnız subcontracted delivery mi?","Dangerous/restricted cargo var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-DMV-CDL","US-DMV-MCP","US-FMCSA-AUTH","US-FMCSA-MOVER","US-LA-BTRC"]', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:moto-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:moto-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:moto-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:moto-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-MCP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:moto-courier';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-FMCSA-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:moto-courier';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:moto-courier';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '30423dde0f7247e517656aa6a65f93f7f3259d80db9856ab2811e6198fd422f5'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:moto-courier';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 14, 47, 'US-CA-LOS_ANGELES:courier:scheduled-delivery', '2.0.0-research', '1be8558d71ad8bf0066d8eff21d302149578a342dca940132bb3be49c07926c7', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","CA#","aktif Motor Carrier Permit","liability insurance","workers’ compensation/exemption","EPN requester/driver monitoring, tetiklenirse","uygun driver licence/endorsement","commercial vehicle registration"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Yaya/bisiklet/motosiklet/kei/van/truck hangisi?","Araç ağırlığı ve route scope nedir?","Express operator mı yalnız subcontracted delivery mi?","Dangerous/restricted cargo var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-DMV-CDL","US-DMV-MCP","US-FMCSA-AUTH","US-FMCSA-MOVER","US-LA-BTRC"]', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:scheduled-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:scheduled-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:scheduled-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:scheduled-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-MCP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:scheduled-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-FMCSA-MOVER: Eyaletler arası household goods taşıma'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-FMCSA-MOVER'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:scheduled-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:scheduled-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '11c0a5a2e98b65014d0859c9d1be6f82c6ee4e4dd6142abe89a2206e5f73637d'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:courier:scheduled-delivery';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 15, 11, 'US-CA-LOS_ANGELES:roadside:battery-jump', '2.0.0-research', '6e0fc1c4f4f35769caa7debb6b2e378869b6e371de1f964476e350de7d075bc2', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","US-CA-LA-BASE","sürücü belgesi","servis aracı tescil/sigorta","yakıt taşıma miktarı için hazmat sonucu"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Yalnız jump/tire/fuel mi; teşhis/repair/tow var mı?","Service vehicle ve driver sınıfı nedir?","Yakıt veya başka hazardous material miktarı nedir?"]', '["G-NIST-IAL","G-W3C-VC","US-DMV-CDL","US-DMV-MCP","US-DMV-TTD","US-LA-BTRC","US-LA-TOW"]', 'US-CA-TOW: Ücretli towing/vehicle transport', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:battery-jump';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:battery-jump';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:battery-jump';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:battery-jump';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ROAD-BASIC'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:battery-jump';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-TOW: Ücretli towing/vehicle transport'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-TOW'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:battery-jump';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:battery-jump';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '2a0fb5134ba239555a59b6561f26e7a5714469408b5392308188143aab93c7a7'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:battery-jump';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 15, 59, 'US-CA-LOS_ANGELES:roadside:tire-change', '2.0.0-research', '0f6ce0fe75637f80fd5d19005a0992f6109f223a0369343dc004218dccc98e2d', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","US-CA-LA-BASE","sürücü belgesi","servis aracı tescil/sigorta","yakıt taşıma miktarı için hazmat sonucu","Aktif BAR ARD registration","mobil ise araç plakası ve mobile ARD kayıt bağı","işletme adı/numara/telefon reklam gösterimi"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Yalnız jump/tire/fuel mi; teşhis/repair/tow var mı?","Service vehicle ve driver sınıfı nedir?","Yakıt veya başka hazardous material miktarı nedir?"]', '["G-NIST-IAL","G-W3C-VC","US-BAR-ARD","US-BAR-LOOKUP","US-DMV-CDL","US-DMV-MCP","US-DMV-TTD","US-LA-BTRC","US-LA-TOW"]', 'US-CA-TOW: Ücretli towing/vehicle transport', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:tire-change';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:tire-change';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:tire-change';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:tire-change';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ROAD-BASIC'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:tire-change';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ARD'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:tire-change';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-TOW: Ücretli towing/vehicle transport'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-TOW'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:tire-change';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:tire-change';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '23775449e88a1f07505af4609c107fb49022877f3fe658532dd812fd50387713'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:tire-change';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 15, 36, 'US-CA-LOS_ANGELES:roadside:fuel-delivery', '2.0.0-research', '6dd12739a1db7275d4ff733231062499d651acd65fea78e03183dc328b2df247', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","US-CA-LA-BASE","sürücü belgesi","servis aracı tescil/sigorta","yakıt taşıma miktarı için hazmat sonucu"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Yalnız jump/tire/fuel mi; teşhis/repair/tow var mı?","Service vehicle ve driver sınıfı nedir?","Yakıt veya başka hazardous material miktarı nedir?"]', '["G-NIST-IAL","G-W3C-VC","US-DMV-CDL","US-DMV-MCP","US-DMV-TTD","US-LA-BTRC","US-LA-TOW"]', 'US-CA-TOW: Ücretli towing/vehicle transport', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:fuel-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:fuel-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:fuel-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:fuel-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ROAD-BASIC'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:fuel-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-TOW: Ücretli towing/vehicle transport'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-TOW'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:fuel-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:fuel-delivery';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '07e3ca2bbbb3bcb4383226292313f87fd415affa054a772cf9252dfd431146db'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:fuel-delivery';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 15, 24, 'US-CA-LOS_ANGELES:roadside:minor-repair', '2.0.0-research', 'b20e2d830b779a285a722297f357a5495830d0dbb9e91c04296b160e0ef387cc', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","US-CA-LA-BASE","sürücü belgesi","servis aracı tescil/sigorta","yakıt taşıma miktarı için hazmat sonucu","Aktif BAR ARD registration","mobil ise araç plakası ve mobile ARD kayıt bağı","işletme adı/numara/telefon reklam gösterimi"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Yalnız jump/tire/fuel mi; teşhis/repair/tow var mı?","Service vehicle ve driver sınıfı nedir?","Yakıt veya başka hazardous material miktarı nedir?"]', '["G-NIST-IAL","G-W3C-VC","US-BAR-ARD","US-BAR-LOOKUP","US-DMV-CDL","US-DMV-MCP","US-DMV-TTD","US-LA-BTRC","US-LA-TOW"]', 'US-CA-TOW: Ücretli towing/vehicle transport', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:minor-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:minor-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:minor-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:minor-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ROAD-BASIC'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:minor-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ARD'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:minor-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-TOW: Ücretli towing/vehicle transport'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-TOW'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:minor-repair';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:minor-repair';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '52aee049d1b98fe39ed8e48ce8286ed2b5d6e1812e8a1d250c9c97ff1c8d9a1c'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:roadside:minor-repair';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60002, 48, 'US-CA-LOS_ANGELES:home-repair:furniture-assembly', '2.0.0-research', '2464e51395b23ee3ae32c436e27a1d08dffaaf9fd80d44268300e50130492783', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","İşe göre B/B-2, C-6, C-9, C-17 veya başka aktif CSLB classification"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Exact task hangi yapı elemanında?","Prefabricated assembly mi custom manufacture/structural work mü?","Permit/value/employees/electric-water-gas/asbestos trigger var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-DIR-ASBESTOS","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:furniture-assembly';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:furniture-assembly';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:furniture-assembly';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:furniture-assembly';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:furniture-assembly';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-HOME-REPAIR'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:furniture-assembly';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:furniture-assembly';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ASBESTOS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:furniture-assembly';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:furniture-assembly';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:furniture-assembly';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:furniture-assembly';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '394cff942537e4b9647b25ab8d69e26e4eb230cd617b03bafa39f8567b1995ae'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:furniture-assembly';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60002, 12, 'US-CA-LOS_ANGELES:home-repair:drywall-repair', '2.0.0-research', 'e26473e5d51613127e0deca9f62068881ba8dd2c0bd57f7b283245877e2b854d', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","İşe göre B/B-2, C-6, C-9, C-17 veya başka aktif CSLB classification"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Exact task hangi yapı elemanında?","Prefabricated assembly mi custom manufacture/structural work mü?","Permit/value/employees/electric-water-gas/asbestos trigger var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-DIR-ASBESTOS","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:drywall-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:drywall-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:drywall-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:drywall-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:drywall-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-HOME-REPAIR'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:drywall-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:drywall-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ASBESTOS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:drywall-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:drywall-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:drywall-repair';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:drywall-repair';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'd8f77c15ecd166c29077793aab6a63911195f4e70d2b24d6e294997d5920f3db'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:drywall-repair';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60002, 60, 'US-CA-LOS_ANGELES:home-repair:door-window-repair', '2.0.0-research', '6369ecbdc3d7d9673f5fde129f6fe87c6653ce7ab6a61a04cce087a30d17c530', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","İşe göre B/B-2, C-6, C-9, C-17 veya başka aktif CSLB classification"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Exact task hangi yapı elemanında?","Prefabricated assembly mi custom manufacture/structural work mü?","Permit/value/employees/electric-water-gas/asbestos trigger var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-DIR-ASBESTOS","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:door-window-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:door-window-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:door-window-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:door-window-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:door-window-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-HOME-REPAIR'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:door-window-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:door-window-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ASBESTOS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:door-window-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:door-window-repair';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:door-window-repair';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:door-window-repair';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'cc00c5f099b9801aadb81be1db30c732586d3665612cfe62ef057dac62130495'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:door-window-repair';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60002, 37, 'US-CA-LOS_ANGELES:home-repair:general-handyman', '2.0.0-research', 'bdcba072acc45a88f3e9450674e82123b39da9414be2adf63b19aeb243142ee9', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif CSLB licence","işe uygun classification","qualifier bağı","25.000 USD contractor bond kaydı","workers’ compensation veya hukuken geçerli exemption","İşe göre B/B-2, C-6, C-9, C-17 veya başka aktif CSLB classification"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Exact task hangi yapı elemanında?","Prefabricated assembly mi custom manufacture/structural work mü?","Permit/value/employees/electric-water-gas/asbestos trigger var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BPC-7048","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-DIR-ASBESTOS","US-EPA-RRP","US-LA-BTRC"]', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:general-handyman';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:general-handyman';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:general-handyman';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:general-handyman';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:general-handyman';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-HOME-REPAIR'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:general-handyman';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-EPA-RRP'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:general-handyman';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ASBESTOS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:general-handyman';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:general-handyman';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-EPA-RRP: 1978 öncesi konut/child-occupied facility’de ücretli renovation ile boyalı yüzey bozma; federal eşik ve istisnalar uygulanır | US-CA-ASBESTOS: Asbestos >0.1% ve düzenlenen alan/iş eşiği veya diğer asbestos trigger | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-C36: Plumbing işinde contractor tetikleri veya platform ilanı'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C36'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:general-handyman';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:general-handyman';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'ebbf30c993a9ba10705c598b08bbfd6b41cb5dcc023ccf6f70b2bff2fc3b3df8'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:home-repair:general-handyman';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60003, 25, 'US-CA-LOS_ANGELES:automotive:vehicle-maintenance', '2.0.0-research', 'ad25f466e14d148db3f0b2c4b3aea23118c2b5146e6fa339b88498529ad27536', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif BAR ARD registration","mobil ise araç plakası ve mobile ARD kayıt bağı","işletme adı/numara/telefon reklam gösterimi"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Detailing mi, diagnosis/maintenance/repair mı?","Mobile mı approved workshop/site içinde mi?","Smog/safety inspection veya special maintenance var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BAR-ARD","US-BAR-LOOKUP","US-LA-BTRC"]', '', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ARD'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-maintenance';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '513845047cda660a42604c24a52856d954a1b8b6ca966e8ce54d2ac31db999ab'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-maintenance';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60003, 49, 'US-CA-LOS_ANGELES:automotive:vehicle-diagnostics', '2.0.0-research', '747974326f697fd356839775e9723d0ed8d8153c6f372b533c2dced340bed04d', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif BAR ARD registration","mobil ise araç plakası ve mobile ARD kayıt bağı","işletme adı/numara/telefon reklam gösterimi"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Detailing mi, diagnosis/maintenance/repair mı?","Mobile mı approved workshop/site içinde mi?","Smog/safety inspection veya special maintenance var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BAR-ARD","US-BAR-LOOKUP","US-LA-BTRC"]', '', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-diagnostics';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-diagnostics';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-diagnostics';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-diagnostics';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ARD'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-diagnostics';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-diagnostics';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '838ecd9831cf86ce066416e76df5502ceb240250c425b5534f04c40cdf208e1b'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:vehicle-diagnostics';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60003, 13, 'US-CA-LOS_ANGELES:automotive:tire-service', '2.0.0-research', 'c6581653f3a45417ce7d78f556ef79c35db9b69b3c8b3712c54ed7f1d8200e6e', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Aktif BAR ARD registration","mobil ise araç plakası ve mobile ARD kayıt bağı","işletme adı/numara/telefon reklam gösterimi"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Detailing mi, diagnosis/maintenance/repair mı?","Mobile mı approved workshop/site içinde mi?","Smog/safety inspection veya special maintenance var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BAR-ARD","US-BAR-LOOKUP","US-LA-BTRC"]', '', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:tire-service';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:tire-service';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:tire-service';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:tire-service';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ARD'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:tire-service';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:tire-service';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '8875822d5651d79ab9acb9acfcc14b6070777c4bc7baae35d1238c4c03363634'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:tire-service';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60003, 61, 'US-CA-LOS_ANGELES:automotive:auto-detailing', '2.0.0-research', '2e86fba7e4a7fbe6f4989fa5db260a99093979785464825547ff008a25b3f7a2', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Detailing mi, diagnosis/maintenance/repair mı?","Mobile mı approved workshop/site içinde mi?","Smog/safety inspection veya special maintenance var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BAR-ARD","US-BAR-LOOKUP","US-LA-BTRC"]', 'US-CA-ARD: Ücretli diagnose, service veya repair; mobile/referral/sublet dahil', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:auto-detailing';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:auto-detailing';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:auto-detailing';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:auto-detailing';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-ARD: Ücretli diagnose, service veya repair; mobile/referral/sublet dahil'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ARD'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:auto-detailing';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:auto-detailing';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '57164e1480d998477782846f0429b1784db9b634e1b5b8735b2e4299ede71f00'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:automotive:auto-detailing';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60004, 38, 'US-CA-LOS_ANGELES:technology:computer-service', '2.0.0-research', 'd0c1d7719085acaad06b3a4857b83aad85b170ad3916bba1019f6e921415b349', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Her service location için aktif Appliance Service Dealer veya Electronic Service Dealer registration"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Bench repair mi fixed wiring/network/security installation mı?","Alarm/fire/surveillance veya mains electricity bağlantısı var mı?","“Authorized service” iddiası var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BHGS-REPAIR","US-LA-BTRC"]', '', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:computer-service';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:computer-service';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:computer-service';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:computer-service';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-APPLIANCE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:computer-service';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:computer-service';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'c95ded7717c19cf6ebdb52631d06ee8b9a1ea887654870f9f1c9419cfdf648d1'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:computer-service';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60004, 26, 'US-CA-LOS_ANGELES:technology:mobile-device-service', '2.0.0-research', 'cdadcdf808ffc0d34b50230a777b9702b4839f4bfdbc77faa79a6576e0d3b284', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Her service location için aktif Appliance Service Dealer veya Electronic Service Dealer registration"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Bench repair mi fixed wiring/network/security installation mı?","Alarm/fire/surveillance veya mains electricity bağlantısı var mı?","“Authorized service” iddiası var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BHGS-REPAIR","US-LA-BTRC"]', '', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:mobile-device-service';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:mobile-device-service';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:mobile-device-service';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:mobile-device-service';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-APPLIANCE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:mobile-device-service';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:mobile-device-service';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '60763e74c4bdc5561a2901a76fe6735671baaf733218ec9467272ed44598f290'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:mobile-device-service';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60004, 50, 'US-CA-LOS_ANGELES:technology:network-setup', '2.0.0-research', '75f89f5496d9b78b0023a3a41df29c086e027e6f42b875ff64ad81e48854259f', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Her service location için aktif Appliance Service Dealer veya Electronic Service Dealer registration"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Bench repair mi fixed wiring/network/security installation mı?","Alarm/fire/surveillance veya mains electricity bağlantısı var mı?","“Authorized service” iddiası var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BHGS-REPAIR","US-BPC-7048","US-BSIS-ALARM","US-BSIS-VERIFY","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-LA-BTRC"]', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:network-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:network-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:network-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:network-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-APPLIANCE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:network-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:network-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:network-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ALARM'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:network-setup';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:network-setup';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '717aabb6e7ca6b1c8a5918e7b0bde17c22fff18d657f4e96de52a4f78ef0c794'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:network-setup';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60004, 14, 'US-CA-LOS_ANGELES:technology:smart-home-setup', '2.0.0-research', 'd11001fd867e81c51b0be3c6153fdf9ff328d98844f239d0e60a8a4ab4d02f48', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Her service location için aktif Appliance Service Dealer veya Electronic Service Dealer registration"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Bench repair mi fixed wiring/network/security installation mı?","Alarm/fire/surveillance veya mains electricity bağlantısı var mı?","“Authorized service” iddiası var mı?"]', '["G-NIST-IAL","G-W3C-VC","US-BHGS-REPAIR","US-BPC-7048","US-BSIS-ALARM","US-BSIS-VERIFY","US-CSLB-CLASS","US-CSLB-TRIGGER","US-CSLB-VERIFY","US-LA-BTRC"]', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:smart-home-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:smart-home-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:smart-home-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:smart-home-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-APPLIANCE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:smart-home-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-CONTRACTOR-CLASS'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:smart-home-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-C10'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:smart-home-setup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'CONDITIONAL', 'US-CA-CONTRACTOR-CLASS: İş permit gerektiriyorsa, çalışan kullanılıyorsa veya labor+materials toplamı $1.000+ ise; platformda contractor olarak reklam minor exemption’ı kaldırabilir | US-CA-C10: Elektrik tesisatı/onarımı | US-CA-ALARM: Güvenlik alarmını satma, kurma, izleme, servis veya yanıt'
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-ALARM'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:smart-home-setup';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:smart-home-setup';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '6cfd71612f7df5e6fa9815301f6af6aebc4d6dc829a0c59013d39ef89cae8e2c'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:technology:smart-home-setup';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60005, 62, 'US-CA-LOS_ANGELES:personal-care:hair-care', '2.0.0-research', '74b1f0d89eca8cc4bd4250024086d0deb53160b321323e905995d998d40603d2', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Hizmete uygun aktif person licence: cosmetologist/hairstylist/esthetician/manicurist","işletme mekânı varsa establishment licence","müşteri evi/otel ise Personal Service Permit"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Saç/makyaj/tırnak/masaj exact işlem nedir?","Medical/therapeutic/invasive claim var mı?","Licensed salon/establishment mı yoksa müşteri evi/otel/event mi?"]', '["G-NIST-IAL","G-W3C-VC","US-BC-LICENSE","US-BC-PSP","US-DCA-LOOKUP","US-LA-BTRC"]', '', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:hair-care';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:hair-care';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:hair-care';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:hair-care';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-PERSONAL'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:hair-care';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:hair-care';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '37c597540ea9718aaab4b9b40d35fc1774465cebb35ebce92c51b3c1d7f63c6a'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:hair-care';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60005, 39, 'US-CA-LOS_ANGELES:personal-care:makeup', '2.0.0-research', 'c6e9b0290c40167d0b33f2f208bcb53518b74d8ac0de595fdcf6dc2699f45562', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Hizmete uygun aktif person licence: cosmetologist/hairstylist/esthetician/manicurist","işletme mekânı varsa establishment licence","müşteri evi/otel ise Personal Service Permit"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Saç/makyaj/tırnak/masaj exact işlem nedir?","Medical/therapeutic/invasive claim var mı?","Licensed salon/establishment mı yoksa müşteri evi/otel/event mi?"]', '["G-NIST-IAL","G-W3C-VC","US-BC-LICENSE","US-BC-PSP","US-DCA-LOOKUP","US-LA-BTRC"]', '', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:makeup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:makeup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:makeup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:makeup';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-PERSONAL'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:makeup';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:makeup';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', '1545f1b5ac49ca3d9a53ef50cf1533a92329dbbee8d4fa6b36a39522af6e9f7a'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:makeup';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60005, 27, 'US-CA-LOS_ANGELES:personal-care:nail-care', '2.0.0-research', 'f9e318cc22e78179c150fbb397028017426f8923904ee6f5e9cffc5d9fdaefd5', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","Hizmete uygun aktif person licence: cosmetologist/hairstylist/esthetician/manicurist","işletme mekânı varsa establishment licence","müşteri evi/otel ise Personal Service Permit"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Saç/makyaj/tırnak/masaj exact işlem nedir?","Medical/therapeutic/invasive claim var mı?","Licensed salon/establishment mı yoksa müşteri evi/otel/event mi?"]', '["G-NIST-IAL","G-W3C-VC","US-BC-LICENSE","US-BC-PSP","US-DCA-LOOKUP","US-LA-BTRC"]', '', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:nail-care';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:nail-care';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:nail-care';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:nail-care';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-PERSONAL'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:nail-care';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:nail-care';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'cc5fec472fbc5dd73f1d0436c2eb2f98be0e58637122e8ba6efd36a46cef32f6'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:nail-care';
--> statement-breakpoint
INSERT INTO country_service_coverage (countryDeploymentId,jurisdictionNodeId,canonicalCategoryId,canonicalSubcategoryId,researchRowId,researchRulePackVersion,researchRowHash,mappingState,sourceState,legalState,connectorState,productionState,riskLevel,mandatoryEvidenceJson,intakeQuestionsJson,sourceIdsJson,conditionalTriggerSummary,missingEvidenceDecision)
SELECT deployment.id, los_angeles.id, 60005, 51, 'US-CA-LOS_ANGELES:personal-care:massage', '2.0.0-research', '329108368482e8bd6ef6fc22bddf184febebd31d182240091fd82af4a570b984', 'MAPPED_BLOCKED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_REVIEWED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'BLOCKED_PENDING_GATES', 'CRITICAL', '["Devlet kimliği veya yetkili dijital kimlik kanıtı","canlılık/selfie eşleşmesi","işletme/sole proprietor kaydı","vergi statüsü","yetkili temsilci bağı","Madde/ek/istisna/tarih bazlı hukukçu onayı","bağımsız dil uzmanı onayı","sürüm/hash","etkinlik ve yürürlük tarihleri","Belge sahibi","veren kurum","belge no","kapsam/sınıf","durum","son kullanma/askı/iptal","işletme-kişi-araç-site bağları","Kimlik ve rol","W-9/TIN iş akışı için gerekli vergi bilgisi","işletme/DBA kaydı gerekiyorsa","Los Angeles BTRC","çalışan/bağımsız yüklenici sınıflandırma sonucu","CAMTC certification veya Los Angeles’ın kabul ettiği bireysel massage permit rotası","massage establishment/business permit gerekiyorsa","kimlik ve işyeri bağı"]', '["İş hangi ülke/pilot yargı ve kesin adreste yapılacak?","Sağlayıcı bağımsız kişi, şahıs işletmesi, şirket, çalışan, alt yüklenici, owner-driver veya fleet operator mı?","Tam işlem installation/repair/maintenance/inspection/transport/emergency-help/authorized-service seçeneklerinden hangisi?","Konut, ticari alan, inşaat sahası, kamu alanı veya müşteri evi mi?","Saç/makyaj/tırnak/masaj exact işlem nedir?","Medical/therapeutic/invasive claim var mı?","Licensed salon/establishment mı yoksa müşteri evi/otel/event mi?"]', '["G-NIST-IAL","G-W3C-VC","US-CAMTC","US-LA-BTRC","US-LA-TOW"]', '', 'CAPABILITY_BLOCKED'
FROM country_deployments deployment INNER JOIN jurisdiction_nodes los_angeles ON los_angeles.countryDeploymentId = deployment.id AND los_angeles.nodeCode = 'US-CA-LOS_ANGELES'
WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-IDENTITY-ENTITY'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:massage';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-LOCAL-LAW-TEXT'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:massage';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'GLOBAL-EVIDENCE-CHAIN'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:massage';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-LA-BASE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:massage';
--> statement-breakpoint
INSERT INTO country_coverage_bundle_bindings (coverageId,bundleId,bindingKind,conditionSummary)
SELECT coverage.id, bundle.id, 'MANDATORY', NULL
FROM country_service_coverage coverage INNER JOIN country_requirement_bundles bundle ON bundle.bundleKey = 'US-CA-MASSAGE'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:massage';
--> statement-breakpoint
INSERT INTO country_coverage_policy_decisions (coverageId,rulePackVersionId,decision,assuranceLevel,sourceState,connectorState,legalApprovalState,productReleaseState,stateVersion,reasonCodesJson)
SELECT coverage.id, rule_pack.id, 'BLOCKED', 'SELF_ASSERTED', 'AI_RESEARCHED_UNVERIFIED', 'NOT_IMPLEMENTED_OR_NOT_AUTHORIZED', 'NOT_REVIEWED', 'PENDING', 1, '["COUNTRY_SCAFFOLD_ONLY","AI_RESEARCHED_UNVERIFIED","LOCAL_COUNSEL_NOT_REVIEWED","CONNECTOR_NOT_AUTHORIZED","PRODUCT_RELEASE_PENDING"]'
FROM country_service_coverage coverage INNER JOIN country_rule_pack_versions rule_pack ON rule_pack.version = '2.0.0-research'
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:massage';
--> statement-breakpoint
INSERT INTO country_coverage_policy_events (coveragePolicyDecisionId,eventType,actorUserId,reasonCode,evidenceHash)
SELECT decision.id, 'SEEDED', NULL, 'RESEARCH_SEED_DEFAULT_OFF', 'd1c688b5a3791c9b2219ee4bf0b429d2a6b73f8de2369b882d32001ae7b3492a'
FROM country_coverage_policy_decisions decision INNER JOIN country_service_coverage coverage ON coverage.id = decision.coverageId
WHERE coverage.researchRowId = 'US-CA-LOS_ANGELES:personal-care:massage';
--> statement-breakpoint
INSERT INTO legal_documents (countryDeploymentId,documentKey,documentVersion,documentSurface,legalApprovalState)
SELECT deployment.id, 'US-CA-LA-CONSUMER_TERMS', '2.0.0-research-draft-machine', 'consumer_terms', 'PENDING' FROM country_deployments deployment WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO localized_legal_versions (legalDocumentId,locale,localizationState,contentHash,contentStorageKey,runtimeSelectable)
SELECT document.id, 'en-US', 'DRAFT_MACHINE', NULL, NULL, 0 FROM legal_documents document WHERE document.documentKey = 'US-CA-LA-CONSUMER_TERMS' AND document.documentVersion = '2.0.0-research-draft-machine';
--> statement-breakpoint
INSERT INTO localized_legal_versions (legalDocumentId,locale,localizationState,contentHash,contentStorageKey,runtimeSelectable)
SELECT document.id, 'es-US', 'DRAFT_MACHINE', NULL, NULL, 0 FROM legal_documents document WHERE document.documentKey = 'US-CA-LA-CONSUMER_TERMS' AND document.documentVersion = '2.0.0-research-draft-machine';
--> statement-breakpoint
INSERT INTO legal_documents (countryDeploymentId,documentKey,documentVersion,documentSurface,legalApprovalState)
SELECT deployment.id, 'US-CA-LA-PROVIDER_AGREEMENT', '2.0.0-research-draft-machine', 'provider_agreement', 'PENDING' FROM country_deployments deployment WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO localized_legal_versions (legalDocumentId,locale,localizationState,contentHash,contentStorageKey,runtimeSelectable)
SELECT document.id, 'en-US', 'DRAFT_MACHINE', NULL, NULL, 0 FROM legal_documents document WHERE document.documentKey = 'US-CA-LA-PROVIDER_AGREEMENT' AND document.documentVersion = '2.0.0-research-draft-machine';
--> statement-breakpoint
INSERT INTO localized_legal_versions (legalDocumentId,locale,localizationState,contentHash,contentStorageKey,runtimeSelectable)
SELECT document.id, 'es-US', 'DRAFT_MACHINE', NULL, NULL, 0 FROM legal_documents document WHERE document.documentKey = 'US-CA-LA-PROVIDER_AGREEMENT' AND document.documentVersion = '2.0.0-research-draft-machine';
--> statement-breakpoint
INSERT INTO legal_documents (countryDeploymentId,documentKey,documentVersion,documentSurface,legalApprovalState)
SELECT deployment.id, 'US-CA-LA-PRIVACY_NOTICE', '2.0.0-research-draft-machine', 'privacy_notice', 'PENDING' FROM country_deployments deployment WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO localized_legal_versions (legalDocumentId,locale,localizationState,contentHash,contentStorageKey,runtimeSelectable)
SELECT document.id, 'en-US', 'DRAFT_MACHINE', NULL, NULL, 0 FROM legal_documents document WHERE document.documentKey = 'US-CA-LA-PRIVACY_NOTICE' AND document.documentVersion = '2.0.0-research-draft-machine';
--> statement-breakpoint
INSERT INTO localized_legal_versions (legalDocumentId,locale,localizationState,contentHash,contentStorageKey,runtimeSelectable)
SELECT document.id, 'es-US', 'DRAFT_MACHINE', NULL, NULL, 0 FROM legal_documents document WHERE document.documentKey = 'US-CA-LA-PRIVACY_NOTICE' AND document.documentVersion = '2.0.0-research-draft-machine';
--> statement-breakpoint
INSERT INTO legal_documents (countryDeploymentId,documentKey,documentVersion,documentSurface,legalApprovalState)
SELECT deployment.id, 'US-CA-LA-COOKIE_NOTICE', '2.0.0-research-draft-machine', 'cookie_notice', 'PENDING' FROM country_deployments deployment WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO localized_legal_versions (legalDocumentId,locale,localizationState,contentHash,contentStorageKey,runtimeSelectable)
SELECT document.id, 'en-US', 'DRAFT_MACHINE', NULL, NULL, 0 FROM legal_documents document WHERE document.documentKey = 'US-CA-LA-COOKIE_NOTICE' AND document.documentVersion = '2.0.0-research-draft-machine';
--> statement-breakpoint
INSERT INTO localized_legal_versions (legalDocumentId,locale,localizationState,contentHash,contentStorageKey,runtimeSelectable)
SELECT document.id, 'es-US', 'DRAFT_MACHINE', NULL, NULL, 0 FROM legal_documents document WHERE document.documentKey = 'US-CA-LA-COOKIE_NOTICE' AND document.documentVersion = '2.0.0-research-draft-machine';
--> statement-breakpoint
INSERT INTO legal_documents (countryDeploymentId,documentKey,documentVersion,documentSurface,legalApprovalState)
SELECT deployment.id, 'US-CA-LA-APPEAL_NOTICE', '2.0.0-research-draft-machine', 'appeal_notice', 'PENDING' FROM country_deployments deployment WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO localized_legal_versions (legalDocumentId,locale,localizationState,contentHash,contentStorageKey,runtimeSelectable)
SELECT document.id, 'en-US', 'DRAFT_MACHINE', NULL, NULL, 0 FROM legal_documents document WHERE document.documentKey = 'US-CA-LA-APPEAL_NOTICE' AND document.documentVersion = '2.0.0-research-draft-machine';
--> statement-breakpoint
INSERT INTO localized_legal_versions (legalDocumentId,locale,localizationState,contentHash,contentStorageKey,runtimeSelectable)
SELECT document.id, 'es-US', 'DRAFT_MACHINE', NULL, NULL, 0 FROM legal_documents document WHERE document.documentKey = 'US-CA-LA-APPEAL_NOTICE' AND document.documentVersion = '2.0.0-research-draft-machine';
--> statement-breakpoint
INSERT INTO legal_documents (countryDeploymentId,documentKey,documentVersion,documentSurface,legalApprovalState)
SELECT deployment.id, 'US-CA-LA-INCIDENT_NOTICE', '2.0.0-research-draft-machine', 'incident_notice', 'PENDING' FROM country_deployments deployment WHERE deployment.countryCode = 'US';
--> statement-breakpoint
INSERT INTO localized_legal_versions (legalDocumentId,locale,localizationState,contentHash,contentStorageKey,runtimeSelectable)
SELECT document.id, 'en-US', 'DRAFT_MACHINE', NULL, NULL, 0 FROM legal_documents document WHERE document.documentKey = 'US-CA-LA-INCIDENT_NOTICE' AND document.documentVersion = '2.0.0-research-draft-machine';
--> statement-breakpoint
INSERT INTO localized_legal_versions (legalDocumentId,locale,localizationState,contentHash,contentStorageKey,runtimeSelectable)
SELECT document.id, 'es-US', 'DRAFT_MACHINE', NULL, NULL, 0 FROM legal_documents document WHERE document.documentKey = 'US-CA-LA-INCIDENT_NOTICE' AND document.documentVersion = '2.0.0-research-draft-machine';
--> statement-breakpoint
