ALTER TABLE `users`
  ADD COLUMN `pendingEmailChange` varchar(320),
  ADD COLUMN `pendingEmailToken` varchar(128),
  ADD COLUMN `pendingEmailTokenExpiry` timestamp NULL,
  ADD COLUMN `pendingPhoneChange` varchar(32),
  ADD COLUMN `pendingPhoneToken` varchar(128),
  ADD COLUMN `pendingPhoneTokenExpiry` timestamp NULL;

CREATE TABLE `contact_change_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `contactType` enum('email','phone') NOT NULL,
  `eventType` enum('initiated','confirmed','expired','cancelled') NOT NULL,
  `contactValueHash` varchar(128) NOT NULL,
  `challengeId` int,
  `metadata` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `contact_change_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `contact_change_events_user_created_idx` ON `contact_change_events` (`userId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `contact_change_events_challenge_idx` ON `contact_change_events` (`challengeId`);
