CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`receiverId` int NOT NULL,
	`requestId` int,
	`content` text NOT NULL,
	`isRead` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`providerId` int NOT NULL,
	`price` int NOT NULL,
	`message` text,
	`estimatedTime` varchar(100),
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`userId` int NOT NULL,
	`providerId` int NOT NULL,
	`amount` int NOT NULL,
	`status` enum('pending','held','released','refunded') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(200) NOT NULL,
	`bio` text,
	`categoryId` int,
	`rating` int DEFAULT 0,
	`completedJobs` int DEFAULT 0,
	`moveScore` int DEFAULT 50,
	`isVerified` int DEFAULT 0,
	`isPremium` int DEFAULT 0,
	`latitude` varchar(20),
	`longitude` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`icon` varchar(10),
	`color` varchar(10),
	`pricingType` enum('fixed','km_based','hourly') NOT NULL DEFAULT 'fixed',
	`kmRate` int,
	`basePrice` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `service_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`categoryId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pending','active','completed','cancelled') NOT NULL DEFAULT 'pending',
	`address` text,
	`latitude` varchar(20),
	`longitude` varchar(20),
	`budgetMin` int,
	`budgetMax` int,
	`distanceKm` int,
	`estimatedPrice` int,
	`assignedProviderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_requests_id` PRIMARY KEY(`id`)
);
