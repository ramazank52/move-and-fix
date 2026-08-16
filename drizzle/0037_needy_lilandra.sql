CREATE TABLE `consent_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`consentKey` varchar(96) NOT NULL,
	`documentVersion` varchar(64) NOT NULL,
	`purpose` enum('legal','marketing','transactional') NOT NULL,
	`action` enum('granted','withdrawn') NOT NULL,
	`source` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consent_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `consent_events_user_key_created_idx` ON `consent_events` (`userId`,`consentKey`,`createdAt`);--> statement-breakpoint
CREATE INDEX `consent_events_purpose_action_idx` ON `consent_events` (`purpose`,`action`,`createdAt`);