ALTER TABLE `service_requests` ADD `jurisdictionId` int;--> statement-breakpoint
ALTER TABLE `service_requests` ADD `jurisdictionId` int;--> statement-breakpoint
ALTER TABLE `service_requests` ADD `requiredCapabilityId` int;--> statement-breakpoint
ALTER TABLE `service_requests` ADD `compliancePackageVersion` varchar(64);--> statement-breakpoint
CREATE INDEX `service_requests_capability_context_idx` ON `service_requests` (`jurisdictionId`,`requiredCapabilityId`);
