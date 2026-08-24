CREATE TABLE `marketplace_opportunity_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`providerId` int NOT NULL,
	`eventType` enum('opportunity_available','opportunity_revoked') NOT NULL,
	`status` enum('queued','delivered','revoked','failed') NOT NULL DEFAULT 'queued',
	`idempotencyKey` varchar(191) NOT NULL,
	`deepLink` varchar(240) NOT NULL,
	`reasonCode` varchar(160) NOT NULL,
	`deliveredAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_opportunity_notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_opportunity_notification_idempotency_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `marketplace_opportunity_notification_provider_idx` ON `marketplace_opportunity_notifications` (`providerId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `marketplace_opportunity_notification_request_idx` ON `marketplace_opportunity_notifications` (`requestId`,`eventType`,`status`);