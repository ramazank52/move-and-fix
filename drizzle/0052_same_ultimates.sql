CREATE TABLE `insurance_claim_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`claimId` int NOT NULL,
	`mediaId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `insurance_claim_media_id` PRIMARY KEY(`id`),
	CONSTRAINT `insurance_claim_media_media_unique` UNIQUE(`mediaId`),
	CONSTRAINT `insurance_claim_media_claim_media_unique` UNIQUE(`claimId`,`mediaId`)
);
--> statement-breakpoint
CREATE TABLE `insurance_claims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`openedByUserId` int NOT NULL,
	`claimantRole` enum('customer','provider') NOT NULL,
	`category` enum('injury','property_damage','theft','liability','other') NOT NULL,
	`description` text NOT NULL,
	`incidentAt` timestamp NOT NULL,
	`status` enum('submitted','under_review','more_information_required','accepted','rejected','withdrawn') NOT NULL DEFAULT 'submitted',
	`reviewedByUserId` int,
	`decisionNote` text,
	`decidedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `insurance_claims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_request_tax_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`taxRuleId` int NOT NULL,
	`taxRuleVersion` varchar(64) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'TRY',
	`subtotalAmount` int NOT NULL,
	`taxAmount` int NOT NULL,
	`totalAmount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_request_tax_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_request_tax_snapshots_request_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE TABLE `support_ticket_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`eventType` enum('opened','message','status_changed','assignment','resolution') NOT NULL,
	`body` text,
	`metadataJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_ticket_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int,
	`createdByUserId` int NOT NULL,
	`category` enum('technical','payment','safety','service','account','other') NOT NULL,
	`priority` enum('normal','high','urgent') NOT NULL DEFAULT 'normal',
	`subject` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`status` enum('open','in_review','resolved','closed') NOT NULL DEFAULT 'open',
	`assignedAdminUserId` int,
	`resolutionNote` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tax_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryCode` varchar(2) NOT NULL,
	`taxType` enum('vat') NOT NULL DEFAULT 'vat',
	`categoryId` int,
	`version` varchar(64) NOT NULL,
	`rateBasisPoints` int NOT NULL,
	`effectiveFrom` timestamp NOT NULL,
	`effectiveUntil` timestamp,
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tax_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `tax_rules_country_category_version_unique` UNIQUE(`countryCode`,`categoryId`,`version`)
);
--> statement-breakpoint
CREATE INDEX `insurance_claim_media_claim_idx` ON `insurance_claim_media` (`claimId`);--> statement-breakpoint
CREATE INDEX `insurance_claims_request_status_idx` ON `insurance_claims` (`requestId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `insurance_claims_opener_status_idx` ON `insurance_claims` (`openedByUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `service_request_tax_snapshots_rule_idx` ON `service_request_tax_snapshots` (`taxRuleId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `support_ticket_events_ticket_created_idx` ON `support_ticket_events` (`ticketId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `support_tickets_creator_status_idx` ON `support_tickets` (`createdByUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `support_tickets_request_idx` ON `support_tickets` (`requestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `support_tickets_admin_status_idx` ON `support_tickets` (`assignedAdminUserId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `tax_rules_lookup_idx` ON `tax_rules` (`countryCode`,`categoryId`,`status`,`effectiveFrom`);