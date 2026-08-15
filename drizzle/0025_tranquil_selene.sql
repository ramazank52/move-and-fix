CREATE TABLE `job_cancellation_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`agreementId` int,
	`openedByUserId` int NOT NULL,
	`reasonCode` enum('schedule','provider_unavailable','customer_changed_mind','safety','other') NOT NULL,
	`description` text NOT NULL,
	`status` enum('requested','under_review','resolved','withdrawn') NOT NULL DEFAULT 'requested',
	`resolvedByUserId` int,
	`settlementOutcome` enum('pending','refund','partial_refund','provider_payable','no_payment') NOT NULL DEFAULT 'pending',
	`resolutionNote` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_cancellation_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_cancellation_cases_request_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE TABLE `job_change_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`agreementId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`kind` enum('scope','schedule','amount') NOT NULL,
	`description` text NOT NULL,
	`amountDelta` int NOT NULL DEFAULT 0,
	`status` enum('requested','accepted','rejected','withdrawn','expired') NOT NULL DEFAULT 'requested',
	`respondedByUserId` int,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_change_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_agreements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`offerId` int NOT NULL,
	`customerUserId` int NOT NULL,
	`providerId` int NOT NULL,
	`paymentId` int,
	`currency` varchar(3) NOT NULL DEFAULT 'TRY',
	`agreedAmount` int NOT NULL,
	`commissionRateBps` int NOT NULL,
	`commissionAmount` int NOT NULL,
	`providerPayout` int NOT NULL,
	`completionReviewHours` int NOT NULL,
	`snapshotJson` text NOT NULL,
	`acceptedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_agreements_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_agreements_request_unique` UNIQUE(`requestId`),
	CONSTRAINT `service_agreements_offer_unique` UNIQUE(`offerId`)
);
--> statement-breakpoint
CREATE INDEX `job_cancellation_cases_status_idx` ON `job_cancellation_cases` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `job_change_orders_request_status_idx` ON `job_change_orders` (`requestId`,`status`);--> statement-breakpoint
CREATE INDEX `job_change_orders_agreement_idx` ON `job_change_orders` (`agreementId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `service_agreements_provider_idx` ON `service_agreements` (`providerId`,`createdAt`);