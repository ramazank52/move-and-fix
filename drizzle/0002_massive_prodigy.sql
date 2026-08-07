ALTER TABLE `users` ADD CONSTRAINT `users_email_idx` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `messages_senderId_idx` ON `messages` (`senderId`);--> statement-breakpoint
CREATE INDEX `messages_receiverId_idx` ON `messages` (`receiverId`);--> statement-breakpoint
CREATE INDEX `messages_requestId_idx` ON `messages` (`requestId`);--> statement-breakpoint
CREATE INDEX `messages_isRead_idx` ON `messages` (`isRead`);--> statement-breakpoint
CREATE INDEX `offers_requestId_idx` ON `offers` (`requestId`);--> statement-breakpoint
CREATE INDEX `offers_providerId_idx` ON `offers` (`providerId`);--> statement-breakpoint
CREATE INDEX `offers_status_idx` ON `offers` (`status`);--> statement-breakpoint
CREATE INDEX `payments_requestId_idx` ON `payments` (`requestId`);--> statement-breakpoint
CREATE INDEX `payments_userId_idx` ON `payments` (`userId`);--> statement-breakpoint
CREATE INDEX `payments_providerId_idx` ON `payments` (`providerId`);--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `providers_userId_idx` ON `providers` (`userId`);--> statement-breakpoint
CREATE INDEX `providers_categoryId_idx` ON `providers` (`categoryId`);--> statement-breakpoint
CREATE INDEX `providers_rating_idx` ON `providers` (`rating`);--> statement-breakpoint
CREATE INDEX `providers_isVerified_idx` ON `providers` (`isVerified`);--> statement-breakpoint
CREATE INDEX `service_requests_userId_idx` ON `service_requests` (`userId`);--> statement-breakpoint
CREATE INDEX `service_requests_status_idx` ON `service_requests` (`status`);--> statement-breakpoint
CREATE INDEX `service_requests_categoryId_idx` ON `service_requests` (`categoryId`);--> statement-breakpoint
CREATE INDEX `service_requests_assignedProviderId_idx` ON `service_requests` (`assignedProviderId`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);