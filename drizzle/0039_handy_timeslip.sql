CREATE TABLE `payment_provider_watch` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('iyzico','stripe') NOT NULL,
	`countryCode` varchar(2) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`status` enum('not_configured','regulatory_review','operational','suspended') NOT NULL DEFAULT 'not_configured',
	`configVersion` varchar(64) NOT NULL,
	`healthCheckedAt` timestamp,
	`regulatoryReviewedAt` timestamp,
	`nextReviewAt` timestamp,
	`blockingReason` text,
	`reviewedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_provider_watch_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_provider_watch_scope_unique` UNIQUE(`provider`,`countryCode`,`currency`)
);
--> statement-breakpoint
CREATE INDEX `payment_provider_watch_status_idx` ON `payment_provider_watch` (`status`,`nextReviewAt`);