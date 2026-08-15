CREATE TABLE `job_completion_proof_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`completionProofId` int NOT NULL,
	`mediaId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_completion_proof_media_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_completion_proof_media_media_unique` UNIQUE(`mediaId`),
	CONSTRAINT `job_completion_proof_media_proof_media_unique` UNIQUE(`completionProofId`,`mediaId`)
);
--> statement-breakpoint
CREATE INDEX `job_completion_proof_media_proof_idx` ON `job_completion_proof_media` (`completionProofId`);