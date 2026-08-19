CREATE TABLE IF NOT EXISTS `contact_verification_states` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `contactType` enum('email','phone') NOT NULL,
  `contactValue` varchar(320) NOT NULL,
  `status` enum('unverified','pending','verified') NOT NULL DEFAULT 'unverified',
  `challengeId` int,
  `initiatedAt` timestamp NULL,
  `verifiedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `contact_verification_states_id` PRIMARY KEY(`id`),
  CONSTRAINT `contact_verification_user_type_unique` UNIQUE(`userId`,`contactType`),
  KEY `contact_verification_user_status_idx` (`userId`,`status`)
);
