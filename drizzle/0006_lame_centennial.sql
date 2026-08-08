CREATE TABLE `payment_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('iyzico','stripe') NOT NULL,
	`eventId` varchar(191) NOT NULL,
	`eventType` varchar(96) NOT NULL,
	`payloadHash` varchar(64) NOT NULL,
	`status` enum('processing','processed','failed') NOT NULL DEFAULT 'processing',
	`error` text,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `payment_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_webhook_provider_event_unique` UNIQUE(`provider`,`eventId`)
);
