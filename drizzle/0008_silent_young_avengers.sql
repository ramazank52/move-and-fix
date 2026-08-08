ALTER TABLE `payments` ADD `gatewayCheckoutToken` varchar(191);--> statement-breakpoint
ALTER TABLE `payments` ADD `gatewayCheckoutToken` varchar(191);
--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_gatewayCheckoutToken_unique` UNIQUE(`gatewayCheckoutToken`);
