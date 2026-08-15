CREATE TABLE `auth_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`purpose` enum('verify_email','verify_phone','password_reset') NOT NULL,
	`channel` enum('email','sms') NOT NULL,
	`destination` varchar(320) NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 5,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `provider_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`type` enum('identity','driver_license','src_certificate','psychotechnic') NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(96) NOT NULL,
	`sizeBytes` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`rejectionReason` varchar(500),
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provider_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_documents_provider_type_unique` UNIQUE(`providerId`,`type`)
);
--> statement-breakpoint
CREATE TABLE `user_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailNormalized` varchar(320),
	`phoneE164` varchar(32),
	`passwordHash` varchar(255) NOT NULL,
	`failedLoginCount` int NOT NULL DEFAULT 0,
	`lockedUntil` timestamp,
	`passwordUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_credentials_user_unique` UNIQUE(`userId`),
	CONSTRAINT `user_credentials_email_unique` UNIQUE(`emailNormalized`),
	CONSTRAINT `user_credentials_phone_unique` UNIQUE(`phoneE164`)
);
--> statement-breakpoint
ALTER TABLE `messages` ADD `kind` enum('text','audio') DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `mediaStorageKey` varchar(512);--> statement-breakpoint
ALTER TABLE `messages` ADD `mediaUrl` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `mediaMimeType` varchar(96);--> statement-breakpoint
ALTER TABLE `messages` ADD `mediaSizeBytes` int;--> statement-breakpoint
ALTER TABLE `messages` ADD `mediaDurationMs` int;--> statement-breakpoint
ALTER TABLE `messages` ADD `mediaSha256` varchar(64);--> statement-breakpoint
ALTER TABLE `providers` ADD `verificationStatus` enum('unsubmitted','pending','approved','rejected') DEFAULT 'unsubmitted' NOT NULL;--> statement-breakpoint
ALTER TABLE `providers` ADD `verificationSubmittedAt` timestamp;--> statement-breakpoint
ALTER TABLE `providers` ADD `verificationReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `phoneVerifiedAt` timestamp;--> statement-breakpoint
CREATE INDEX `auth_challenges_user_purpose_idx` ON `auth_challenges` (`userId`,`purpose`);--> statement-breakpoint
CREATE INDEX `auth_challenges_expiry_idx` ON `auth_challenges` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `provider_documents_status_idx` ON `provider_documents` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `provider_documents_owner_idx` ON `provider_documents` (`ownerUserId`);