CREATE TABLE `privacy_legal_holds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reason` varchar(1000) NOT NULL,
	`status` enum('active','released') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`releasedByUserId` int,
	`releasedAt` timestamp,
	CONSTRAINT `privacy_legal_holds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `privacy_rights_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterUserId` int NOT NULL,
	`requestType` enum('export','erasure') NOT NULL,
	`status` enum('open','in_review','blocked_legal_hold','approved','rejected','completed') NOT NULL DEFAULT 'open',
	`requestReason` varchar(500),
	`reviewNote` varchar(1000),
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `privacy_rights_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `masked_communication_sessions` ADD `expiredAt` timestamp;--> statement-breakpoint
ALTER TABLE `messages` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `messages` ADD `deletedByUserId` int;--> statement-breakpoint
CREATE INDEX `privacy_legal_hold_user_status_idx` ON `privacy_legal_holds` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `privacy_rights_requester_status_idx` ON `privacy_rights_requests` (`requesterUserId`,`status`);--> statement-breakpoint
CREATE INDEX `privacy_rights_status_created_idx` ON `privacy_rights_requests` (`status`,`createdAt`);