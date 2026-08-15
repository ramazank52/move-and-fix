CREATE TABLE `move_ai_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceMessage` text NOT NULL,
	`assistantSummary` text NOT NULL,
	`categoryId` int,
	`draftJson` text NOT NULL,
	`riskLevel` enum('low','medium','high') NOT NULL DEFAULT 'low',
	`status` enum('draft','confirmed','cancelled','expired','blocked') NOT NULL DEFAULT 'draft',
	`confirmedRequestId` int,
	`expiresAt` timestamp NOT NULL,
	`confirmedAt` timestamp,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `move_ai_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectUserId` int NOT NULL,
	`relatedRequestId` int,
	`source` enum('move_ai','system','admin','report') NOT NULL,
	`reasonCode` varchar(96) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`status` enum('open','under_review','resolved','dismissed') NOT NULL DEFAULT 'open',
	`detailsJson` text NOT NULL,
	`reviewedByUserId` int,
	`reviewNote` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `risk_flags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trust_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`score` int NOT NULL DEFAULT 100,
	`status` enum('active','restricted','blocked') NOT NULL DEFAULT 'active',
	`lastEvaluatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trust_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `trust_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `move_ai_drafts_user_status_idx` ON `move_ai_drafts` (`userId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `move_ai_drafts_expiry_idx` ON `move_ai_drafts` (`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `risk_flags_subject_status_idx` ON `risk_flags` (`subjectUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `risk_flags_status_severity_idx` ON `risk_flags` (`status`,`severity`,`createdAt`);--> statement-breakpoint
CREATE INDEX `trust_profiles_status_score_idx` ON `trust_profiles` (`status`,`score`);