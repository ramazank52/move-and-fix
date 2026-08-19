CREATE TABLE `provider_document_reviewer_permissions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `grantedByUserId` int NOT NULL,
  `grantedAt` timestamp NOT NULL DEFAULT (now()),
  `revokedAt` timestamp,
  CONSTRAINT `provider_document_reviewer_permissions_id` PRIMARY KEY(`id`),
  CONSTRAINT `provider_doc_reviewer_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `provider_doc_reviewer_active_idx` ON `provider_document_reviewer_permissions` (`userId`,`revokedAt`);
