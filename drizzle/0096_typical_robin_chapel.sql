CREATE TABLE `service_request_measurements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`idempotencyKey` varchar(96) NOT NULL,
	`method` enum('manual_rectangle','manual_polygon','ar_depth','ar_plane') NOT NULL,
	`unit` enum('m','cm') NOT NULL,
	`areaSquareCentimeters` int NOT NULL,
	`geometryJson` text NOT NULL,
	`capabilityClass` enum('manual','ar_depth','ar_plane') NOT NULL,
	`qualityWarning` enum('estimated','tracking_lost','low_confidence'),
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_request_measurements_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_request_measurements_request_unique` UNIQUE(`requestId`),
	CONSTRAINT `service_request_measurements_owner_idempotency_unique` UNIQUE(`ownerUserId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `service_request_measurements_owner_request_idx` ON `service_request_measurements` (`ownerUserId`,`requestId`);