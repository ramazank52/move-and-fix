-- Additive CHECKPOINT A extension. This migration does not mutate legacy
-- service_capabilities, Turkey compliance records, provider profiles or users.
-- It binds the default-off scaffold to every canonical service capability and
-- adds only Germany/Berlin research shells. All source and legal statuses stay
-- unverified/pending; no country or capability becomes selectable.
ALTER TABLE `service_capability_definitions`
  ADD COLUMN `canonicalCapabilityId` int NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `service_capability_definitions_canonical_capability_unique`
  ON `service_capability_definitions` (`canonicalCapabilityId`);
--> statement-breakpoint

-- Preserve the category-level seed from 0085 and add one explicit, default-off
-- task definition per existing authoritative catalog capability.
INSERT INTO `service_capability_definitions` (
  `canonicalServiceKey`, `canonicalCategoryId`, `canonicalCapabilityId`, `displayName`,
  `serviceLevel`, `requiredDimensionsJson`, `blockedByDefault`, `mappingState`
)
SELECT
  CONCAT('capability:', `key`),
  `categoryId`,
  `id`,
  `displayName`,
  'task',
  JSON_ARRAY('PROFILE', 'LEGAL_SOURCE', 'OFFICIAL_EVIDENCE', 'CONNECTOR', 'LOCAL_LEGAL_APPROVAL', 'PRODUCT_RELEASE_APPROVAL'),
  1,
  'MAPPED_BLOCKED'
FROM `service_capabilities`;
--> statement-breakpoint

-- A capability policy row is materialized only for the Berlin pilot node.
-- The five country shells remain infrastructure records; no JP/US/CN/RU city
-- node or capability policy is introduced before its explicit checkpoint.
INSERT INTO `capability_policy_decisions` (
  `countryDeploymentId`, `jurisdictionNodeId`, `capabilityDefinitionId`, `scopeKey`,
  `decision`, `sourceState`, `legalState`, `connectorState`, `releaseState`,
  `enforcementState`, `translationState`, `dataResidencyState`, `sanctionsState`, `stateVersion`
)
SELECT
  deployment.`id`,
  berlin.`id`,
  definition.`id`,
  CONCAT('DE-BE-BERLIN:', definition.`canonicalServiceKey`),
  'BLOCKED', 'UNVERIFIED', 'PENDING', 'PENDING', 'PENDING',
  'CLEAR', 'DRAFT_MACHINE', 'NOT_READY', 'UNKNOWN', 1
FROM `country_deployments` deployment
INNER JOIN `jurisdiction_nodes` berlin ON berlin.`countryDeploymentId` = deployment.`id`
INNER JOIN `service_capability_definitions` definition ON definition.`canonicalCapabilityId` IS NOT NULL
WHERE BINARY deployment.`countryCode` = BINARY 'DE' AND BINARY berlin.`nodeCode` = BINARY 'DE-BE-BERLIN';
--> statement-breakpoint

-- These references are discovery records copied from the user-supplied
-- research input. They are not legal verification, a source hash, a counsel
-- approval or an authority/connector authorization.
INSERT INTO `official_sources` (
  `countryDeploymentId`, `jurisdictionNodeId`, `sourceKey`, `authorityName`, `sourceUrl`,
  `sourceVersion`, `sourceHash`, `sourceStatus`, `retrievalMethod`
)
SELECT deployment.`id`, berlin.`id`, source_seed.`sourceKey`, source_seed.`authorityName`, source_seed.`sourceUrl`,
  'research-reference-2026-08-21', NULL, 'SOURCE_UNVERIFIED', 'MANUAL_REFERENCE'
FROM `country_deployments` deployment
INNER JOIN `jurisdiction_nodes` berlin ON berlin.`countryDeploymentId` = deployment.`id`
INNER JOIN (
  SELECT 'DE-HWO' AS `sourceKey`, 'Federal Ministry of Justice / gesetze-im-internet' AS `authorityName`, 'https://www.gesetze-im-internet.de/hwo/' AS `sourceUrl`
  UNION ALL SELECT 'DE-NAV-13', 'Federal Ministry of Justice / gesetze-im-internet', 'https://www.gesetze-im-internet.de/nav/BJNR247710006.html'
  UNION ALL SELECT 'DE-AVBWASSERV-12', 'Federal Ministry of Justice / gesetze-im-internet', 'https://www.gesetze-im-internet.de/avbwasserv/BJNR007500980.html'
  UNION ALL SELECT 'DE-NDAV-13', 'Federal Ministry of Justice / gesetze-im-internet', 'https://www.gesetze-im-internet.de/ndav/__13.html'
  UNION ALL SELECT 'DE-CHEMKLIMASCHUTZV-2026', 'Federal Ministry of Justice / gesetze-im-internet', 'https://www.gesetze-im-internet.de/chemklimaschutzv_2026/'
  UNION ALL SELECT 'DE-BALM-GUETERVERKEHR', 'Federal Office for Logistics and Mobility', 'https://www.balm.bund.de/DE/Service/FragenAntwortenFAQ/FragenAntwortenGueterverkehr/fragenantwortengueterverkehr.html'
  UNION ALL SELECT 'DE-POSTG-2024', 'Federal Ministry of Justice / gesetze-im-internet', 'https://www.gesetze-im-internet.de/postg_2024/BJNR0EC0B0024.html'
  UNION ALL SELECT 'DE-BNETZA-POST-DIRECTORY', 'Bundesnetzagentur', 'https://www.bundesnetzagentur.de/DE/Fachthemen/Post/Anbieterverzeichnis/artikel.html'
  UNION ALL SELECT 'DE-DVGW-INSTALLER-RESEARCH', 'DVGW (research reference)', 'https://www.dvgw.de/'
  UNION ALL SELECT 'DE-VDE-TAB-RESEARCH', 'VDE / local network operator (research reference)', 'https://www.vde.com/'
) source_seed ON 1 = 1
WHERE BINARY deployment.`countryCode` = BINARY 'DE' AND BINARY berlin.`nodeCode` = BINARY 'DE-BE-BERLIN';
--> statement-breakpoint

INSERT INTO `legal_requirements` (
  `countryDeploymentId`, `jurisdictionNodeId`, `capabilityDefinitionId`, `requirementKey`,
  `requirementVersion`, `requirementState`, `authoritative`, `sourceStatus`,
  `legalApprovalState`, `officialSourceId`, `sourceReference`, `blockingReasonCode`
)
SELECT
  deployment.`id`, berlin.`id`, NULL,
  CONCAT('DE-BE-', source.`sourceKey`),
  'research-reference-2026-08-21',
  'UNKNOWN', 0, 'SOURCE_UNVERIFIED', 'PENDING', source.`id`,
  CONCAT('Research-only reference: ', source.`sourceKey`),
  'SOURCE_UNVERIFIED_LOCAL_COUNSEL_REQUIRED'
FROM `country_deployments` deployment
INNER JOIN `jurisdiction_nodes` berlin ON berlin.`countryDeploymentId` = deployment.`id`
INNER JOIN `official_sources` source ON source.`countryDeploymentId` = deployment.`id` AND source.`jurisdictionNodeId` = berlin.`id`
WHERE BINARY deployment.`countryCode` = BINARY 'DE' AND BINARY berlin.`nodeCode` = BINARY 'DE-BE-BERLIN';
--> statement-breakpoint

INSERT INTO `credential_types` (`countryDeploymentId`, `credentialKey`, `displayName`, `rawCredentialClassification`, `extractionAllowed`)
SELECT deployment.`id`, credential_seed.`credentialKey`, credential_seed.`displayName`, 'UNCLASSIFIED', 0
FROM `country_deployments` deployment
INNER JOIN (
  SELECT 'DE_HANDWERKSROLLE' AS `credentialKey`, 'Handwerksrolle / business registration (research shell)' AS `displayName`
  UNION ALL SELECT 'DE_UTILITY_INSTALLER_LIST', 'Utility installer-list evidence (research shell)'
  UNION ALL SELECT 'DE_FGAS_PERSON_COMPANY_CERTIFICATE', 'F-gas person/company certification evidence (research shell)'
  UNION ALL SELECT 'DE_FREIGHT_AUTHORITY_AND_INSURANCE', 'Freight authority / licence / insurance evidence (research shell)'
  UNION ALL SELECT 'DE_POSTAL_PROVIDER_REGISTRY', 'Postal provider registry evidence (research shell)'
) credential_seed ON 1 = 1
WHERE BINARY deployment.`countryCode` = BINARY 'DE';
--> statement-breakpoint

INSERT INTO `verification_connectors` (
  `countryDeploymentId`, `jurisdictionNodeId`, `connectorKey`, `displayName`, `status`,
  `assuranceLevel`, `forbiddenScraping`, `authorizationEvidenceHash`, `officialSourceId`
)
SELECT deployment.`id`, berlin.`id`, connector_seed.`connectorKey`, connector_seed.`displayName`, 'PENDING',
  'NONE', 1, NULL, source.`id`
FROM `country_deployments` deployment
INNER JOIN `jurisdiction_nodes` berlin ON berlin.`countryDeploymentId` = deployment.`id`
INNER JOIN (
  SELECT 'DE_HANDWERKSKAMMER_REGISTRY' AS `connectorKey`, 'Handwerkskammer registry connector (not configured)' AS `displayName`, 'DE-HWO' AS `sourceKey`
  UNION ALL SELECT 'DE_UTILITY_INSTALLER_REGISTRY', 'Utility installer-list connector (not configured)', 'DE-NAV-13'
  UNION ALL SELECT 'DE_BALM_FREIGHT_REGISTRY', 'BALM freight authority connector (not configured)', 'DE-BALM-GUETERVERKEHR'
  UNION ALL SELECT 'DE_BNETZA_POST_REGISTRY', 'Bundesnetzagentur post directory connector (not configured)', 'DE-BNETZA-POST-DIRECTORY'
) connector_seed ON 1 = 1
LEFT JOIN `official_sources` source ON source.`countryDeploymentId` = deployment.`id`
  AND source.`jurisdictionNodeId` = berlin.`id` AND BINARY source.`sourceKey` = BINARY connector_seed.`sourceKey`
WHERE BINARY deployment.`countryCode` = BINARY 'DE' AND BINARY berlin.`nodeCode` = BINARY 'DE-BE-BERLIN';
--> statement-breakpoint

INSERT INTO `legal_documents` (`countryDeploymentId`, `documentKey`, `documentVersion`, `documentSurface`, `legalApprovalState`)
SELECT deployment.`id`, document_seed.`documentKey`, '0.0.0-draft-machine', document_seed.`documentSurface`, 'PENDING'
FROM `country_deployments` deployment
INNER JOIN (
  SELECT 'DE-BE-CONSUMER-TERMS' AS `documentKey`, 'consumer_terms' AS `documentSurface`
  UNION ALL SELECT 'DE-BE-PROVIDER-AGREEMENT', 'provider_agreement'
  UNION ALL SELECT 'DE-BE-PRIVACY-NOTICE', 'privacy_notice'
  UNION ALL SELECT 'DE-BE-COOKIE-NOTICE', 'cookie_notice'
  UNION ALL SELECT 'DE-BE-APPEAL-NOTICE', 'appeal_notice'
  UNION ALL SELECT 'DE-BE-INCIDENT-NOTICE', 'incident_notice'
) document_seed ON 1 = 1
WHERE BINARY deployment.`countryCode` = BINARY 'DE';
--> statement-breakpoint

INSERT INTO `localized_legal_versions` (`legalDocumentId`, `locale`, `localizationState`, `contentHash`, `contentStorageKey`, `runtimeSelectable`)
SELECT document.`id`, 'de-DE', 'DRAFT_MACHINE', NULL, NULL, 0
FROM `legal_documents` document
INNER JOIN `country_deployments` deployment ON deployment.`id` = document.`countryDeploymentId`
WHERE BINARY deployment.`countryCode` = BINARY 'DE' AND BINARY document.`documentVersion` = BINARY '0.0.0-draft-machine';
