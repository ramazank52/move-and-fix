-- Additive Türkiye-only country market control. This is not a release migration:
-- TR begins READINESS_BLOCKED; no legacy deployment flag is enabled here.
CREATE TABLE `country_market_controls` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryDeploymentId` int NOT NULL,
  `desiredState` enum('INFRA_ONLY','ACTIVE','PAUSED','EMERGENCY_DISABLED') NOT NULL DEFAULT 'INFRA_ONLY',
  `effectiveState` enum('INFRA_ONLY','READINESS_BLOCKED','READY_PENDING_OWNER_APPROVAL','ACTIVE','PAUSED','EMERGENCY_DISABLED','INFRA_ONLY_NO_GO') NOT NULL DEFAULT 'INFRA_ONLY',
  `storeDistributionState` enum('TR_ONLY_PLANNED','NOT_LISTED','EXTERNAL_STORE_GATE_REQUIRED') NOT NULL DEFAULT 'NOT_LISTED',
  `inAppProductionAllowlisted` int NOT NULL DEFAULT 0,
  `requiresRevalidation` int NOT NULL DEFAULT 1,
  `lastOwnerReason` text,
  `lastChangedByUserId` int,
  `lastMfaGrantId` varchar(64),
  `lastGateSnapshotHash` varchar(128),
  `stateVersion` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `country_market_controls_id` PRIMARY KEY(`id`),
  CONSTRAINT `country_market_controls_deployment_unique` UNIQUE(`countryDeploymentId`)
);
--> statement-breakpoint
CREATE TABLE `country_market_control_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryMarketControlId` int NOT NULL,
  `eventType` enum('DESIRED_STATE_REQUESTED','EFFECTIVE_STATE_EVALUATED','EMERGENCY_DISABLED','REVALIDATION_REQUIRED','RELEASE_RUN_BLOCKED','ROLLBACK_APPLIED') NOT NULL,
  `previousDesiredState` varchar(48),
  `nextDesiredState` varchar(48),
  `previousEffectiveState` varchar(48),
  `nextEffectiveState` varchar(48) NOT NULL,
  `actorUserId` int,
  `mfaGrantId` varchar(64),
  `reason` text NOT NULL,
  `gateSnapshotHash` varchar(128),
  `correlationId` varchar(128) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `country_market_control_events_id` PRIMARY KEY(`id`),
  CONSTRAINT `country_market_control_events_correlation_unique` UNIQUE(`correlationId`)
);
--> statement-breakpoint
CREATE TABLE `country_market_release_runs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `countryMarketControlId` int NOT NULL,
  `requestedDesiredState` varchar(48) NOT NULL,
  `result` enum('BLOCKED','ABORTED','ACTIVE') NOT NULL DEFAULT 'BLOCKED',
  `stage` enum('PRECHECK','DEPLOYMENT_HEALTH','LEGACY_GATE','COVERAGE_GATE','OTHER_COUNTRY_ASSERTION','ROLLED_BACK') NOT NULL DEFAULT 'PRECHECK',
  `blockersJson` json NOT NULL,
  `gateSnapshotHash` varchar(128) NOT NULL,
  `actorUserId` int,
  `mfaGrantId` varchar(64),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `country_market_release_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `country_market_controls` ADD CONSTRAINT `fk_country_market_control_deployment` FOREIGN KEY (`countryDeploymentId`) REFERENCES `country_deployments`(`id`) ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE `country_market_control_events` ADD CONSTRAINT `fk_country_market_event_control` FOREIGN KEY (`countryMarketControlId`) REFERENCES `country_market_controls`(`id`) ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE `country_market_release_runs` ADD CONSTRAINT `fk_country_market_release_control` FOREIGN KEY (`countryMarketControlId`) REFERENCES `country_market_controls`(`id`) ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX `country_market_controls_effective_idx` ON `country_market_controls` (`effectiveState`,`inAppProductionAllowlisted`);
--> statement-breakpoint
CREATE INDEX `country_market_control_events_control_created_idx` ON `country_market_control_events` (`countryMarketControlId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `country_market_release_runs_control_created_idx` ON `country_market_release_runs` (`countryMarketControlId`,`createdAt`);
--> statement-breakpoint
-- Türkiye exists as a runtime allowlist candidate, not an open market. All
-- legacy country deployment feature flags remain zero/default-off.
INSERT INTO `country_deployments` (
  `countryCode`, `displayName`, `state`, `dataPlaneClass`, `defaultLocale`, `defaultCurrency`, `defaultTimeZone`,
  `rawCredentialGlobalTransferAllowed`, `localDataPlaneReady`, `countryShellEnabled`, `jurisdictionEnabled`,
  `consumerDiscoveryEnabled`, `providerOnboardingEnabled`, `bookingEnabled`, `paymentsEnabled`,
  `aiAssistantEnabled`, `supportEnabled`, `productionStateReachable`, `seedVersion`
) VALUES (
  'TR', 'Türkiye', 'SCAFFOLD_ONLY', 'TR_PRIMARY', 'tr-TR', 'TRY', 'Europe/Istanbul',
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'tr-only-market-control-v1'
)
ON DUPLICATE KEY UPDATE `countryCode` = VALUES(`countryCode`);
--> statement-breakpoint
-- Seed every known country. Existing rows are preserved on rerun; no market
-- becomes active through this insert.
INSERT INTO `country_market_controls` (
  `countryDeploymentId`, `desiredState`, `effectiveState`, `storeDistributionState`,
  `inAppProductionAllowlisted`, `requiresRevalidation`, `lastOwnerReason`, `stateVersion`
)
SELECT
  cd.`id`,
  CASE WHEN cd.`countryCode` = 'TR' THEN 'ACTIVE' ELSE 'INFRA_ONLY' END,
  CASE
    WHEN cd.`countryCode` = 'TR' THEN 'READINESS_BLOCKED'
    WHEN cd.`countryCode` = 'RU' THEN 'INFRA_ONLY_NO_GO'
    ELSE 'INFRA_ONLY'
  END,
  CASE WHEN cd.`countryCode` = 'TR' THEN 'TR_ONLY_PLANNED' ELSE 'NOT_LISTED' END,
  CASE WHEN cd.`countryCode` = 'TR' THEN 1 ELSE 0 END,
  1,
  CASE WHEN cd.`countryCode` = 'TR' THEN 'MIGRATION_SEED_TR_DESIRED_ACTIVE_EFFECTIVE_READINESS_BLOCKED' ELSE 'MIGRATION_SEED_INFRA_ONLY' END,
  1
FROM `country_deployments` cd
ON DUPLICATE KEY UPDATE `countryDeploymentId` = VALUES(`countryDeploymentId`);
--> statement-breakpoint
INSERT INTO `country_market_control_events` (
  `countryMarketControlId`, `eventType`, `nextDesiredState`, `nextEffectiveState`, `reason`, `correlationId`
)
SELECT
  cmc.`id`,
  'EFFECTIVE_STATE_EVALUATED',
  cmc.`desiredState`,
  cmc.`effectiveState`,
  cmc.`lastOwnerReason`,
  CONCAT('migration-0089-', cd.`countryCode`)
FROM `country_market_controls` cmc
INNER JOIN `country_deployments` cd ON cd.`id` = cmc.`countryDeploymentId`
ON DUPLICATE KEY UPDATE `correlationId` = VALUES(`correlationId`);
