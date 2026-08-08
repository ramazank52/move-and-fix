ALTER TABLE `payments` ADD `gatewayProvider` enum('iyzico','stripe');--> statement-breakpoint
ALTER TABLE `payments` ADD `gatewayProvider` enum('iyzico','stripe');--> statement-breakpoint
ALTER TABLE `payments` ADD `gatewayPaymentId` varchar(191);--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_gatewayPaymentId_unique` UNIQUE(`gatewayPaymentId`);
