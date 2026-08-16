CREATE TABLE `masked_communication_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`customerUserId` int NOT NULL,
	`providerUserId` int NOT NULL,
	`channel` enum('phone','message') NOT NULL,
	`status` enum('not_configured','pending','active','released','expired') NOT NULL DEFAULT 'not_configured',
	`providerSessionReference` varchar(191),
	`expiresAt` timestamp,
	`releasedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `masked_communication_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `masked_communication_request_channel_unique` UNIQUE(`requestId`,`channel`)
);
--> statement-breakpoint
CREATE INDEX `masked_communication_customer_idx` ON `masked_communication_sessions` (`customerUserId`,`status`);--> statement-breakpoint
CREATE INDEX `masked_communication_provider_idx` ON `masked_communication_sessions` (`providerUserId`,`status`);--> statement-breakpoint
CREATE INDEX `masked_communication_expiry_idx` ON `masked_communication_sessions` (`status`,`expiresAt`);