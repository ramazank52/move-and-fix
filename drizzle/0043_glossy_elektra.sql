CREATE TABLE `price_guarantees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`agreementId` int NOT NULL,
	`customerUserId` int NOT NULL,
	`providerId` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'TRY',
	`guaranteedAmount` int NOT NULL,
	`maximumAmount` int NOT NULL,
	`status` enum('active','superseded','cancelled','completed') NOT NULL DEFAULT 'active',
	`policyVersion` varchar(64) NOT NULL DEFAULT 'no_surprise_price_v1',
	`acceptedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`supersededAt` timestamp,
	`cancellationReason` varchar(255),
	CONSTRAINT `price_guarantees_id` PRIMARY KEY(`id`),
	CONSTRAINT `price_guarantees_request_unique` UNIQUE(`requestId`),
	CONSTRAINT `price_guarantees_agreement_unique` UNIQUE(`agreementId`)
);
--> statement-breakpoint
CREATE INDEX `price_guarantees_customer_status_idx` ON `price_guarantees` (`customerUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `price_guarantees_provider_status_idx` ON `price_guarantees` (`providerId`,`status`,`createdAt`);