CREATE TABLE `job_timeline_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`eventType` varchar(96) NOT NULL,
	`actorUserId` int,
	`referenceType` varchar(64) NOT NULL,
	`referenceId` int,
	`metadataJson` json NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_timeline_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_timeline_events_reference_unique` UNIQUE(`requestId`,`referenceType`,`referenceId`)
);
--> statement-breakpoint
CREATE TABLE `organization_maintenance_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`siteId` int,
	`assetId` int,
	`categoryId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`cadence` enum('weekly','monthly','quarterly','annual') NOT NULL,
	`nextRunAt` timestamp NOT NULL,
	`status` enum('active','paused','archived') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_maintenance_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_managed_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`siteId` int,
	`kind` enum('property','vehicle','equipment','other') NOT NULL,
	`name` varchar(160) NOT NULL,
	`externalReference` varchar(128),
	`detailsJson` json NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_managed_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_request_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`organizationId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`reviewedByUserId` int,
	`decisionNote` text,
	`decidedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_request_approvals_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_request_approvals_request_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE TABLE `organization_sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`address` text NOT NULL,
	`latitude` varchar(20),
	`longitude` varchar(20),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_sites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_intelligence_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int,
	`requestedByUserId` int NOT NULL,
	`categoryId` int NOT NULL,
	`countryCode` varchar(2) NOT NULL DEFAULT 'TR',
	`currency` varchar(3) NOT NULL DEFAULT 'TRY',
	`status` enum('available','insufficient_data','unavailable','failed') NOT NULL DEFAULT 'insufficient_data',
	`sampleSize` int NOT NULL DEFAULT 0,
	`medianAmount` int,
	`lowAmount` int,
	`highAmount` int,
	`explanationJson` json NOT NULL,
	`dataWindowStartedAt` timestamp,
	`dataWindowEndedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_intelligence_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `safety_check_ins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('requested','acknowledged','missed','cancelled') NOT NULL DEFAULT 'requested',
	`dueAt` timestamp NOT NULL,
	`acknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `safety_check_ins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `safety_incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int,
	`reporterUserId` int NOT NULL,
	`category` enum('conduct','identity','unsafe_condition','harassment','other') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`description` text NOT NULL,
	`status` enum('open','under_review','resolved','dismissed') NOT NULL DEFAULT 'open',
	`externalDeliveryStatus` enum('not_configured','not_requested','queued','delivered','failed') NOT NULL DEFAULT 'not_configured',
	`reviewedByUserId` int,
	`resolutionNote` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `safety_incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `safety_trusted_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`encryptedContactJson` text NOT NULL,
	`label` varchar(80),
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `safety_trusted_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `job_timeline_events_request_time_idx` ON `job_timeline_events` (`requestId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `job_timeline_events_actor_time_idx` ON `job_timeline_events` (`actorUserId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `organization_maintenance_due_idx` ON `organization_maintenance_schedules` (`status`,`nextRunAt`);--> statement-breakpoint
CREATE INDEX `organization_maintenance_org_idx` ON `organization_maintenance_schedules` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `organization_assets_org_status_idx` ON `organization_managed_assets` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `organization_assets_site_idx` ON `organization_managed_assets` (`siteId`,`status`);--> statement-breakpoint
CREATE INDEX `organization_request_approvals_org_status_idx` ON `organization_request_approvals` (`organizationId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `organization_sites_org_status_idx` ON `organization_sites` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `price_intelligence_request_idx` ON `price_intelligence_assessments` (`requestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `price_intelligence_category_status_idx` ON `price_intelligence_assessments` (`categoryId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `price_intelligence_requester_idx` ON `price_intelligence_assessments` (`requestedByUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `safety_check_ins_request_user_idx` ON `safety_check_ins` (`requestId`,`userId`,`status`);--> statement-breakpoint
CREATE INDEX `safety_check_ins_due_idx` ON `safety_check_ins` (`status`,`dueAt`);--> statement-breakpoint
CREATE INDEX `safety_incidents_request_status_idx` ON `safety_incidents` (`requestId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `safety_incidents_reporter_idx` ON `safety_incidents` (`reporterUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `safety_incidents_status_severity_idx` ON `safety_incidents` (`status`,`severity`,`createdAt`);--> statement-breakpoint
CREATE INDEX `safety_trusted_contacts_user_status_idx` ON `safety_trusted_contacts` (`userId`,`status`,`createdAt`);