CREATE TABLE `job_completion_proofs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `requestId` int NOT NULL,
  `providerId` int NOT NULL,
  `submittedByUserId` int NOT NULL,
  `summary` text NOT NULL,
  `status` enum('submitted','approved','auto_approved','disputed','resolved') NOT NULL DEFAULT 'submitted',
  `responseDueAt` timestamp NOT NULL,
  `customerApprovedAt` timestamp NULL,
  `releasedAt` timestamp NULL,
  `releaseReason` enum('customer_approval','auto_release','admin_resolution') NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `job_completion_proofs_id` PRIMARY KEY(`id`),
  CONSTRAINT `job_completion_proofs_request_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE INDEX `job_completion_proofs_due_status_idx` ON `job_completion_proofs` (`status`,`responseDueAt`);
--> statement-breakpoint
CREATE INDEX `job_completion_proofs_provider_idx` ON `job_completion_proofs` (`providerId`,`createdAt`);
--> statement-breakpoint
CREATE TABLE `completion_disputes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `requestId` int NOT NULL,
  `completionProofId` int NOT NULL,
  `openedByUserId` int NOT NULL,
  `reasonCode` enum('incomplete_work','quality_issue','damage','wrong_service','other') NOT NULL,
  `description` text NOT NULL,
  `status` enum('open','under_review','resolved_customer','resolved_provider') NOT NULL DEFAULT 'open',
  `reviewedByUserId` int NULL,
  `resolutionNote` text NULL,
  `resolvedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `completion_disputes_id` PRIMARY KEY(`id`),
  CONSTRAINT `completion_disputes_request_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE INDEX `completion_disputes_status_created_idx` ON `completion_disputes` (`status`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `completion_disputes_proof_idx` ON `completion_disputes` (`completionProofId`);
--> statement-breakpoint
CREATE TABLE `escrow_release_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `requestId` int NOT NULL,
  `paymentId` int NOT NULL,
  `completionProofId` int NOT NULL,
  `reason` enum('customer_approval','auto_release','admin_resolution') NOT NULL,
  `actorUserId` int NULL,
  `idempotencyKey` varchar(160) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `escrow_release_events_id` PRIMARY KEY(`id`),
  CONSTRAINT `escrow_release_events_payment_unique` UNIQUE(`paymentId`),
  CONSTRAINT `escrow_release_events_idempotency_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `escrow_release_events_request_idx` ON `escrow_release_events` (`requestId`);
