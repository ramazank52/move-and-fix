-- Faz 8-A Blok 1 v3: non-destructive capability profile hardening.
-- Existing 0083 rows are retained. Legacy "suspended" profiles fail closed as
-- unclassified enforcement suspensions until an authorised audited release.
ALTER TABLE `provider_capability_profiles`
  ADD COLUMN `operatingModelVersion` varchar(32) NOT NULL DEFAULT 'v2',
  ADD COLUMN `operatingModelCode` varchar(80) NOT NULL DEFAULT 'independent_tradesperson',
  ADD COLUMN `operatingModelContextJson` json NULL,
  ADD COLUMN `declarationState` enum('draft','submitted','withdrawn','locked') NOT NULL DEFAULT 'draft',
  ADD COLUMN `sourceVerificationState` enum('unverified','verified','blocked') NOT NULL DEFAULT 'unverified',
  ADD COLUMN `legalApprovalState` enum('pending','approved','revoked','expired') NOT NULL DEFAULT 'pending',
  ADD COLUMN `releaseApprovalState` enum('pending','approved','revoked','expired') NOT NULL DEFAULT 'pending',
  ADD COLUMN `voluntarySuspensionState` enum('active','suspended') NOT NULL DEFAULT 'active',
  ADD COLUMN `enforcementState` enum('clear','suspended','blocked') NOT NULL DEFAULT 'clear',
  ADD COLUMN `enforcementReasonCode` varchar(120) NULL,
  ADD COLUMN `requiredRulePackVersion` varchar(120) NOT NULL DEFAULT 'unknown',
  ADD COLUMN `requiredRequirementVersion` varchar(120) NOT NULL DEFAULT 'unknown',
  ADD COLUMN `stateVersion` int NOT NULL DEFAULT 1,
  ADD COLUMN `enforcementUpdatedAt` timestamp NULL;
--> statement-breakpoint
UPDATE `provider_capability_profiles`
SET
  `operatingModelVersion` = 'v2',
  `operatingModelCode` = CASE `operatingModel`
    WHEN 'company' THEN 'company'
    ELSE 'independent_tradesperson'
  END,
  `enforcementState` = CASE WHEN `profileStatus` = 'suspended' THEN 'suspended' ELSE 'clear' END,
  `enforcementReasonCode` = CASE WHEN `profileStatus` = 'suspended' THEN 'LEGACY_SUSPENSION_UNCLASSIFIED' ELSE NULL END,
  `declarationState` = CASE WHEN `profileStatus` = 'suspended' THEN 'locked' ELSE 'draft' END,
  `enforcementUpdatedAt` = CASE WHEN `profileStatus` = 'suspended' THEN NOW() ELSE NULL END;
--> statement-breakpoint
CREATE TABLE `provider_capability_approval_ledger` (
  `id` int AUTO_INCREMENT NOT NULL,
  `profileId` int NOT NULL,
  `approvalType` enum('legal_source','product_release') NOT NULL,
  `eventType` enum('granted','revoked','expired','superseded') NOT NULL,
  `rulePackVersion` varchar(120) NOT NULL,
  `requirementVersion` varchar(120) NOT NULL,
  `approverUserId` int NOT NULL,
  `approverRole` varchar(120) NOT NULL,
  `authorityScope` varchar(240) NOT NULL,
  `evidenceHash` varchar(128) NOT NULL,
  `evidenceStatus` enum('present','deleted') NOT NULL DEFAULT 'present',
  `validFrom` timestamp NULL,
  `validUntil` timestamp NULL,
  `reasonCode` varchar(160) NULL,
  `priorLedgerEventId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `provider_capability_approval_ledger_id` PRIMARY KEY (`id`),
  CONSTRAINT `provider_capability_approval_ledger_profile_fk`
    FOREIGN KEY (`profileId`) REFERENCES `provider_capability_profiles` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `provider_capability_enforcement_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `profileId` int NOT NULL,
  `action` enum('suspend','block','release') NOT NULL,
  `reasonCode` varchar(160) NOT NULL,
  `actorUserId` int NOT NULL,
  `actorRole` varchar(120) NOT NULL,
  `evidenceHash` varchar(128) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `provider_capability_enforcement_events_id` PRIMARY KEY (`id`),
  CONSTRAINT `provider_capability_enforcement_events_profile_fk`
    FOREIGN KEY (`profileId`) REFERENCES `provider_capability_profiles` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `provider_capability_profiles_enforcement_idx`
  ON `provider_capability_profiles` (`providerId`, `enforcementState`);
--> statement-breakpoint
CREATE INDEX `provider_capability_approval_ledger_profile_type_idx`
  ON `provider_capability_approval_ledger` (`profileId`, `approvalType`, `createdAt`);
--> statement-breakpoint
CREATE INDEX `provider_capability_approval_ledger_approver_idx`
  ON `provider_capability_approval_ledger` (`approverUserId`, `createdAt`);
--> statement-breakpoint
CREATE INDEX `provider_capability_enforcement_profile_idx`
  ON `provider_capability_enforcement_events` (`profileId`, `createdAt`);
