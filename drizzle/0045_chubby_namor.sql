ALTER TABLE `service_request_media` ADD `publicId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `service_request_media` ADD COLUMN `publicId` varchar(64);
UPDATE `service_request_media` SET `publicId` = UUID() WHERE `publicId` IS NULL;
ALTER TABLE `service_request_media` MODIFY COLUMN `publicId` varchar(64) NOT NULL;
ALTER TABLE `service_request_media` ADD CONSTRAINT `service_request_media_public_id_unique` UNIQUE(`publicId`);
