CREATE TABLE `admin_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('super_admin') NOT NULL,
	`grantedByUserId` int NOT NULL,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `admin_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_roles_user_role_unique` UNIQUE(`userId`,`role`)
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member') NOT NULL,
	`invitedByUserId` int NOT NULL,
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`joinedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_members_org_user_unique` UNIQUE(`organizationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`taxId` varchar(64),
	`type` enum('corporate','fleet','facility') NOT NULL,
	`ownerId` int NOT NULL,
	`status` enum('active','suspended','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_owner_tax_id_unique` UNIQUE(`ownerId`,`taxId`)
);
--> statement-breakpoint
ALTER TABLE `service_requests` ADD `organizationId` int;--> statement-breakpoint
CREATE INDEX `admin_roles_active_idx` ON `admin_roles` (`role`,`revokedAt`);--> statement-breakpoint
CREATE INDEX `organization_members_user_idx` ON `organization_members` (`userId`,`organizationId`);--> statement-breakpoint
CREATE INDEX `organization_members_org_role_idx` ON `organization_members` (`organizationId`,`role`);--> statement-breakpoint
CREATE INDEX `organizations_owner_status_idx` ON `organizations` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `service_requests_organization_status_idx` ON `service_requests` (`organizationId`,`status`);