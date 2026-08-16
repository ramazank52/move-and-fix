ALTER TABLE `job_tracking` ADD `locationSharingStatus` enum('disabled','enabled','stopped') DEFAULT 'disabled' NOT NULL;--> statement-breakpoint
ALTER TABLE `job_tracking` ADD `locationConsentAt` timestamp;--> statement-breakpoint
ALTER TABLE `job_tracking` ADD `locationSharingStoppedAt` timestamp;--> statement-breakpoint
CREATE INDEX `job_tracking_location_share_idx` ON `job_tracking` (`locationSharingStatus`,`lastLocationAt`);