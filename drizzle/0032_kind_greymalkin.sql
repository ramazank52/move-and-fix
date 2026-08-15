CREATE TABLE `expense_refund_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`expenseId` int NOT NULL,
	`providerId` int NOT NULL,
	`requestedAmount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'TRY',
	`materialAssessmentJson` text NOT NULL,
	`status` enum('draft','submitted','under_review','approved','rejected','withdrawn') NOT NULL DEFAULT 'draft',
	`reviewedByUserId` int,
	`resolutionNote` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expense_refund_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `expense_refund_requests_expense_unique` UNIQUE(`expenseId`)
);
--> statement-breakpoint
CREATE TABLE `job_expense_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expenseId` int NOT NULL,
	`mediaId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_expense_media_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_expense_media_media_unique` UNIQUE(`mediaId`),
	CONSTRAINT `job_expense_media_expense_media_unique` UNIQUE(`expenseId`,`mediaId`)
);
--> statement-breakpoint
CREATE TABLE `job_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`agreementId` int NOT NULL,
	`providerId` int NOT NULL,
	`category` enum('fuel','toll','parking','material','part','paint','equipment','transport','packaging','other') NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'TRY',
	`description` text NOT NULL,
	`purchasedAt` timestamp NOT NULL,
	`vendorName` varchar(191),
	`brand` varchar(120),
	`model` varchar(120),
	`quantity` int,
	`locationUrl` varchar(500),
	`sharedWithCustomer` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `service_request_media` MODIFY COLUMN `purpose` enum('request','before','after','completion','expense','dispute') NOT NULL DEFAULT 'request';--> statement-breakpoint
CREATE INDEX `expense_refund_requests_request_status_idx` ON `expense_refund_requests` (`requestId`,`status`);--> statement-breakpoint
CREATE INDEX `job_expense_media_expense_idx` ON `job_expense_media` (`expenseId`);--> statement-breakpoint
CREATE INDEX `job_expenses_request_created_idx` ON `job_expenses` (`requestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `job_expenses_provider_created_idx` ON `job_expenses` (`providerId`,`createdAt`);