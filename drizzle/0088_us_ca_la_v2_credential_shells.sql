-- US-CA-LOS_ANGELES v2 CHECKPOINT A evidence shells.
-- These records model research relationships only. They neither classify a
-- document as a legal credential nor verify an issuer, source or connector.
INSERT INTO `credential_types` (
  `countryDeploymentId`, `credentialKey`, `displayName`, `rawCredentialClassification`, `extractionAllowed`
)
SELECT
  deployment.`id`,
  CONCAT('US_V2_BUNDLE_', bundle.`bundleKey`),
  CONCAT(bundle.`title`, ' — AI researched evidence shell'),
  'AI_RESEARCHED_UNCLASSIFIED',
  0
FROM `country_requirement_bundles` bundle
INNER JOIN `country_deployments` deployment ON deployment.`id` = bundle.`countryDeploymentId`
WHERE deployment.`countryCode` = 'US';
--> statement-breakpoint

-- The existing issuer table has a country-wide issuer-key uniqueness rule.
-- Store each requirement-bundle/source association as a distinct unverified
-- evidence-issuer shell rather than collapsing source identity across bundles.
INSERT INTO `credential_issuers` (
  `countryDeploymentId`, `credentialTypeId`, `issuerKey`, `displayName`, `issuerStatus`, `officialSourceId`
)
SELECT
  deployment.`id`,
  credential.`id`,
  CONCAT('US_V2_', bundle.`bundleKey`, '__', source.`sourceKey`),
  CONCAT(source.`authorityName`, ' — research association only'),
  'UNVERIFIED',
  source.`id`
FROM `country_requirement_source_bindings` binding
INNER JOIN `country_requirement_bundles` bundle ON bundle.`id` = binding.`bundleId`
INNER JOIN `country_deployments` deployment ON deployment.`id` = bundle.`countryDeploymentId`
INNER JOIN `credential_types` credential ON credential.`countryDeploymentId` = deployment.`id`
  AND credential.`credentialKey` = CONCAT('US_V2_BUNDLE_', bundle.`bundleKey`)
INNER JOIN `official_sources` source ON source.`id` = binding.`officialSourceId`
WHERE deployment.`countryCode` = 'US';
