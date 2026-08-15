ALTER TABLE `provider_credentials` ADD `validFrom` timestamp;--> statement-breakpoint
ALTER TABLE `provider_credentials` ADD `lastRegistryCheckAt` timestamp;--> statement-breakpoint
ALTER TABLE `provider_credentials` ADD `revocationStatus` enum('unknown','clear','revoked','check_failed') DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `provider_credentials` ADD `verificationSourceId` int;--> statement-breakpoint
ALTER TABLE `provider_credentials` ADD `sourceVersion` varchar(120);--> statement-breakpoint
ALTER TABLE `provider_credentials` ADD `ruleVersion` varchar(64);--> statement-breakpoint
ALTER TABLE `provider_credentials` ADD `retentionDueAt` timestamp;--> statement-breakpoint
ALTER TABLE `provider_credentials` ADD `evidencePurgedAt` timestamp;--> statement-breakpoint
ALTER TABLE `provider_documents` ADD `retentionDueAt` timestamp;--> statement-breakpoint
ALTER TABLE `provider_documents` ADD `contentPurgedAt` timestamp;--> statement-breakpoint
ALTER TABLE `provider_documents` ADD `purgeStatus` enum('not_scheduled','scheduled','logical_purge_complete','storage_erase_pending','storage_erase_confirmed') DEFAULT 'not_scheduled' NOT NULL;