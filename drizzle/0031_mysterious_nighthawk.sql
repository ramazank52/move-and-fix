ALTER TABLE `job_cancellation_cases` ADD `refundAmount` int;--> statement-breakpoint
ALTER TABLE `job_cancellation_cases` ADD `providerGrossAmount` int;--> statement-breakpoint
ALTER TABLE `job_cancellation_cases` ADD `commissionAmount` int;--> statement-breakpoint
ALTER TABLE `job_cancellation_cases` ADD `providerPayoutAmount` int;--> statement-breakpoint
ALTER TABLE `job_cancellation_cases` ADD `settlementGatewayReference` varchar(191);