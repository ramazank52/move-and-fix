CREATE TABLE `provider_rating_aggregates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`approvedReviewCount` int NOT NULL,
	`averageRatingTenths` int NOT NULL,
	`sourcePlanHash` varchar(64) NOT NULL,
	`reconciledAt` timestamp NOT NULL DEFAULT (now()),
	`reconciledByUserId` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provider_rating_aggregates_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_rating_aggregates_provider_unique` UNIQUE(`providerId`)
);
--> statement-breakpoint
CREATE TABLE `rating_reconciliation_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runKey` varchar(96) NOT NULL,
	`mode` enum('dry_run','apply') NOT NULL,
	`status` enum('planned','applying','applied','failed') NOT NULL,
	`actorUserId` int NOT NULL,
	`planHash` varchar(64) NOT NULL,
	`schemaFingerprint` varchar(64) NOT NULL,
	`batchSize` int NOT NULL,
	`checkpointProviderId` int NOT NULL DEFAULT 0,
	`appliedProviderCount` int NOT NULL DEFAULT 0,
	`failureCode` varchar(96),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rating_reconciliation_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `rating_reconciliation_runs_key_unique` UNIQUE(`runKey`)
);
--> statement-breakpoint
CREATE INDEX `provider_rating_aggregates_plan_idx` ON `provider_rating_aggregates` (`sourcePlanHash`,`reconciledAt`);--> statement-breakpoint
CREATE INDEX `rating_reconciliation_runs_status_created_idx` ON `rating_reconciliation_runs` (`status`,`createdAt`);