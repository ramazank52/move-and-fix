ALTER TABLE `service_request_media` MODIFY COLUMN `purpose` enum('request','before','after','completion','expense','dispute','claim') NOT NULL DEFAULT 'request';
ALTER TABLE `service_request_media` MODIFY COLUMN `purpose` enum('request','before','after','completion','expense','dispute','claim') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'request';
