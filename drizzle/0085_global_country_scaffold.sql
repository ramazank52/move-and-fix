-- Global country infrastructure is additive and default-off. It deliberately
-- does not modify Turkey's legacy jurisdiction, rule-pack or provider data.
CREATE TABLE `country_deployments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryCode` varchar(2) NOT NULL,
  `displayName` varchar(160) NOT NULL,
  `state` enum('SCAFFOLD_ONLY','RESEARCHING','SOURCE_REVIEW','LEGAL_REVIEW','CONNECTOR_PENDING','STAGING_READY','PILOT_READY','PRODUCTION_PARTIAL','PRODUCTION_ACTIVE','SUSPENDED','INFRA_ONLY_NO_GO') NOT NULL DEFAULT 'SCAFFOLD_ONLY',
  `dataPlaneClass` varchar(80) NOT NULL,
  `defaultLocale` varchar(32) NOT NULL,
  `defaultCurrency` varchar(3) NOT NULL,
  `defaultTimeZone` varchar(64) NOT NULL,
  `rawCredentialGlobalTransferAllowed` int NOT NULL DEFAULT 0,
  `localDataPlaneReady` int NOT NULL DEFAULT 0,
  `countryShellEnabled` int NOT NULL DEFAULT 0,
  `jurisdictionEnabled` int NOT NULL DEFAULT 0,
  `consumerDiscoveryEnabled` int NOT NULL DEFAULT 0,
  `providerOnboardingEnabled` int NOT NULL DEFAULT 0,
  `bookingEnabled` int NOT NULL DEFAULT 0,
  `paymentsEnabled` int NOT NULL DEFAULT 0,
  `aiAssistantEnabled` int NOT NULL DEFAULT 0,
  `supportEnabled` int NOT NULL DEFAULT 0,
  `productionStateReachable` int NOT NULL DEFAULT 0,
  `seedVersion` varchar(64) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `country_deployments_id` PRIMARY KEY (`id`),
  CONSTRAINT `country_deployments_country_unique` UNIQUE (`countryCode`)
);
--> statement-breakpoint
CREATE TABLE `jurisdiction_nodes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `parentId` int NULL,
  `nodeCode` varchar(96) NOT NULL,
  `displayName` varchar(160) NOT NULL,
  `nodeType` enum('country','state','province','region','city','district','municipality') NOT NULL,
  `state` enum('SCAFFOLD_ONLY','SUSPENDED','ACTIVE') NOT NULL DEFAULT 'SCAFFOLD_ONLY',
  `locale` varchar(32) NOT NULL,
  `currency` varchar(3) NOT NULL,
  `timeZone` varchar(64) NOT NULL,
  `addressProfile` varchar(80) NOT NULL DEFAULT 'UNKNOWN',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `jurisdiction_nodes_id` PRIMARY KEY (`id`),
  CONSTRAINT `jurisdiction_nodes_node_code_unique` UNIQUE (`nodeCode`)
);
--> statement-breakpoint
CREATE TABLE `service_capability_definitions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `canonicalServiceKey` varchar(120) NOT NULL,
  `canonicalCategoryId` int NULL,
  `displayName` varchar(160) NOT NULL,
  `serviceLevel` enum('category','subcategory','task') NOT NULL DEFAULT 'category',
  `requiredDimensionsJson` json NOT NULL,
  `blockedByDefault` int NOT NULL DEFAULT 1,
  `mappingState` enum('UNMAPPED_SERVICE_BLOCKED','MAPPED_BLOCKED','MAPPED_ELIGIBLE') NOT NULL DEFAULT 'UNMAPPED_SERVICE_BLOCKED',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `service_capability_definitions_id` PRIMARY KEY (`id`),
  CONSTRAINT `service_capability_definitions_key_unique` UNIQUE (`canonicalServiceKey`)
);
--> statement-breakpoint
CREATE TABLE `official_sources` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `jurisdictionNodeId` int NULL,
  `sourceKey` varchar(160) NOT NULL,
  `authorityName` varchar(240) NOT NULL,
  `sourceUrl` varchar(2048) NOT NULL,
  `sourceVersion` varchar(160) NOT NULL,
  `sourceHash` varchar(128) NULL,
  `sourceStatus` enum('SOURCE_UNVERIFIED','SOURCE_VERIFIED','SUPERSEDED','REVOKED') NOT NULL DEFAULT 'SOURCE_UNVERIFIED',
  `retrievalMethod` enum('MANUAL_REFERENCE','PERMITTED_API','AUTHORIZED_EXPORT','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `verifiedByApprovalLedgerId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `official_sources_id` PRIMARY KEY (`id`),
  CONSTRAINT `official_sources_scope_key_unique` UNIQUE (`countryDeploymentId`,`sourceKey`,`sourceVersion`)
);
--> statement-breakpoint
CREATE TABLE `legal_requirements` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `jurisdictionNodeId` int NULL,
  `capabilityDefinitionId` int NULL,
  `requirementKey` varchar(160) NOT NULL,
  `requirementVersion` varchar(80) NOT NULL,
  `requirementState` enum('UNKNOWN','REQUIRED','CONDITIONAL','NOT_REQUIRED','PROHIBITED') NOT NULL DEFAULT 'UNKNOWN',
  `authoritative` int NOT NULL DEFAULT 0,
  `sourceStatus` enum('SOURCE_UNVERIFIED','SOURCE_VERIFIED') NOT NULL DEFAULT 'SOURCE_UNVERIFIED',
  `legalApprovalState` enum('PENDING','APPROVED','REVOKED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `officialSourceId` int NULL,
  `sourceReference` varchar(320) NULL,
  `blockingReasonCode` varchar(160) NOT NULL DEFAULT 'UNKNOWN_LEGAL_REQUIREMENT',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `legal_requirements_id` PRIMARY KEY (`id`),
  CONSTRAINT `legal_requirements_scope_key_version_unique` UNIQUE (`countryDeploymentId`,`requirementKey`,`requirementVersion`)
);
--> statement-breakpoint
CREATE TABLE `credential_types` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `credentialKey` varchar(160) NOT NULL,
  `displayName` varchar(200) NOT NULL,
  `rawCredentialClassification` varchar(80) NOT NULL DEFAULT 'UNCLASSIFIED',
  `extractionAllowed` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `credential_types_id` PRIMARY KEY (`id`),
  CONSTRAINT `credential_types_country_key_unique` UNIQUE (`countryDeploymentId`,`credentialKey`)
);
--> statement-breakpoint
CREATE TABLE `credential_issuers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `credentialTypeId` int NOT NULL,
  `issuerKey` varchar(160) NOT NULL,
  `displayName` varchar(240) NOT NULL,
  `issuerStatus` enum('UNVERIFIED','VERIFIED','REVOKED') NOT NULL DEFAULT 'UNVERIFIED',
  `officialSourceId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `credential_issuers_id` PRIMARY KEY (`id`),
  CONSTRAINT `credential_issuers_country_key_unique` UNIQUE (`countryDeploymentId`,`issuerKey`)
);
--> statement-breakpoint
CREATE TABLE `verification_connectors` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `jurisdictionNodeId` int NULL,
  `connectorKey` varchar(160) NOT NULL,
  `displayName` varchar(240) NOT NULL,
  `status` enum('PENDING','UNVERIFIED','AUTHORIZED','OPERATIONAL','REVOKED','NOT_CONFIGURED') NOT NULL DEFAULT 'PENDING',
  `assuranceLevel` enum('NONE','DOCUMENT_ONLY','ISSUER_SIGNATURE','REGISTRY_MATCH','REGISTRY_STATUS') NOT NULL DEFAULT 'NONE',
  `forbiddenScraping` int NOT NULL DEFAULT 1,
  `authorizationEvidenceHash` varchar(128) NULL,
  `officialSourceId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `verification_connectors_id` PRIMARY KEY (`id`),
  CONSTRAINT `verification_connectors_country_key_unique` UNIQUE (`countryDeploymentId`,`connectorKey`)
);
--> statement-breakpoint
CREATE TABLE `credential_evidence` (
  `id` int AUTO_INCREMENT NOT NULL,
  `providerCredentialId` int NULL,
  `countryDeploymentId` int NOT NULL,
  `credentialTypeId` int NULL,
  `evidenceLevel` enum('SELF_ASSERTED','DOCUMENT_UPLOADED','DOCUMENT_EXTRACTED','ISSUER_SIGNATURE_VERIFIED','REGISTRY_MATCHED','REGISTRY_STATUS_ACTIVE','REVOCATION_MONITORED') NOT NULL DEFAULT 'SELF_ASSERTED',
  `evidenceHash` varchar(128) NOT NULL,
  `evidenceStatus` enum('PENDING','UNVERIFIED','VERIFIED','REVOKED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `credential_evidence_id` PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `credentialEvidenceId` int NULL,
  `verificationConnectorId` int NULL,
  `eventType` enum('REQUESTED','EXTRACTED','MATCHED','STATUS_CHECKED','FAILED','REVOKED') NOT NULL,
  `resultState` enum('UNVERIFIED','MATCHED','ACTIVE','FAILED','REVOKED') NOT NULL DEFAULT 'UNVERIFIED',
  `correlationId` varchar(128) NOT NULL,
  `evidenceHash` varchar(128) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `verification_events_id` PRIMARY KEY (`id`),
  CONSTRAINT `verification_events_correlation_unique` UNIQUE (`correlationId`)
);
--> statement-breakpoint
CREATE TABLE `legal_documents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `documentKey` varchar(160) NOT NULL,
  `documentVersion` varchar(80) NOT NULL,
  `documentSurface` enum('consumer_terms','provider_agreement','privacy_notice','cookie_notice','appeal_notice','incident_notice') NOT NULL,
  `legalApprovalState` enum('PENDING','APPROVED','REVOKED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `legal_documents_id` PRIMARY KEY (`id`),
  CONSTRAINT `legal_documents_country_key_version_unique` UNIQUE (`countryDeploymentId`,`documentKey`,`documentVersion`)
);
--> statement-breakpoint
CREATE TABLE `localized_legal_versions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `legalDocumentId` int NOT NULL,
  `locale` varchar(32) NOT NULL,
  `localizationState` enum('DRAFT_MACHINE','HUMAN_TRANSLATED','LEGAL_REVIEWED','LINGUIST_REVIEWED','APPROVED_STAGING','APPROVED_PRODUCTION','RETIRED') NOT NULL DEFAULT 'DRAFT_MACHINE',
  `contentHash` varchar(128) NULL,
  `contentStorageKey` varchar(512) NULL,
  `runtimeSelectable` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `localized_legal_versions_id` PRIMARY KEY (`id`),
  CONSTRAINT `localized_legal_versions_document_locale_unique` UNIQUE (`legalDocumentId`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `approval_ledger` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `jurisdictionNodeId` int NULL,
  `subjectType` enum('OFFICIAL_SOURCE','LEGAL_REQUIREMENT','CONNECTOR','LEGAL_DOCUMENT','CAPABILITY_POLICY','COUNTRY_ACTIVATION') NOT NULL,
  `subjectKey` varchar(240) NOT NULL,
  `approvalType` enum('SOURCE_VERIFICATION','LOCAL_LEGAL','LINGUIST','CONNECTOR_AUTHORIZATION','DATA_PRIVACY','PAYMENT_FUNDS_FLOW','PRODUCT_RELEASE') NOT NULL,
  `eventType` enum('GRANTED','REVOKED','EXPIRED','SUPERSEDED') NOT NULL,
  `approverUserId` int NOT NULL,
  `approverRole` varchar(120) NOT NULL,
  `authorityScope` varchar(240) NOT NULL,
  `evidenceHash` varchar(128) NOT NULL,
  `validFrom` timestamp NULL,
  `validUntil` timestamp NULL,
  `priorLedgerEventId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `approval_ledger_id` PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE TABLE `capability_policy_decisions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `jurisdictionNodeId` int NULL,
  `capabilityDefinitionId` int NOT NULL,
  `scopeKey` varchar(280) NOT NULL,
  `decision` enum('BLOCKED','REVIEW_REQUIRED','POLICY_ELIGIBLE','ACTIVE','SUSPENDED') NOT NULL DEFAULT 'BLOCKED',
  `sourceState` enum('UNVERIFIED','VERIFIED','BLOCKED') NOT NULL DEFAULT 'UNVERIFIED',
  `legalState` enum('PENDING','APPROVED','REVOKED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `connectorState` enum('PENDING','UNVERIFIED','AUTHORIZED','OPERATIONAL','BLOCKED') NOT NULL DEFAULT 'PENDING',
  `releaseState` enum('PENDING','APPROVED','REVOKED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `enforcementState` enum('CLEAR','SUSPENDED','BLOCKED') NOT NULL DEFAULT 'CLEAR',
  `translationState` enum('UNREVIEWED','DRAFT_MACHINE','APPROVED') NOT NULL DEFAULT 'UNREVIEWED',
  `dataResidencyState` enum('UNKNOWN','NOT_READY','READY','BLOCKED') NOT NULL DEFAULT 'UNKNOWN',
  `sanctionsState` enum('UNKNOWN','CLEAR','BLOCKED') NOT NULL DEFAULT 'UNKNOWN',
  `stateVersion` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `capability_policy_decisions_id` PRIMARY KEY (`id`),
  CONSTRAINT `capability_policy_decisions_scope_unique` UNIQUE (`scopeKey`)
);
--> statement-breakpoint
CREATE TABLE `country_capability_appeals` (
  `id` int AUTO_INCREMENT NOT NULL,
  `capabilityPolicyDecisionId` int NOT NULL,
  `providerId` int NULL,
  `status` enum('SUBMITTED','UNDER_REVIEW','ACCEPTED','REJECTED','WITHDRAWN') NOT NULL DEFAULT 'SUBMITTED',
  `statement` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `country_capability_appeals_id` PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE TABLE `incident_jurisdiction_matrix` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `jurisdictionNodeId` int NULL,
  `incidentType` varchar(120) NOT NULL,
  `notificationState` enum('UNKNOWN','NOT_CONFIGURED','CONFIGURED','BLOCKED') NOT NULL DEFAULT 'NOT_CONFIGURED',
  `legalRequirementId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `incident_jurisdiction_matrix_id` PRIMARY KEY (`id`),
  CONSTRAINT `incident_jurisdiction_matrix_scope_unique` UNIQUE (`countryDeploymentId`,`incidentType`)
);
--> statement-breakpoint
CREATE TABLE `incident_notices` (
  `id` int AUTO_INCREMENT NOT NULL,
  `incidentJurisdictionMatrixId` int NOT NULL,
  `locale` varchar(32) NOT NULL,
  `localizationState` enum('DRAFT_MACHINE','HUMAN_TRANSLATED','LEGAL_REVIEWED','APPROVED_PRODUCTION','RETIRED') NOT NULL DEFAULT 'DRAFT_MACHINE',
  `runtimeSelectable` int NOT NULL DEFAULT 0,
  `contentHash` varchar(128) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `incident_notices_id` PRIMARY KEY (`id`),
  CONSTRAINT `incident_notices_matrix_locale_unique` UNIQUE (`incidentJurisdictionMatrixId`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `country_activation_runs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `requestedState` varchar(40) NOT NULL,
  `result` enum('BLOCKED','PASSED','ABORTED') NOT NULL DEFAULT 'BLOCKED',
  `blockersJson` json NOT NULL,
  `actorUserId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `country_activation_runs_id` PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE INDEX `country_deployments_state_idx` ON `country_deployments` (`state`);
--> statement-breakpoint
CREATE INDEX `jurisdiction_nodes_country_parent_idx` ON `jurisdiction_nodes` (`countryDeploymentId`,`parentId`);
--> statement-breakpoint
CREATE INDEX `jurisdiction_nodes_state_idx` ON `jurisdiction_nodes` (`state`);
--> statement-breakpoint
CREATE INDEX `service_capability_definitions_category_idx` ON `service_capability_definitions` (`canonicalCategoryId`,`mappingState`);
--> statement-breakpoint
CREATE INDEX `official_sources_country_status_idx` ON `official_sources` (`countryDeploymentId`,`sourceStatus`);
--> statement-breakpoint
CREATE INDEX `legal_requirements_capability_state_idx` ON `legal_requirements` (`capabilityDefinitionId`,`requirementState`,`authoritative`);
--> statement-breakpoint
CREATE INDEX `verification_connectors_status_idx` ON `verification_connectors` (`countryDeploymentId`,`status`,`assuranceLevel`);
--> statement-breakpoint
CREATE INDEX `credential_evidence_country_status_idx` ON `credential_evidence` (`countryDeploymentId`,`evidenceStatus`,`evidenceLevel`);
--> statement-breakpoint
CREATE INDEX `verification_events_connector_created_idx` ON `verification_events` (`verificationConnectorId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `approval_ledger_subject_idx` ON `approval_ledger` (`countryDeploymentId`,`subjectType`,`subjectKey`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `approval_ledger_approver_idx` ON `approval_ledger` (`approverUserId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `capability_policy_decisions_country_decision_idx` ON `capability_policy_decisions` (`countryDeploymentId`,`decision`,`enforcementState`);
--> statement-breakpoint
CREATE INDEX `country_capability_appeals_decision_status_idx` ON `country_capability_appeals` (`capabilityPolicyDecisionId`,`status`);
--> statement-breakpoint
CREATE INDEX `country_activation_runs_country_created_idx` ON `country_activation_runs` (`countryDeploymentId`,`createdAt`);
--> statement-breakpoint
INSERT INTO `country_deployments` (`countryCode`,`displayName`,`state`,`dataPlaneClass`,`defaultLocale`,`defaultCurrency`,`defaultTimeZone`,`rawCredentialGlobalTransferAllowed`,`localDataPlaneReady`,`countryShellEnabled`,`jurisdictionEnabled`,`consumerDiscoveryEnabled`,`providerOnboardingEnabled`,`bookingEnabled`,`paymentsEnabled`,`aiAssistantEnabled`,`supportEnabled`,`productionStateReachable`,`seedVersion`) VALUES
  ('DE','Germany','SCAFFOLD_ONLY','EU_REGIONAL','de-DE','EUR','Europe/Berlin',0,0,0,0,0,0,0,0,0,0,0,'1.0.0'),
  ('JP','Japan','SCAFFOLD_ONLY','JP_LOCAL_OR_APPROVED_REGIONAL','ja-JP','JPY','Asia/Tokyo',0,0,0,0,0,0,0,0,0,0,0,'1.0.0'),
  ('US','United States','SCAFFOLD_ONLY','US_REGIONAL','en-US','USD','America/Los_Angeles',0,0,0,0,0,0,0,0,0,0,0,'1.0.0'),
  ('CN','China','SCAFFOLD_ONLY','CN_SEPARATE_LOCAL','zh-Hans-CN','CNY','Asia/Shanghai',0,0,0,0,0,0,0,0,0,0,0,'1.0.0'),
  ('RU','Russia','INFRA_ONLY_NO_GO','RU_SEPARATE_LOCAL','ru-RU','RUB','Europe/Moscow',0,0,0,0,0,0,0,0,0,0,0,'1.0.0');
--> statement-breakpoint
INSERT INTO `jurisdiction_nodes` (`countryDeploymentId`,`parentId`,`nodeCode`,`displayName`,`nodeType`,`state`,`locale`,`currency`,`timeZone`,`addressProfile`)
SELECT `id`, NULL, `countryCode`, `displayName`, 'country', 'SCAFFOLD_ONLY', `defaultLocale`, `defaultCurrency`, `defaultTimeZone`, 'UNKNOWN' FROM `country_deployments`;
--> statement-breakpoint
INSERT INTO `jurisdiction_nodes` (`countryDeploymentId`,`parentId`,`nodeCode`,`displayName`,`nodeType`,`state`,`locale`,`currency`,`timeZone`,`addressProfile`) VALUES
  ((SELECT id FROM country_deployments WHERE countryCode = 'DE'),(SELECT id FROM jurisdiction_nodes WHERE nodeCode = 'DE'),'DE-BE-BERLIN','Berlin','city','SCAFFOLD_ONLY','de-DE','EUR','Europe/Berlin','UNKNOWN');
--> statement-breakpoint
INSERT INTO `service_capability_definitions` (`canonicalServiceKey`,`canonicalCategoryId`,`displayName`,`serviceLevel`,`requiredDimensionsJson`,`blockedByDefault`,`mappingState`)
SELECT `slug`, `id`, `name`, 'category', JSON_ARRAY('country','jurisdiction','provider_type','legal_source','connector','release'), 1, 'UNMAPPED_SERVICE_BLOCKED'
FROM `service_categories` WHERE `isActive` = 1;
