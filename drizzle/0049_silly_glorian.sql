ALTER TABLE `service_requests` ADD `requiredCredentialType` varchar(120);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `requiredCredentialType` varchar(120);--> statement-breakpoint
ALTER TABLE `service_requests` ADD `requiredCredentialAssurance` enum('A','B','C','D','E','F');--> statement-breakpoint
ALTER TABLE `service_requests` ADD `requiresCredentialHumanReview` int;--> statement-breakpoint
CREATE INDEX `service_requests_credential_context_idx` ON `service_requests` (`jurisdictionId`,`requiredCredentialType`);
