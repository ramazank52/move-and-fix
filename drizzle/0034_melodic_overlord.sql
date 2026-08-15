CREATE TABLE `operational_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(96) NOT NULL,
	`severity` enum('info','warning','error') NOT NULL DEFAULT 'info',
	`requestId` varchar(96),
	`actorUserId` int,
	`metadataJson` json NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operational_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operational_feature_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flagKey` varchar(96) NOT NULL,
	`version` int NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`rolloutPercent` int NOT NULL DEFAULT 0,
	`killSwitch` int NOT NULL DEFAULT 0,
	`audienceSeed` varchar(96) NOT NULL,
	`startsAt` timestamp NOT NULL DEFAULT (now()),
	`endsAt` timestamp,
	`createdByUserId` int NOT NULL,
	`reason` varchar(280) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operational_feature_flags_id` PRIMARY KEY(`id`),
	CONSTRAINT `operational_flags_version_unique` UNIQUE(`flagKey`,`version`)
);
--> statement-breakpoint
CREATE INDEX `operational_events_type_time_idx` ON `operational_events` (`eventType`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `operational_flags_lookup_idx` ON `operational_feature_flags` (`flagKey`,`startsAt`);