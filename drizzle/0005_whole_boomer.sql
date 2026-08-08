CREATE TABLE `provider_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`providerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `provider_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_favorites_user_provider_unique` UNIQUE(`userId`,`providerId`)
);
