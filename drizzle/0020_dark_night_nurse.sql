CREATE TABLE `admin_mfa_grants` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`sessionFingerprint` varchar(64) NOT NULL,
	`challengeId` int NOT NULL,
	`verifiedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	CONSTRAINT `admin_mfa_grants_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_mfa_grants_session_unique` UNIQUE(`userId`,`sessionFingerprint`)
);
--> statement-breakpoint
CREATE INDEX `admin_mfa_grants_active_idx` ON `admin_mfa_grants` (`userId`,`expiresAt`,`revokedAt`);