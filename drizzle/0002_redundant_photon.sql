CREATE TABLE `wallet_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'TRY',
	`availableBalance` int NOT NULL DEFAULT 0,
	`pendingBalance` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallet_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_accounts_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('deposit','escrow_hold','commission_deduction','provider_payout','withdrawal','refund','adjustment') NOT NULL,
	`status` enum('pending','processing','completed','failed','cancelled') NOT NULL,
	`amount` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`reference` varchar(96),
	`idempotencyKey` varchar(96),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_transactions_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `wallet_withdrawals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`transactionId` int NOT NULL,
	`amount` int NOT NULL,
	`bankAccountId` varchar(96) NOT NULL,
	`status` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallet_withdrawals_id` PRIMARY KEY(`id`)
);
