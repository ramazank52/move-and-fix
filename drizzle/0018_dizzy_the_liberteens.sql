CREATE TABLE `local_auth_sessions` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`userAgent` varchar(512),
	`ipHash` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`revokeReason` varchar(80),
	CONSTRAINT `local_auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `local_auth_sessions_token_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `local_auth_sessions_user_active_idx` ON `local_auth_sessions` (`userId`,`revokedAt`,`expiresAt`);