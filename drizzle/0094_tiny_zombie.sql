CREATE TABLE `user_content_moderation_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moderationRecordId` int NOT NULL,
	`reviewerUserId` int NOT NULL,
	`decision` enum('approved','rejected','quarantined','review_required') NOT NULL,
	`reasonCode` varchar(96) NOT NULL,
	`idempotencyKey` varchar(128) NOT NULL,
	`decidedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_content_moderation_decisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `ugc_moderation_decision_idempotency_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `user_content_moderation_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`surface` enum('service_request','provider_bio','review','expense_note','support_ticket') NOT NULL,
	`contentReference` varchar(191) NOT NULL,
	`contentHash` varchar(128) NOT NULL,
	`policyVersion` varchar(64) NOT NULL,
	`status` enum('pending','approved','rejected','quarantined','review_required') NOT NULL DEFAULT 'pending',
	`reasonCode` varchar(96) NOT NULL,
	`reviewerUserId` int,
	`decidedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_content_moderation_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `ugc_moderation_surface_reference_unique` UNIQUE(`surface`,`contentReference`)
);
--> statement-breakpoint
CREATE INDEX `ugc_moderation_decision_record_idx` ON `user_content_moderation_decisions` (`moderationRecordId`,`decidedAt`);--> statement-breakpoint
CREATE INDEX `ugc_moderation_decision_reviewer_idx` ON `user_content_moderation_decisions` (`reviewerUserId`,`decidedAt`);--> statement-breakpoint
CREATE INDEX `ugc_moderation_owner_status_idx` ON `user_content_moderation_records` (`ownerUserId`,`status`);--> statement-breakpoint
CREATE INDEX `ugc_moderation_reviewer_status_idx` ON `user_content_moderation_records` (`reviewerUserId`,`status`);