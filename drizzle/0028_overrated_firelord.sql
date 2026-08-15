CREATE TABLE `settlement_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scopeKey` varchar(191) NOT NULL,
	`countryCode` varchar(2) NOT NULL,
	`categoryId` int,
	`gatewayProvider` enum('any','iyzico','stripe') NOT NULL DEFAULT 'any',
	`contractType` varchar(48) NOT NULL DEFAULT 'standard',
	`precedence` int NOT NULL DEFAULT 0,
	`version` varchar(64) NOT NULL,
	`completionReviewHours` int NOT NULL,
	`cancellationPolicyJson` text NOT NULL,
	`status` enum('draft','active','retired','suspended') NOT NULL DEFAULT 'draft',
	`effectiveFrom` timestamp NOT NULL DEFAULT (now()),
	`effectiveTo` timestamp,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settlement_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `settlement_policies_scopeKey_unique` UNIQUE(`scopeKey`)
);
--> statement-breakpoint
CREATE INDEX `settlement_policies_lookup_idx` ON `settlement_policies` (`countryCode`,`categoryId`,`gatewayProvider`,`contractType`,`status`,`effectiveFrom`);
--> statement-breakpoint
INSERT INTO `settlement_policies` (
  `scopeKey`, `countryCode`, `categoryId`, `gatewayProvider`, `contractType`,
  `precedence`, `version`, `completionReviewHours`, `cancellationPolicyJson`,
  `status`, `effectiveFrom`
) VALUES (
  'TR:standard:any:global:v1', 'TR', NULL, 'any', 'standard',
  0, 'tr-global-v1', 48,
  '{"version":"tr-global-v1","requiresHumanReviewForPartialSettlement":true,"requiresGatewayRefundConfirmation":true,"automaticCancellationSettlement":"disabled"}',
  'active', NOW()
);
