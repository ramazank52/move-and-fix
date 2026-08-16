CREATE TABLE `organization_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`requestId` int,
	`batchId` int,
	`invoiceNumber` varchar(96) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'TRY',
	`subtotalAmount` int NOT NULL,
	`taxAmount` int NOT NULL DEFAULT 0,
	`totalAmount` int NOT NULL,
	`status` enum('draft','issued','paid','void') NOT NULL DEFAULT 'draft',
	`issuedAt` timestamp,
	`paidAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_invoices_number_unique` UNIQUE(`invoiceNumber`),
	CONSTRAINT `organization_invoices_request_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE TABLE `organization_request_batch_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` int NOT NULL,
	`requestId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_request_batch_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_batch_items_request_unique` UNIQUE(`requestId`),
	CONSTRAINT `organization_batch_items_batch_request_unique` UNIQUE(`batchId`,`requestId`)
);
--> statement-breakpoint
CREATE TABLE `organization_request_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`categoryId` int NOT NULL,
	`siteId` int,
	`description` text,
	`requestedForAt` timestamp,
	`status` enum('draft','submitted','cancelled','completed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_request_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `organization_invoices_org_status_idx` ON `organization_invoices` (`organizationId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `organization_invoices_batch_idx` ON `organization_invoices` (`batchId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `organization_batch_items_batch_idx` ON `organization_request_batch_items` (`batchId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `organization_request_batches_org_status_idx` ON `organization_request_batches` (`organizationId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `organization_request_batches_creator_idx` ON `organization_request_batches` (`createdByUserId`,`createdAt`);