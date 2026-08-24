ALTER TABLE `marketplace_opportunity_notifications` MODIFY COLUMN `status` enum('queued','processing','delivered','revoked','failed','dead_letter') NOT NULL DEFAULT 'queued';--> statement-breakpoint
ALTER TABLE `marketplace_opportunity_notifications` ADD `attemptCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_opportunity_notifications` ADD `nextAttemptAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_opportunity_notifications` ADD `claimToken` varchar(64);--> statement-breakpoint
ALTER TABLE `marketplace_opportunity_notifications` ADD `claimedAt` timestamp;--> statement-breakpoint
ALTER TABLE `marketplace_opportunity_notifications` ADD `claimUntil` timestamp;--> statement-breakpoint
ALTER TABLE `marketplace_opportunity_notifications` ADD `lastErrorCode` varchar(160);--> statement-breakpoint
ALTER TABLE `marketplace_opportunity_notifications` ADD `deliveryNotificationId` int;--> statement-breakpoint
CREATE INDEX `marketplace_opportunity_notification_claim_idx` ON `marketplace_opportunity_notifications` (`status`,`nextAttemptAt`,`claimUntil`);
