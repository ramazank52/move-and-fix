CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`userId` int NOT NULL,
	`providerId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviews_requestId_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
ALTER TABLE `payments` ADD `offerId` int;--> statement-breakpoint
ALTER TABLE `payments` ADD `commissionRateBps` int;--> statement-breakpoint
ALTER TABLE `payments` ADD `commissionAmount` int;--> statement-breakpoint
ALTER TABLE `payments` ADD `providerPayout` int;--> statement-breakpoint
ALTER TABLE `payments` ADD `idempotencyKey` varchar(128);--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_idempotencyKey_unique` UNIQUE(`idempotencyKey`);