ALTER TABLE `service_requests`
  ADD COLUMN `serviceCountryCode` varchar(2) NULL,
  ADD COLUMN `requirementState` enum('REQUIRED','NOT_REQUIRED','CONDITIONAL','PROHIBITED','UNKNOWN','LEGAL_REVIEW_REQUIRED','JURISDICTION_UNRESOLVED','CAPABILITY_UNMAPPED') NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN `compliancePackageId` int NULL,
  ADD COLUMN `complianceRuleId` int NULL,
  ADD COLUMN `officialSourceId` int NULL,
  ADD COLUMN `sourceStatus` enum('verified','draft','superseded','revoked','missing') NOT NULL DEFAULT 'missing',
  ADD COLUMN `currencyContext` varchar(3) NULL;
--> statement-breakpoint
CREATE INDEX `service_requests_jurisdiction_snapshot_idx` ON `service_requests` (`serviceCountryCode`,`jurisdictionId`,`requirementState`);
