CREATE TABLE `move_ai_draft_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`draftId` int,
	`ownerUserId` int NOT NULL,
	`opaqueId` varchar(64) NOT NULL,
	`kind` enum('image','audio') NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`sizeBytes` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`status` enum('staged','attached','transferred','purged') NOT NULL DEFAULT 'staged',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`attachedAt` timestamp,
	`transferredAt` timestamp,
	CONSTRAINT `move_ai_draft_media_id` PRIMARY KEY(`id`),
	CONSTRAINT `move_ai_draft_media_opaque_unique` UNIQUE(`opaqueId`)
);
--> statement-breakpoint
ALTER TABLE `service_request_media` MODIFY COLUMN `kind` enum('image','video','audio','document') NOT NULL;--> statement-breakpoint
ALTER TABLE `move_ai_drafts` ADD `attachedMediaOpaqueIds` json;--> statement-breakpoint
ALTER TABLE `move_ai_drafts` ADD `mediaConsentGrantedAt` timestamp;--> statement-breakpoint
ALTER TABLE `move_ai_drafts` ADD `hasAudioInput` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `move_ai_draft_media_owner_status_idx` ON `move_ai_draft_media` (`ownerUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `move_ai_draft_media_draft_idx` ON `move_ai_draft_media` (`draftId`,`status`);