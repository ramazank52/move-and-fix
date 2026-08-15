CREATE TABLE `in_app_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(80) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text NOT NULL,
	`dataJson` text,
	`status` enum('pending','sent','failed','read') NOT NULL DEFAULT 'sent',
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `in_app_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_push_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`platform` enum('ios','android') NOT NULL,
	`deviceId` varchar(160),
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_push_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_push_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `in_app_notifications_user_created_idx` ON `in_app_notifications` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `in_app_notifications_user_read_idx` ON `in_app_notifications` (`userId`,`readAt`);--> statement-breakpoint
CREATE INDEX `user_push_tokens_user_active_idx` ON `user_push_tokens` (`userId`,`active`);