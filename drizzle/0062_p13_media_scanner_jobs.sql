CREATE TABLE `media_scanner_jobs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `mediaClass` enum('provider_document','service_request_media','voice_message','move_ai_draft_media') NOT NULL,
  `mediaId` varchar(64) NOT NULL,
  `sha256` varchar(64) NOT NULL,
  `storageKey` varchar(512) NOT NULL,
  `status` enum('queued','dispatched','retry_scheduled','completed','blocked','failed') NOT NULL DEFAULT 'queued',
  `deliveryAttempts` int NOT NULL DEFAULT 0,
  `lastDispatchAt` timestamp NULL,
  `nextAttemptAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `scannerReference` varchar(191),
  `outcome` enum('clean','blocked'),
  `outcomeReason` varchar(500),
  `completedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `media_scanner_jobs_id` PRIMARY KEY(`id`),
  CONSTRAINT `media_scanner_jobs_media_unique` UNIQUE(`mediaClass`,`mediaId`)
);
--> statement-breakpoint
CREATE INDEX `media_scanner_jobs_claim_idx` ON `media_scanner_jobs` (`status`,`nextAttemptAt`,`id`);
