CREATE TABLE `service_request_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`subcategoryId` int,
	`serviceType` enum('generic','painting','electrical','plumbing','cleaning','moving','courier','tow_truck','roadside') NOT NULL DEFAULT 'generic',
	`pickupAddress` text,
	`destinationAddress` text,
	`pickupLatitude` varchar(20),
	`pickupLongitude` varchar(20),
	`destinationLatitude` varchar(20),
	`destinationLongitude` varchar(20),
	`pickupFloor` int,
	`destinationFloor` int,
	`pickupHasElevator` int,
	`destinationHasElevator` int,
	`distanceKm` int,
	`attributesJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_request_details_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_request_details_request_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE TABLE `service_request_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`purpose` enum('request','before','after','completion','dispute') NOT NULL DEFAULT 'request',
	`kind` enum('image','video','document') NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`sizeBytes` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_request_media_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_request_media_storage_key_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `service_subcategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_subcategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_subcategories_category_slug_unique` UNIQUE(`categoryId`,`slug`)
);
--> statement-breakpoint
ALTER TABLE `service_categories` ADD `isActive` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `service_categories` ADD `sortOrder` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `service_request_details_type_idx` ON `service_request_details` (`serviceType`);--> statement-breakpoint
CREATE INDEX `service_request_media_request_purpose_idx` ON `service_request_media` (`requestId`,`purpose`);--> statement-breakpoint
CREATE INDEX `service_request_media_owner_idx` ON `service_request_media` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `service_subcategories_category_active_sort_idx` ON `service_subcategories` (`categoryId`,`isActive`,`sortOrder`);