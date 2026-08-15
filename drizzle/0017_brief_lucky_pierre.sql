CREATE TABLE `financial_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(160) NOT NULL,
	`accountType` enum('asset','liability','revenue','expense','equity') NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'TRY',
	`ownerUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_accounts_code_currency_unique` UNIQUE(`code`,`currency`)
);
--> statement-breakpoint
CREATE TABLE `financial_ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` enum('payment_pending','payment_succeeded','hold','commission','provider_payable','settlement','refund','partial_refund','dispute_hold','payout','failed_payout','reversal','chargeback','reimbursement','adjustment') NOT NULL,
	`paymentId` int,
	`requestId` int,
	`referenceType` varchar(64) NOT NULL,
	`referenceId` varchar(191) NOT NULL,
	`externalReference` varchar(191),
	`idempotencyKey` varchar(191) NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_ledger_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_ledger_entries_idempotency_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `financial_ledger_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryId` int NOT NULL,
	`accountId` int NOT NULL,
	`direction` enum('debit','credit') NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'TRY',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_ledger_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_reconciliation_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`severity` enum('warning','critical') NOT NULL DEFAULT 'critical',
	`code` varchar(64) NOT NULL DEFAULT 'FINANCIAL_RECONCILIATION_ALERT',
	`paymentId` int,
	`externalReference` varchar(191),
	`details` text NOT NULL,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_reconciliation_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_reconciliation_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('iyzico','stripe') NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`checkedCount` int NOT NULL DEFAULT 0,
	`mismatchCount` int NOT NULL DEFAULT 0,
	`error` text,
	CONSTRAINT `financial_reconciliation_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `financial_accounts_owner_idx` ON `financial_accounts` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `financial_ledger_entries_payment_idx` ON `financial_ledger_entries` (`paymentId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `financial_ledger_entries_request_idx` ON `financial_ledger_entries` (`requestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `financial_ledger_lines_entry_idx` ON `financial_ledger_lines` (`entryId`);--> statement-breakpoint
CREATE INDEX `financial_ledger_lines_account_idx` ON `financial_ledger_lines` (`accountId`,`currency`);--> statement-breakpoint
CREATE INDEX `financial_reconciliation_alerts_run_idx` ON `financial_reconciliation_alerts` (`runId`);--> statement-breakpoint
CREATE INDEX `financial_reconciliation_alerts_open_idx` ON `financial_reconciliation_alerts` (`resolvedAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `financial_reconciliation_runs_provider_status_idx` ON `financial_reconciliation_runs` (`provider`,`status`);
-- TiDB does not support triggers. Immutability is enforced by the append-only
-- FinancialLedger service: no update/delete method or router is exposed; a
-- unique idempotency key prevents duplicate posts and corrections are reversals.
