CREATE TABLE `job_tracking` (
	`requestId` int NOT NULL,
	`lifecycleStatus` enum('scheduled','on_the_way','arrived','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`providerLatitude` varchar(20),
	`providerLongitude` varchar(20),
	`accuracyMeters` int,
	`etaMinutes` int,
	`lastLocationAt` timestamp,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_tracking_requestId` PRIMARY KEY(`requestId`)
);
--> statement-breakpoint
CREATE INDEX `job_tracking_status_idx` ON `job_tracking` (`lifecycleStatus`);--> statement-breakpoint
CREATE INDEX `job_tracking_updated_at_idx` ON `job_tracking` (`updatedAt`);